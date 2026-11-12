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

/** Type used for custom patterns that do not specify one. */
export const DEFAULT_CUSTOM_PATTERN_TYPE: SecretType = 'GENERIC_SECRET';
/** Confidence used for custom patterns that do not specify one. */
export const DEFAULT_CUSTOM_PATTERN_CONFIDENCE = 0.8;

interface CompiledPattern {
  regex: RegExp;
  type: SecretType;
  confidence: number;
}

function clampConfidence(value: number | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return DEFAULT_CUSTOM_PATTERN_CONFIDENCE;
  return Math.min(Math.max(value, 0), 1);
}

export class Sanitizer {
  private regexPatterns: Map<string, CompiledPattern>;
  private scrubHistory: ScrubbedItem[] = [];

  constructor(config?: RefinerConfig) {
    this.regexPatterns = this.compilePatterns(config?.customRegexPatterns);
  }

  /**
   * Compile built-in patterns plus any custom patterns from configuration.
   * A custom pattern with the same name as a built-in one replaces it.
   */
  private compilePatterns(customPatterns?: Record<string, Partial<RegexPattern>>): Map<string, CompiledPattern> {
    const patterns = new Map<string, CompiledPattern>();

    for (const [key, config] of Object.entries(SECRET_REGEX_PATTERNS)) {
      try {
        patterns.set(key, { regex: new RegExp(config.pattern, 'gi'), type: config.type, confidence: config.confidence });
      } catch (e) {
        console.warn(`Failed to compile pattern ${key}:`, e);
      }
    }

    if (customPatterns) {
      for (const [key, config] of Object.entries(customPatterns)) {
        if (!config.pattern) {
          console.warn(`Skipping custom pattern ${key}: no pattern given`);
          continue;
        }
        try {
          patterns.set(key, {
            regex: new RegExp(config.pattern, 'gi'),
            type: config.type ?? DEFAULT_CUSTOM_PATTERN_TYPE,
            confidence: clampConfidence(config.confidence),
          });
        } catch (e) {
          console.warn(`Failed to compile custom pattern ${key}:`, e);
        }
      }
    }

    return patterns;
  }

  /**
   * Yields every non-empty match. Empty matches are skipped and the search moves on,
   * so a pattern that can match an empty string cannot loop forever.
   */
  private *matches(regex: RegExp, text: string): Generator<RegExpExecArray> {
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      if (match[0].length === 0) {
        regex.lastIndex++;
        continue;
      }
      yield match;
    }
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
    for (const [key, compiled] of sortedPatterns) {
      sanitizedText = this.applyPattern(sanitizedText, compiled, key);
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
  private applyPattern(text: string, compiled: CompiledPattern, patternName: string): string {
    const replacement = `[REDACTED_${compiled.type}]`;
    compiled.regex.lastIndex = 0;

    // One positional pass: each match is replaced where it was found, in linear time.
    return text.replace(compiled.regex, (matched: string, ...args: unknown[]) => {
      if (matched.length === 0) return matched;
      this.scrubHistory.push({
        type: compiled.type,
        pattern: patternName,
        location: args.find((arg): arg is number => typeof arg === 'number') ?? 0,
        length: matched.length,
        confidence: compiled.confidence,
        replacement
      });
      return replacement;
    });
  }

  /**
   * Get patterns sorted by confidence (high to low)
   */
  private getSortedPatterns(): Array<[string, CompiledPattern]> {
    return Array.from(this.regexPatterns.entries()).sort((a, b) => b[1].confidence - a[1].confidence);
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
   * Add a custom pattern. It is used by sanitize(), detectSecrets() and hasSecrets().
   * A pattern with the same name as an existing one replaces it.
   */
  public addPattern(
    name: string,
    pattern: string,
    type: SecretType = DEFAULT_CUSTOM_PATTERN_TYPE,
    confidence: number = DEFAULT_CUSTOM_PATTERN_CONFIDENCE
  ): void {
    if (!pattern) {
      throw new Error('Invalid regex pattern: pattern is empty');
    }
    try {
      this.regexPatterns.set(name, { regex: new RegExp(pattern, 'gi'), type, confidence: clampConfidence(confidence) });
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
    for (const [, compiled] of this.regexPatterns) {
      if (!this.matches(compiled.regex, text).next().done) {
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

    for (const [key, compiled] of this.getSortedPatterns()) {
      for (const match of this.matches(compiled.regex, text)) {
        detected.push({
          type: compiled.type,
          pattern: key,
          location: match.index,
          length: match[0].length,
          confidence: compiled.confidence,
          replacement: `[REDACTED_${compiled.type}]`
        });
      }
    }

    return detected;
  }
}
