type CommandHandler = (...args: unknown[]) => unknown;

const commandHandlers = new Map<string, CommandHandler>();
const mockVscode = {
  commands: {
    registerCommand: jest.fn((id: string, handler: CommandHandler) => {
      commandHandlers.set(id, handler);
      return { dispose: jest.fn() };
    }),
  },
  env: {
    clipboard: { writeText: jest.fn() },
  },
  window: {
    activeTextEditor: undefined as
      | { document: { getText: () => string; languageId: string } }
      | undefined,
    showInformationMessage: jest.fn(),
    showTextDocument: jest.fn(),
    showWarningMessage: jest.fn(),
  },
  workspace: {
    openTextDocument: jest.fn(),
  },
};

jest.mock('vscode', () => mockVscode, { virtual: true });

describe('MaxiMinion VS Code commands', () => {
  const sourceText = 'const apiKey = "sk-proj-abcdef1234567890abcdef1234567890";';

  beforeEach(() => {
    jest.clearAllMocks();
    commandHandlers.clear();
    mockVscode.window.activeTextEditor = {
      document: {
        getText: () => sourceText,
        languageId: 'typescript',
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
});