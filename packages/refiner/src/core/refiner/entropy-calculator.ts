/**
 * Phase 1: THE REFINER - Entropy Calculator Module
 * Implements Shannon Entropy for signal-to-noise scoring
 * 
 * Formula: H(s) = -Σ p(x_i) * log₂(p(x_i))
 * Where p(x_i) is the probability of character x_i in string
 * 
 * Interpretation:
 * - H > 6.5: High signal (complex logic)
 * - 5 < H ≤ 6.5: Medium signal (normal code)
 * - H ≤ 5: Low signal (boilerplate, comments)
 */

import { EntropyScore, SignalRating, EntropyCalculation } from './types';

export class EntropyCalculator {
  /**
   * Threshold values for signal rating
   */
  private static readonly THRESHOLDS = {
    HIGH: 6.5,      // Complex logic
    MEDIUM_MIN: 5.0, // Normal code
    LOW: 5.0        // Boilerplate
  };

  /**
   * Calculate Shannon Entropy for a text block
   * Returns entropy score (0-8) and signal rating
   */
  public calculateEntropy(text: string): EntropyScore {
    if (!text || text.length === 0) {
      return {
        value: 0,
        rating: 'LOW',
        signal: 0,
        description: 'Empty text'
      };
    }

    const calculation = this.computeEntropy(text);
    const rating = this.rateSignal(calculation.value);
    const signal = this.confidenceScore(calculation.value, text.length);

    return {
      value: calculation.value,
      rating,
      signal,
      description: `Shannon Entropy: ${calculation.value.toFixed(2)} bits (${rating} signal)`
    };
  }

  /**
   * Internal entropy computation
   * Returns entropy value and character frequency map
   */
  private computeEntropy(text: string): EntropyCalculation {
    const frequency: Record<string, number> = {};
    const totalChars = text.length;

    // Calculate character frequency
    for (const char of text) {
      frequency[char] = (frequency[char] || 0) + 1;
    }

    // Calculate Shannon entropy
    let entropy = 0;
    for (const count of Object.values(frequency)) {
      const probability = count / totalChars;
      entropy -= probability * Math.log2(probability);
    }

    return {
      value: entropy,
      charFrequency: frequency,
      totalChars
    };
  }

  /**
   * Rate signal quality based on entropy value
   */
  private rateSignal(entropy: number): SignalRating {
    if (entropy > EntropyCalculator.THRESHOLDS.HIGH) {
      return 'HIGH';
    } else if (entropy > EntropyCalculator.THRESHOLDS.MEDIUM_MIN) {
      return 'MEDIUM';
    } else {
      return 'LOW';
    }
  }

  /**
   * Calculate confidence score (0-1) based on entropy and text length
   * Longer texts with higher entropy are more reliable
   */
  private confidenceScore(entropy: number, textLength: number): number {
    // Confidence increases with entropy (up to 8)
    const entropyConfidence = Math.min(entropy / 8, 1);

    // Confidence increases with text length (minimum 10 chars for meaningful sample)
    const lengthConfidence = Math.min(textLength / 100, 1);

    // Combined confidence (weighted average)
    return (entropyConfidence * 0.7 + lengthConfidence * 0.3);
  }

  /**
   * Analyze multiple blocks and return ranked list
   * Higher entropy = more important (signal-rich)
   */
  public rankBlocks(blocks: string[]): Array<{ block: string; entropy: number; rank: number }> {
    const analyzed = blocks.map((block, index) => ({
      block,
      entropy: this.calculateEntropy(block).value,
      index
    }));

    // Sort by entropy descending (highest first)
    analyzed.sort((a, b) => b.entropy - a.entropy);

    return analyzed.map((item, rank) => ({
      block: item.block,
      entropy: item.entropy,
      rank: rank + 1
    }));
  }

  /**
   * Calculate average entropy for a set of blocks
   */
  public averageEntropy(blocks: string[]): number {
    if (blocks.length === 0) return 0;
    const total = blocks.reduce((sum, block) => sum + this.calculateEntropy(block).value, 0);
    return total / blocks.length;
  }

  /**
   * Calculate signal-to-noise ratio for a set of blocks
   * SNR = (HIGH signal blocks) / (total blocks)
   */
  public calculateSignalToNoiseRatio(blocks: string[]): number {
    if (blocks.length === 0) return 0;

    const highSignalCount = blocks.filter(
      block => this.calculateEntropy(block).rating === 'HIGH'
    ).length;

    return highSignalCount / blocks.length;
  }

  /**
   * Identify "noisy" blocks (LOW signal)
   */
  public findNoisyBlocks(blocks: string[]): string[] {
    return blocks.filter(
      block => this.calculateEntropy(block).rating === 'LOW'
    );
  }

  /**
   * Identify "signal-rich" blocks (HIGH signal)
   */
  public findSignalRichBlocks(blocks: string[]): string[] {
    return blocks.filter(
      block => this.calculateEntropy(block).rating === 'HIGH'
    );
  }

  /**
   * Get detailed frequency analysis for debugging/visualization
   */
  public analyzeFrequency(text: string): {
    entropy: number;
    uniqueChars: number;
    mostCommon: Array<[string, number]>;
    distribution: Record<string, number>;
  } {
    const calculation = this.computeEntropy(text);

    // Get top 10 most common characters
    const sorted = Object.entries(calculation.charFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    return {
      entropy: calculation.value,
      uniqueChars: Object.keys(calculation.charFrequency).length,
      mostCommon: sorted,
      distribution: calculation.charFrequency
    };
  }

  /**
   * Predict if a block should be folded based on entropy
   * Generally: high entropy + verbose = good candidate for semantic folding
   */
  public shouldFold(text: string, minLines: number = 8): boolean {
    const entropy = this.calculateEntropy(text).value;
    const lineCount = text.split('\n').length;

    // Fold if high entropy AND longer code block
    return entropy > 5.5 && lineCount >= minLines;
  }

  /**
   * Get entropy buckets for visualization
   * Divides blocks into 5 buckets based on entropy value
   */
  public bucketizeByEntropy(blocks: string[]): Map<'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH', string[]> {
    const buckets = new Map<'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH', string[]>([
      ['VERY_LOW', []],
      ['LOW', []],
      ['MEDIUM', []],
      ['HIGH', []],
      ['VERY_HIGH', []]
    ]);

    for (const block of blocks) {
      const entropy = this.calculateEntropy(block).value;

      if (entropy < 3) {
        buckets.get('VERY_LOW')!.push(block);
      } else if (entropy < 5) {
        buckets.get('LOW')!.push(block);
      } else if (entropy < 6) {
        buckets.get('MEDIUM')!.push(block);
      } else if (entropy < 7) {
        buckets.get('HIGH')!.push(block);
      } else {
        buckets.get('VERY_HIGH')!.push(block);
      }
    }

    return buckets;
  }
}
