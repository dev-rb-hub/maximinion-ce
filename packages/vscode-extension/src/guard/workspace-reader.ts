import { promises as fs } from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { sensitiveReason } from './sensitive-paths';

export const SCAN_LIMITS = {
  /** Larger files are skipped: they are rarely useful context and slow to analyse. */
  maxFileBytes: 512 * 1024,
  /** Bytes checked for NUL characters to detect binary files (same heuristic as Git). */
  binarySniffBytes: 8000,
};

export type ScanSkipReason =
  | 'outside-workspace'
  | 'symlink'
  | 'sensitive'
  | 'too-large'
  | 'binary'
  | 'not-a-file'
  | 'unreadable';

export type ScanResult =
  | { ok: true; relativePath: string; text: string }
  | { ok: false; relativePath: string; reason: ScanSkipReason; detail?: string };

function isInside(child: string, parent: string): boolean {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

/**
 * Reads a file for automatic analysis, refusing anything a scan should never touch:
 * files outside the workspace folders (including through symlinked files or folders),
 * credential files, large files and binaries. Files the user picks explicitly do not use
 * this gate.
 */
export async function readForScan(uri: vscode.Uri): Promise<ScanResult> {
  const folder = vscode.workspace.getWorkspaceFolder(uri);
  const relativePath = vscode.workspace.asRelativePath(uri, false);
  if (!folder) return { ok: false, relativePath, reason: 'outside-workspace' };

  const sensitive = sensitiveReason(relativePath);
  if (sensitive) return { ok: false, relativePath, reason: 'sensitive', detail: sensitive };

  let stat: vscode.FileStat;
  try {
    stat = await vscode.workspace.fs.stat(uri);
  } catch {
    return { ok: false, relativePath, reason: 'unreadable' };
  }
  if (stat.type & vscode.FileType.SymbolicLink) return { ok: false, relativePath, reason: 'symlink' };
  if (!(stat.type & vscode.FileType.File)) return { ok: false, relativePath, reason: 'not-a-file' };
  if (stat.size > SCAN_LIMITS.maxFileBytes) return { ok: false, relativePath, reason: 'too-large' };

  // A symlinked folder can point outside the workspace, or at a sensitive folder inside it
  // (for example `notes -> .git`), so containment and names are checked on the resolved path.
  if (uri.scheme === 'file' && folder.uri.scheme === 'file') {
    try {
      const [real, root] = await Promise.all([fs.realpath(uri.fsPath), fs.realpath(folder.uri.fsPath)]);
      if (!isInside(real, root)) return { ok: false, relativePath, reason: 'outside-workspace', detail: 'symlinked folder' };
      const resolvedSensitive = sensitiveReason(path.relative(root, real));
      if (resolvedSensitive) {
        return { ok: false, relativePath, reason: 'sensitive', detail: `${resolvedSensitive} (through a symlink)` };
      }
    } catch {
      return { ok: false, relativePath, reason: 'unreadable' };
    }
  }

  let bytes: Uint8Array;
  try {
    bytes = await vscode.workspace.fs.readFile(uri);
  } catch {
    return { ok: false, relativePath, reason: 'unreadable' };
  }
  if (bytes.byteLength > SCAN_LIMITS.maxFileBytes) return { ok: false, relativePath, reason: 'too-large' };
  if (bytes.subarray(0, SCAN_LIMITS.binarySniffBytes).includes(0)) return { ok: false, relativePath, reason: 'binary' };

  return { ok: true, relativePath, text: new TextDecoder('utf-8').decode(bytes) };
}
