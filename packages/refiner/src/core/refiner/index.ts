/**
 * Phase 1: THE REFINER - Main Orchestrator Class
 * Coordinates sanitization, entropy calculation, and semantic folding
 */

import {
  RefinedOutput,
  RefinerConfig,
  CodeBlock,
  RefinerMetadata,
  RefinerOptions
} from './types';
import { Sanitizer } from './sanitizer';
import { EntropyCalculator } from './entropy-calculator';
import { SemanticFolder } from './semantic-folder';
import { estimateTokenCount, estimateBlockTokenCount } from '../../utils/token-counter';

export class Refiner {
  private sanitizer: Sanitizer;
  private entropyCalculator: EntropyCalculator;
  private semanticFolder: SemanticFolder;
  private config: RefinerConfig;
  private _options: RefinerOptions;

  constructor(config?: RefinerConfig, options?: RefinerOptions) {
    this.config = config || {};
    this._options = options || {};
    this.sanitizer = new Sanitizer(config);
    this.entropyCalculator = new EntropyCalculator();
    this.semanticFolder = new SemanticFolder(config);
    // Note: options are reserved for future use (batch processing, caching)
  }

  /**
   * Main refine method: Process raw code through entire pipeline
   */
  public async refine(input: string): Promise<RefinedOutput> {
    const startTime = Date.now();

    // Step 1: Sanitize (remove secrets)
    const sanitized = this.sanitizer.sanitize(input);

    // Step 2: Split into blocks
    const blocks = this.splitIntoBlocks(sanitized.text);

    // Step 3: Calculate entropy for each block
    const codeBlocks: CodeBlock[] = [];
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const entropy = this.entropyCalculator.calculateEntropy(block);
      const originalTokens = estimateBlockTokenCount(block);

      let folded = undefined;
      let refinedTokens = originalTokens;

      // Step 4: Apply semantic folding if enabled
      if (this.config.enableSemanticFolding && this.entropyCalculator.shouldFold(block)) {
        try {
          folded = await this.semanticFolder.fold(block);
          refinedTokens = estimateBlockTokenCount(folded.summary);
        } catch (error) {
          console.warn('Semantic folding failed for block:', error);
        }
      }

      codeBlocks.push({
        content: folded?.summary || block,
        entropy,
        folded,
        metadata: {
          line: i,
          endLine: i,
          type: 'code',
          language: this.detectLanguage(block)
        },
        originalTokenCount: originalTokens,
        refinedTokenCount: refinedTokens
      });
    }

    // Step 5: Calculate metadata and statistics
    const metadata = this.calculateMetadata(
      input,
      sanitized.text,
      codeBlocks,
      Date.now() - startTime
    );

    return {
      sanitizedText: sanitized.text,
      blocks: codeBlocks,
      metadata
    };
  }

  /**
   * Split text into logical code blocks
   */
  private splitIntoBlocks(text: string): string[] {
    // For Phase 1, use simple line-based splitting
    // In Phase 2, this will be replaced with AST-based splitting
    const lines = text.split('\n');
    const blocks: string[] = [];
    let currentBlock: string[] = [];

    for (const line of lines) {
      if (line.trim() === '' && currentBlock.length > 0) {
        // Empty line = block boundary
        blocks.push(currentBlock.join('\n'));
        currentBlock = [];
      } else if (line.trim() !== '') {
        currentBlock.push(line);
      }
    }

    // Add remaining block
    if (currentBlock.length > 0) {
      blocks.push(currentBlock.join('\n'));
    }

    return blocks.filter(b => b.length > 0);
  }

  /**
   * Detect programming language from block content
   */
  private detectLanguage(block: string): string {
    if (block.includes('import ') && block.includes('from ')) return 'python';
    if (block.includes('import {') || block.includes('const ') || block.includes('function ')) return 'typescript';
    if (block.includes('function ') && block.includes('{')) return 'javascript';
    if (block.includes('def ') && block.includes(':')) return 'python';
    if (block.includes('public ') && block.includes('{')) return 'csharp';
    if (block.includes('fn ') && block.includes('{')) return 'rust';
    return 'unknown';
  }

  /**
   * Calculate optimization metadata
   */
  private calculateMetadata(
    originalInput: string,
    sanitizedText: string,
    blocks: CodeBlock[],
    processingTimeMs: number
  ): RefinerMetadata {
    const originalTokens = estimateTokenCount(originalInput);
    const refinedBlocks = blocks.map(b => b.refinedTokenCount || 0);
    const totalTokens = refinedBlocks.reduce((sum, t) => sum + t, 0);

    const highSignalBlocks = blocks.filter(b => b.entropy.rating === 'HIGH').length;
    const lowSignalBlocks = blocks.filter(b => b.entropy.rating === 'LOW').length;
    const foldedCount = blocks.filter(b => b.folded).length;

    const _originalLength = originalInput.length;
    const _sanitizedLength = sanitizedText.length;
    // Note: entropyReduction could be used for reporting in future versions

    return {
      totalTokens,
      originalTokens,
      noisyBlocks: lowSignalBlocks,
      foldedFunctions: foldedCount,
      compressionRatio: originalTokens > 0 ? originalTokens / totalTokens : 1,
      signalToNoiseRatio: blocks.length > 0 ? highSignalBlocks / blocks.length : 0,
      processingTimeMs,
      sanitizationStats: this.sanitizer.getStats()
    };
  }

  /**
   * Sanitize only (no entropy/folding)
   */
  public sanitize(text: string) {
    return this.sanitizer.sanitize(text);
  }

  /**
   * Calculate entropy only
   */
  public calculateEntropy(text: string) {
    return this.entropyCalculator.calculateEntropy(text);
  }

  /**
   * Fold code only
   */
  public async fold(code: string) {
    return this.semanticFolder.fold(code);
  }

  /**
   * Get refiner statistics
   */
  public getStatistics() {
    return {
      sanitizer: this.sanitizer.getStats(),
      cache: this.semanticFolder.getCacheStats()
    };
  }

  /**
   * Configure sanitizer
   */
  public addCustomSanitizationPattern(name: string, pattern: string, type: any, confidence?: number) {
    this.sanitizer.addPattern(name, pattern, type, confidence);
  }

  /**
   * Configure semantic folding
   */
  public configureSemanticFolding(endpoint?: string, model?: string, enabled?: boolean) {
    if (endpoint || model) {
      this.semanticFolder.setConfig(endpoint, model);
    }
    if (enabled !== undefined) {
      this.semanticFolder.setEnabled(enabled);
    }
  }
}

// Export all related types and modules
export { Sanitizer } from './sanitizer';
export { EntropyCalculator } from './entropy-calculator';
export { SemanticFolder } from './semantic-folder';
export * from './types';
