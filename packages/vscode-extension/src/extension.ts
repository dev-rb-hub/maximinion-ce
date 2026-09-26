import { Sanitizer } from '@maximinion/refiner';
import * as vscode from 'vscode';

function sanitizeActiveDocument(): { text: string; count: number; language: string } | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    void vscode.window.showWarningMessage('Open a text document before sanitizing.');
    return undefined;
  }

  const result = new Sanitizer().sanitize(editor.document.getText());
  return {
    text: result.text,
    count: result.scrubbed.length,
    language: editor.document.languageId,
  };
}

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('maximinion.sanitizeActiveFile', async () => {
      const result = sanitizeActiveDocument();
      if (!result) return;

      const preview = await vscode.workspace.openTextDocument({
        content: result.text,
        language: result.language,
      });
      await vscode.window.showTextDocument(preview, { preview: true });
      void vscode.window.showInformationMessage(`Sanitized preview ready. Redacted ${result.count} value(s).`);
    }),
    vscode.commands.registerCommand('maximinion.copySanitizedActiveFile', async () => {
      const result = sanitizeActiveDocument();
      if (!result) return;

      await vscode.env.clipboard.writeText(result.text);
      void vscode.window.showInformationMessage(`Copied sanitized text. Redacted ${result.count} value(s).`);
    }),
  );
}