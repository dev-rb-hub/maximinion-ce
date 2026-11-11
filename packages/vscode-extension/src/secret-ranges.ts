import { Sanitizer } from '@maximinion/refiner';

export interface SecretRange {
  start: number;
  end: number;
  type: string;
  replacement: string;
}

// Environment variable references (process.env.X) name a secret but do not contain one.
const NON_VALUE_TYPES = new Set(['ENV_VAR']);

// Patterns that match `key = value`; only the value should be flagged and redacted in source.
const ASSIGNMENT_PATTERNS = new Set(['AWS_SECRET', 'API_KEY', 'PASSWORD', 'TOKEN', 'GENERIC_SECRET']);
const ASSIGNMENT_PREFIX = /^[^:=]*[:=]\s*["']?/;

export const PII_TYPES = new Set(['EMAIL', 'SSN', 'CREDIT_CARD']);

/**
 * Returns non-overlapping secret ranges at or above the confidence threshold.
 * Detections arrive ordered by confidence, so overlaps keep the most confident match.
 */
export function findSecretRanges(text: string, minConfidence: number): SecretRange[] {
  const ranges: SecretRange[] = [];

  for (const item of new Sanitizer().detectSecrets(text)) {
    const length = item.length ?? 0;
    if (length <= 0 || NON_VALUE_TYPES.has(item.type) || (item.confidence ?? 0) < minConfidence) {
      continue;
    }

    let start = item.location;
    let end = start + length;
    if (ASSIGNMENT_PATTERNS.has(item.pattern)) {
      const prefix = ASSIGNMENT_PREFIX.exec(text.slice(start, end));
      if (prefix && prefix[0].length < length) {
        start += prefix[0].length;
      }
      while (end > start + 1 && `"'\`,;`.includes(text[end - 1])) {
        end--;
      }
    }
    if (ranges.some((range) => start < range.end && end > range.start)) {
      continue;
    }
    ranges.push({ start, end, type: item.type, replacement: item.replacement });
  }

  return ranges.sort((a, b) => a.start - b.start);
}
