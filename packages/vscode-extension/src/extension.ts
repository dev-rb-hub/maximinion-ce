import { Sanitizer, Refiner, EntropyScore } from '@maximinion/refiner';
import * as vscode from 'vscode';

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
      if (message.command === 'runRefiner') {
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
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
</head>
<body>
  <button id="run">Run Refiner on Active File</button>
  <button id="settings">Open Settings</button>
  <p>Secret scrubbing: ${scrubbingEnabled ? 'enabled' : 'disabled'}</p>
  <p>Entropy scoring: ${entropyScoringEnabled ? 'enabled' : 'disabled'}</p>
  <p>Semantic folding: ${semanticFoldingEnabled ? 'enabled' : 'disabled'}</p>
  <p>Manifest export format: ${exportFormat}</p>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
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

  context.subscriptions.push(
    outputChannel,
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
}