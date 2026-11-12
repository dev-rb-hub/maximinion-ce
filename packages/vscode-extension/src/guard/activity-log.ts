import * as vscode from 'vscode';

export type ActivityEvent =
  | {
      kind: 'clipboard';
      command: string;
      sources: string[];
      redacted: number;
      scrubbing: boolean;
      tokens: number;
      hiddenUnicode: number;
    }
  | {
      kind: 'local-model';
      endpoint: string;
      model: string;
      source: string;
      tokens: number;
      /** Omitted when no workspace code is sent. */
      scrubbing?: boolean;
      /** Set when the user allowed a remote (cloud) model: where Ollama forwards the request. */
      remote?: { host?: string };
    }
  | { kind: 'preview'; command: string; source: string; redacted: number; scrubbing: boolean }
  | { kind: 'declined'; command: string; sources: string[]; reason: string }
  | { kind: 'override-ignored'; settings: string[] };

const SOURCE_LIMIT = 20;

function listSources(sources: string[]): string {
  const shown = sources.slice(0, SOURCE_LIMIT).join(', ');
  return sources.length > SOURCE_LIMIT ? `${shown}, +${sources.length - SOURCE_LIMIT} more` : shown;
}

/** One line per event. Records paths and counts only, never file content. */
export function formatActivity(event: ActivityEvent): string {
  const scrubbing = (on: boolean) => `secret redaction ${on ? 'on' : 'OFF'}`;
  switch (event.kind) {
    case 'clipboard':
      return (
        `Copied to clipboard (${event.command}): ${event.sources.length} source(s) [${listSources(event.sources)}], ` +
        `${event.redacted} redacted, ${scrubbing(event.scrubbing)}, ~${event.tokens} tokens` +
        (event.hiddenUnicode > 0 ? `, ${event.hiddenUnicode} hidden Unicode character(s)` : '')
      );
    case 'local-model':
      return (
        (event.remote
          ? `Sent to REMOTE model ${event.model} via ${event.endpoint}, forwarded to ${event.remote.host ?? 'another host'}: `
          : `Sent to local model ${event.model} at ${event.endpoint}: `) +
        `${event.source}, ~${event.tokens} tokens` +
        (event.scrubbing === undefined ? '' : `, ${scrubbing(event.scrubbing)}`)
      );
    case 'preview':
      return `Opened local preview (${event.command}): ${event.source}, ${event.redacted} redacted, ${scrubbing(event.scrubbing)}`;
    case 'declined':
      return `Not copied (${event.command}): [${listSources(event.sources)}], ${event.reason}`;
    case 'override-ignored':
      return `Ignored workspace setting(s) that would lower protection: ${event.settings.join(', ')}`;
  }
}

/**
 * Local record of what MaxiMinion read and sent. Uses a log output channel, so VS Code
 * timestamps each line and keeps the logs of recent sessions on disk. Nothing leaves the machine.
 */
export class ActivityLog implements vscode.Disposable {
  public static readonly channelName = 'MaxiMinion Activity';
  private readonly channel = vscode.window.createOutputChannel(ActivityLog.channelName, { log: true });

  public record(event: ActivityEvent): void {
    this.channel.info(formatActivity(event));
  }

  public show(): void {
    this.channel.show(true);
  }

  public dispose(): void {
    this.channel.dispose();
  }
}
