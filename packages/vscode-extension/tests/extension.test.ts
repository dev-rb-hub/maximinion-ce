type CommandHandler = (...args: unknown[]) => unknown;

const commandHandlers = new Map<string, CommandHandler>();
const configValues: Record<string, unknown> = {};
const mockVscode = {
  commands: {
    registerCommand: jest.fn((id: string, handler: CommandHandler) => {
      commandHandlers.set(id, handler);
      return { dispose: jest.fn() };
    }),
    executeCommand: jest.fn(),
  },
  env: {
    clipboard: { writeText: jest.fn() },
  },
  window: {
    activeTextEditor: undefined as
      | { document: { getText: () => string; languageId: string; uri: { fsPath: string }; fileName: string } }
      | undefined,
    showInformationMessage: jest.fn(),
    showTextDocument: jest.fn(),
    showWarningMessage: jest.fn(),
    registerWebviewViewProvider: jest.fn(() => ({ dispose: jest.fn() })),
    createOutputChannel: jest.fn(() => ({
      appendLine: jest.fn(),
      show: jest.fn(),
      dispose: jest.fn(),
    })),
  },
  workspace: {
    openTextDocument: jest.fn(),
    getConfiguration: jest.fn(() => ({
      get: jest.fn((key: string, defaultValue: unknown) => configValues[key] ?? defaultValue),
    })),
    onDidChangeConfiguration: jest.fn(() => ({ dispose: jest.fn() })),
  },
};

jest.mock('vscode', () => mockVscode, { virtual: true });

describe('MaxiMinion VS Code commands', () => {
  const sourceText = 'const apiKey = "sk-proj-abcdef1234567890abcdef1234567890";';

  beforeEach(() => {
    jest.clearAllMocks();
    commandHandlers.clear();
    delete configValues['secretScrubbing.enabled'];
    delete configValues['entropyScoring.enabled'];
    delete configValues['semanticFolding.enabled'];
    delete configValues['manifest.exportFormat'];
    mockVscode.window.activeTextEditor = {
      document: {
        getText: () => sourceText,
        languageId: 'typescript',
        uri: { fsPath: 'test.ts' },
        fileName: 'test.ts',
      },
    };
    mockVscode.workspace.openTextDocument.mockResolvedValue({ uri: 'untitled:preview' });
    jest.resetModules();
    jest.doMock('vscode', () => mockVscode, { virtual: true });

    const { activate } = require('../src/extension') as typeof import('../src/extension');
    activate({ subscriptions: [] } as unknown as import('vscode').ExtensionContext);
  });

  test('opens a sanitized preview without editing the source document', async () => {
    const handler = commandHandlers.get('maximinion.sanitizeActiveFile');
    expect(handler).toBeDefined();

    await handler!();

    expect(mockVscode.workspace.openTextDocument).toHaveBeenCalledWith({
      content: expect.not.stringContaining('sk-proj-abcdef1234567890abcdef1234567890'),
      language: 'typescript',
    });
    expect(mockVscode.window.showTextDocument).toHaveBeenCalledWith(
      { uri: 'untitled:preview' },
      { preview: true },
    );
  });

  test('copies only sanitized text to the clipboard', async () => {
    const handler = commandHandlers.get('maximinion.copySanitizedActiveFile');
    expect(handler).toBeDefined();

    await handler!();

    expect(mockVscode.env.clipboard.writeText).toHaveBeenCalledWith(
      expect.not.stringContaining('sk-proj-abcdef1234567890abcdef1234567890'),
    );
  });

  test('warns and does nothing when there is no active editor', async () => {
    mockVscode.window.activeTextEditor = undefined;
    const handler = commandHandlers.get('maximinion.sanitizeActiveFile');

    await handler!();

    expect(mockVscode.window.showWarningMessage).toHaveBeenCalledWith(
      'Open a text document before sanitizing.',
    );
    expect(mockVscode.workspace.openTextDocument).not.toHaveBeenCalled();
  });

  test('registers a webview view provider for the sidebar', () => {
    expect(mockVscode.window.registerWebviewViewProvider).toHaveBeenCalledWith(
      'maximinion.sidebar',
      expect.anything(),
    );
  });

  test('openSettings opens the maximinion settings section', async () => {
    const handler = commandHandlers.get('maximinion.openSettings');
    expect(handler).toBeDefined();

    await handler!();

    expect(mockVscode.commands.executeCommand).toHaveBeenCalledWith(
      'workbench.action.openSettings',
      'maximinion',
    );
  });

  test('sidebar webview re-renders when a maximinion setting changes', () => {
    const provider = (mockVscode.window.registerWebviewViewProvider.mock.calls as any[])[0][1];
    const fakeWebviewView = {
      webview: { options: undefined as unknown, html: '', onDidReceiveMessage: jest.fn() },
      onDidDispose: jest.fn(),
    };

    provider.resolveWebviewView(fakeWebviewView);
    expect(fakeWebviewView.webview.html).toContain('Manifest export format: json');

    configValues['manifest.exportFormat'] = 'markdown';
    const configCallback = (mockVscode.workspace.onDidChangeConfiguration.mock.calls as any[])[0][0];
    configCallback({ affectsConfiguration: () => true });

    expect(fakeWebviewView.webview.html).toContain('Manifest export format: markdown');
  });

  test('runRefinerOnActiveFile opens a preview containing only the refined text', async () => {
    const handler = commandHandlers.get('maximinion.runRefinerOnActiveFile');
    expect(handler).toBeDefined();

    await handler!();

    expect(mockVscode.workspace.openTextDocument).toHaveBeenCalledWith({
      content: expect.not.stringContaining('sk-proj-abcdef1234567890abcdef1234567890'),
      language: 'typescript',
    });
    const outputChannel = mockVscode.window.createOutputChannel.mock.results[0].value;
    expect(outputChannel.appendLine).toHaveBeenCalledWith(expect.stringContaining('"entropy"'));
    expect(mockVscode.window.showInformationMessage).toHaveBeenCalledWith(
      expect.stringMatching(/Refiner complete\. Redacted \d+ value\(s\)\. Optimization: -?\d+\.\d%\./),
    );
  });

  test('runRefinerOnActiveFile skips secret scrubbing and entropy scoring when disabled', async () => {
    configValues['secretScrubbing.enabled'] = false;
    configValues['entropyScoring.enabled'] = false;
    const handler = commandHandlers.get('maximinion.runRefinerOnActiveFile');

    await handler!();

    expect(mockVscode.workspace.openTextDocument).toHaveBeenCalledWith({
      content: expect.stringContaining('sk-proj-abcdef1234567890abcdef1234567890'),
      language: 'typescript',
    });
  });

  test('runRefinerOnActiveFile logs a markdown report when the export format setting is markdown', async () => {
    configValues['manifest.exportFormat'] = 'markdown';
    const handler = commandHandlers.get('maximinion.runRefinerOnActiveFile');

    await handler!();

    const outputChannel = mockVscode.window.createOutputChannel.mock.results[0].value;
    expect(outputChannel.appendLine).toHaveBeenCalledWith(expect.stringContaining('# MaxiMinion Refiner Report'));
  });

  test('runRefinerOnActiveFile warns and does nothing when there is no active editor', async () => {
    mockVscode.window.activeTextEditor = undefined;
    const handler = commandHandlers.get('maximinion.runRefinerOnActiveFile');

    await handler!();

    expect(mockVscode.window.showWarningMessage).toHaveBeenCalledWith(
      'Open a text document before running the Refiner.',
    );
    expect(mockVscode.workspace.openTextDocument).not.toHaveBeenCalled();
  });

  test('skips scrubbing when secretScrubbing.enabled is false', async () => {
    configValues['secretScrubbing.enabled'] = false;
    const handler = commandHandlers.get('maximinion.sanitizeActiveFile');

    await handler!();

    expect(mockVscode.workspace.openTextDocument).toHaveBeenCalledWith({
      content: sourceText,
      language: 'typescript',
    });
  });
});