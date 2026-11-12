import * as fs from 'fs';
import * as path from 'path';
import { USER_ONLY_SETTINGS } from '../src/settings';

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
});
