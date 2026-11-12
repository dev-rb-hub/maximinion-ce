import { buildAiPayload, compactWhitespace, estimateTokens } from '../src/payload';
import { findSecretRanges } from '../src/secret-ranges';

describe('buildAiPayload', () => {
  test('uses a fence longer than any backtick run in the content', () => {
    const result = buildAiPayload([{ label: 'README.md', language: 'markdown', text: '```js\nx\n```' }], {
      scrubSecrets: false,
      compactWhitespace: false,
    });

    expect(result.text).toBe('### README.md\n\n````markdown\n```js\nx\n```\n````');
  });

  test('counts redactions and token estimates across sources', () => {
    const result = buildAiPayload(
      [
        { label: 'a.ts', language: 'typescript', text: 'const k = "AKIA3Z5Z5Z5Z5Z5Z5Z5Z";' },
        { label: 'b.ts', language: 'typescript', text: 'const b = 2;' },
      ],
      { scrubSecrets: true, compactWhitespace: true },
    );

    expect(result.sources).toBe(2);
    expect(result.redacted).toBe(1);
    expect(result.originalTokens).toBe(estimateTokens('const k = "AKIA3Z5Z5Z5Z5Z5Z5Z5Z";') + estimateTokens('const b = 2;'));
    expect(result.payloadTokens).toBe(estimateTokens(result.text));
  });
});

describe('compactWhitespace', () => {
  test('trims trailing spaces and collapses blank-line runs', () => {
    expect(compactWhitespace('a  \r\n\r\n\r\n\r\nb\t\n', 'typescript')).toBe('a\n\nb');
  });

  test('keeps Markdown hard line breaks', () => {
    expect(compactWhitespace('line one  \nline two', 'markdown')).toBe('line one  \nline two');
  });

  test('preserves first-line indentation of partial selections', () => {
    expect(compactWhitespace('\n\n    if x:\n        y()\n\n', 'python')).toBe('    if x:\n        y()');
  });

  test('stays fast on long runs of whitespace that do not end a line', () => {
    const text = 'a' + ' '.repeat(100_000) + 'b\n' + 'c' + '\t'.repeat(100_000) + 'd';
    const start = Date.now();

    expect(compactWhitespace(text, 'typescript')).toBe(text);
    expect(Date.now() - start).toBeLessThan(250);
  });
});

describe('findSecretRanges', () => {
  test('narrows assignment matches to the value', () => {
    const text = 'password = "hunter2hunter2"';
    const [range] = findSecretRanges(text, 0.5);

    expect(text.slice(range.start, range.end)).toBe('hunter2hunter2');
    expect(range.type).toBe('PASSWORD');
  });

  test('keeps the most confident of overlapping detections', () => {
    const text = 'apiKey = "sk-proj-abcdef1234567890abcdef1234567890"';
    const ranges = findSecretRanges(text, 0.5);

    expect(ranges).toHaveLength(1);
    expect(text.slice(ranges[0].start, ranges[0].end)).toBe('sk-proj-abcdef1234567890abcdef1234567890');
  });

  test('respects the confidence threshold', () => {
    expect(findSecretRanges('password = "hunter2hunter2"', 0.75)).toEqual([]);
  });
});
