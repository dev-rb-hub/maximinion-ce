import { Refiner, RefinerConfig } from '@maximinion/refiner';
import * as vscode from 'vscode';
import { userSetting } from '../settings';
import { ActivityEvent, ActivityLog } from './activity-log';

/**
 * The only network endpoint MaxiMinion contacts: a local Ollama server, used for optional
 * semantic folding. It is deliberately not a setting, so a workspace cannot send code elsewhere,
 * and the Refiner refuses HTTP redirects.
 */
export const OLLAMA_ENDPOINT = 'http://localhost:11434';

/** Whether the user allowed Ollama cloud models, which forward code to another host. User settings only. */
export function remoteModelsAllowed(): boolean {
  return userSetting(vscode.workspace.getConfiguration('maximinion'), 'semanticFolding.allowRemoteModels', false);
}

/**
 * Every Refiner in the extension is created here, so it always uses the local endpoint and only
 * accepts remote (cloud) models when the user allowed them in their own settings.
 */
export function createRefiner(config: Omit<RefinerConfig, 'ollamaEndpoint' | 'allowRemoteModels'> = {}): Refiner {
  return new Refiner({ ...config, ollamaEndpoint: OLLAMA_ENDPOINT, allowRemoteModels: remoteModelsAllowed() });
}

/** The single path to the clipboard, which is where text leaves for AI tools. */
export async function copyToClipboard(
  log: ActivityLog,
  text: string,
  event: Extract<ActivityEvent, { kind: 'clipboard' }>,
): Promise<void> {
  await vscode.env.clipboard.writeText(text);
  log.record(event);
}
