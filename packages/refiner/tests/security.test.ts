/**
 * Security guardrails for the Refiner (see docs/SECURITY_MODEL.md).
 */

import * as fs from 'fs';
import * as path from 'path';
import { Sanitizer, SemanticFolder } from '../src/core/refiner';
import { SECRET_REGEX_PATTERNS } from '../src/utils/regex-patterns';

describe('Sanitizer custom patterns', () => {
  test('patterns from configuration are applied with their type and confidence', () => {
    const sanitizer = new Sanitizer({
      customRegexPatterns: {
        INTERNAL_KEY: { pattern: 'ACME_[A-Z0-9]{12}', type: 'API_KEY', confidence: 0.93, description: 'ACME key' },
      },
    });

    const result = sanitizer.sanitize('const key = "ACME_ABCDEF123456";');

    expect(result.text).toBe('const key = "[REDACTED_API_KEY]";');
    expect(result.scrubbed).toEqual([
      expect.objectContaining({ pattern: 'INTERNAL_KEY', type: 'API_KEY', confidence: 0.93 }),
    ]);
  });

  test('addPattern keeps its type and confidence, and is used by every detection method', () => {
    const sanitizer = new Sanitizer();
    sanitizer.addPattern('TICKET_TOKEN', 'tkt_[a-f0-9]{16}', 'TOKEN', 0.91);
    const text = 'auth(tkt_0123456789abcdef)';

    expect(sanitizer.hasSecrets(text)).toBe(true);
    expect(sanitizer.detectSecrets(text)).toEqual([
      expect.objectContaining({ pattern: 'TICKET_TOKEN', type: 'TOKEN', confidence: 0.91, location: 5, length: 20 }),
    ]);
    expect(sanitizer.sanitize(text).text).toBe('auth([REDACTED_TOKEN])');
  });

  test('custom patterns without a type or confidence get safe defaults', () => {
    const sanitizer = new Sanitizer();
    sanitizer.addPattern('LEGACY', 'legacy-[0-9]{6}');

    const [item] = sanitizer.detectSecrets('id legacy-123456');

    expect(item).toMatchObject({ type: 'GENERIC_SECRET', confidence: 0.8 });
  });

  test('a pattern that can match an empty string does not hang', () => {
    const sanitizer = new Sanitizer({
      customRegexPatterns: { OPTIONAL: { pattern: 'z*', type: 'UNKNOWN', confidence: 0.5, description: '' } },
    });

    expect(sanitizer.sanitize('abc zz def').text).toBe('abc [REDACTED_UNKNOWN] def');
  });

  test('empty or invalid custom patterns are rejected', () => {
    const sanitizer = new Sanitizer();

    expect(() => sanitizer.addPattern('EMPTY', '')).toThrow('pattern is empty');
    expect(() => sanitizer.addPattern('BROKEN', '([')).toThrow('Invalid regex pattern');
  });
});

describe('Secret patterns resist ReDoS', () => {
  // Secret patterns run on untrusted file content, including in inline diagnostics on every edit.
  const n = 50_000;
  const adversarial: Record<string, string> = {
    letters: 'a'.repeat(n),
    digits: '1'.repeat(n),
    digitsAndSpaces: '1 '.repeat(n / 2) + 'x',
    digitsAndDashes: '1-'.repeat(n / 2) + '_',
    spacesAfterDigit: '1' + ' '.repeat(n) + 'x',
    dottedLabels: 'a@' + 'a.'.repeat(n / 2),
    atSigns: '@a'.repeat(n / 2),
    jwtLike: 'eyJ' + 'a'.repeat(n / 2) + '.eyJ' + 'a'.repeat(n / 2),
    dbUserColons: 'mysql://' + 'a:'.repeat(n / 2),
    dbNoAt: 'mysql://a:' + 'b'.repeat(n),
    dbManyPrefixes: 'sql://a:'.repeat(n / 8),
    dbManyPrefixesWithSlashes: 'mysql://u:p/'.repeat(n / 12),
    emailManyAts: 'a@b'.repeat(n / 3),
    assignmentSpaces: 'api_key:' + ' '.repeat(n) + '!',
    passwordEquals: 'password=' + '='.repeat(n),
    tokenDots: 'token=' + 'a.'.repeat(n / 2),
    privateKeyHeader: '-----BEGIN ' + 'A '.repeat(n / 2),
    base64Blob: 'data:image/png;base64,' + 'QUJD'.repeat(n / 4),
  };

  test.each(Object.keys(SECRET_REGEX_PATTERNS))('%s stays fast on adversarial input', (name) => {
    const { pattern } = SECRET_REGEX_PATTERNS[name as keyof typeof SECRET_REGEX_PATTERNS];
    for (const [input, text] of Object.entries(adversarial)) {
      const regex = new RegExp(pattern, 'gi');
      const start = Date.now();
      let match: RegExpExecArray | null;
      while ((match = regex.exec(text)) !== null) {
        if (match[0].length === 0) regex.lastIndex++;
      }
      expect({ input, slow: Date.now() - start > 250 }).toEqual({ input, slow: false });
    }
  });

  test('the full sanitizer handles a large blob quickly', () => {
    const start = Date.now();
    new Sanitizer().sanitize(Object.values(adversarial).join('\n'));
    expect(Date.now() - start).toBeLessThan(1500);
  });

  test('redaction is linear in the number of matches', () => {
    const manyEmails = Array.from({ length: 20_000 }, (_, i) => `user${i}@example.com`).join(' ');
    const start = Date.now();

    const result = new Sanitizer().sanitize(manyEmails);

    expect(result.scrubbed).toHaveLength(20_000);
    expect(result.text).not.toContain('@example.com');
    expect(Date.now() - start).toBeLessThan(1000);
  });

  test('each match is replaced where it was found, not at an earlier copy of the same text', () => {
    const sanitizer = new Sanitizer();
    sanitizer.addPattern('ASSIGNED', '(?<=key=)[a-z]{8}', 'API_KEY', 0.9);

    const result = sanitizer.sanitize('label abcdefgh; key=abcdefgh');

    expect(result.text).toBe('label abcdefgh; key=[REDACTED_API_KEY]');
    expect(result.scrubbed[0]).toMatchObject({ pattern: 'ASSIGNED', location: 20 });
  });

  test('the bounded patterns still find real secrets', () => {
    const sanitizer = new Sanitizer();
    const patternsIn = (text: string) => sanitizer.detectSecrets(text).map((item) => item.pattern);

    expect(patternsIn('mail jane.doe+ai@example.co.uk')).toContain('EMAIL');
    for (const url of [
      'mongodb://admin:p%40ss/w0rd@db.local:27017/app',
      // Azure Database usernames take the form user@server.
      'mysql://admin@myserver:S3cret!@myserver.mysql.database.azure.com/db',
      'postgres://svc/reader:pw@db.internal/app',
    ]) {
      expect({ url, patterns: patternsIn(url) }).toEqual({ url, patterns: expect.arrayContaining(['DB_CONNECTION']) });
    }
  });
});

describe('Semantic folding network guardrails', () => {
  const realFetch = global.fetch;

  afterEach(() => {
    global.fetch = realFetch;
    jest.restoreAllMocks();
  });

  test('requests to Ollama refuse to follow redirects', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const inits: RequestInit[] = [];
    global.fetch = jest.fn(async (_url: unknown, init?: RequestInit) => {
      inits.push(init ?? {});
      return { ok: true, status: 200, json: async () => ({ models: [], response: 'ok' }) } as Response;
    }) as typeof fetch;

    await new SemanticFolder({ ollamaModel: 'phi3' }).fold('const a = 1;');

    expect(inits.length).toBeGreaterThan(0);
    for (const init of inits) expect(init.redirect).toBe('error');
  });
});

describe('Forbidden APIs', () => {
  const srcRoot = path.join(__dirname, '..', 'src');
  const files = (function walk(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      return entry.isDirectory() ? walk(full) : full.endsWith('.ts') ? [full] : [];
    });
  })(srcRoot);

  test.each([
    ['child processes', /\bchild_process\b/],
    ['eval', /\beval\s*\(/],
    ['new Function', /\bnew\s+Function\s*\(/],
    ['raw network modules', /from\s+['"](?:node:)?(?:http|https|net|tls|dgram)['"]|require\(\s*['"](?:node:)?(?:http|https|net|tls|dgram)['"]\s*\)/],
  ])('source never uses %s', (_name, pattern) => {
    const offenders = files.filter((file) => pattern.test(fs.readFileSync(file, 'utf8')));
    expect(offenders.map((file) => path.relative(srcRoot, file))).toEqual([]);
  });

  test('only the semantic folder makes network requests', () => {
    const callers = files.filter((file) => /\bfetch\s*\(/.test(fs.readFileSync(file, 'utf8')));
    expect(callers.map((file) => path.relative(srcRoot, file).replace(/\\/g, '/'))).toEqual([
      'core/refiner/semantic-folder.ts',
    ]);
  });
});
