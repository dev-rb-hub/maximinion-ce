import * as fs from 'fs';
import * as path from 'path';
import { USER_ONLY_DEFAULTS, USER_ONLY_SETTINGS } from '../src/settings';

const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const contributes = manifest.contributes;
const source = fs.readFileSync(path.join(root, 'src', 'extension.ts'), 'utf8');

describe('extension manifest', () => {
  const declaredCommands = new Set<string>(contributes.commands.map((c: { command: string }) => c.command));
  const declaredSubmenus = new Set<string>(contributes.submenus.map((s: { id: string }) => s.id));

  test('every declared command is registered in code and vice versa', () => {
    const registered = new Set([...source.matchAll(/registerCommand\('([^']+)'/g)].map((m) => m[1]));
    expect([...declaredCommands].sort()).toEqual([...registered].sort());
  });

  test('menus only reference declared commands and submenus', () => {
    for (const [menu, items] of Object.entries<Array<{ command?: string; submenu?: string }>>(contributes.menus)) {
      for (const item of items) {
        if (item.command) expect({ menu, ref: item.command, ok: declaredCommands.has(item.command) }).toMatchObject({ ok: true });
        if (item.submenu) expect({ menu, ref: item.submenu, ok: declaredSubmenus.has(item.submenu) }).toMatchObject({ ok: true });
      }
    }
  });

  test('walkthrough media files exist and the walkthrough id matches the help command', () => {
    const [walkthrough] = contributes.walkthroughs;
    expect(source).toContain(`'${manifest.publisher}.${manifest.name}#${walkthrough.id}'`);
    for (const step of walkthrough.steps) {
      expect(fs.existsSync(path.join(root, step.media.markdown))).toBe(true);
    }
  });

  test('every setting has an explanation and settings read in code are declared', () => {
    const properties = Object.assign({}, ...contributes.configuration.map((c: { properties: object }) => c.properties));
    for (const [key, schema] of Object.entries<Record<string, unknown>>(properties)) {
      expect({ key, explained: Boolean(schema.markdownDescription || schema.description) }).toMatchObject({ explained: true });
    }
    const read = new Set(
      [...source.matchAll(/get<\w+>\('([^']+)'|userSetting\(\w+(?:\(\))?, '([^']+)'/g)].map(
        (m) => `maximinion.${m[1] ?? m[2]}`,
      ),
    );
    for (const key of read) {
      expect({ key, declared: key in properties }).toMatchObject({ declared: true });
    }
  });

  test('settings that weaken protection can only be set in user settings', () => {
    const properties = Object.assign({}, ...contributes.configuration.map((c: { properties: object }) => c.properties));
    for (const key of USER_ONLY_SETTINGS) {
      expect({ key, scope: properties[`maximinion.${key}`]?.scope }).toEqual({ key, scope: 'application' });
      expect({ key, default: USER_ONLY_DEFAULTS[key] }).toEqual({ key, default: properties[`maximinion.${key}`]?.default });
      expect(source).not.toMatch(new RegExp(`\\.get(<\\w+>)?\\('${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`));
      expect(source).toContain(`'${key}'`);
    }
  });

  test('works in untrusted workspaces with semantic folding restricted', () => {
    expect(manifest.capabilities.untrustedWorkspaces.supported).toBe('limited');
    expect(manifest.capabilities.untrustedWorkspaces.restrictedConfigurations).toContain(
      'maximinion.semanticFolding.enabled',
    );
  });

  // The VSIX ships without node_modules, so the bundle must not require files that weren't bundled.
  test('build script produces a self-contained bundle', async () => {
    const esbuild = await import('esbuild');
    const mainFields = /--main-fields=(\S+)/.exec(manifest.scripts.build)?.[1]?.split(',');
    const result = await esbuild.build({
      entryPoints: [path.join(root, 'src', 'extension.ts')],
      bundle: true,
      platform: 'node',
      external: ['vscode'],
      mainFields,
      write: false,
      logLevel: 'silent',
    });
    // esbuild renames shadowed `require` to require2, require3, ...
    const relativeRequires = result.outputFiles[0].text.match(/\brequire\d*\(\s*["']\.{1,2}\/[^"']*["']\s*\)/g) ?? [];
    expect(relativeRequires).toEqual([]);
  }, 30000);
});

describe('forbidden APIs (see docs/SECURITY_MODEL.md)', () => {
  const srcRoot = path.join(root, 'src');
  const files = (function walk(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      return entry.isDirectory() ? walk(full) : full.endsWith('.ts') ? [full] : [];
    });
  })(srcRoot);
  const usersOf = (pattern: RegExp) =>
    files
      .filter((file) => pattern.test(fs.readFileSync(file, 'utf8')))
      .map((file) => path.relative(srcRoot, file).replace(/\\/g, '/'))
      .sort();

  test.each([
    ['child processes', /\bchild_process\b/],
    ['eval', /\beval\s*\(/],
    ['new Function', /\bnew\s+Function\s*\(/],
    ['direct network requests', /\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b/],
    ['raw network modules', /['"](?:node:)?(?:http|https|net|tls|dgram|http2)['"]/],
  ])('source never uses %s', (_name, pattern) => {
    expect(usersOf(pattern)).toEqual([]);
  });

  test('the clipboard is only written through the egress module', () => {
    expect(usersOf(/clipboard\.writeText/)).toEqual(['guard/egress.ts']);
  });

  test('every Refiner (the only network client) is created by the egress module', () => {
    expect(usersOf(/new\s+Refiner\s*\(/)).toEqual(['guard/egress.ts']);
  });

  test('Node file system access is limited to the guarded workspace reader', () => {
    expect(usersOf(/from\s+['"](?:node:)?fs(?:\/promises)?['"]|require\(\s*['"](?:node:)?fs/)).toEqual([
      'guard/workspace-reader.ts',
    ]);
  });

  test('the Ollama endpoint is a loopback constant, not a setting', () => {
    const egress = fs.readFileSync(path.join(srcRoot, 'guard', 'egress.ts'), 'utf8');
    expect(egress).toMatch(/export const OLLAMA_ENDPOINT = 'http:\/\/localhost:11434';/);
    const properties = Object.assign({}, ...contributes.configuration.map((c: { properties: object }) => c.properties));
    expect(Object.keys(properties).filter((key) => /endpoint|url|host/i.test(key))).toEqual([]);
  });
});
