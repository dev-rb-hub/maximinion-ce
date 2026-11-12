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
