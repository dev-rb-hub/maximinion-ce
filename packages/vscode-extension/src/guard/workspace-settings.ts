import { parse, ParseError } from 'jsonc-parser';
import * as vscode from 'vscode';
import { RawSettingsSource } from '../settings';

const MAX_SETTINGS_BYTES = 1024 * 1024;

/** Workspace-controlled files that can carry VS Code settings. */
export const WORKSPACE_SETTINGS_FILES = ['.vscode/settings.json', '.devcontainer/devcontainer.json', '.devcontainer.json'];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Turns nested (`{"maximinion": {"secretScrubbing": {"enabled": false}}}`) and dotted keys into full setting names. */
export function flattenSettings(value: unknown, prefix = '', out: Record<string, unknown> = {}): Record<string, unknown> {
  if (!isPlainObject(value)) return out;
  for (const [key, child] of Object.entries(value)) {
    // Language-specific blocks such as "[typescript]" cannot hold application-scoped settings.
    if (!prefix && key.startsWith('[')) continue;
    const name = prefix ? `${prefix}.${key}` : key;
    if (isPlainObject(child)) flattenSettings(child, name, out);
    else out[name] = child;
  }
  return out;
}

/** Extracts the settings a workspace file tries to apply. Returns undefined if the file is not usable JSON(C). */
export function settingsFromFile(source: string, text: string): RawSettingsSource | undefined {
  const errors: ParseError[] = [];
  const data: unknown = parse(text, errors, { allowTrailingComma: true });
  if (!isPlainObject(data)) return undefined;

  let settings: unknown = data;
  if (source.endsWith('devcontainer.json')) {
    const customizations = isPlainObject(data.customizations) ? data.customizations : {};
    const vscodeCustomizations = isPlainObject(customizations.vscode) ? customizations.vscode : {};
    settings = { ...(isPlainObject(data.settings) ? data.settings : {}), ...(isPlainObject(vscodeCustomizations.settings) ? vscodeCustomizations.settings : {}) };
  } else if (source.endsWith('.code-workspace')) {
    settings = data.settings;
  }
  return { source, settings: flattenSettings(settings) };
}

async function readText(uri: vscode.Uri): Promise<string | undefined> {
  try {
    const stat = await vscode.workspace.fs.stat(uri);
    if (stat.size > MAX_SETTINGS_BYTES) return undefined;
    return new TextDecoder('utf-8').decode(await vscode.workspace.fs.readFile(uri));
  } catch {
    return undefined;
  }
}

/**
 * Reads the settings files a workspace controls, without applying them. Used only to tell the user
 * when those files try to lower protection; the values themselves are never used.
 */
export async function readWorkspaceSettingSources(): Promise<RawSettingsSource[]> {
  const folders = vscode.workspace.workspaceFolders ?? [];
  const targets: Array<{ uri: vscode.Uri; source: string }> = folders.flatMap((folder) =>
    WORKSPACE_SETTINGS_FILES.map((file) => ({
      uri: vscode.Uri.joinPath(folder.uri, file),
      source: folders.length > 1 ? `${folder.name}/${file}` : file,
    })),
  );
  const workspaceFile = vscode.workspace.workspaceFile;
  if (workspaceFile && workspaceFile.scheme !== 'untitled') {
    targets.push({ uri: workspaceFile, source: workspaceFile.path.split('/').pop() ?? 'workspace file' });
  }

  const sources: RawSettingsSource[] = [];
  for (const { uri, source } of targets) {
    const text = await readText(uri);
    const parsed = text === undefined ? undefined : settingsFromFile(source, text);
    if (parsed) sources.push(parsed);
  }
  return sources;
}
