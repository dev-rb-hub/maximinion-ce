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
}

/** Must match the defaults in package.json; a manifest test checks this. */
export const USER_ONLY_DEFAULTS: Record<UserOnlySetting, boolean | number> = {
  'secretScrubbing.enabled': true,
  'secretDiagnostics.enabled': true,
  'secretDiagnostics.minConfidence': 0.75,
};

/** Workspace and folder values for protection settings, which MaxiMinion ignores. */
export function findIgnoredOverrides(config: vscode.WorkspaceConfiguration): IgnoredOverride[] {
  const ignored: IgnoredOverride[] = [];
  for (const key of USER_ONLY_SETTINGS) {
    const inspected = config.inspect<boolean | number>(key);
    const effective = userSetting(config, key, USER_ONLY_DEFAULTS[key]);
    for (const attempted of [inspected?.workspaceValue, inspected?.workspaceFolderValue]) {
      if (attempted === undefined || attempted === effective) continue;
      const weakens =
        typeof effective === 'number' ? typeof attempted === 'number' && attempted > effective : attempted === false;
      ignored.push({ key, attempted, effective, weakens });
    }
  }
  return ignored;
}
