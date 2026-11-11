import { Sanitizer, Refiner, EntropyScore, sameOllamaModel } from '@maximinion/refiner';
import * as vscode from 'vscode';
import { buildAiPayload, estimateTokens, formatTokens, PayloadSource } from './payload';
import { findSecretRanges, PII_TYPES } from './secret-ranges';

export const CE_NOTICE =
  'MaxiMinion.AI Community Edition is provided completely free of charge for evaluation and individual use. ' +
  'It does not constitute the supply of a good or service in trade or commerce under the Australian Consumer Law. ' +
  "The software is provided 'AS IS' without warranties of any kind.";

const NOTICE_STATE_KEY = 'maximinion.ceNoticeShown';
const LICENSE_URL = 'https://github.com/dev-rb-hub/maximinion-ce/blob/main/LICENSE';
export const HELP_URL = 'https://github.com/dev-rb-hub/maximinion-ce/blob/main/packages/vscode-extension/README.md';
const WALKTHROUGH_ID = 'maximinion.maximinion#gettingStarted';
const DIAGNOSTIC_SOURCE = 'MaxiMinion';
const DIAGNOSTIC_SCHEMES = new Set(['file', 'untitled']);
const MAX_DIAGNOSTIC_CHARS = 500_000;

function getConfig(): vscode.WorkspaceConfiguration {
  return vscode.workspace.getConfiguration('maximinion');
}

// Every notification is prefixed so users can tell which extension raised it.
function info(message: string, ...actions: string[]): Thenable<string | undefined> {
  return vscode.window.showInformationMessage(`MaxiMinion: ${message}`, ...actions);
}

function warn(message: string, ...actions: string[]): Thenable<string | undefined> {
  return vscode.window.showWarningMessage(`MaxiMinion: ${message}`, ...actions);
}

function showHelp(step?: string): void {
  void Promise.resolve(
    vscode.commands.executeCommand(
      'workbench.action.openWalkthrough',
      step ? { category: WALKTHROUGH_ID, step: `${WALKTHROUGH_ID}#${step}` } : WALKTHROUGH_ID,
      false,
    ),
  ).catch(() => vscode.env.openExternal(vscode.Uri.parse(HELP_URL)));
}

function sanitizeActiveDocument(): { text: string; count: number; language: string } | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    void warn('Open a text document before sanitizing.');
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
  void info(message);
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
      void warn('Open a text document before running the Refiner.');
      return;
    }

    const config = vscode.workspace.getConfiguration('maximinion');
    const secretScrubbingEnabled = config.get<boolean>('secretScrubbing.enabled', true);
    const entropyScoringEnabled = config.get<boolean>('entropyScoring.enabled', true);
    const semanticFoldingEnabled = config.get<boolean>('semanticFolding.enabled', false);
    const foldingModel = config.get<string>('semanticFolding.model', 'phi3').trim() || 'phi3';
    const exportFormat = config.get<string>('manifest.exportFormat', 'json');

    const filePath = editor.document.uri.fsPath || editor.document.fileName;
    const originalText = editor.document.getText();

    output.appendLine('');
    output.appendLine(`[${new Date().toISOString()}] maximinion.runRefinerOnActiveFile`);
    output.appendLine(`Input file: ${filePath}`);
    output.appendLine(
      `Configuration: secretScrubbing=${secretScrubbingEnabled}, entropyScoring=${entropyScoringEnabled}, ` +
        `semanticFolding=${semanticFoldingEnabled}${semanticFoldingEnabled ? ` (model=${foldingModel})` : ''}, ` +
        `manifestExportFormat=${exportFormat}`,
    );

    const refiner = new Refiner({ enableSemanticFolding: semanticFoldingEnabled, ollamaModel: foldingModel });
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
      output.appendLine(`  -> ${describeSignal(entropy.rating)}`);
    } else {
      output.appendLine('Entropy scoring: skipped (disabled in settings)');
    }

    let foldedApplied = false;
    let foldedTokensSaved = 0;
    if (!semanticFoldingEnabled) {
      output.appendLine(
        'Semantic folding: skipped (disabled; enable maximinion.semanticFolding.enabled and run Ollama locally to summarize code)',
      );
    } else if (!entropy) {
      output.appendLine('Semantic folding: skipped (requires entropy scoring to be enabled)');
    } else {
      const folded = await runSemanticFolding(refiner, currentText, foldingModel, output);
      if (folded) {
        foldedApplied = true;
        foldedTokensSaved = folded.tokensSaved;
        currentText = folded.summary;
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
    const signal = entropy ? `signal ${entropy.rating}, ` : '';
    const sizeChange =
      optimizationPercent >= 0
        ? `${optimizationPercent.toFixed(1)}% smaller`
        : `${Math.abs(optimizationPercent).toFixed(1)}% larger`;
    void info(
      `Refiner complete: ${signal}${scrubbedCount} value(s) redacted, ${sizeChange}. ` +
        'The refined text is in the preview tab.',
      'Show Report',
      'What does this mean?',
    ).then((choice) => {
      if (choice === 'Show Report') {
        output.show();
      } else if (choice === 'What does this mean?') {
        showHelp('refiner');
      }
    });
  };
}

const OLLAMA_URL = 'http://localhost:11434';

async function setFoldingModel(model: string): Promise<void> {
  await getConfig().update('semanticFolding.model', model, vscode.ConfigurationTarget.Global);
  void info(`Semantic folding model set to "${model}". Run the Refiner again to fold with it.`);
}

/**
 * Checks Ollama and the configured model first so failures are explained, then folds with a cancellable progress
 * notification. Returns undefined when folding did not happen; the reason is logged and shown to the user.
 */
async function runSemanticFolding(
  refiner: Refiner,
  text: string,
  model: string,
  output: vscode.OutputChannel,
): Promise<{ summary: string; tokensSaved: number } | undefined> {
  let installed: string[];
  try {
    installed = (await refiner.listOllamaModels()).map((m) => m.name);
  } catch (error) {
    output.appendLine(`Semantic folding: failed (Ollama is not reachable at ${OLLAMA_URL})`);
    output.appendLine('  -> Install Ollama from https://ollama.com and start it with `ollama serve`.');
    void warn(`Semantic folding skipped: Ollama is not running at ${OLLAMA_URL}.`, 'Install Ollama', 'Turn Off Folding').then(
      (choice) => {
        if (choice === 'Install Ollama') {
          void vscode.env.openExternal(vscode.Uri.parse('https://ollama.com/download'));
        } else if (choice === 'Turn Off Folding') {
          void getConfig().update('semanticFolding.enabled', false, vscode.ConfigurationTarget.Global);
        }
      },
    );
    return undefined;
  }

  if (!installed.some((name) => sameOllamaModel(name, model))) {
    const available = installed.length > 0 ? installed.join(', ') : 'none';
    output.appendLine(`Semantic folding: failed (model "${model}" is not installed; installed models: ${available})`);
    output.appendLine(`  -> Run \`ollama pull ${model}\`, or set maximinion.semanticFolding.model to an installed model.`);
    const useInstalled = installed.length > 0 ? `Use ${installed[0]}` : undefined;
    const actions = [useInstalled, 'Choose Model'].filter((a): a is string => Boolean(a));
    void warn(
      `Semantic folding skipped: model "${model}" is not installed in Ollama (installed: ${available}).`,
      ...actions,
    ).then(async (choice) => {
      if (choice === useInstalled && useInstalled) {
        await setFoldingModel(installed[0]);
      } else if (choice === 'Choose Model') {
        const picked = await vscode.window.showQuickPick(installed, {
          title: 'MaxiMinion: choose an Ollama model for semantic folding',
          placeHolder: installed.length > 0 ? 'Installed Ollama models' : `No models installed. Run "ollama pull ${model}" first.`,
        });
        if (picked) await setFoldingModel(picked);
      }
    });
    return undefined;
  }

  const controller = new AbortController();
  const folded = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `MaxiMinion: Folding with ${model}… (the first run can take a while as the model loads)`,
      cancellable: true,
    },
    (_progress, token) => {
      token.onCancellationRequested(() => controller.abort());
      return refiner.fold(text, controller.signal);
    },
  );

  if (controller.signal.aborted) {
    output.appendLine('Semantic folding: cancelled');
    return undefined;
  }
  if (folded.error) {
    output.appendLine(`Semantic folding: failed (${folded.error})`);
    void warn(`Semantic folding failed with ${model}. See the MaxiMinion output for details.`);
    return undefined;
  }

  output.appendLine(
    `Semantic folding: applied with ${folded.model} (confidence=${folded.confidence.toFixed(2)}, tokensSaved=${folded.tokensSaved})`,
  );
  output.appendLine('  -> The summary is lossy; review it before relying on it.');
  return folded;
}

function describeSignal(rating: string): string {
  switch (rating) {
    case 'HIGH':
      return 'HIGH signal: dense, varied content (usually real logic worth sending to an AI).';
    case 'LOW':
      return 'LOW signal: repetitive or boilerplate content; consider trimming it before sharing.';
    default:
      return 'MEDIUM signal: a mix of logic and boilerplate.';
  }
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
      void warn('Open a file or select files in the Explorer before using Copy for AI.');
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
    void warn('No readable text files were selected for Copy for AI.');
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
    void warn(`${summary} This exceeds your token budget of ~${formatTokens(budget)}.`, 'Change Budget').then(
      (choice) => {
        if (choice === 'Change Budget') {
          void vscode.commands.executeCommand('workbench.action.openSettings', 'maximinion.tokenBudget');
        }
      },
    );
  } else {
    void info(summary);
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
      `MaxiMinion: ~${formatTokens(tokens)} estimated tokens in the current ${hasSelection ? 'selection' : 'file'}` +
      `${budget > 0 ? ` (budget ~${formatTokens(budget)}${overBudget ? ', exceeded' : ''})` : ''}.\n` +
      'Click to sanitize and copy for AI (Ctrl+Shift+Alt+M).';
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
        `Possible secret (${range.type}). Redact it or use Copy for AI before sharing this file with AI tools.`,
        PII_TYPES.has(range.type) ? vscode.DiagnosticSeverity.Information : vscode.DiagnosticSeverity.Warning,
      );
      diagnostic.source = DIAGNOSTIC_SOURCE;
      diagnostic.code = { value: range.type, target: vscode.Uri.parse(`${HELP_URL}#inline-secret-warnings`) };
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
        const code = typeof diagnostic.code === 'object' ? diagnostic.code.value : diagnostic.code;
        const replacement = `[REDACTED_${String(code)}]`;
        const action = new vscode.CodeAction(`MaxiMinion: Redact with ${replacement}`, vscode.CodeActionKind.QuickFix);
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
  void Promise.resolve(vscode.window.showInformationMessage(CE_NOTICE, 'Get Started', 'View License')).then(
    (choice) => {
      if (choice === 'Get Started') {
        showHelp();
      } else if (choice === 'View License') {
        void vscode.env.openExternal(vscode.Uri.parse(LICENSE_URL));
      }
    },
  );
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
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
      const commands: Record<string, string> = {
        copyForAI: 'maximinion.copyForAI',
        preview: 'maximinion.sanitizeActiveFile',
        runRefiner: 'maximinion.runRefinerOnActiveFile',
        openSettings: 'maximinion.openSettings',
        showHelp: 'maximinion.showHelp',
        showProblems: 'workbench.actions.view.problems',
      };
      if (message.command === 'openDocs') {
        void vscode.env.openExternal(vscode.Uri.parse(HELP_URL));
      } else if (message.command && commands[message.command]) {
        void vscode.commands.executeCommand(commands[message.command]);
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
    const onOff = (value: boolean) => (value ? 'on' : 'off');
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<style>
  body { padding: 0 12px 12px; }
  h3 { margin: 16px 0 4px; font-size: 1em; }
  p { margin: 4px 0 8px; }
  .hint { opacity: 0.8; font-size: 0.9em; }
  button {
    display: block; width: 100%; margin: 4px 0; padding: 4px 8px; border: none; cursor: pointer;
    color: var(--vscode-button-foreground); background: var(--vscode-button-background);
  }
  button:hover { background: var(--vscode-button-hoverBackground); }
  button.secondary { color: var(--vscode-button-secondaryForeground); background: var(--vscode-button-secondaryBackground); }
  button.secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }
  a { color: var(--vscode-textLink-foreground); cursor: pointer; }
  ul { margin: 4px 0; padding-left: 16px; }
  .notice { margin-top: 16px; font-size: 0.8em; opacity: 0.7; }
</style>
</head>
<body>
  <h3>Share code with AI</h3>
  <p class="hint">Copy the selection or active file with secrets redacted and a token estimate. Use it before pasting into any AI chat. Shortcut: Ctrl+Shift+Alt+M (Cmd+Shift+Alt+M on macOS).</p>
  <button data-command="copyForAI">Copy for AI (Sanitized)</button>
  <button class="secondary" data-command="preview">Preview Sanitized File</button>

  <h3>Analyze a file</h3>
  <p class="hint">The Refiner scores how much real signal a file has (entropy) and can summarize it with a local Ollama model. Use it on large files before sharing.</p>
  <button class="secondary" data-command="runRefiner">Run Refiner on Active File</button>

  <h3>Secret warnings</h3>
  <p class="hint">Likely secrets are underlined and listed in the Problems panel as <b>MaxiMinion</b>. Press Ctrl+. on one to redact it.</p>
  <button class="secondary" data-command="showProblems">Show Problems Panel</button>

  <h3>Current settings</h3>
  <ul>
    <li>Token budget: ${tokenBudget > 0 ? `~${formatTokens(tokenBudget)} tokens` : 'off'}</li>
    <li>Secret scrubbing: ${onOff(scrubbingEnabled)}</li>
    <li>Inline secret warnings: ${onOff(diagnosticsEnabled)}</li>
    <li>Entropy scoring: ${onOff(entropyScoringEnabled)}</li>
    <li>Semantic folding (Ollama): ${onOff(semanticFoldingEnabled)}${
      semanticFoldingEnabled ? ` (model: ${escapeHtml(config.get<string>('semanticFolding.model', 'phi3'))})` : ''
    }</li>
    <li>Report format: ${exportFormat}</li>
  </ul>
  <button class="secondary" data-command="openSettings">Open Settings</button>

  <h3>Help</h3>
  <p><a data-command="showHelp">Get Started walkthrough</a> · <a data-command="openDocs">Documentation</a></p>

  <p class="notice">${CE_NOTICE} Secret detection is pattern-based; review output before sharing it.</p>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    document.querySelectorAll('[data-command]').forEach((element) => {
      element.addEventListener('click', () => vscode.postMessage({ command: element.dataset.command }));
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
      void info(`Copied sanitized text. Redacted ${result.count} value(s).`);
    }),
    vscode.commands.registerCommand('maximinion.runRefinerOnActiveFile', createRunRefinerOnActiveDocument(outputChannel)),
    vscode.commands.registerCommand('maximinion.openSettings', () => {
      void vscode.commands.executeCommand('workbench.action.openSettings', 'maximinion');
    }),
    vscode.commands.registerCommand('maximinion.showHelp', () => showHelp()),
  );

  diagnostics.refreshAll();
  statusBar.update();
  showNoticeOnce(context);
}