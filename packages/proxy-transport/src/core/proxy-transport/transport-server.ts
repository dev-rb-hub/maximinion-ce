/**
 * Transport Server Module for Phase 4
 *
 * HTTP and WebSocket server for real-time context delivery.
 */

import {
  TransportMessage,
  ProxyTransportConfig,
  ContextQuery,
  TransportMetrics,
  ConnectionState,
  DEFAULT_PROXY_CONFIG,
  ManifestNode,
} from './types';
import { ContextManager } from './context-manager';
import { ManifestStreamer } from './manifest-streamer';

export class TransportServer {
  private config: ProxyTransportConfig;
  private contextManager: ContextManager;
  private manifestStreamer: ManifestStreamer;
  private connections = new Map<string, ConnectionState>();
  private messageId = 0;
  private startTime = Date.now();
  private metrics: TransportMetrics = {
    sessionsActive: 0,
    sessionsPeak: 0,
    queriesProcessed: 0,
    messagesReceived: 0,
    messagesSent: 0,
    bytesReceived: 0,
    bytesSent: 0,
    averageResponseTimeMs: 0,
    errorRate: 0,
    uptime: 0,
    lastUpdated: Date.now(),
  };

  constructor(config?: Partial<ProxyTransportConfig>) {
    this.config = { ...DEFAULT_PROXY_CONFIG, ...config };
    this.contextManager = new ContextManager(this.config);
    this.manifestStreamer = new ManifestStreamer();
  }

  /**
   * Initialize server
   */
  async initialize(): Promise<void> {
    // In production, this would setup actual HTTP and WebSocket servers
    // For now, we have the framework ready
    console.log(`[TransportServer] Initialized on ${this.config.serverHost}:${this.config.serverPort}`);
  }

  /**
   * Handle incoming message
   */
  async handleMessage(sessionId: string, message: TransportMessage): Promise<TransportMessage> {
    const startTime = Date.now();
    this.metrics.messagesReceived++;
    this.metrics.bytesReceived += JSON.stringify(message).length;

    try {
      let response: TransportMessage;

      switch (message.type) {
        case 'query':
          response = await this.handleQuery(sessionId, message);
          break;

        case 'subscribe':
          response = await this.handleSubscribe(sessionId, message);
          break;

        case 'unsubscribe':
          response = await this.handleUnsubscribe(sessionId, message);
          break;

        case 'heartbeat':
          response = this.handleHeartbeat(sessionId, message);
          break;

        default:
          response = {
            id: this.generateMessageId(),
            type: 'error',
            sessionId,
            timestamp: Date.now(),
            error: { code: 'UNKNOWN_TYPE', message: `Unknown message type: ${message.type}` },
          };
      }

      // Update metrics
      const responseTime = Date.now() - startTime;
      this.metrics.queriesProcessed++;
      this.metrics.averageResponseTimeMs =
        (this.metrics.averageResponseTimeMs * (this.metrics.queriesProcessed - 1) + responseTime) /
        this.metrics.queriesProcessed;

      this.metrics.messagesSent++;
      this.metrics.bytesSent += JSON.stringify(response).length;

      return response;
    } catch (error) {
      this.metrics.errorRate = (this.metrics.errorRate * (this.metrics.queriesProcessed - 1) + 1) /
        this.metrics.queriesProcessed || 0;

      return {
        id: this.generateMessageId(),
        type: 'error',
        sessionId,
        timestamp: Date.now(),
        error: {
          code: 'SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Handle query message
   */
  private async handleQuery(sessionId: string, message: TransportMessage): Promise<TransportMessage> {
    const query = message.payload as ContextQuery;
    const result = this.contextManager.queryContext(sessionId, query);

    return {
      id: this.generateMessageId(),
      type: 'response',
      sessionId,
      timestamp: Date.now(),
      payload: result,
    };
  }

  /**
   * Handle subscription message
   */
  private async handleSubscribe(sessionId: string, message: TransportMessage): Promise<TransportMessage> {
    const { manifestId, nodeFilters } = message.payload as {
      manifestId: string;
      nodeFilters?: { types?: string[]; importance?: { min: number; max: number } };
    };

    const subscriptionId = this.manifestStreamer.subscribe(
      sessionId,
      manifestId,
      async (update) => {
        // In real implementation, send to client via WebSocket
        console.log(`[ManifestStreamer] Update for subscription: ${subscriptionId}`);
      },
      nodeFilters as { types?: ManifestNode['type'][]; importance?: { min: number; max: number } } | undefined,
    );

    return {
      id: this.generateMessageId(),
      type: 'response',
      sessionId,
      timestamp: Date.now(),
      payload: { subscriptionId },
    };
  }

  /**
   * Handle unsubscribe message
   */
  private async handleUnsubscribe(sessionId: string, message: TransportMessage): Promise<TransportMessage> {
    const { subscriptionId } = message.payload as { subscriptionId: string };
    const unsubscribed = this.manifestStreamer.unsubscribe(subscriptionId);

    return {
      id: this.generateMessageId(),
      type: 'response',
      sessionId,
      timestamp: Date.now(),
      payload: { success: unsubscribed },
    };
  }

  /**
   * Handle heartbeat
   */
  private handleHeartbeat(sessionId: string, message: TransportMessage): TransportMessage {
    const connection = this.connections.get(sessionId);
    if (connection) {
      connection.lastHeartbeat = Date.now();
    }

    return {
      id: this.generateMessageId(),
      type: 'heartbeat',
      sessionId,
      timestamp: Date.now(),
    };
  }

  /**
   * Register connection
   */
  registerConnection(sessionId: string, transport: 'websocket' | 'http'): void {
    const connection: ConnectionState = {
      sessionId,
      isConnected: true,
      connectionTime: Date.now(),
      lastHeartbeat: Date.now(),
      transport,
    };

    this.connections.set(sessionId, connection);
    this.metrics.sessionsActive = this.connections.size;
    this.metrics.sessionsPeak = Math.max(this.metrics.sessionsPeak, this.connections.size);
  }

  /**
   * Unregister connection
   */
  unregisterConnection(sessionId: string): void {
    this.connections.delete(sessionId);
    this.metrics.sessionsActive = this.connections.size;
    this.manifestStreamer.clearSessionSubscriptions(sessionId);
  }

  /**
   * Get metrics
   */
  getMetrics(): TransportMetrics {
    return {
      ...this.metrics,
      uptime: Date.now() - this.startTime,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Get connection state
   */
  getConnectionState(sessionId: string): ConnectionState | undefined {
    return this.connections.get(sessionId);
  }

  /**
   * Get active sessions count
   */
  getActiveSessionsCount(): number {
    return this.connections.size;
  }

  /**
   * Start periodic maintenance
   */
  startMaintenance(intervalMs: number = 60000): NodeJS.Timeout {
    return setInterval(() => {
      this.performMaintenance();
    }, intervalMs);
  }

  /**
   * Perform maintenance tasks
   */
  private performMaintenance(): void {
    // Clean expired sessions
    const expired = this.contextManager.cleanExpiredSessions();
    if (expired > 0) {
      console.log(`[TransportServer] Cleaned ${expired} expired sessions`);
    }

    // Remove stale connections
    const now = Date.now();
    const HEARTBEAT_TIMEOUT = 120000; // 2 minutes

    for (const [sessionId, connection] of this.connections.entries()) {
      if (now - connection.lastHeartbeat > HEARTBEAT_TIMEOUT) {
        this.unregisterConnection(sessionId);
      }
    }

    // Update uptime
    this.metrics.uptime = Date.now() - this.startTime;
    this.metrics.lastUpdated = Date.now();
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${++this.messageId}`;
  }

  /**
   * Get context manager (for integration)
   */
  getContextManager(): ContextManager {
    return this.contextManager;
  }

  /**
   * Get manifest streamer (for integration)
   */
  getManifestStreamer(): ManifestStreamer {
    return this.manifestStreamer;
  }
}
