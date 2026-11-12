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
// Values from a workspace's .vscode/settings.json; `get` applies them like a host that ignores setting scopes.
const workspaceConfigValues: Record<string, unknown> = {};
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
const configUpdate = jest.fn(async (key: string, value: unknown) => {
  configValues[key] = value;
});

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
  ProgressLocation: { Notification: 15 },
  ConfigurationTarget: { Global: 1 },
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
    showQuickPick: jest.fn(),
    withProgress: jest.fn((_options: unknown, task: (progress: unknown, token: unknown) => unknown) =>
      task({ report: jest.fn() }, { onCancellationRequested: jest.fn() }),
    ),
    registerWebviewViewProvider: jest.fn(disposable),
    createStatusBarItem: jest.fn(() => statusBarItem),
    onDidChangeActiveTextEditor: jest.fn(disposable),
    onDidChangeTextEditorSelection: jest.fn(disposable),
    createOutputChannel: jest.fn((name: string) => ({
      name,
      appendLine: jest.fn(),
      info: jest.fn(),
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
      get: jest.fn(
        (key: string, defaultValue: unknown) => workspaceConfigValues[key] ?? configValues[key] ?? defaultValue,
      ),
      inspect: jest.fn((key: string) => ({
        key,
        globalValue: configValues[key],
        workspaceValue: workspaceConfigValues[key],
      })),
      update: configUpdate,
    })),
    onDidChangeConfiguration: jest.fn(disposable),
    onDidOpenTextDocument: jest.fn(disposable),
    onDidChangeTextDocument: jest.fn(disposable),
    onDidCloseTextDocument: jest.fn(disposable),
  },
};

jest.mock('vscode', () => mockVscode, { virtual: true });

function activityLines(): string[] {
  const channel = (mockVscode.window.createOutputChannel.mock.results as Array<{ value: any }>)
    .map((result) => result.value)
    .filter((value) => value.name === 'MaxiMinion Activity')
    .pop();
  return channel ? (channel.info.mock.calls as string[][]).map((call) => call[0]) : [];
}

describe('MaxiMinion VS Code commands', () => {
  const sourceText = 'const apiKey = "sk-proj-abcdef1234567890abcdef1234567890";';

  beforeEach(() => {
    jest.clearAllMocks();
    commandHandlers.clear();
    for (const key of Object.keys(configValues)) delete configValues[key];
    for (const key of Object.keys(workspaceConfigValues)) delete workspaceConfigValues[key];
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

  test('ignores workspace settings that try to turn off secret redaction', async () => {
    workspaceConfigValues['secretScrubbing.enabled'] = false;

    await commandHandlers.get('maximinion.copySanitizedActiveFile')!();
    await commandHandlers.get('maximinion.copyForAI')!();

    for (const [text] of mockVscode.env.clipboard.writeText.mock.calls as any[]) {
      expect(text).not.toContain('sk-proj-abcdef1234567890abcdef1234567890');
    }
    expect(mockVscode.env.clipboard.writeText).toHaveBeenCalledTimes(2);
  });

  test('still lets the user turn off secret redaction in user settings', async () => {
    configValues['secretScrubbing.enabled'] = false;

    await commandHandlers.get('maximinion.copySanitizedActiveFile')!();

    expect(mockVscode.env.clipboard.writeText).toHaveBeenCalledWith(sourceText);
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

    test('ignores workspace settings that try to hide secret warnings', () => {
      workspaceConfigValues['secretDiagnostics.enabled'] = false;
      workspaceConfigValues['secretDiagnostics.minConfidence'] = 1;

      expect(refreshWith(makeDocument(sourceText))).toHaveLength(1);
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

  describe('security guardrails', () => {
    const secret = 'sk-proj-abcdef1234567890abcdef1234567890';

    test('Copy for AI logs paths and counts, never content', async () => {
      await commandHandlers.get('maximinion.copyForAI')!();

      const [line, ...rest] = activityLines();
      expect(rest).toEqual([]);
      expect(line).toMatch(/^Copied to clipboard \(Copy for AI\): 1 source\(s\) \[test\.ts\], 1 redacted, secret redaction on, ~\d+ tokens$/);
      expect(line).not.toContain(secret);
      expect(line).not.toContain('apiKey');
    });

    test('asks before copying a credentials file and copies nothing if cancelled', async () => {
      mockVscode.window.activeTextEditor = { document: makeDocument(`OPENAI_KEY=${secret}\n`, '.env', 'dotenv') };

      await commandHandlers.get('maximinion.copyForAI')!();

      expect(mockVscode.window.showWarningMessage).toHaveBeenCalledWith(
        expect.stringContaining('.env (environment file) usually holds credentials'),
        { modal: true },
        'Copy Anyway',
      );
      expect(mockVscode.env.clipboard.writeText).not.toHaveBeenCalled();
      expect(activityLines()).toEqual(['Not copied (Copy for AI): [.env], looks like a credentials file']);
    });

    test('copies a credentials file, still redacted, only when the user confirms', async () => {
      mockVscode.window.activeTextEditor = { document: makeDocument(`OPENAI_KEY=${secret}\n`, '.env', 'dotenv') };
      mockVscode.window.showWarningMessage.mockResolvedValueOnce('Copy Anyway');

      await commandHandlers.get('maximinion.copyForAI')!();

      const copied = mockVscode.env.clipboard.writeText.mock.calls[0][0] as string;
      expect(copied).toContain('### .env');
      expect(copied).not.toContain(secret);
    });

    test('can skip credentials files in an Explorer selection and copy the rest', async () => {
      const code = makeDocument('export const a = 1;', 'src/a.ts');
      const env = makeDocument('PASSWORD=hunter2hunter2', 'config/.env.local', 'dotenv');
      const template = makeDocument('PASSWORD=', '.env.example', 'dotenv');
      mockVscode.workspace.fs.stat.mockResolvedValue({ type: mockVscode.FileType.File });
      mockVscode.workspace.openTextDocument.mockImplementation(async (uri: unknown) =>
        [code, env, template].find((doc) => doc.uri === uri),
      );
      mockVscode.window.showWarningMessage.mockResolvedValueOnce('Skip These Files');

      await commandHandlers.get('maximinion.copyForAI')!(code.uri, [code.uri, env.uri, template.uri]);

      const copied = mockVscode.env.clipboard.writeText.mock.calls[0][0] as string;
      expect(copied).toContain('### src/a.ts');
      expect(copied).toContain('### .env.example');
      expect(copied).not.toContain('config/.env.local');
      expect(activityLines()[0]).toBe('Not copied (Copy for AI): [config/.env.local], looks like a credentials file');
    });

    test('asks before copying hidden Unicode and never strips it', async () => {
      const trojan = 'const isAdmin = false; /*\u202E } if (isAdmin) \u2066*/';
      mockVscode.window.activeTextEditor = { document: makeDocument(trojan) };

      await commandHandlers.get('maximinion.copyForAI')!();
      expect(mockVscode.window.showWarningMessage).toHaveBeenCalledWith(
        expect.stringContaining('Hidden Unicode found (test.ts: 2 bidirectional control(s))'),
        { modal: true },
        'Copy Anyway',
        'Show',
      );
      expect(mockVscode.env.clipboard.writeText).not.toHaveBeenCalled();

      mockVscode.window.showWarningMessage.mockResolvedValueOnce('Copy Anyway');
      await commandHandlers.get('maximinion.copyForAI')!();
      expect(mockVscode.env.clipboard.writeText.mock.calls[0][0]).toContain('\u202E');
      expect(activityLines().pop()).toMatch(/, 2 hidden Unicode character\(s\)$/);
    });

    test('Copy Sanitized File uses the same checks and activity log', async () => {
      mockVscode.window.activeTextEditor = { document: makeDocument(`key: ${secret}`, 'deploy/server.pem') };

      await commandHandlers.get('maximinion.copySanitizedActiveFile')!();
      expect(mockVscode.env.clipboard.writeText).not.toHaveBeenCalled();

      mockVscode.window.showWarningMessage.mockResolvedValueOnce('Copy Anyway');
      await commandHandlers.get('maximinion.copySanitizedActiveFile')!();
      expect(mockVscode.env.clipboard.writeText).toHaveBeenCalledWith(expect.not.stringContaining(secret));
      expect(activityLines().pop()).toMatch(/^Copied to clipboard \(Copy Sanitized File\): 1 source\(s\) \[deploy\/server\.pem\]/);
    });

    test('Show Activity Log opens the activity channel', () => {
      commandHandlers.get('maximinion.showActivityLog')!();

      const channel = (mockVscode.window.createOutputChannel.mock.results as Array<{ value: any }>)
        .map((result) => result.value)
        .find((value) => value.name === 'MaxiMinion Activity');
      expect(mockVscode.window.createOutputChannel).toHaveBeenCalledWith('MaxiMinion Activity', { log: true });
      expect(channel.show).toHaveBeenCalled();
    });
  });

  describe('semantic folding', () => {
    const realFetch = global.fetch;
    let generateCalls: number;

    function mockOllama(options: { reachable?: boolean; models?: string[]; summary?: string }) {
      generateCalls = 0;
      global.fetch = jest.fn(async (url: any) => {
        if (options.reachable === false) throw new Error('connect ECONNREFUSED');
        if (String(url).endsWith('/api/tags')) {
          return { ok: true, status: 200, json: async () => ({ models: (options.models ?? []).map((name) => ({ name })) }) };
        }
        generateCalls++;
        return { ok: true, status: 200, json: async () => ({ response: options.summary ?? 'Adds numbers.' }) };
      }) as unknown as typeof fetch;
    }

    beforeEach(() => {
      configValues['semanticFolding.enabled'] = true;
      jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    afterEach(() => {
      global.fetch = realFetch;
      jest.restoreAllMocks();
    });

    const outputLines = () =>
      (mockVscode.window.createOutputChannel.mock.results[0].value.appendLine.mock.calls as string[][]).map((c) => c[0]);

    test('folds with the configured model behind a cancellable progress notification', async () => {
      configValues['semanticFolding.model'] = 'gemma4:26b';
      mockOllama({ models: ['gemma4:26b'], summary: 'Adds numbers.' });

      await commandHandlers.get('maximinion.runRefinerOnActiveFile')!();

      expect(mockVscode.window.withProgress).toHaveBeenCalledWith(
        expect.objectContaining({ cancellable: true, title: expect.stringContaining('gemma4:26b') }),
        expect.any(Function),
      );
      expect(mockVscode.workspace.openTextDocument).toHaveBeenCalledWith({
        content: '# Adds numbers.',
        language: 'typescript',
      });
      expect(outputLines()).toContainEqual(expect.stringContaining('Semantic folding: applied with gemma4:26b'));
    });

    test('only contacts the fixed local endpoint, refuses redirects, and logs what was sent', async () => {
      configValues['semanticFolding.model'] = 'gemma4:26b';
      mockOllama({ models: ['gemma4:26b'], summary: 'Adds numbers.' });

      await commandHandlers.get('maximinion.runRefinerOnActiveFile')!();

      const calls = (global.fetch as jest.Mock).mock.calls as Array<[string, RequestInit | undefined]>;
      expect(calls.length).toBeGreaterThan(0);
      for (const [url, init] of calls) {
        expect(String(url)).toMatch(/^http:\/\/localhost:11434\//);
        expect(init?.redirect).toBe('error');
      }
      expect(activityLines()).toContainEqual(
        expect.stringMatching(/^Sent to local model gemma4:26b at http:\/\/localhost:11434: test\.ts, ~\d+ tokens, secret redaction on$/),
      );
    });

    test('explains a missing model, lists installed ones, and offers to switch', async () => {
      mockOllama({ models: ['gemma4:26b'] });

      await commandHandlers.get('maximinion.runRefinerOnActiveFile')!();

      expect(generateCalls).toBe(0);
      expect(mockVscode.window.showWarningMessage).toHaveBeenCalledWith(
        'MaxiMinion: Semantic folding skipped: Model "phi3" is not installed in Ollama (installed: gemma4:26b).',
        'Use gemma4:26b',
        'Choose Model',
        'Test Again',
      );
      expect(outputLines()).not.toContainEqual(expect.stringContaining('Semantic folding: applied'));
      expect(mockVscode.workspace.openTextDocument).toHaveBeenCalledWith({
        content: expect.stringContaining('[REDACTED_API_KEY]'),
        language: 'typescript',
      });
    });

    test('explains when Ollama is not running', async () => {
      mockOllama({ reachable: false });

      await commandHandlers.get('maximinion.runRefinerOnActiveFile')!();

      expect(mockVscode.window.showWarningMessage).toHaveBeenCalledWith(
        'MaxiMinion: Semantic folding skipped: Ollama is not running at http://localhost:11434.',
        'Install Ollama',
        'Test Again',
      );
      expect(mockVscode.window.withProgress).not.toHaveBeenCalled();
    });

    test('matches the model name without the :latest tag', async () => {
      mockOllama({ models: ['phi3:latest'] });

      await commandHandlers.get('maximinion.runRefinerOnActiveFile')!();

      expect(generateCalls).toBe(1);
    });

    describe('setup check', () => {
      const changeFoldingSetting = async () => {
        const configCallback = (mockVscode.workspace.onDidChangeConfiguration.mock.calls as any[])[0][0];
        configCallback({ affectsConfiguration: (section: string) => section.startsWith('maximinion') });
        await new Promise((resolve) => setTimeout(resolve, 700)); // debounce + async check
      };

      test('turning folding on with a missing model turns it off again and explains why', async () => {
        mockOllama({ models: ['gemma4:26b'] });

        await changeFoldingSetting();

        expect(configUpdate).toHaveBeenCalledWith('semanticFolding.enabled', false, mockVscode.ConfigurationTarget.Global);
        expect(configValues['semanticFolding.enabled']).toBe(false);
        expect(mockVscode.window.showWarningMessage).toHaveBeenCalledWith(
          'MaxiMinion: Semantic folding was turned off because the setup check failed: Model "phi3" is not installed in Ollama (installed: gemma4:26b).',
          'Use gemma4:26b',
          'Choose Model',
          'Test Again',
        );
      });

      test('turning folding on when Ollama is not running turns it off again', async () => {
        mockOllama({ reachable: false });

        await changeFoldingSetting();

        expect(configValues['semanticFolding.enabled']).toBe(false);
        expect(mockVscode.window.showWarningMessage).toHaveBeenCalledWith(
          expect.stringContaining('Ollama is not running'),
          'Install Ollama',
          'Test Again',
        );
      });

      test('turning folding on with a working setup keeps it on and confirms', async () => {
        configValues['semanticFolding.model'] = 'gemma4:26b';
        mockOllama({ models: ['gemma4:26b'] });

        await changeFoldingSetting();

        expect(configValues['semanticFolding.enabled']).toBe(true);
        expect(configUpdate).not.toHaveBeenCalled();
        expect(mockVscode.window.showInformationMessage).toHaveBeenCalledWith(
          'MaxiMinion: Semantic folding is ready: Ollama is running and "gemma4:26b" is installed.',
        );
      });

      test('Test Setup runs a sample fold and offers to turn folding on', async () => {
        configValues['semanticFolding.enabled'] = false;
        configValues['semanticFolding.model'] = 'gemma4:26b';
        mockOllama({ models: ['gemma4:26b'], summary: 'Adds two numbers.' });

        await commandHandlers.get('maximinion.testSemanticFolding')!();

        expect(generateCalls).toBe(1);
        expect(mockVscode.window.showInformationMessage).toHaveBeenCalledWith(
          expect.stringMatching(/^MaxiMinion: Semantic folding test passed: "gemma4:26b" summarized a sample function in \d+\.\ds: # Adds two numbers\.$/),
          'Turn On Folding',
        );
      });

      test('the sidebar shows readiness and a Test Folding Setup button', async () => {
        mockOllama({ reachable: false });
        await commandHandlers.get('maximinion.testSemanticFolding')!();
        const provider = (mockVscode.window.registerWebviewViewProvider.mock.calls as any[])[0][1];
        const view = { webview: { options: undefined as unknown, html: '', onDidReceiveMessage: jest.fn() }, onDidDispose: jest.fn() };

        provider.resolveWebviewView(view);

        expect(view.webview.html).toContain('✗ not ready. Ollama is not running at http://localhost:11434.');
        expect(view.webview.html).toContain('data-command="testFolding"');
      });
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