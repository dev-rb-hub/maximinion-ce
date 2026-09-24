/**
 * Manifest Streamer Module for Phase 4
 *
 * Provides real-time streaming of manifest updates via WebSocket.
 */

import { ManifestStreamUpdate, ManifestSubscription, ManifestNode, CrossReference } from './types';

export class ManifestStreamer {
  private subscriptions = new Map<string, ManifestSubscription>();
  private updateQueue: ManifestStreamUpdate[] = [];
  private isStreaming = false;
  private streamInterval: NodeJS.Timeout | null = null;

  /**
   * Subscribe to manifest updates
   */
  subscribe(
    sessionId: string,
    manifestId: string,
    callback: (update: ManifestStreamUpdate) => Promise<void>,
    nodeFilters?: { types?: ManifestNode['type'][]; importance?: { min: number; max: number } },
  ): string {
    const subscription: ManifestSubscription = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId,
      manifestId,
      nodeFilters,
      callback,
    };

    this.subscriptions.set(subscription.id, subscription);
    return subscription.id;
  }

  /**
   * Unsubscribe from updates
   */
  unsubscribe(subscriptionId: string): boolean {
    return this.subscriptions.delete(subscriptionId);
  }

  /**
   * Queue node additions
   */
  queueNodeAddition(nodes: ManifestNode[]): void {
    this.updateQueue.push({
      type: 'add',
      nodes,
      timestamp: Date.now(),
      version: new Date().toISOString(),
    });
  }

  /**
   * Queue node removal
   */
  queueNodeRemoval(nodeIds: string[]): void {
    this.updateQueue.push({
      type: 'remove',
      removedNodeIds: nodeIds,
      timestamp: Date.now(),
      version: new Date().toISOString(),
    });
  }

  /**
   * Queue node updates
   */
  queueNodeUpdate(nodes: ManifestNode[]): void {
    this.updateQueue.push({
      type: 'update',
      nodes,
      timestamp: Date.now(),
      version: new Date().toISOString(),
    });
  }

  /**
   * Queue reference updates
   */
  queueReferenceUpdate(references: CrossReference[]): void {
    this.updateQueue.push({
      type: 'update',
      references,
      timestamp: Date.now(),
      version: new Date().toISOString(),
    });
  }

  /**
   * Start streaming updates to subscribers
   */
  startStreaming(intervalMs: number = 1000): void {
    if (this.isStreaming) return;

    this.isStreaming = true;
    this.streamInterval = setInterval(() => {
      this.processUpdates();
    }, intervalMs);
  }

  /**
   * Stop streaming
   */
  stopStreaming(): void {
    if (this.streamInterval) {
      clearInterval(this.streamInterval);
      this.streamInterval = null;
    }
    this.isStreaming = false;
  }

  /**
   * Process queued updates and send to subscribers
   */
  private async processUpdates(): Promise<void> {
    if (this.updateQueue.length === 0) return;

    const updates = [...this.updateQueue];
    this.updateQueue = [];

    for (const subscription of this.subscriptions.values()) {
      try {
        for (const update of updates) {
          if (this.matchesFilter(update, subscription)) {
            await subscription.callback(update);
          }
        }
      } catch (error) {
        console.error(`Error streaming to subscription ${subscription.id}:`, error);
      }
    }
  }

  /**
   * Check if update matches subscription filter
   */
  private matchesFilter(update: ManifestStreamUpdate, subscription: ManifestSubscription): boolean {
    if (!subscription.nodeFilters) return true;

    if (!update.nodes) return true; // Can't filter reference-only updates

    const { types, importance } = subscription.nodeFilters;

    return update.nodes.some((node) => {
      if (types && !types.includes(node.type)) return false;
      if (importance && (node.importance < importance.min || node.importance > importance.max)) {
        return false;
      }
      return true;
    });
  }

  /**
   * Get subscriber count
   */
  getSubscriberCount(): number {
    return this.subscriptions.size;
  }

  /**
   * Get update queue size
   */
  getQueueSize(): number {
    return this.updateQueue.length;
  }

  /**
   * Get subscriptions for session
   */
  getSubscriptionsForSession(sessionId: string): ManifestSubscription[] {
    return Array.from(this.subscriptions.values()).filter((s) => s.sessionId === sessionId);
  }

  /**
   * Clear subscriptions for session
   */
  clearSessionSubscriptions(sessionId: string): number {
    let cleared = 0;
    for (const [id, sub] of this.subscriptions.entries()) {
      if (sub.sessionId === sessionId) {
        this.subscriptions.delete(id);
        cleared++;
      }
    }
    return cleared;
  }
}
