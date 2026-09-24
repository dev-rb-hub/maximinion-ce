/**
 * Phase 1: THE REFINER - PII/Secret Sanitizer Module
 * Removes sensitive data (API keys, secrets, PII) from code
 */

import {
  SanitizedText,
  ScrubbedItem,
  SecretType,
  RegexPattern,
  SanitizationStats,
  RefinerConfig
} from './types';
import { SECRET_REGEX_PATTERNS } from '../../utils/regex-patterns';

export class Sanitizer {
  private regexPatterns: Map<string, RegExp>;
  private scrubHistory: ScrubbedItem[] = [];

  constructor(config?: RefinerConfig) {
    this.regexPatterns = this.compilePatterns(config?.customRegexPatterns);
  }

  /**
   * Compile regex patterns from configuration
   */
  private compilePatterns(customPatterns?: Record<string, any>): Map<string, RegExp> {
    const patterns = new Map<string, RegExp>();

    // Add default patterns
    for (const [key, patternConfig] of Object.entries(SECRET_REGEX_PATTERNS)) {
      try {
        const config = patternConfig as any;
        patterns.set(key, new RegExp(config.pattern, 'gi'));
      } catch (e) {
        console.warn(`Failed to compile pattern ${key}:`, e);
      }
    }

    // Add custom patterns
    if (customPatterns) {
      for (const [key, config] of Object.entries(customPatterns)) {
        try {
          const patternObj = config as RegexPattern;
          patterns.set(key, new RegExp(patternObj.pattern, 'gi'));
        } catch (e) {
          console.warn(`Failed to compile custom pattern ${key}:`, e);
        }
      }
    }

    return patterns;
  }

  /**
   * Main sanitization method
   * Removes all detected secrets and returns sanitized text + audit log
   */
  public sanitize(text: string): SanitizedText {
    if (!text || text.length === 0) {
      return {
        text: '',
        scrubbed: [],
        originalLength: 0,
        sanitizedLength: 0
      };
    }

    const originalLength = text.length;
    this.scrubHistory = [];
    let sanitizedText = text;

    // Apply all regex patterns in order of confidence (high to low)
    const sortedPatterns = this.getSortedPatterns();
    for (const [key, regex] of sortedPatterns) {
      sanitizedText = this.applyPattern(sanitizedText, regex, key);
    }

    return {
      text: sanitizedText,
      scrubbed: this.scrubHistory,
      originalLength,
      sanitizedLength: sanitizedText.length
    };
  }

  /**
   * Apply a single regex pattern to text
   */
  private applyPattern(text: string, regex: RegExp, patternName: string): string {
    const patternConfig = SECRET_REGEX_PATTERNS[patternName as keyof typeof SECRET_REGEX_PATTERNS];
    if (!patternConfig) return text;

    let result = text;
    let match;

    // Reset lastIndex for global regex
    regex.lastIndex = 0;

    while ((match = regex.exec(text)) !== null) {
      const matched = match[0];
      const location = match.index;
      const replacement = `[REDACTED_${patternConfig.type}]`;

      // Record scrubbed item
      this.scrubHistory.push({
        type: patternConfig.type,
        pattern: patternName,
        location,
        replacement
      });

      // Replace in result
      result = result.replace(matched, replacement);
    }

    return result;
  }

  /**
   * Get patterns sorted by confidence (high to low)
   */
  private getSortedPatterns(): Array<[string, RegExp]> {
    const entries = Array.from(this.regexPatterns.entries());
    return entries.sort((a, b) => {
      const configA = SECRET_REGEX_PATTERNS[a[0] as keyof typeof SECRET_REGEX_PATTERNS];
      const configB = SECRET_REGEX_PATTERNS[b[0] as keyof typeof SECRET_REGEX_PATTERNS];
      const confA = configA?.confidence ?? 0;
      const confB = configB?.confidence ?? 0;
      return confB - confA; // Descending order
    });
  }

  /**
   * Get sanitization statistics
   */
  public getStats(): SanitizationStats {
    const byType: Record<SecretType, number> = {
      API_KEY: 0,
      AWS_KEY: 0,
      AZURE_KEY: 0,
      PRIVATE_KEY: 0,
      PASSWORD: 0,
      TOKEN: 0,
      EMAIL: 0,
      SSN: 0,
      CREDIT_CARD: 0,
      ENV_VAR: 0,
      GENERIC_SECRET: 0,
      UNKNOWN: 0
    };

    for (const item of this.scrubHistory) {
      byType[item.type]++;
    }

    return {
      totalScrubbed: this.scrubHistory.length,
      byType,
      entropyReduction: 0 // Calculated elsewhere
    };
  }

  /**
   * Reset scrub history
   */
  public clearHistory(): void {
    this.scrubHistory = [];
  }

  /**
   * Get all scrubbed items from last sanitization
   */
  public getScrubHistory(): ScrubbedItem[] {
    return [...this.scrubHistory];
  }

  /**
   * Add a custom pattern
   */
  public addPattern(name: string, pattern: string, _type?: SecretType, _confidence?: number): void {
    try {
      this.regexPatterns.set(name, new RegExp(pattern, 'gi'));
    } catch (e) {
      throw new Error(`Invalid regex pattern: ${e}`);
    }
  }

  /**
   * Remove a pattern by name
   */
  public removePattern(name: string): void {
    this.regexPatterns.delete(name);
  }

  /**
   * Check if text contains any secrets (without full sanitization)
   */
  public hasSecrets(text: string): boolean {
    for (const [, regex] of this.regexPatterns) {
      regex.lastIndex = 0;
      if (regex.test(text)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get all detected secrets without removing them
   */
  public detectSecrets(text: string): ScrubbedItem[] {
    const detected: ScrubbedItem[] = [];
    const sortedPatterns = this.getSortedPatterns();

    for (const [key, regex] of sortedPatterns) {
      const patternConfig = SECRET_REGEX_PATTERNS[key as keyof typeof SECRET_REGEX_PATTERNS];
      if (!patternConfig) continue;

      regex.lastIndex = 0;
      let match;

      while ((match = regex.exec(text)) !== null) {
        detected.push({
          type: patternConfig.type,
          pattern: key,
          location: match.index,
          replacement: `[REDACTED_${patternConfig.type}]`
        });
      }
    }

    return detected;
  }
}
