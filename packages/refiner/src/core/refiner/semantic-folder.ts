/**
 * Phase 1: THE REFINER - Semantic Folding Module
 * Compresses code via local LLM (Ollama) summarization
 */

import { FoldedSummary, OllamaFoldResponse, OllamaModelInfo, RefinerConfig } from './types';

/** Ollama tags omit ":latest" in user input, so "phi3" and "phi3:latest" are the same model. */
export function sameOllamaModel(a: string, b: string): boolean {
  const normalize = (name: string) => (name.includes(':') ? name : `${name}:latest`);
  return normalize(a) === normalize(b);
}

/** Ollama cloud models use a `cloud` tag, for example `gpt-oss:120b-cloud` or `minimax-m2:cloud`. */
export function isCloudModelName(name: string): boolean {
  return /[:-]cloud$/i.test(name.trim());
}

/** True when the endpoint is on this machine (loopback). Unparseable endpoints count as remote. */
export function isLoopbackEndpoint(endpoint: string): boolean {
  let hostname: string;
  try {
    hostname = new URL(endpoint).hostname.toLowerCase();
  } catch {
    return false;
  }
  return hostname === 'localhost' || hostname === '[::1]' || /^127(\.\d{1,3}){3}$/.test(hostname);
}

/** Explains why a remote model was refused. */
export function remoteModelRefusal(model: OllamaModelInfo): string {
  const destination = model.remoteHost ? ` to ${model.remoteHost}` : ' off this machine';
  return `Model "${model.name}" is a remote (cloud) model: Ollama would send the code${destination}. Remote models are not allowed.`;
}

export class SemanticFolder {
  private ollamaEndpoint: string;
  private ollamaModel: string;
  private enabled: boolean;
  private allowRemoteModels: boolean;
  private cache: Map<string, FoldedSummary>;
  private cacheEnabled: boolean;

  constructor(config?: RefinerConfig) {
    this.ollamaEndpoint = config?.ollamaEndpoint || 'http://localhost:11434';
    this.ollamaModel = config?.ollamaModel || 'phi3';
    this.enabled = config?.enableSemanticFolding !== false;
    this.allowRemoteModels = config?.allowRemoteModels === true;
    this.cacheEnabled = config?.cacheFoldedSummaries !== false;
    this.cache = new Map();
  }

  /**
   * Check if Ollama is available
   */
  public async isAvailable(): Promise<boolean> {
    if (!this.enabled) return false;

    try {
      const response = await this.makeRequest('/api/tags', {
        method: 'GET'
      });
      return !!response;
    } catch (error) {
      console.warn('Ollama not available:', error);
      return false;
    }
  }

  /**
   * List models installed in the local Ollama instance. Throws if Ollama is unreachable.
   */
  public async listModels(signal?: AbortSignal): Promise<OllamaModelInfo[]> {
    const response = await this.makeRequest('/api/tags', { method: 'GET', signal });
    const models: Array<{
      name?: string;
      model?: string;
      capabilities?: string[];
      remote_host?: string;
      remote_model?: string;
    }> = response?.models ?? [];
    return models
      .map((m) => {
        const name = m.name ?? m.model ?? '';
        return {
          name,
          capabilities: m.capabilities ?? [],
          remote: Boolean(m.remote_host || m.remote_model) || isCloudModelName(name),
          ...(m.remote_host ? { remoteHost: m.remote_host } : {}),
        };
      })
      .filter((m) => m.name.length > 0);
  }

  /**
   * Fold (compress) a code function into semantic summary.
   * On failure the original code is returned with `confidence: 0` and `error` set.
   */
  public async fold(code: string, context?: string, signal?: AbortSignal): Promise<FoldedSummary> {
    if (!this.enabled) {
      return {
        summary: code,
        confidence: 0,
        tokensSaved: 0,
        model: 'N/A',
        timestamp: new Date()
      };
    }

    // Check cache
    const cacheKey = this.generateCacheKey(code);
    if (this.cacheEnabled && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const _startTime = Date.now();
      const prompt = this.buildPrompt(code, context);
      const response = await this.callOllama(prompt, code, signal);
      // Processing time is tracked in response.processingTimeMs

      const summary: FoldedSummary = {
        summary: response.summary,
        confidence: response.confidence,
        tokensSaved: response.tokensSaved,
        model: this.ollamaModel,
        timestamp: new Date()
      };

      if (this.cacheEnabled) {
        this.cache.set(cacheKey, summary);
      }

      return summary;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn('Semantic folding failed, returning original:', message);
      return {
        summary: code,
        confidence: 0,
        tokensSaved: 0,
        model: this.ollamaModel,
        timestamp: new Date(),
        error: message
      };
    }
  }

  /**
   * Fold multiple code blocks in batch (parallel)
   */
  public async foldBatch(
    blocks: string[],
    parallelCount: number = 3
  ): Promise<FoldedSummary[]> {
    const results: FoldedSummary[] = [];

    // Process in parallel batches
    for (let i = 0; i < blocks.length; i += parallelCount) {
      const batch = blocks.slice(i, i + parallelCount);
      const batchResults = await Promise.all(batch.map(b => this.fold(b)));
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Build the prompt for Ollama
   */
  private buildPrompt(code: string, context?: string): string {
    return `You are a code summarizer. Summarize the following code in 1-2 lines describing WHAT it does, not HOW it does it. Be concise.

${context ? `Context: ${context}\n\n` : ''}Code:
\`\`\`
${code}
\`\`\`

Summary (1-2 lines):`;
  }

  /**
   * Call Ollama API
   */
  private async callOllama(prompt: string, code: string, signal?: AbortSignal): Promise<OllamaFoldResponse> {
    try {
      const model = await this.resolveModel(signal);
      // Thinking models (e.g. gemma4, qwen3) otherwise spend minutes reasoning before a 1-2 line answer.
      // Non-thinking models reject the flag, so it is only sent when the model supports it.
      const supportsThinking = model?.capabilities.includes('thinking') ?? false;
      const response = await this.makeRequest('/api/generate', {
        method: 'POST',
        signal,
        body: JSON.stringify({
          model: this.ollamaModel,
          prompt,
          stream: false,
          ...(supportsThinking ? { think: false } : {}),
          options: {
            temperature: 0.3, // Lower temperature for consistency
            top_p: 0.9,
            num_predict: 80 // Limit to ~2 lines
          }
        })
      });

      if (!response || typeof response.response !== 'string' || response.response.trim().length === 0) {
        throw new Error('Ollama returned an empty response');
      }

      const summary = response.response.trim();

      // Savings compare the original code with the summary, not the instruction prompt.
      const originalTokens = Math.ceil(code.split(/\s+/).filter(Boolean).length * 1.3);
      const summaryTokens = Math.ceil(summary.split(/\s+/).length * 1.3);
      const tokensSaved = Math.max(0, originalTokens - summaryTokens);

      return {
        model: this.ollamaModel,
        summary: `# ${summary}`, // Add comment marker for code
        confidence: 0.8, // Ollama confidence
        tokensSaved,
        processingTimeMs: response.eval_duration ? Math.round(response.eval_duration / 1_000_000) : 0
      };
    } catch (error) {
      throw new Error(`Ollama call failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Looks up the configured model before any code is sent, and refuses remote models unless allowed.
   * Fails closed: if the model list cannot be read, or the model is not in it, nothing is sent, because
   * Ollama also accepts spellings the list does not show (for example `library/name`), which could
   * reach a renamed remote model. With `allowRemoteModels`, an unlisted model is left to Ollama to report.
   */
  private async resolveModel(signal?: AbortSignal): Promise<OllamaModelInfo | undefined> {
    if (!this.allowRemoteModels && !isLoopbackEndpoint(this.ollamaEndpoint)) {
      throw new Error(
        `Ollama endpoint ${this.ollamaEndpoint} is not on this machine, so the code would leave it. Remote models are not allowed.`
      );
    }
    let models: OllamaModelInfo[];
    try {
      models = await this.listModels(signal);
    } catch (error) {
      throw new Error(
        `could not check that model "${this.ollamaModel}" is local (${error instanceof Error ? error.message : error})`
      );
    }
    const model =
      models.find((m) => sameOllamaModel(m.name, this.ollamaModel)) ??
      (isCloudModelName(this.ollamaModel)
        ? { name: this.ollamaModel, capabilities: [], remote: true }
        : undefined);
    if (model?.remote && !this.allowRemoteModels) {
      throw new Error(remoteModelRefusal(model));
    }
    if (!model && !this.allowRemoteModels) {
      throw new Error(`Model "${this.ollamaModel}" is not installed in Ollama (check the name with \`ollama list\`).`);
    }
    return model;
  }

  /**
   * Make HTTP request to Ollama
   */
  private async makeRequest(
    path: string,
    options: RequestInit
  ): Promise<any> {
    const url = `${this.ollamaEndpoint}${path}`;

    try {
      const response = await fetch(url, {
        ...options,
        // Never follow redirects: code sent for folding must only reach the configured endpoint.
        redirect: 'error',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      if (!response.ok) {
        let detail = '';
        try {
          const body = (await response.json()) as { error?: string } | null;
          detail = body?.error ? `: ${body.error}` : '';
        } catch {
          // Body is not JSON; the status code is enough.
        }
        throw new Error(`HTTP ${response.status}${detail}`);
      }

      return response.json();
    } catch (error) {
      throw new Error(`Request to ${url} failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Generate cache key from code
   */
  private generateCacheKey(code: string): string {
    // Simple hash (in production, use crypto)
    const buffer = new TextEncoder().encode(code);
    let hash = 0;
    for (const byte of buffer) {
      hash = ((hash << 5) - hash) + byte;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `fold_${Math.abs(hash).toString(16)}`;
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  public getCacheStats() {
    return {
      size: this.cache.size,
      cacheEnabled: this.cacheEnabled,
      entries: Array.from(this.cache.entries()).map(([key, value]) => ({
        key,
        summary: value.summary.substring(0, 50) + '...',
        tokensSaved: value.tokensSaved
      }))
    };
  }

  /**
   * Set Ollama configuration
   */
  public setConfig(endpoint?: string, model?: string): void {
    if (endpoint) this.ollamaEndpoint = endpoint;
    if (model) this.ollamaModel = model;
  }

  /**
   * Enable/disable semantic folding
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}
