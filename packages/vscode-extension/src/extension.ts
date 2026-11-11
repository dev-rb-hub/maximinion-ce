import { Sanitizer, Refiner, EntropyScore } from '@maximinion/refiner';
import * as vscode from 'vscode';
import { buildAiPayload, estimateTokens, formatTokens, PayloadSource } from './payload';
import { findSecretRanges, PII_TYPES } from './secret-ranges';

export const CE_NOTICE =
  'MaxiMinion.AI Community Edition is provided completely free of charge for evaluation and individual use. ' +
  'It does not constitute the supply of a good or service in trade or commerce under the Australian Consumer Law. ' +
  "The software is provided 'AS IS' without warranties of any kind.";

const NOTICE_STATE_KEY = 'maximinion.ceNoticeShown';
const LICENSE_URL = 'https://github.com/dev-rb-hub/maximinion-ce/blob/main/LICENSE';
const DIAGNOSTIC_SOURCE = 'MaxiMinion';
const DIAGNOSTIC_SCHEMES = new Set(['file', 'untitled']);
const MAX_DIAGNOSTIC_CHARS = 500_000;

function getConfig(): vscode.WorkspaceConfiguration {
  return vscode.workspace.getConfiguration('maximinion');
}

function sanitizeActiveDocument(): { text: string; count: number; language: string } | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    void vscode.window.showWarningMessage('Open a text document before sanitizing.');
    return undefined;
  }

  const scrubbingEnabled = vscode.workspace
    .getConfiguration('maximinion')
    .get<boolean>('secretScrubbing.enabled', true);

  if (!scrubbingEnabled) {
    return { text: editor.document.getText(), count: 0, language: editor.document.languageId };
  }

  const result = new Sanitizer().sanitize(editor.document.getText());
  return {
    text: result.text,
    count: result.scrubbed.length,
    language: editor.document.languageId,
  };
}

async function showSanitizedPreview(
  result: { text: string; count: number; language: string },
  message: string,
): Promise<void> {
  const preview = await vscode.workspace.openTextDocument({
    content: result.text,
    language: result.language,
  });
  await vscode.window.showTextDocument(preview, { preview: true });
  void vscode.window.showInformationMessage(message);
}

function formatRunReport(report: RunReport, format: string): string {
  if (format === 'markdown') {
    return [
      '# MaxiMinion Refiner Report',
      '',
      `- Input file: ${report.filePath}`,
      `- Secret scrubbing: ${report.secretScrubbingEnabled ? `enabled (${report.scrubbedCount} redacted)` : 'disabled'}`,
      `- Entropy scoring: ${report.entropy ? `${report.entropy.rating} (value=${report.entropy.value.toFixed(2)})` : 'disabled'}`,
      `- Semantic folding: ${report.foldedApplied ? `applied (tokens saved: ${report.foldedTokensSaved})` : 'not applied'}`,
      `- Optimization: ${report.optimizationPercent.toFixed(1)}% size reduction`,
    ].join('\n');
  }

  return JSON.stringify(report, null, 2);
}

interface RunReport {
  filePath: string;
  secretScrubbingEnabled: boolean;
  scrubbedCount: number;
  entropy?: EntropyScore;
  foldedApplied: boolean;
  foldedTokensSaved: number;
  optimizationPercent: number;
}

function createRunRefinerOnActiveDocument(
  output: vscode.OutputChannel,
): () => Promise<void> {
  return async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      void vscode.window.showWarningMessage('Open a text document before running the Refiner.');
      return;
    }

    const config = vscode.workspace.getConfiguration('maximinion');
    const secretScrubbingEnabled = config.get<boolean>('secretScrubbing.enabled', true);
    const entropyScoringEnabled = config.get<boolean>('entropyScoring.enabled', true);
    const semanticFoldingEnabled = config.get<boolean>('semanticFolding.enabled', false);
    const exportFormat = config.get<string>('manifest.exportFormat', 'json');

    const filePath = editor.document.uri.fsPath || editor.document.fileName;
    const originalText = editor.document.getText();

    output.appendLine('');
    output.appendLine(`[${new Date().toISOString()}] maximinion.runRefinerOnActiveFile`);
    output.appendLine(`Input file: ${filePath}`);
    output.appendLine(
      `Configuration: secretScrubbing=${secretScrubbingEnabled}, entropyScoring=${entropyScoringEnabled}, ` +
        `semanticFolding=${semanticFoldingEnabled}, manifestExportFormat=${exportFormat}`,
    );

    const refiner = new Refiner({ enableSemanticFolding: semanticFoldingEnabled });
    let currentText = originalText;
    let scrubbedCount = 0;

    if (secretScrubbingEnabled) {
      const sanitized = refiner.sanitize(currentText);
      currentText = sanitized.text;
      scrubbedCount = sanitized.scrubbed.length;
      output.appendLine(`Secret scrubbing: redacted ${scrubbedCount} value(s)`);
    } else {
      output.appendLine('Secret scrubbing: skipped (disabled in settings)');
    }

    let entropy: EntropyScore | undefined;
    if (entropyScoringEnabled) {
      entropy = refiner.calculateEntropy(currentText);
      output.appendLine(
        `Entropy scoring: value=${entropy.value.toFixed(2)}, rating=${entropy.rating}, signal=${entropy.signal.toFixed(2)}`,
      );
    } else {
      output.appendLine('Entropy scoring: skipped (disabled in settings)');
    }

    let foldedApplied = false;
    let foldedTokensSaved = 0;
    if (!semanticFoldingEnabled) {
      output.appendLine('Semantic folding: skipped (disabled in settings)');
    } else if (!entropy) {
      output.appendLine('Semantic folding: skipped (requires entropy scoring to be enabled)');
    } else {
      try {
        const folded = await refiner.fold(currentText);
        foldedApplied = true;
        foldedTokensSaved = folded.tokensSaved;
        currentText = folded.summary;
        output.appendLine(
          `Semantic folding: applied (confidence=${folded.confidence.toFixed(2)}, tokensSaved=${folded.tokensSaved})`,
        );
      } catch (error) {
        output.appendLine(`Semantic folding: failed (${error instanceof Error ? error.message : String(error)})`);
      }
    }

    const optimizationPercent =
      originalText.length > 0 ? ((originalText.length - currentText.length) / originalText.length) * 100 : 0;
    output.appendLine(
      `Optimization score: ${optimizationPercent.toFixed(1)}% size reduction (${originalText.length} -> ${currentText.length} chars)`,
    );

    const report: RunReport = {
      filePath,
      secretScrubbingEnabled,
      scrubbedCount,
      entropy,
      foldedApplied,
      foldedTokensSaved,
      optimizationPercent,
    };
    output.appendLine('Report:');
    output.appendLine(formatRunReport(report, exportFormat));

    // Preview holds only the refined text (no report wrapper) so it can be copy-pasted straight into an LLM prompt.
    const preview = await vscode.workspace.openTextDocument({
      content: currentText,
      language: editor.document.languageId,
    });
    await vscode.window.showTextDocument(preview, { preview: true });
    output.show(true);
    void vscode.window.showInformationMessage(
      `Refiner complete. Redacted ${scrubbedCount} value(s). Optimization: ${optimizationPercent.toFixed(1)}%.`,
    );
  };
}

function labelFor(document: vscode.TextDocument): string {
  return document.uri.scheme === 'file' ? vscode.workspace.asRelativePath(document.uri, false) : document.fileName;
}

async function collectPayloadSources(
  uri?: vscode.Uri,
  uris?: vscode.Uri[],
): Promise<PayloadSource[] | undefined> {
  // Explorer menus pass the multi-selection array; editor menus and keybindings do not.
  const fromExplorer = Array.isArray(uris) && uris.length > 0;
  const targets = fromExplorer ? uris : uri ? [uri] : [];
  const editor = vscode.window.activeTextEditor;
  const targetsActiveEditor =
    !fromExplorer &&
    targets.length === 1 &&
    editor !== undefined &&
    editor.document.uri.toString() === targets[0].toString();

  if (targets.length === 0 || targetsActiveEditor) {
    if (!editor) {
      void vscode.window.showWarningMessage('Open a file or select files in the Explorer before using Copy for AI.');
      return undefined;
    }
    const { document, selection } = editor;
    if (selection && !selection.isEmpty) {
      return [
        {
          label: `${labelFor(document)} (lines ${selection.start.line + 1}-${selection.end.line + 1})`,
          language: document.languageId,
          text: document.getText(selection),
        },
      ];
    }
    return [{ label: labelFor(document), language: document.languageId, text: document.getText() }];
  }

  const sources: PayloadSource[] = [];
  for (const target of targets) {
    try {
      const stat = await vscode.workspace.fs.stat(target);
      if (stat.type & vscode.FileType.Directory) continue;
      const document = await vscode.workspace.openTextDocument(target);
      sources.push({ label: labelFor(document), language: document.languageId, text: document.getText() });
    } catch {
      // Binary or unreadable files are skipped.
    }
  }
  return sources;
}

async function copyForAI(uri?: vscode.Uri, uris?: vscode.Uri[]): Promise<void> {
  const sources = await collectPayloadSources(uri, uris);
  if (!sources) return;
  if (sources.length === 0) {
    void vscode.window.showWarningMessage('No readable text files were selected for Copy for AI.');
    return;
  }

  const config = getConfig();
  const scrubSecrets = config.get<boolean>('secretScrubbing.enabled', true);
  const result = buildAiPayload(sources, {
    scrubSecrets,
    compactWhitespace: config.get<boolean>('copyForAI.compactWhitespace', true),
  });
  await vscode.env.clipboard.writeText(result.text);

  const redaction = scrubSecrets ? `${result.redacted} value(s) redacted` : 'secret scrubbing disabled';
  const summary =
    `Copied for AI: ${result.sources} source(s), ${redaction}, ` +
    `~${formatTokens(result.originalTokens)} → ~${formatTokens(result.payloadTokens)} tokens.`;
  const budget = config.get<number>('tokenBudget', 8000);
  if (budget > 0 && result.payloadTokens > budget) {
    void vscode.window.showWarningMessage(`${summary} This exceeds your token budget of ~${formatTokens(budget)}.`);
  } else {
    void vscode.window.showInformationMessage(summary);
  }
}

class TokenStatusBar implements vscode.Disposable {
  private readonly item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);

  constructor() {
    this.item.name = 'MaxiMinion Tokens';
    this.item.command = 'maximinion.copyForAI';
  }

  public update(): void {
    const editor = vscode.window.activeTextEditor;
    if (!getConfig().get<boolean>('statusBar.enabled', true) || !editor || editor.document.uri.scheme === 'output') {
      this.item.hide();
      return;
    }

    const selection = editor.selection;
    const hasSelection = selection !== undefined && !selection.isEmpty;
    const tokens = estimateTokens(hasSelection ? editor.document.getText(selection) : editor.document.getText());
    const budget = getConfig().get<number>('tokenBudget', 8000);
    const overBudget = budget > 0 && tokens > budget;

    this.item.text = `$(shield) ~${formatTokens(tokens)} tokens`;
    this.item.tooltip =
      `MaxiMinion: estimated tokens for the current ${hasSelection ? 'selection' : 'file'}` +
      `${budget > 0 ? ` (budget ~${formatTokens(budget)})` : ''}. Click to sanitize and copy for AI.`;
    this.item.backgroundColor = overBudget ? new vscode.ThemeColor('statusBarItem.warningBackground') : undefined;
    this.item.show();
  }

  public dispose(): void {
    this.item.dispose();
  }
}

class SecretDiagnostics implements vscode.CodeActionProvider, vscode.Disposable {
  public static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];
  private readonly collection = vscode.languages.createDiagnosticCollection('maximinion');
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  public refresh(document: vscode.TextDocument): void {
    const config = getConfig();
    const text = document.getText();
    if (
      !config.get<boolean>('secretDiagnostics.enabled', true) ||
      !DIAGNOSTIC_SCHEMES.has(document.uri.scheme) ||
      text.length > MAX_DIAGNOSTIC_CHARS
    ) {
      this.collection.delete(document.uri);
      return;
    }

    const minConfidence = config.get<number>('secretDiagnostics.minConfidence', 0.75);
    const diagnostics = findSecretRanges(text, minConfidence).map((range) => {
      const diagnostic = new vscode.Diagnostic(
        new vscode.Range(document.positionAt(range.start), document.positionAt(range.end)),
        `Possible ${range.type} detected. Review before sharing this file with AI tools.`,
        PII_TYPES.has(range.type) ? vscode.DiagnosticSeverity.Information : vscode.DiagnosticSeverity.Warning,
      );
      diagnostic.source = DIAGNOSTIC_SOURCE;
      diagnostic.code = range.type;
      return diagnostic;
    });
    this.collection.set(document.uri, diagnostics);
  }

  public schedule(document: vscode.TextDocument): void {
    const key = document.uri.toString();
    clearTimeout(this.timers.get(key));
    this.timers.set(
      key,
      setTimeout(() => {
        this.timers.delete(key);
        this.refresh(document);
      }, 400),
    );
  }

  public refreshAll(): void {
    vscode.workspace.textDocuments.forEach((document) => this.refresh(document));
  }

  public forget(document: vscode.TextDocument): void {
    const key = document.uri.toString();
    clearTimeout(this.timers.get(key));
    this.timers.delete(key);
    this.collection.delete(document.uri);
  }

  public provideCodeActions(
    document: vscode.TextDocument,
    _range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
  ): vscode.CodeAction[] {
    return context.diagnostics
      .filter((diagnostic) => diagnostic.source === DIAGNOSTIC_SOURCE)
      .map((diagnostic) => {
        const replacement = `[REDACTED_${String(diagnostic.code)}]`;
        const action = new vscode.CodeAction(`Redact with ${replacement}`, vscode.CodeActionKind.QuickFix);
        action.edit = new vscode.WorkspaceEdit();
        action.edit.replace(document.uri, diagnostic.range, replacement);
        action.diagnostics = [diagnostic];
        action.isPreferred = true;
        return action;
      });
  }

  public dispose(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    this.collection.dispose();
  }
}

function showNoticeOnce(context: vscode.ExtensionContext): void {
  if (context.globalState.get<boolean>(NOTICE_STATE_KEY)) return;
  void context.globalState.update(NOTICE_STATE_KEY, true);
  void Promise.resolve(vscode.window.showInformationMessage(CE_NOTICE, 'OK', 'View License')).then((choice) => {
    if (choice === 'View License') {
      void vscode.env.openExternal(vscode.Uri.parse(LICENSE_URL));
    }
  });
}

function getNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';
  for (let i = 0; i < 32; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}

class MaximinionSidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'maximinion.sidebar';

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = this.getHtml();

    const configListener = vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('maximinion')) {
        webviewView.webview.html = this.getHtml();
      }
    });
    webviewView.onDidDispose(() => configListener.dispose());

    webviewView.webview.onDidReceiveMessage((message: { command?: string }) => {
      if (message.command === 'copyForAI') {
        void vscode.commands.executeCommand('maximinion.copyForAI');
      } else if (message.command === 'runRefiner') {
        void vscode.commands.executeCommand('maximinion.runRefinerOnActiveFile');
      } else if (message.command === 'openSettings') {
        void vscode.commands.executeCommand('maximinion.openSettings');
      }
    });
  }

  private getHtml(): string {
    const config = vscode.workspace.getConfiguration('maximinion');
    const scrubbingEnabled = config.get<boolean>('secretScrubbing.enabled', true);
    const entropyScoringEnabled = config.get<boolean>('entropyScoring.enabled', true);
    const semanticFoldingEnabled = config.get<boolean>('semanticFolding.enabled', false);
    const exportFormat = config.get<string>('manifest.exportFormat', 'json');
    const tokenBudget = config.get<number>('tokenBudget', 8000);
    const diagnosticsEnabled = config.get<boolean>('secretDiagnostics.enabled', true);
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<style>
  button { display: block; width: 100%; margin: 0 0 8px; }
  .notice { margin-top: 16px; font-size: 0.85em; opacity: 0.8; }
</style>
</head>
<body>
  <button id="copy">Copy for AI (Sanitized)</button>
  <button id="run">Run Refiner on Active File</button>
  <button id="settings">Open Settings</button>
  <p>Token budget: ${tokenBudget > 0 ? `~${formatTokens(tokenBudget)} tokens` : 'disabled'}</p>
  <p>Secret scrubbing: ${scrubbingEnabled ? 'enabled' : 'disabled'}</p>
  <p>Inline secret warnings: ${diagnosticsEnabled ? 'enabled' : 'disabled'}</p>
  <p>Entropy scoring: ${entropyScoringEnabled ? 'enabled' : 'disabled'}</p>
  <p>Semantic folding: ${semanticFoldingEnabled ? 'enabled' : 'disabled'}</p>
  <p>Manifest export format: ${exportFormat}</p>
  <p class="notice">${CE_NOTICE} Secret detection is pattern-based; review output before sharing it.</p>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    document.getElementById('copy').addEventListener('click', () => {
      vscode.postMessage({ command: 'copyForAI' });
    });
    document.getElementById('run').addEventListener('click', () => {
      vscode.postMessage({ command: 'runRefiner' });
    });
    document.getElementById('settings').addEventListener('click', () => {
      vscode.postMessage({ command: 'openSettings' });
    });
  </script>
</body>
</html>`;
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel('MaxiMinion');
  const statusBar = new TokenStatusBar();
  const diagnostics = new SecretDiagnostics();

  context.subscriptions.push(
    outputChannel,
    statusBar,
    diagnostics,
    vscode.languages.registerCodeActionsProvider({ scheme: 'file' }, diagnostics, {
      providedCodeActionKinds: SecretDiagnostics.providedCodeActionKinds,
    }),
    vscode.languages.registerCodeActionsProvider({ scheme: 'untitled' }, diagnostics, {
      providedCodeActionKinds: SecretDiagnostics.providedCodeActionKinds,
    }),
    vscode.workspace.onDidOpenTextDocument((document) => diagnostics.refresh(document)),
    vscode.workspace.onDidChangeTextDocument((event) => {
      diagnostics.schedule(event.document);
      if (event.document === vscode.window.activeTextEditor?.document) statusBar.update();
    }),
    vscode.workspace.onDidCloseTextDocument((document) => diagnostics.forget(document)),
    vscode.window.onDidChangeActiveTextEditor(() => statusBar.update()),
    vscode.window.onDidChangeTextEditorSelection(() => statusBar.update()),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('maximinion')) {
        statusBar.update();
        diagnostics.refreshAll();
      }
    }),
    vscode.commands.registerCommand('maximinion.copyForAI', copyForAI),
    vscode.window.registerWebviewViewProvider(MaximinionSidebarProvider.viewType, new MaximinionSidebarProvider()),
    vscode.commands.registerCommand('maximinion.sanitizeActiveFile', async () => {
      const result = sanitizeActiveDocument();
      if (!result) return;

      await showSanitizedPreview(result, `Sanitized preview ready. Redacted ${result.count} value(s).`);
    }),
    vscode.commands.registerCommand('maximinion.copySanitizedActiveFile', async () => {
      const result = sanitizeActiveDocument();
      if (!result) return;

      await vscode.env.clipboard.writeText(result.text);
      void vscode.window.showInformationMessage(`Copied sanitized text. Redacted ${result.count} value(s).`);
    }),
    vscode.commands.registerCommand('maximinion.runRefinerOnActiveFile', createRunRefinerOnActiveDocument(outputChannel)),
    vscode.commands.registerCommand('maximinion.openSettings', () => {
      void vscode.commands.executeCommand('workbench.action.openSettings', 'maximinion');
    }),
  );

  diagnostics.refreshAll();
  statusBar.update();
  showNoticeOnce(context);
}