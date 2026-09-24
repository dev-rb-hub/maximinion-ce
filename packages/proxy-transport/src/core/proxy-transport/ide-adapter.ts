/**
 * IDE Adapter Module for Phase 4
 *
 * Provides abstraction for IDE integration (VS Code, JetBrains, etc.)
 */

import { IDEAdapter, Decoration, ProgressBar } from './types';

/**
 * VS Code IDE Adapter Implementation
 */
export class VSCodeAdapter implements IDEAdapter {
  name = 'VS Code';
  version = '1.0.0';
  capabilities = ['file_navigation', 'code_highlighting', 'decorations', 'context_menu', 'progress'];

  private activeFileWatchers = new Set<string>();
  private decorations = new Map<string, Decoration[]>();

  /**
   * Get currently active file in editor
   */
  async getActiveFile(): Promise<string | null> {
    // In real implementation, this would query VS Code API
    // For now, return mock data
    return '/src/main.ts';
  }

  /**
   * Get selected text in editor
   */
  async getSelectedText(): Promise<string | null> {
    // In real implementation, this would query VS Code API
    return null;
  }

  /**
   * Get file content
   */
  async getFileContent(path: string): Promise<string | null> {
    // In real implementation, this would read from VS Code workspace
    return null;
  }

  /**
   * Get workspace root path
   */
  async getWorkspacePath(): Promise<string | null> {
    // In real implementation, this would query VS Code workspace
    return '/home/user/project';
  }

  /**
   * Show message to user
   */
  async showMessage(message: string, type: 'info' | 'warning' | 'error'): Promise<void> {
    const prefix = type.toUpperCase();
    console.log(`[${prefix}] ${message}`);
    // In real implementation, this would show VS Code notification
  }

  /**
   * Show progress bar
   */
  async showProgressBar(label: string, maxValue?: number): Promise<ProgressBar> {
    console.log(`[Progress] ${label}`);

    return {
      update: async (value: number, label?: string) => {
        const percentage = maxValue ? Math.round((value / maxValue) * 100) : 0;
        console.log(`[Progress] ${label || 'Processing'}: ${percentage}%`);
      },
      close: async () => {
        console.log('[Progress] Complete');
      },
    };
  }

  /**
   * Open file in editor
   */
  async openFile(path: string, line?: number, column?: number): Promise<void> {
    const location = line ? `${path}:${line}${column ? `:${column}` : ''}` : path;
    console.log(`[Navigation] Opening file: ${location}`);
    // In real implementation, would use VS Code command
  }

  /**
   * Highlight range in editor
   */
  async highlightRange(path: string, startLine: number, endLine: number, column?: number): Promise<void> {
    console.log(`[Highlighting] ${path}:${startLine}-${endLine}`);
    // In real implementation, would apply VS Code selection/decoration
  }

  /**
   * Set decorations (colors, underlines, etc.)
   */
  async setDecorations(path: string, decorations: Decoration[]): Promise<void> {
    this.decorations.set(path, decorations);
    console.log(`[Decorations] Applied ${decorations.length} to ${path}`);
    // In real implementation, would apply VS Code decorations
  }

  /**
   * Clear decorations
   */
  async clearDecorations(path: string): Promise<void> {
    this.decorations.delete(path);
    console.log(`[Decorations] Cleared for ${path}`);
  }

  /**
   * Register context menu command
   */
  async registerContextCommand(
    id: string,
    label: string,
    callback: (nodeId: string) => Promise<void>,
  ): Promise<void> {
    console.log(`[ContextMenu] Registered command: ${label}`);
    // In real implementation, would register VS Code command
  }

  /**
   * Watch file for changes
   */
  watchFile(path: string, onChange: (content: string) => Promise<void>): () => void {
    this.activeFileWatchers.add(path);
    console.log(`[FileWatch] Watching: ${path}`);

    // Return unwatch function
    return () => {
      this.activeFileWatchers.delete(path);
      console.log(`[FileWatch] Stopped watching: ${path}`);
    };
  }

  /**
   * Get diagnostics for file
   */
  async getDiagnostics(path: string): Promise<Array<{ line: number; message: string; severity: string }>> {
    // In real implementation, would query VS Code diagnostics
    return [];
  }

  /**
   * Apply quick fix
   */
  async applyQuickFix(path: string, line: number, fix: string): Promise<void> {
    console.log(`[QuickFix] Applied to ${path}:${line}`);
    // In real implementation, would execute VS Code quick fix
  }
}

/**
 * JetBrains IDE Adapter Implementation (stub)
 */
export class JetBrainsAdapter implements IDEAdapter {
  name = 'JetBrains';
  version = '1.0.0';
  capabilities = ['file_navigation', 'code_highlighting', 'context_menu'];

  async getActiveFile(): Promise<string | null> {
    return null;
  }

  async getSelectedText(): Promise<string | null> {
    return null;
  }

  async getFileContent(path: string): Promise<string | null> {
    return null;
  }

  async getWorkspacePath(): Promise<string | null> {
    return null;
  }

  async showMessage(message: string, type: 'info' | 'warning' | 'error'): Promise<void> {
    console.log(`[JetBrains ${type.toUpperCase()}] ${message}`);
  }

  async showProgressBar(label: string, maxValue?: number): Promise<ProgressBar> {
    return {
      update: async (value: number, label?: string) => {},
      close: async () => {},
    };
  }

  async openFile(path: string, line?: number, column?: number): Promise<void> {
    console.log(`[JetBrains] Opening: ${path}`);
  }

  async highlightRange(path: string, startLine: number, endLine: number, column?: number): Promise<void> {
    console.log(`[JetBrains] Highlighting: ${path}:${startLine}-${endLine}`);
  }

  async setDecorations(path: string, decorations: Decoration[]): Promise<void> {
    console.log(`[JetBrains] Applied ${decorations.length} decorations to ${path}`);
  }

  async clearDecorations(path: string): Promise<void> {
    console.log(`[JetBrains] Cleared decorations for ${path}`);
  }

  async registerContextCommand(
    id: string,
    label: string,
    callback: (nodeId: string) => Promise<void>,
  ): Promise<void> {
    console.log(`[JetBrains] Registered: ${label}`);
  }
}

/**
 * Mock IDE Adapter for testing
 */
export class MockIDEAdapter implements IDEAdapter {
  name = 'Mock';
  version = '1.0.0';
  capabilities = [];

  private mockState: Record<string, unknown> = {};

  async getActiveFile(): Promise<string | null> {
    return (this.mockState.activeFile as string) || null;
  }

  async getSelectedText(): Promise<string | null> {
    return (this.mockState.selectedText as string) || null;
  }

  async getFileContent(path: string): Promise<string | null> {
    return (this.mockState[`file_${path}`] as string) || null;
  }

  async getWorkspacePath(): Promise<string | null> {
    return (this.mockState.workspacePath as string) || null;
  }

  async showMessage(message: string, type: 'info' | 'warning' | 'error'): Promise<void> {
    this.mockState[`message_${Date.now()}`] = { message, type };
  }

  async showProgressBar(label: string, maxValue?: number): Promise<ProgressBar> {
    return {
      update: async (value: number, label?: string) => {
        this.mockState.lastProgress = { value, label };
      },
      close: async () => {},
    };
  }

  async openFile(path: string, line?: number, column?: number): Promise<void> {
    this.mockState.lastOpenedFile = { path, line, column };
  }

  async highlightRange(path: string, startLine: number, endLine: number, column?: number): Promise<void> {
    this.mockState.lastHighlight = { path, startLine, endLine, column };
  }

  async setDecorations(path: string, decorations: Decoration[]): Promise<void> {
    this.mockState[`decorations_${path}`] = decorations;
  }

  async clearDecorations(path: string): Promise<void> {
    delete this.mockState[`decorations_${path}`];
  }

  async registerContextCommand(
    id: string,
    label: string,
    callback: (nodeId: string) => Promise<void>,
  ): Promise<void> {
    this.mockState[`command_${id}`] = { label, callback };
  }

  // Test helpers
  setMockState(key: string, value: unknown): void {
    this.mockState[key] = value;
  }

  getMockState(): Record<string, unknown> {
    return { ...this.mockState };
  }
}
