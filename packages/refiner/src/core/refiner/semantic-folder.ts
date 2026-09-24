/**
 * Phase 1: THE REFINER - Semantic Folding Module
 * Compresses code via local LLM (Ollama) summarization
 */

import { FoldedSummary, OllamaFoldResponse, RefinerConfig } from './types';

export class SemanticFolder {
  private ollamaEndpoint: string;
  private ollamaModel: string;
  private enabled: boolean;
  private cache: Map<string, FoldedSummary>;
  private cacheEnabled: boolean;

  constructor(config?: RefinerConfig) {
    this.ollamaEndpoint = config?.ollamaEndpoint || 'http://localhost:11434';
    this.ollamaModel = config?.ollamaModel || 'phi3';
    this.enabled = config?.enableSemanticFolding !== false;
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
   * Fold (compress) a code function into semantic summary
   */
  public async fold(code: string, context?: string): Promise<FoldedSummary> {
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
      const response = await this.callOllama(prompt);
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
      console.warn('Semantic folding failed, returning original:', error);
      return {
        summary: code,
        confidence: 0,
        tokensSaved: 0,
        model: this.ollamaModel,
        timestamp: new Date()
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
  private async callOllama(prompt: string): Promise<OllamaFoldResponse> {
    try {
      const response = await this.makeRequest('/api/generate', {
        method: 'POST',
        body: JSON.stringify({
          model: this.ollamaModel,
          prompt,
          stream: false,
          temperature: 0.3, // Lower temperature for consistency
          top_p: 0.9,
          num_predict: 50 // Limit to ~2 lines
        })
      });

      if (!response || !response.response) {
        throw new Error('Invalid response from Ollama');
      }

      // Parse the response
      const summary = response.response.trim();

      // Estimate tokens saved (rough calculation)
      const originalTokens = Math.ceil(prompt.split(/\s+/).length * 1.3);
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
      throw new Error(`Ollama call failed: ${error}`);
    }
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
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return response.json();
    } catch (error) {
      throw new Error(`Request to ${url} failed: ${error}`);
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
