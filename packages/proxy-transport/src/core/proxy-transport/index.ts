/**
 * Proxy Transport Orchestrator - Phase 4
 *
 * Main API for real-time context injection with IDE integration.
 * Coordinates context management, manifest streaming, and transport.
 */

import {
  ProxyTransportConfig,
  ContextQuery,
  ContextResult,
  TransportMetrics,
  IDEAdapter,
  ManifestNode,
  DEFAULT_PROXY_CONFIG,
} from './types';

import { ContextManager } from './context-manager';
import { ManifestStreamer } from './manifest-streamer';
import { TransportServer } from './transport-server';
import { VSCodeAdapter } from './ide-adapter';
import { Manifest } from '@maximinion/manifest-generator';

export class ProxyTransport {
  private config: ProxyTransportConfig;
  private contextManager: ContextManager;
  private manifestStreamer: ManifestStreamer;
  private transportServer: TransportServer;
  private ideAdapter: IDEAdapter;
  private isInitialized = false;

  constructor(config?: Partial<ProxyTransportConfig>, ideAdapter?: IDEAdapter) {
    this.config = { ...DEFAULT_PROXY_CONFIG, ...config };
    this.contextManager = new ContextManager(this.config);
    this.manifestStreamer = new ManifestStreamer();
    this.transportServer = new TransportServer(this.config);
    this.ideAdapter = ideAdapter || new VSCodeAdapter();
  }

  /**
   * Initialize the proxy transport
   */
  async initialize(manifest: Manifest, nodeMap: Map<string, ManifestNode>): Promise<void> {
    if (this.isInitialized) {
      throw new Error('ProxyTransport already initialized');
    }

    // Load manifest into context manager
    this.contextManager.loadManifest(manifest, nodeMap);

    // Initialize transport server
    await this.transportServer.initialize();

    // Start streaming if enabled
    if (this.config.streamingEnabled) {
      this.manifestStreamer.startStreaming(this.config.streamUpdateInterval);
    }

    // Start periodic maintenance
    this.transportServer.startMaintenance();

    this.isInitialized = true;
    console.log('[ProxyTransport] Initialized successfully');
  }

  /**
   * Query context for LLM consumption
   */
  async queryContext(sessionId: string, query: ContextQuery): Promise<ContextResult> {
    if (!this.isInitialized) {
      throw new Error('ProxyTransport not initialized');
    }

    return this.contextManager.queryContext(sessionId, query);
  }

  /**
   * Get context for current file in IDE
   */
  async getContextForCurrentFile(sessionId: string, tokenBudget: number = 4000): Promise<ContextResult> {
    const activeFile = await this.ideAdapter.getActiveFile();
    if (!activeFile) {
      throw new Error('No active file in editor');
    }

    return this.contextManager.queryContext(sessionId, {
      path: activeFile,
      maxTokens: tokenBudget,
    });
  }

  /**
   * Get context for focused node
   */
  async getContextForNode(sessionId: string, nodeId: string, tokenBudget: number = 2000): Promise<ContextResult> {
    return this.contextManager.queryContext(sessionId, {
      nodeIds: [nodeId],
      maxTokens: tokenBudget,
    });
  }

  /**
   * Get related nodes (imports and dependents)
   */
  async getRelatedContext(sessionId: string, nodeId: string, depth: number = 1): Promise<ManifestNode[]> {
    return this.contextManager.getRelatedNodes(sessionId, nodeId, depth);
  }

  /**
   * Start IDE integration
   */
  async startIDEIntegration(sessionId: string): Promise<void> {
    // Get workspace path
    const workspacePath = await this.ideAdapter.getWorkspacePath();
    if (!workspacePath) {
      throw new Error('Could not determine workspace path');
    }

    // Show status message
    await this.ideAdapter.showMessage('Maximinion Proxy Transport connected', 'info');

    // Register context menu commands
    await this.ideAdapter.registerContextCommand('maximinion.getContext', 'Get Context', async (nodeId) => {
      const context = await this.getContextForNode(sessionId, nodeId);
      console.log(`Context for ${nodeId}:`, context.nodes.length, 'nodes');
    });

    console.log('[ProxyTransport] IDE integration started');
  }

  /**
   * Subscribe to manifest updates
   */
  async subscribeToUpdates(
    sessionId: string,
    manifestId: string,
    callback: (event: string, data: unknown) => Promise<void>,
  ): Promise<string> {
    return this.manifestStreamer.subscribe(
      sessionId,
      manifestId,
      async (update) => {
        await callback('manifest_update', update);
      },
    );
  }

  /**
   * Unsubscribe from updates
   */
  unsubscribeFromUpdates(subscriptionId: string): boolean {
    return this.manifestStreamer.unsubscribe(subscriptionId);
  }

  /**
   * Get metrics
   */
  getMetrics(): TransportMetrics {
    return this.transportServer.getMetrics();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: number; hitRate: number } {
    return this.contextManager.getCacheStats();
  }

  /**
   * Get session statistics
   */
  getSessionStats(): { active: number; peak: number; totalCreated: number } {
    return this.contextManager.getSessionStats();
  }

  /**
   * Stop streaming and periodic maintenance timers started by initialize()
   */
  shutdown(): void {
    this.manifestStreamer.stopStreaming();
    this.transportServer.stopMaintenance();
    this.isInitialized = false;
  }

  /**
   * Get health status
   */
  getHealth(): {
    initialized: boolean;
    streaming: boolean;
    cacheHitRate: number;
    activeStreams: number;
    uptime: number;
  } {
    const cacheStats = this.getCacheStats();
    const metrics = this.getMetrics();

    return {
      initialized: this.isInitialized,
      streaming: this.manifestStreamer.getQueueSize() > 0,
      cacheHitRate: cacheStats.hitRate,
      activeStreams: this.manifestStreamer.getSubscriberCount(),
      uptime: metrics.uptime,
    };
  }

  /**
   * Update configuration
   */
  configure(config: Partial<ProxyTransportConfig>): void {
    Object.assign(this.config, config);
  }

  /**
   * Get configuration
   */
  getConfig(): ProxyTransportConfig {
    return { ...this.config };
  }

  /**
   * Get context manager (for testing)
   */
  getContextManager(): ContextManager {
    return this.contextManager;
  }

  /**
   * Get manifest streamer (for testing)
   */
  getManifestStreamer(): ManifestStreamer {
    return this.manifestStreamer;
  }

  /**
   * Get transport server (for testing)
   */
  getTransportServer(): TransportServer {
    return this.transportServer;
  }

  /**
   * Get IDE adapter
   */
  getIDEAdapter(): IDEAdapter {
    return this.ideAdapter;
  }
}

// Export public API
export { ContextManager } from './context-manager';
export { ManifestStreamer } from './manifest-streamer';
export { TransportServer } from './transport-server';
export { VSCodeAdapter, JetBrainsAdapter, MockIDEAdapter } from './ide-adapter';
export type {
  ContextSession,
  ContextQuery,
  ContextResult,
  TransportMessage,
  ProxyTransportConfig,
  IDEAdapter,
  ManifestNode,
  CrossReference,
  TransportMetrics,
} from './types';
