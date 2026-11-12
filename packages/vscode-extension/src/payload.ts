import { Sanitizer, estimateTokenCountByChars } from '@maximinion/refiner';

export interface PayloadSource {
  label: string;
  language: string;
  text: string;
}

export interface PayloadOptions {
  scrubSecrets: boolean;
  compactWhitespace: boolean;
}

export interface PayloadResult {
  text: string;
  sources: number;
  redacted: number;
  originalTokens: number;
  payloadTokens: number;
}

// ~4 characters per token is a common, model-agnostic approximation for code.
const CHARS_PER_TOKEN = 4;

export function estimateTokens(text: string): number {
  return estimateTokenCountByChars(text, CHARS_PER_TOKEN);
}

export function formatTokens(count: number): string {
  return count.toLocaleString('en-US');
}

// Trailing spaces are significant in Markdown (hard line breaks), so only blank-line runs are collapsed there.
export function compactWhitespace(text: string, language: string): string {
  let result = text.replace(/\r\n/g, '\n');
  if (language !== 'markdown') {
    // The lookbehind starts each match at the beginning of a whitespace run, keeping this linear.
    result = result.replace(/(?<![ \t])[ \t]+$/gm, '');
  }
  // Leading indentation is preserved so partial selections of indented code stay valid.
  return result.replace(/\n{3,}/g, '\n\n').replace(/^(?:[ \t]*\n)+/, '').trimEnd();
}

function fenceFor(text: string): string {
  const longestRun = Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  return '`'.repeat(Math.max(3, longestRun + 1));
}

export function buildAiPayload(sources: PayloadSource[], options: PayloadOptions): PayloadResult {
  let redacted = 0;
  let originalTokens = 0;

  const blocks = sources.map((source) => {
    originalTokens += estimateTokens(source.text);

    let body = source.text;
    if (options.scrubSecrets) {
      const sanitized = new Sanitizer().sanitize(body);
      body = sanitized.text;
      redacted += sanitized.scrubbed.length;
    }
    if (options.compactWhitespace) {
      body = compactWhitespace(body, source.language);
    }

    const fence = fenceFor(body);
    return `### ${source.label}\n\n${fence}${source.language}\n${body}\n${fence}`;
  });

  const text = blocks.join('\n\n');
  return {
    text,
    sources: sources.length,
    redacted,
    originalTokens,
    payloadTokens: estimateTokens(text),
  };
}
