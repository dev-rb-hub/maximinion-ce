/**
 * Type definitions for Phase 4: The Proxy Transport
 *
 * Defines real-time context injection, transport protocols,
 * IDE adapters, and context streaming models.
 */

import { Manifest, ManifestNode, CrossReference } from '@maximinion/manifest-generator';

/**
 * Represents an active context session
 */
export interface ContextSession {
  id: string;
  clientId: string;
  createdAt: number;
  lastAccessedAt: number;
  expiresAt: number;

  // Session context
  projectPath: string;
  manifestId: string;
  language: string;

  // Selection state
  currentFile?: string;
  selectedNodeIds: string[];
  focusedNodeId?: string;

  // Statistics
  accessCount: number;
  bytesTransferred: number;
}

/**
 * Represents a context query from IDE/LLM
 */
export interface ContextQuery {
  nodeIds?: string[];
  path?: string;
  importance?: { min: number; max: number };
  complexity?: { min: number; max: number };
  maxTokens?: number;
  includeImports?: boolean;
  includeDependents?: boolean;
  maxDepth?: number;
}

/**
 * Result of context query with selected nodes and references
 */
export interface ContextResult {
  sessionId: string;
  nodes: ManifestNode[];
  references: CrossReference[];
  totalNodes: number;
  selectedCount: number;
  estimatedTokens: number;
  compressionRatio: number;
  generatedAt: number;
}

/**
 * Transport message format for real-time communication
 */
export interface TransportMessage {
  id: string;
  type: 'query' | 'response' | 'update' | 'heartbeat' | 'subscribe' | 'unsubscribe' | 'error';
  sessionId: string;
  timestamp: number;
  payload?: unknown;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Manifest stream update (incremental changes)
 */
export interface ManifestStreamUpdate {
  type: 'add' | 'remove' | 'update' | 'full';
  nodes?: ManifestNode[];
  references?: CrossReference[];
  removedNodeIds?: string[];
  timestamp: number;
  version: string;
}

/**
 * IDE adapter interface for different IDEs
 */
export interface IDEAdapter {
  name: string;
  version: string;
  capabilities: string[];

  // Context methods
  getActiveFile(): Promise<string | null>;
  getSelectedText(): Promise<string | null>;
  getFileContent(path: string): Promise<string | null>;
  getWorkspacePath(): Promise<string | null>;

  // Notification methods
  showMessage(message: string, type: 'info' | 'warning' | 'error'): Promise<void>;
  showProgressBar(label: string, maxValue?: number): Promise<ProgressBar>;

  // Code navigation
  openFile(path: string, line?: number, column?: number): Promise<void>;
  highlightRange(path: string, startLine: number, endLine: number, column?: number): Promise<void>;

  // Decorations
  setDecorations(path: string, decorations: Decoration[]): Promise<void>;
  clearDecorations(path: string): Promise<void>;

  // Context menu
  registerContextCommand(
    id: string,
    label: string,
    callback: (nodeId: string) => Promise<void>,
  ): Promise<void>;
}

/**
 * Progress bar interface
 */
export interface ProgressBar {
  update(value: number, label?: string): Promise<void>;
  close(): Promise<void>;
}

/**
 * Decoration for highlighting code ranges
 */
export interface Decoration {
  range: { startLine: number; startColumn: number; endLine: number; endColumn: number };
  style: 'highlight' | 'underline' | 'error' | 'warning' | 'info';
  hoverMessage?: string;
}

/**
 * Configuration for Proxy Transport
 */
export interface ProxyTransportConfig {
  // Server settings
  serverHost: string;
  serverPort: number;
  enableWebSocket: boolean;
  enableHTTP: boolean;

  // Session settings
  sessionTimeout: number; // milliseconds
  maxConcurrentSessions: number;
  maxSessionContextSize: number; // bytes

  // Streaming settings
  streamingEnabled: boolean;
  streamBatchSize: number;
  streamUpdateInterval: number; // milliseconds

  // Cache settings
  enableCaching: boolean;
  cacheMaxSize: number; // bytes
  cacheEvictionPolicy: 'LRU' | 'LFU' | 'FIFO';

  // IDE settings
  enableVSCodeIntegration: boolean;
  enableJetBrainsIntegration: boolean;

  // Security
  requireAuthentication: boolean;
  apiKeyHeader?: string;
  corsEnabled: boolean;

  // Logging
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableMetrics: boolean;
}

/**
 * Metrics for monitoring transport health
 */
export interface TransportMetrics {
  sessionsActive: number;
  sessionsPeak: number;
  queriesProcessed: number;
  messagesReceived: number;
  messagesSent: number;
  bytesReceived: number;
  bytesSent: number;
  averageResponseTimeMs: number;
  errorRate: number;
  uptime: number;
  lastUpdated: number;
}

/**
 * Cache entry for context results
 */
export interface CacheEntry {
  key: string;
  value: ContextResult;
  size: number;
  hits: number;
  lastAccessed: number;
  createdAt: number;
  ttl: number;
}

/**
 * Subscription for manifest updates
 */
export interface ManifestSubscription {
  id: string;
  sessionId: string;
  manifestId: string;
  nodeFilters?: {
    types?: ManifestNode['type'][];
    importance?: { min: number; max: number };
  };
  callback: (update: ManifestStreamUpdate) => Promise<void>;
}

/**
 * Connection state tracking
 */
export interface ConnectionState {
  sessionId: string;
  isConnected: boolean;
  connectionTime: number;
  lastHeartbeat: number;
  transport: 'websocket' | 'http' | 'unknown';
  clientVersion?: string;
}

/**
 * Default configuration
 */
export const DEFAULT_PROXY_CONFIG: ProxyTransportConfig = {
  serverHost: 'localhost',
  serverPort: 3000,
  enableWebSocket: true,
  enableHTTP: true,
  sessionTimeout: 3600000, // 1 hour
  maxConcurrentSessions: 100,
  maxSessionContextSize: 50 * 1024 * 1024, // 50MB
  streamingEnabled: true,
  streamBatchSize: 50,
  streamUpdateInterval: 1000,
  enableCaching: true,
  cacheMaxSize: 200 * 1024 * 1024, // 200MB
  cacheEvictionPolicy: 'LRU',
  enableVSCodeIntegration: true,
  enableJetBrainsIntegration: false,
  requireAuthentication: false,
  corsEnabled: true,
  logLevel: 'info',
  enableMetrics: true,
};

// Re-exports from manifest-generator
export type { ManifestNode, CrossReference };
