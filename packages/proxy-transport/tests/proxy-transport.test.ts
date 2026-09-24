/**
 * Unit tests for Phase 4: The Proxy Transport
 *
 * Tests for context management, manifest streaming,
 * transport server, IDE integration, and orchestration.
 */

import {
  ProxyTransport,
  ContextManager,
  ManifestStreamer,
  TransportServer,
  VSCodeAdapter,
  MockIDEAdapter,
} from '../src/core/proxy-transport/index';

import { Manifest, ManifestNode, CrossReference } from '@maximinion/manifest-generator';

describe('Phase 4: THE PROXY TRANSPORT - Unit Tests', () => {
  // Mock data
  const mockManifestNode: ManifestNode = {
    id: 'node1',
    name: 'app.ts',
    type: 'file',
    path: 'src/app.ts',
    language: 'typescript',
    lineStart: 1,
    lineEnd: 100,
    lineCount: 100,
    characterCount: 2500,
    estimatedTokenCount: 600,
    children: [],
    imports: [],
    importedBy: [],
    complexity: 0.5,
    importance: 0.8,
    coverage: 0.85,
    tags: ['core', 'app'],
    isPublic: true,
    isExported: true,
    isDeprecated: false,
    createdAt: Date.now(),
    modifiedAt: Date.now(),
  };

  const mockNodes = [
    mockManifestNode,
    {
      ...mockManifestNode,
      id: 'node2',
      name: 'utils.ts',
      path: 'src/utils.ts',
      importance: 0.6,
    },
  ];

  const mockManifest: Manifest = {
    version: '1.0.0',
    codebaseId: 'test-app',
    language: 'typescript',
    rootPath: './src',
    layers: [],
    rootNodes: ['node1'],
    crossReferences: [
      {
        fromId: 'node1',
        toId: 'node2',
        type: 'import',
        strength: 0.8,
        isCircular: false,
      },
    ],
    circularDependencies: [],
    totalNodes: 2,
    totalFiles: 2,
    totalLines: 200,
    averageFileSize: 100,
    averageComplexity: 0.55,
    languageDistribution: { typescript: 2 },
    criticalPaths: [],
    longestPath: [],
    longestPathLength: 0,
    clusters: [],
    topLevelModules: ['node1'],
    generatedAt: Date.now(),
    processingTimeMs: 100,
    analyzedFiles: ['src/app.ts', 'src/utils.ts'],
  };

  describe('ContextManager', () => {
    let contextManager: ContextManager;

    beforeEach(() => {
      contextManager = new ContextManager();
      const nodeMap = new Map(mockNodes.map((n) => [n.id, n]));
      contextManager.loadManifest(mockManifest, nodeMap);
    });

    test('should create session', () => {
      const session = contextManager.createSession('client1', './src');
      expect(session.clientId).toBe('client1');
      expect(session.projectPath).toBe('./src');
      expect(session.id).toBeDefined();
    });

    test('should get existing session', () => {
      const session = contextManager.createSession('client1', './src');
      const retrieved = contextManager.getSession(session.id);
      expect(retrieved?.id).toBe(session.id);
    });

    test('should delete session', () => {
      const session = contextManager.createSession('client1', './src');
      const deleted = contextManager.deleteSession(session.id);
      expect(deleted).toBe(true);
      expect(contextManager.getSession(session.id)).toBeUndefined();
    });

    test('should query context', () => {
      const session = contextManager.createSession('client1', './src');
      const result = contextManager.queryContext(session.id, {});
      expect(result.nodes.length).toBeGreaterThan(0);
      expect(result.totalNodes).toBe(2);
    });

    test('should filter context by importance', () => {
      const session = contextManager.createSession('client1', './src');
      const result = contextManager.queryContext(session.id, {
        importance: { min: 0.7, max: 1.0 },
      });
      expect(result.nodes.every((n) => n.importance >= 0.7)).toBe(true);
    });

    test('should select nodes', () => {
      const session = contextManager.createSession('client1', './src');
      contextManager.selectNodes(session.id, ['node1', 'node2']);
      const selected = contextManager.getSelectedNodes(session.id);
      expect(selected.length).toBe(2);
    });

    test('should get related nodes', () => {
      const session = contextManager.createSession('client1', './src');
      const related = contextManager.getRelatedNodes(session.id, 'node1', 1);
      expect(related.length).toBeGreaterThan(0);
    });

    test('should get node stats', () => {
      const stats = contextManager.getNodeStats('node1');
      expect(stats.id).toBe('node1');
      expect(stats.name).toBe('app.ts');
    });

    test('should clean expired sessions', () => {
      contextManager.createSession('client1', './src');
      const cleaned = contextManager.cleanExpiredSessions();
      expect(typeof cleaned).toBe('number');
    });

    test('should get cache stats', () => {
      const session = contextManager.createSession('client1', './src');
      contextManager.queryContext(session.id, {});
      const stats = contextManager.getCacheStats();
      expect(stats.entries).toBeGreaterThanOrEqual(0);
      expect(stats.hitRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('ManifestStreamer', () => {
    let streamer: ManifestStreamer;

    beforeEach(() => {
      streamer = new ManifestStreamer();
    });

    test('should subscribe to updates', (done) => {
      const callback = jest.fn().mockResolvedValue(undefined);
      const subId = streamer.subscribe('session1', 'manifest1', callback);
      expect(subId).toBeDefined();
      done();
    });

    test('should unsubscribe from updates', () => {
      const callback = jest.fn();
      const subId = streamer.subscribe('session1', 'manifest1', callback);
      const unsubscribed = streamer.unsubscribe(subId);
      expect(unsubscribed).toBe(true);
    });

    test('should queue node additions', () => {
      streamer.queueNodeAddition([mockManifestNode]);
      expect(streamer.getQueueSize()).toBeGreaterThan(0);
    });

    test('should queue node removals', () => {
      streamer.queueNodeRemoval(['node1']);
      expect(streamer.getQueueSize()).toBeGreaterThan(0);
    });

    test('should queue node updates', () => {
      streamer.queueNodeUpdate([mockManifestNode]);
      expect(streamer.getQueueSize()).toBeGreaterThan(0);
    });

    test('should get subscriber count', () => {
      const callback = jest.fn();
      streamer.subscribe('session1', 'manifest1', callback);
      expect(streamer.getSubscriberCount()).toBe(1);
    });

    test('should get subscriptions for session', () => {
      const callback = jest.fn();
      streamer.subscribe('session1', 'manifest1', callback);
      const subs = streamer.getSubscriptionsForSession('session1');
      expect(subs.length).toBe(1);
    });

    test('should clear session subscriptions', () => {
      const callback = jest.fn();
      streamer.subscribe('session1', 'manifest1', callback);
      const cleared = streamer.clearSessionSubscriptions('session1');
      expect(cleared).toBe(1);
    });
  });

  describe('TransportServer', () => {
    let server: TransportServer;

    beforeEach(() => {
      server = new TransportServer();
    });

    test('should initialize server', async () => {
      await server.initialize();
      expect(server.getActiveSessionsCount()).toBe(0);
    });

    test('should register connection', () => {
      server.registerConnection('session1', 'websocket');
      expect(server.getActiveSessionsCount()).toBe(1);
    });

    test('should unregister connection', () => {
      server.registerConnection('session1', 'websocket');
      server.unregisterConnection('session1');
      expect(server.getActiveSessionsCount()).toBe(0);
    });

    test('should get connection state', () => {
      server.registerConnection('session1', 'websocket');
      const state = server.getConnectionState('session1');
      expect(state?.sessionId).toBe('session1');
      expect(state?.isConnected).toBe(true);
    });

    test('should get metrics', () => {
      server.registerConnection('session1', 'websocket');
      const metrics = server.getMetrics();
      expect(metrics.sessionsActive).toBe(1);
      expect(typeof metrics.uptime).toBe('number');
    });
  });

  describe('IDE Adapters', () => {
    test('VSCodeAdapter should have correct properties', () => {
      const adapter = new VSCodeAdapter();
      expect(adapter.name).toBe('VS Code');
      expect(adapter.capabilities).toContain('file_navigation');
    });

    test('MockIDEAdapter should work correctly', async () => {
      const adapter = new MockIDEAdapter();
      adapter.setMockState('activeFile', '/src/app.ts');
      const file = await adapter.getActiveFile();
      expect(file).toBe('/src/app.ts');
    });

    test('MockIDEAdapter should track messages', async () => {
      const adapter = new MockIDEAdapter();
      await adapter.showMessage('Test message', 'info');
      const state = adapter.getMockState();
      const messages = Object.entries(state).filter(([k]) => k.startsWith('message_'));
      expect(messages.length).toBeGreaterThan(0);
    });

    test('MockIDEAdapter should track file navigation', async () => {
      const adapter = new MockIDEAdapter();
      await adapter.openFile('/src/app.ts', 10, 5);
      const state = adapter.getMockState();
      expect(state.lastOpenedFile).toEqual({ path: '/src/app.ts', line: 10, column: 5 });
    });
  });

  describe('ProxyTransport Integration', () => {
    let proxy: ProxyTransport;

    beforeEach(() => {
      const mockAdapter = new MockIDEAdapter();
      proxy = new ProxyTransport({}, mockAdapter);
    });

    test('should initialize', async () => {
      const nodeMap = new Map(mockNodes.map((n) => [n.id, n]));
      await proxy.initialize(mockManifest, nodeMap);
      const health = proxy.getHealth();
      expect(health.initialized).toBe(true);
    });

    test('should query context', async () => {
      const nodeMap = new Map(mockNodes.map((n) => [n.id, n]));
      await proxy.initialize(mockManifest, nodeMap);
      const session = proxy.getContextManager().createSession('client1', './src');
      const result = await proxy.queryContext(session.id, {});
      expect(result.nodes).toBeDefined();
    });

    test('should get context for specific node', async () => {
      const nodeMap = new Map(mockNodes.map((n) => [n.id, n]));
      await proxy.initialize(mockManifest, nodeMap);
      const session = proxy.getContextManager().createSession('client1', './src');
      const result = await proxy.getContextForNode(session.id, 'node1');
      expect(result.selectedCount).toBeGreaterThan(0);
    });

    test('should get related context', async () => {
      const nodeMap = new Map(mockNodes.map((n) => [n.id, n]));
      await proxy.initialize(mockManifest, nodeMap);
      const session = proxy.getContextManager().createSession('client1', './src');
      const related = await proxy.getRelatedContext(session.id, 'node1');
      expect(Array.isArray(related)).toBe(true);
    });

    test('should get metrics', async () => {
      const nodeMap = new Map(mockNodes.map((n) => [n.id, n]));
      await proxy.initialize(mockManifest, nodeMap);
      const metrics = proxy.getMetrics();
      expect(metrics.queriesProcessed).toBeGreaterThanOrEqual(0);
    });

    test('should get health status', async () => {
      const nodeMap = new Map(mockNodes.map((n) => [n.id, n]));
      await proxy.initialize(mockManifest, nodeMap);
      const health = proxy.getHealth();
      expect(health.initialized).toBe(true);
      expect(health.cacheHitRate).toBeGreaterThanOrEqual(0);
    });

    test('should configure dynamically', () => {
      proxy.configure({ sessionTimeout: 7200000 });
      const config = proxy.getConfig();
      expect(config.sessionTimeout).toBe(7200000);
    });
  });
});
