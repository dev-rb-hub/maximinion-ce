/**
 * Context Manager Module for Phase 4: The Proxy Transport
 *
 * Manages context caching, session state, and real-time context selection.
 */

import {
  ContextSession,
  ContextQuery,
  ContextResult,
  ProxyTransportConfig,
  CacheEntry,
  ManifestNode,
  CrossReference,
  DEFAULT_PROXY_CONFIG,
} from './types';
import { Manifest } from '@maximinion/manifest-generator';

export class ContextManager {
  private config: ProxyTransportConfig;
  private sessions = new Map<string, ContextSession>();
  private cache = new Map<string, CacheEntry>();
  private manifest: Manifest | null = null;
  private nodeMap = new Map<string, ManifestNode>();
  private cacheSize = 0;

  constructor(config?: Partial<ProxyTransportConfig>) {
    this.config = { ...DEFAULT_PROXY_CONFIG, ...config };
  }

  /**
   * Load manifest into memory for context queries
   */
  loadManifest(manifest: Manifest, nodeMap: Map<string, ManifestNode>): void {
    this.manifest = manifest;
    this.nodeMap = new Map(nodeMap);
  }

  /**
   * Create new context session
   */
  createSession(clientId: string, projectPath: string): ContextSession {
    const session: ContextSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      clientId,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      expiresAt: Date.now() + this.config.sessionTimeout,
      projectPath,
      manifestId: this.manifest?.codebaseId || 'unknown',
      language: this.manifest?.language || 'unknown',
      selectedNodeIds: [],
      accessCount: 0,
      bytesTransferred: 0,
    };

    this.sessions.set(session.id, session);
    return session;
  }

  /**
   * Get existing session
   */
  getSession(sessionId: string): ContextSession | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastAccessedAt = Date.now();
      session.accessCount++;
    }
    return session;
  }

  /**
   * Delete session
   */
  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * Clean expired sessions
   */
  cleanExpiredSessions(): number {
    const now = Date.now();
    let deleted = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        this.sessions.delete(sessionId);
        deleted++;
      }
    }

    return deleted;
  }

  /**
   * Query context from manifest
   */
  queryContext(sessionId: string, query: ContextQuery): ContextResult {
    const session = this.getSession(sessionId);
    if (!session || !this.manifest) {
      throw new Error('Session not found or manifest not loaded');
    }

    // Check cache
    const cacheKey = this.getCacheKey(query);
    const cached = this.cache.get(cacheKey);
    if (cached && cached.ttl > Date.now()) {
      cached.hits++;
      cached.lastAccessed = Date.now();
      return cached.value;
    }

    // Execute query
    let results = Array.from(this.nodeMap.values());

    // Filter by node IDs
    if (query.nodeIds && query.nodeIds.length > 0) {
      results = results.filter((n) => query.nodeIds!.includes(n.id));
    }

    // Filter by path
    if (query.path) {
      results = results.filter((n) => n.path.includes(query.path!));
    }

    // Filter by importance
    if (query.importance) {
      results = results.filter(
        (n) => n.importance >= query.importance!.min && n.importance <= query.importance!.max,
      );
    }

    // Filter by complexity
    if (query.complexity) {
      results = results.filter(
        (n) => n.complexity >= query.complexity!.min && n.complexity <= query.complexity!.max,
      );
    }

    // Truncate to token budget
    if (query.maxTokens) {
      let tokenCount = 0;
      const selected = [];
      for (const node of results) {
        if (tokenCount + node.estimatedTokenCount > query.maxTokens) break;
        selected.push(node);
        tokenCount += node.estimatedTokenCount;
      }
      results = selected;
    }

    // Get references
    let references = this.manifest.crossReferences;
    if (query.includeImports === false) {
      references = references.filter((r) => r.type !== 'import');
    }

    // Build result
    const result: ContextResult = {
      sessionId,
      nodes: results,
      references,
      totalNodes: this.nodeMap.size,
      selectedCount: results.length,
      estimatedTokens: results.reduce((sum, n) => sum + n.estimatedTokenCount, 0),
      compressionRatio: results.length / this.nodeMap.size,
      generatedAt: Date.now(),
    };

    // Cache result
    this.cacheResult(cacheKey, result);
    session.bytesTransferred += JSON.stringify(result).length;

    return result;
  }

  /**
   * Select specific nodes for focused context
   */
  selectNodes(sessionId: string, nodeIds: string[]): void {
    const session = this.getSession(sessionId);
    if (!session) throw new Error('Session not found');

    session.selectedNodeIds = nodeIds.filter((id) => this.nodeMap.has(id));
  }

  /**
   * Get selected nodes for session
   */
  getSelectedNodes(sessionId: string): ManifestNode[] {
    const session = this.getSession(sessionId);
    if (!session) throw new Error('Session not found');

    return session.selectedNodeIds.map((id) => this.nodeMap.get(id)!).filter(Boolean);
  }

  /**
   * Set focused node for navigation
   */
  setFocusedNode(sessionId: string, nodeId: string): void {
    const session = this.getSession(sessionId);
    if (!session) throw new Error('Session not found');

    if (this.nodeMap.has(nodeId)) {
      session.focusedNodeId = nodeId;
    }
  }

  /**
   * Get related nodes (imports/dependents)
   */
  getRelatedNodes(sessionId: string, nodeId: string, depth: number = 1): ManifestNode[] {
    const node = this.nodeMap.get(nodeId);
    if (!node || !this.manifest) return [];

    const related = new Set<string>();
    const queue: Array<{ id: string; depth: number }> = [{ id: nodeId, depth: 0 }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { id, depth: currentDepth } = queue.shift()!;
      if (visited.has(id) || currentDepth > depth) continue;

      visited.add(id);
      related.add(id);

      const refs = this.manifest.crossReferences.filter((r) => r.fromId === id || r.toId === id);
      for (const ref of refs) {
        const nextId = ref.fromId === id ? ref.toId : ref.fromId;
        if (!visited.has(nextId) && currentDepth < depth) {
          queue.push({ id: nextId, depth: currentDepth + 1 });
        }
      }
    }

    return Array.from(related).map((id) => this.nodeMap.get(id)!).filter(Boolean);
  }

  /**
   * Get statistics for a node
   */
  getNodeStats(nodeId: string): Record<string, unknown> {
    const node = this.nodeMap.get(nodeId);
    if (!node) return {};

    const imports = this.manifest?.crossReferences.filter((r) => r.toId === nodeId).length || 0;
    const importedBy = this.manifest?.crossReferences.filter((r) => r.fromId === nodeId).length || 0;

    return {
      id: nodeId,
      name: node.name,
      type: node.type,
      importance: node.importance.toFixed(2),
      complexity: node.complexity.toFixed(2),
      lineCount: node.lineCount,
      estimatedTokens: node.estimatedTokenCount,
      imports,
      importedBy,
      isPublic: node.isPublic,
      isExported: node.isExported,
      tags: node.tags,
    };
  }

  /**
   * Cache query result
   */
  private cacheResult(key: string, result: ContextResult): void {
    if (!this.config.enableCaching) return;

    const size = JSON.stringify(result).length;

    // Evict if necessary
    while (this.cacheSize + size > this.config.cacheMaxSize && this.cache.size > 0) {
      this.evictEntry();
    }

    const entry: CacheEntry = {
      key,
      value: result,
      size,
      hits: 0,
      lastAccessed: Date.now(),
      createdAt: Date.now(),
      ttl: Date.now() + 300000, // 5 minute TTL
    };

    this.cache.set(key, entry);
    this.cacheSize += size;
  }

  /**
   * Evict entry based on policy
   */
  private evictEntry(): void {
    if (this.cache.size === 0) return;

    let toEvict: string | null = null;

    switch (this.config.cacheEvictionPolicy) {
      case 'LRU': {
        let oldest: CacheEntry | null = null;
        for (const entry of this.cache.values()) {
          if (!oldest || entry.lastAccessed < oldest.lastAccessed) {
            oldest = entry;
          }
        }
        if (oldest) toEvict = oldest.key;
        break;
      }
      case 'LFU': {
        let least: CacheEntry | null = null;
        for (const entry of this.cache.values()) {
          if (!least || entry.hits < least.hits) {
            least = entry;
          }
        }
        if (least) toEvict = least.key;
        break;
      }
      case 'FIFO': {
        let oldest: CacheEntry | null = null;
        for (const entry of this.cache.values()) {
          if (!oldest || entry.createdAt < oldest.createdAt) {
            oldest = entry;
          }
        }
        if (oldest) toEvict = oldest.key;
        break;
      }
    }

    if (toEvict) {
      const entry = this.cache.get(toEvict);
      if (entry) {
        this.cacheSize -= entry.size;
      }
      this.cache.delete(toEvict);
    }
  }

  /**
   * Get cache key for query
   */
  private getCacheKey(query: ContextQuery): string {
    return JSON.stringify({
      nodeIds: query.nodeIds?.sort() || [],
      path: query.path,
      importance: query.importance,
      complexity: query.complexity,
      maxTokens: query.maxTokens,
    });
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: number; hitRate: number } {
    let hits = 0;
    let total = 0;

    for (const entry of this.cache.values()) {
      hits += entry.hits;
      total += entry.hits + 1;
    }

    return {
      size: this.cacheSize,
      entries: this.cache.size,
      hitRate: total > 0 ? hits / total : 0,
    };
  }

  /**
   * Get session statistics
   */
  getSessionStats(): { active: number; peak: number; totalCreated: number } {
    return {
      active: this.sessions.size,
      peak: this.sessions.size, // Simplified; track peak separately in production
      totalCreated: this.sessions.size,
    };
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheSize = 0;
  }
}
