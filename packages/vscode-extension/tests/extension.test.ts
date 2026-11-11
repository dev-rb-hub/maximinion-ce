type CommandHandler = (...args: unknown[]) => unknown;

interface MockDocument {
  getText: (range?: unknown) => string;
  languageId: string;
  uri: { fsPath: string; scheme: string; toString: () => string };
  fileName: string;
  positionAt: (offset: number) => { offset: number };
}

function makeDocument(text: string, path = 'test.ts', languageId = 'typescript'): MockDocument {
  return {
    getText: () => text,
    languageId,
    uri: { fsPath: path, scheme: 'file', toString: () => `file:///${path}` },
    fileName: path,
    positionAt: (offset: number) => ({ offset }),
  };
}

const commandHandlers = new Map<string, CommandHandler>();
const configValues: Record<string, unknown> = {};
const globalStateValues: Record<string, unknown> = {};
const diagnosticCollection = { set: jest.fn(), delete: jest.fn(), dispose: jest.fn() };
const statusBarItem = {
  text: '',
  tooltip: '',
  name: '',
  command: '',
  backgroundColor: undefined as unknown,
  show: jest.fn(),
  hide: jest.fn(),
  dispose: jest.fn(),
};
const disposable = () => ({ dispose: jest.fn() });

class MockWorkspaceEdit {
  public replacements: Array<{ uri: unknown; range: unknown; text: string }> = [];
  replace(uri: unknown, range: unknown, text: string): void {
    this.replacements.push({ uri, range, text });
  }
}

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
    openExternal: jest.fn(),
  },
  Uri: { parse: jest.fn((value: string) => ({ value })) },
  FileType: { File: 1, Directory: 2 },
  StatusBarAlignment: { Left: 1, Right: 2 },
  DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 },
  CodeActionKind: { QuickFix: 'quickfix' },
  ThemeColor: class {
    constructor(public id: string) {}
  },
  Range: class {
    constructor(public start: unknown, public end: unknown) {}
  },
  Diagnostic: class {
    public source?: string;
    public code?: string;
    constructor(public range: unknown, public message: string, public severity: number) {}
  },
  CodeAction: class {
    public edit?: MockWorkspaceEdit;
    public diagnostics?: unknown[];
    public isPreferred?: boolean;
    constructor(public title: string, public kind: string) {}
  },
  WorkspaceEdit: MockWorkspaceEdit,
  languages: {
    createDiagnosticCollection: jest.fn(() => diagnosticCollection),
    registerCodeActionsProvider: jest.fn(disposable),
  },
  window: {
    activeTextEditor: undefined as { document: MockDocument; selection?: unknown } | undefined,
    showInformationMessage: jest.fn(),
    showTextDocument: jest.fn(),
    showWarningMessage: jest.fn(),
    registerWebviewViewProvider: jest.fn(disposable),
    createStatusBarItem: jest.fn(() => statusBarItem),
    onDidChangeActiveTextEditor: jest.fn(disposable),
    onDidChangeTextEditorSelection: jest.fn(disposable),
    createOutputChannel: jest.fn(() => ({
      appendLine: jest.fn(),
      show: jest.fn(),
      dispose: jest.fn(),
    })),
  },
  workspace: {
    textDocuments: [] as MockDocument[],
    fs: { stat: jest.fn() },
    asRelativePath: jest.fn((uri: { fsPath: string }) => uri.fsPath),
    openTextDocument: jest.fn(),
    getConfiguration: jest.fn(() => ({
      get: jest.fn((key: string, defaultValue: unknown) => configValues[key] ?? defaultValue),
    })),
    onDidChangeConfiguration: jest.fn(disposable),
    onDidOpenTextDocument: jest.fn(disposable),
    onDidChangeTextDocument: jest.fn(disposable),
    onDidCloseTextDocument: jest.fn(disposable),
  },
};

jest.mock('vscode', () => mockVscode, { virtual: true });

describe('MaxiMinion VS Code commands', () => {
  const sourceText = 'const apiKey = "sk-proj-abcdef1234567890abcdef1234567890";';

  beforeEach(() => {
    jest.clearAllMocks();
    commandHandlers.clear();
    for (const key of Object.keys(configValues)) delete configValues[key];
    for (const key of Object.keys(globalStateValues)) delete globalStateValues[key];
    mockVscode.workspace.textDocuments = [];
    mockVscode.window.showInformationMessage.mockResolvedValue(undefined);
    mockVscode.window.showWarningMessage.mockResolvedValue(undefined);
    mockVscode.window.activeTextEditor = { document: makeDocument(sourceText) };
    mockVscode.workspace.openTextDocument.mockResolvedValue({ uri: 'untitled:preview' });
    jest.resetModules();
    jest.doMock('vscode', () => mockVscode, { virtual: true });

    const { activate } = require('../src/extension') as typeof import('../src/extension');
    activate({
      subscriptions: [],
      globalState: {
        get: (key: string) => globalStateValues[key],
        update: jest.fn((key: string, value: unknown) => {
          globalStateValues[key] = value;
          return Promise.resolve();
        }),
      },
    } as unknown as import('vscode').ExtensionContext);
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
      'MaxiMinion: Open a text document before sanitizing.',
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
    expect(fakeWebviewView.webview.html).toContain('Report format: json');

    configValues['manifest.exportFormat'] = 'markdown';
    const configCalls = mockVscode.workspace.onDidChangeConfiguration.mock.calls as any[];
    const configCallback = configCalls[configCalls.length - 1][0];
    configCallback({ affectsConfiguration: () => true });

    expect(fakeWebviewView.webview.html).toContain('Report format: markdown');
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
      expect.stringMatching(
        /^MaxiMinion: Refiner complete: signal (LOW|MEDIUM|HIGH), \d+ value\(s\) redacted, \d+\.\d% (smaller|larger)\./,
      ),
      'Show Report',
      'What does this mean?',
    );
    expect(outputChannel.appendLine).toHaveBeenCalledWith(expect.stringMatching(/-> (LOW|MEDIUM|HIGH) signal:/));
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
      'MaxiMinion: Open a text document before running the Refiner.',
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

  describe('Copy for AI', () => {
    test('copies a sanitized, fenced block of the active file and reports token estimates', async () => {
      await commandHandlers.get('maximinion.copyForAI')!();

      const copied = mockVscode.env.clipboard.writeText.mock.calls[0][0] as string;
      expect(copied).toContain('### test.ts');
      expect(copied).toContain('```typescript');
      expect(copied).toContain('[REDACTED_API_KEY]');
      expect(copied).not.toContain('sk-proj-abcdef1234567890abcdef1234567890');
      expect(mockVscode.window.showInformationMessage).toHaveBeenCalledWith(
        expect.stringMatching(/^MaxiMinion: Copied for AI: 1 source\(s\), 1 value\(s\) redacted, ~\d+ → ~\d+ tokens\.$/),
      );
    });

    test('copies only the selection when text is selected', async () => {
      mockVscode.window.activeTextEditor = {
        document: { ...makeDocument(sourceText), getText: (range?: unknown) => (range ? 'const a = 1;' : sourceText) },
        selection: { isEmpty: false, start: { line: 4 }, end: { line: 6 } },
      };

      await commandHandlers.get('maximinion.copyForAI')!();

      const copied = mockVscode.env.clipboard.writeText.mock.calls[0][0] as string;
      expect(copied).toContain('### test.ts (lines 5-7)');
      expect(copied).toContain('const a = 1;');
      expect(copied).not.toContain('apiKey');
    });

    test('combines files selected in the Explorer and skips folders', async () => {
      const fileA = makeDocument('export const a = 1;', 'src/a.ts');
      const fileB = makeDocument('# Notes', 'docs/b.md', 'markdown');
      const folder = makeDocument('', 'src');
      mockVscode.workspace.fs.stat.mockImplementation(async (uri: unknown) => ({
        type: uri === folder.uri ? mockVscode.FileType.Directory : mockVscode.FileType.File,
      }));
      mockVscode.workspace.openTextDocument.mockImplementation(async (uri: unknown) =>
        uri === fileA.uri ? fileA : fileB,
      );

      await commandHandlers.get('maximinion.copyForAI')!(fileA.uri, [fileA.uri, folder.uri, fileB.uri]);

      const copied = mockVscode.env.clipboard.writeText.mock.calls[0][0] as string;
      expect(copied).toContain('### src/a.ts');
      expect(copied).toContain('### docs/b.md');
      expect(copied).toContain('```markdown');
      expect(mockVscode.window.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('Copied for AI: 2 source(s)'),
      );
    });

    test('copies the whole file from the Explorer even when it is the active editor with a selection', async () => {
      const active = {
        ...makeDocument(sourceText),
        getText: (range?: unknown) => (range ? 'const a = 1;' : sourceText),
      };
      mockVscode.window.activeTextEditor = {
        document: active,
        selection: { isEmpty: false, start: { line: 0 }, end: { line: 0 } },
      };
      mockVscode.workspace.fs.stat.mockResolvedValue({ type: mockVscode.FileType.File });
      mockVscode.workspace.openTextDocument.mockResolvedValue(active);

      await commandHandlers.get('maximinion.copyForAI')!(active.uri, [active.uri]);

      const copied = mockVscode.env.clipboard.writeText.mock.calls[0][0] as string;
      expect(copied).toContain('### test.ts\n');
      expect(copied).toContain('[REDACTED_API_KEY]');
    });

    test('warns when the payload exceeds the token budget', async () => {
      configValues['tokenBudget'] = 1;

      await commandHandlers.get('maximinion.copyForAI')!();

      expect(mockVscode.env.clipboard.writeText).toHaveBeenCalled();
      expect(mockVscode.window.showWarningMessage).toHaveBeenCalledWith(
        expect.stringContaining('exceeds your token budget of ~1'),
        'Change Budget',
      );
    });

    test('warns when there is no active editor or selected file', async () => {
      mockVscode.window.activeTextEditor = undefined;

      await commandHandlers.get('maximinion.copyForAI')!();

      expect(mockVscode.env.clipboard.writeText).not.toHaveBeenCalled();
      expect(mockVscode.window.showWarningMessage).toHaveBeenCalledWith(
        'MaxiMinion: Open a file or select files in the Explorer before using Copy for AI.',
      );
    });
  });

  describe('status bar', () => {
    test('shows the estimated token count for the active file', () => {
      expect(statusBarItem.text).toMatch(/^\$\(shield\) ~\d+ tokens$/);
      expect(statusBarItem.command).toBe('maximinion.copyForAI');
      expect(statusBarItem.show).toHaveBeenCalled();
    });

    test('hides when disabled in settings', () => {
      configValues['statusBar.enabled'] = false;
      const configCallback = (mockVscode.workspace.onDidChangeConfiguration.mock.calls as any[])[0][0];
      configCallback({ affectsConfiguration: () => true });

      expect(statusBarItem.hide).toHaveBeenCalled();
    });
  });

  describe('inline secret diagnostics', () => {
    function refreshWith(document: MockDocument) {
      const openCallback = (mockVscode.workspace.onDidOpenTextDocument.mock.calls as any[])[0][0];
      openCallback(document);
      const calls = diagnosticCollection.set.mock.calls;
      return calls[calls.length - 1][1] as Array<{
        range: { start: { offset: number }; end: { offset: number } };
        code: string;
        source: string;
        severity: number;
      }>;
    }

    test('flags only the secret value and offers a redact quick fix', () => {
      const document = makeDocument(sourceText);
      const [diagnostic, ...rest] = refreshWith(document);

      expect(rest).toHaveLength(0);
      expect(diagnostic.source).toBe('MaxiMinion');
      expect(diagnostic.severity).toBe(mockVscode.DiagnosticSeverity.Warning);
      expect(sourceText.slice(diagnostic.range.start.offset, diagnostic.range.end.offset)).toBe(
        'sk-proj-abcdef1234567890abcdef1234567890',
      );

      const provider = (mockVscode.languages.registerCodeActionsProvider.mock.calls as any[])[0][1];
      const [action] = provider.provideCodeActions(document, diagnostic.range, { diagnostics: [diagnostic] });
      expect(action.title).toBe('MaxiMinion: Redact with [REDACTED_API_KEY]');
      expect(action.edit.replacements).toEqual([
        { uri: document.uri, range: diagnostic.range, text: '[REDACTED_API_KEY]' },
      ]);
    });

    test('ignores environment variable references and low-confidence matches', () => {
      const diagnostics = refreshWith(
        makeDocument('const key = process.env.API_KEY;\nconst token = getToken();\n'),
      );

      expect(diagnostics).toEqual([]);
    });

    test('clears diagnostics when disabled in settings', () => {
      configValues['secretDiagnostics.enabled'] = false;
      const openCallback = (mockVscode.workspace.onDidOpenTextDocument.mock.calls as any[])[0][0];
      const document = makeDocument(sourceText);

      openCallback(document);

      expect(diagnosticCollection.delete).toHaveBeenCalledWith(document.uri);
      expect(diagnosticCollection.set).not.toHaveBeenCalled();
    });
  });

  describe('help and discoverability', () => {
    test('Get Started & Help opens the MaxiMinion walkthrough', async () => {
      mockVscode.commands.executeCommand.mockResolvedValue(undefined);

      await commandHandlers.get('maximinion.showHelp')!();

      expect(mockVscode.commands.executeCommand).toHaveBeenCalledWith(
        'workbench.action.openWalkthrough',
        'maximinion.maximinion#gettingStarted',
        false,
      );
    });

    test('secret diagnostics link their code to the help page', () => {
      const openCallback = (mockVscode.workspace.onDidOpenTextDocument.mock.calls as any[])[0][0];
      openCallback(makeDocument(sourceText));
      const [diagnostic] = diagnosticCollection.set.mock.calls[0][1];

      expect(diagnostic.code.value).toBe('API_KEY');
      expect(diagnostic.code.target.value).toContain('README.md#inline-secret-warnings');
    });

    test('sidebar explains each action and links to help', () => {
      const provider = (mockVscode.window.registerWebviewViewProvider.mock.calls as any[])[0][1];
      const fakeWebviewView = {
        webview: { options: undefined as unknown, html: '', onDidReceiveMessage: jest.fn() },
        onDidDispose: jest.fn(),
      };
      provider.resolveWebviewView(fakeWebviewView);
      const onMessage = fakeWebviewView.webview.onDidReceiveMessage.mock.calls[0][0];

      expect(fakeWebviewView.webview.html).toContain('The Refiner scores how much real signal a file has');
      onMessage({ command: 'showHelp' });
      onMessage({ command: 'runRefiner' });
      onMessage({ command: 'notAllowed' });

      expect(mockVscode.commands.executeCommand).toHaveBeenCalledWith('maximinion.showHelp');
      expect(mockVscode.commands.executeCommand).toHaveBeenCalledWith('maximinion.runRefinerOnActiveFile');
      expect(mockVscode.commands.executeCommand).not.toHaveBeenCalledWith(undefined);
    });
  });

  describe('Community Edition notice', () => {
    test('is shown once on first activation and offers the license', () => {
      expect(mockVscode.window.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining("provided 'AS IS' without warranties"),
        'Get Started',
        'View License',
      );
      expect(globalStateValues['maximinion.ceNoticeShown']).toBe(true);
    });

    test('is not shown again after it has been acknowledged', () => {
      mockVscode.window.showInformationMessage.mockClear();
      const { activate } = require('../src/extension') as typeof import('../src/extension');
      activate({
        subscriptions: [],
        globalState: { get: (key: string) => globalStateValues[key], update: jest.fn() },
      } as unknown as import('vscode').ExtensionContext);

      expect(mockVscode.window.showInformationMessage).not.toHaveBeenCalled();
    });

    test('appears in the sidebar', () => {
      const provider = (mockVscode.window.registerWebviewViewProvider.mock.calls as any[])[0][1];
      const fakeWebviewView = {
        webview: { options: undefined as unknown, html: '', onDidReceiveMessage: jest.fn() },
        onDidDispose: jest.fn(),
      };

      provider.resolveWebviewView(fakeWebviewView);

      expect(fakeWebviewView.webview.html).toContain("provided 'AS IS' without warranties");
      expect(fakeWebviewView.webview.html).toContain('Copy for AI (Sanitized)');
    });
  });
});