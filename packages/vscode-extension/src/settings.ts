import type * as vscode from 'vscode';

/**
 * Settings that weaken protection when changed. A repository's `.vscode/settings.json`
 * (or a dev container's remote settings) must not be able to turn redaction off, so these
 * are declared with `"scope": "application"` and read from user settings only.
 */
export const USER_ONLY_SETTINGS = [
  'secretScrubbing.enabled',
  'secretDiagnostics.enabled',
  'secretDiagnostics.minConfidence',
  'semanticFolding.allowRemoteModels',
] as const;

export type UserOnlySetting = (typeof USER_ONLY_SETTINGS)[number];

/**
 * Reads a protection setting from user settings, ignoring workspace, folder, and
 * language-specific values even if the host does not enforce the declared scope.
 */
export function userSetting<T>(config: vscode.WorkspaceConfiguration, key: UserOnlySetting, fallback: T): T {
  const inspected = config.inspect<T>(key);
  return inspected?.globalValue ?? inspected?.defaultValue ?? fallback;
}

export interface IgnoredOverride {
  key: UserOnlySetting;
  /** The value the workspace (or a workspace folder) tried to set. */
  attempted: unknown;
  /** The value MaxiMinion actually uses, from user settings or the default. */
  effective: unknown;
  /** True when the attempted value would have lowered protection. */
  weakens: boolean;
  /** Where the value came from, for example `.vscode/settings.json`. */
  source: string;
}

/** Settings found in a workspace-controlled file, keyed by full setting name. */
export interface RawSettingsSource {
  source: string;
  settings: Record<string, unknown>;
}

/** Must match the defaults in package.json; a manifest test checks this. The defaults are the protective values. */
export const USER_ONLY_DEFAULTS: Record<UserOnlySetting, boolean | number> = {
  'secretScrubbing.enabled': true,
  'secretDiagnostics.enabled': true,
  'secretDiagnostics.minConfidence': 0.75,
  'semanticFolding.allowRemoteModels': false,
};

/**
 * Workspace-controlled values for protection settings, which MaxiMinion ignores.
 *
 * VS Code drops application-scoped keys from workspace, folder and dev container settings before
 * extensions can inspect them, so `sources` (read from those files directly) is how the attempt is
 * seen in VS Code itself. The `inspect()` values cover hosts that do not filter by scope.
 */
export function findIgnoredOverrides(
  config: vscode.WorkspaceConfiguration,
  sources: RawSettingsSource[] = [],
): IgnoredOverride[] {
  const ignored: IgnoredOverride[] = [];
  const seen = new Set<string>();
  for (const key of USER_ONLY_SETTINGS) {
    const inspected = config.inspect<boolean | number>(key);
    const effective = userSetting(config, key, USER_ONLY_DEFAULTS[key]);
    const attempts: Array<[unknown, string]> = [
      [inspected?.workspaceValue, 'workspace settings'],
      [inspected?.workspaceFolderValue, 'folder settings'],
      ...sources.map((source): [unknown, string] => [source.settings[`maximinion.${key}`], source.source]),
    ];
    for (const [attempted, source] of attempts) {
      if (attempted === undefined || attempted === effective) continue;
      // The same value seen through inspect() and in the file is reported once.
      const id = `${key}=${JSON.stringify(attempted)}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const weakens =
        typeof effective === 'number'
          ? typeof attempted === 'number' && attempted > effective
          : typeof attempted === 'boolean' && attempted !== USER_ONLY_DEFAULTS[key];
      ignored.push({ key, attempted, effective, weakens, source });
    }
  }
  return ignored;
}
