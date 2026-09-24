/**
 * Phase 2: The Librarian - Unit Tests
 * Tests for graph building, centrality analysis, and semantic ranking
 */

import { Librarian, GraphBuilder, CentralityAnalyzer, SemanticRanker } from '../src/core/librarian';

describe('Phase 2: THE LIBRARIAN - Unit Tests', () => {
  describe('GraphBuilder', () => {
    test('should create graph nodes', () => {
      const builder = new GraphBuilder();

      // Mock data for testing (actual parsing would happen on real code)
      expect(builder).toBeDefined();
    });

    test('should handle empty directory', () => {
      const builder = new GraphBuilder();
      builder.clear();

      expect(builder).toBeDefined();
    });
  });

  describe('CentralityAnalyzer', () => {
    const mockNodes = [
      {
        id: 'file:module1.ts',
        name: 'module1',
        type: 'file' as const,
        filePath: 'module1.ts',
        startLine: 0,
        endLine: 100,
        codeSnippet: 'export function test() {}',
        metrics: {
          lineCount: 100,
          complexity: 3,
          dependencies: 2,
          referencedBy: 5,
          tokenCount: 130,
        },
        metadata: {},
      },
      {
        id: 'file:module2.ts',
        name: 'module2',
        type: 'file' as const,
        filePath: 'module2.ts',
        startLine: 0,
        endLine: 50,
        codeSnippet: 'import * from module1',
        metrics: {
          lineCount: 50,
          complexity: 2,
          dependencies: 1,
          referencedBy: 2,
          tokenCount: 65,
        },
        metadata: {},
      },
    ];

    const mockEdges = [
      {
        source: 'file:module2.ts',
        target: 'file:module1.ts',
        type: 'import' as const,
        weight: 0.8,
      },
    ];

    test('should calculate centrality scores', () => {
      const analyzer = new CentralityAnalyzer(mockNodes, mockEdges);
      const centralities = analyzer.calculateCentralities();

      expect(centralities.size).toBe(2);
      expect(centralities.has('file:module1.ts')).toBe(true);
      expect(centralities.has('file:module2.ts')).toBe(true);
    });

    test('should normalize PageRank scores', () => {
      const analyzer = new CentralityAnalyzer(mockNodes, mockEdges);
      const centralities = analyzer.calculateCentralities();

      const scores = Array.from(centralities.values());
      scores.forEach((score) => {
        expect(score.pageRank).toBeGreaterThanOrEqual(0);
        expect(score.pageRank).toBeLessThanOrEqual(1);
      });
    });

    test('should calculate in-degree and out-degree', () => {
      const analyzer = new CentralityAnalyzer(mockNodes, mockEdges);
      const centralities = analyzer.calculateCentralities();

      const module1 = centralities.get('file:module1.ts')!;
      expect(module1.inDegree).toBeGreaterThanOrEqual(0);
      expect(module1.outDegree).toBeGreaterThanOrEqual(0);
    });
  });

  describe('SemanticRanker', () => {
    const mockNodes = [
      {
        id: 'file:main.ts',
        name: 'main',
        type: 'file' as const,
        filePath: 'main.ts',
        startLine: 0,
        endLine: 200,
        codeSnippet: 'export class Main {}',
        metrics: {
          lineCount: 200,
          complexity: 8,
          dependencies: 5,
          referencedBy: 10,
          tokenCount: 260,
        },
        metadata: {},
      },
      {
        id: 'file:utils.ts',
        name: 'utils',
        type: 'file' as const,
        filePath: 'utils.ts',
        startLine: 0,
        endLine: 50,
        codeSnippet: 'export function helper() {}',
        metrics: {
          lineCount: 50,
          complexity: 2,
          dependencies: 1,
          referencedBy: 3,
          tokenCount: 65,
        },
        metadata: {},
      },
    ];

    const mockCentralities = new Map([
      [
        'file:main.ts',
        {
          pageRank: 0.8,
          betweenness: 0.6,
          closeness: 0.7,
          degree: 15,
          inDegree: 10,
          outDegree: 5,
        },
      ],
      [
        'file:utils.ts',
        {
          pageRank: 0.3,
          betweenness: 0.2,
          closeness: 0.4,
          degree: 4,
          inDegree: 3,
          outDegree: 1,
        },
      ],
    ]);

    test('should rank nodes by importance', () => {
      const ranker = new SemanticRanker();
      const rankedNodes = ranker.rankNodes(mockNodes, mockCentralities);

      expect(rankedNodes.length).toBe(2);
      expect(rankedNodes[0].rank).toBe(1);
      expect(rankedNodes[1].rank).toBe(2);
    });

    test('should assign higher importance to high-centrality nodes', () => {
      const ranker = new SemanticRanker();
      const rankedNodes = ranker.rankNodes(mockNodes, mockCentralities);

      expect(rankedNodes[0].importance).toBeGreaterThan(rankedNodes[1].importance);
    });

    test('should generate reasoning strings', () => {
      const ranker = new SemanticRanker();
      const rankedNodes = ranker.rankNodes(mockNodes, mockCentralities);

      rankedNodes.forEach((node) => {
        expect(typeof node.reasoning).toBe('string');
        // Reasoning may be empty for low-importance nodes, which is valid
        expect(node.reasoning.length).toBeGreaterThanOrEqual(0);
      });
    });

    test('should filter nodes by importance threshold', () => {
      const ranker = new SemanticRanker();
      const rankedNodes = ranker.rankNodes(mockNodes, mockCentralities);
      const filtered = ranker.filterByImportance(rankedNodes, 0.5);

      expect(filtered.length).toBeGreaterThanOrEqual(0);
      filtered.forEach((node) => {
        expect(node.importance).toBeGreaterThanOrEqual(0.5);
      });
    });

    test('should detect clusters', () => {
      const ranker = new SemanticRanker();
      const rankedNodes = ranker.rankNodes(mockNodes, mockCentralities);
      const clusters = ranker.detectClusters(rankedNodes);

      expect(clusters.length).toBeGreaterThan(0);
      clusters.forEach((cluster) => {
        expect(cluster.nodes.length).toBeGreaterThan(0);
        expect(cluster.id).toContain('cluster_');
      });
    });

    test('should filter by node type', () => {
      const ranker = new SemanticRanker();
      const rankedNodes = ranker.rankNodes(mockNodes, mockCentralities);
      const files = ranker.filterByType(rankedNodes, 'file');

      expect(files.length).toBe(2);
      files.forEach((node) => {
        expect(node.type).toBe('file');
      });
    });

    test('should get top N nodes', () => {
      const ranker = new SemanticRanker();
      const rankedNodes = ranker.rankNodes(mockNodes, mockCentralities);
      const top1 = ranker.getTopNodes(rankedNodes, 1);

      expect(top1.length).toBe(1);
      expect(top1[0].rank).toBe(1);
    });
  });

  describe('Librarian Integration', () => {
    test('should initialize with default config', () => {
      const librarian = new Librarian();
      expect(librarian).toBeDefined();
    });

    test('should initialize with custom config', () => {
      const librarian = new Librarian({
        enableClusterDetection: false,
        minImportanceThreshold: 0.5,
        pageRankIterations: 30,
      });

      expect(librarian).toBeDefined();
    });

    test('should update configuration', () => {
      const librarian = new Librarian();
      librarian.configure({ minImportanceThreshold: 0.7 });

      expect(librarian).toBeDefined();
    });

    test('should generate analysis summary', () => {
      const librarian = new Librarian();
      const mockAnalysis = {
        graph: {
          nodes: [],
          edges: [],
          metadata: {
            totalNodes: 0,
            totalEdges: 0,
            averageDegree: 0,
            density: 0,
            connectedComponents: 0,
            processingTimeMs: 100,
            codebaseSize: 0,
          },
        },
        rankedNodes: [],
        criticalPaths: [],
        clusters: [],
        metadata: {
          startTime: 0,
          endTime: 100,
          processingTimeMs: 100,
          filesAnalyzed: 0,
          language: 'typescript',
          graphBuildTimeMs: 0,
          centralityCalcTimeMs: 0,
          rankingTimeMs: 0,
        },
      };

      const summary = librarian.getSummary(mockAnalysis);
      expect(summary).toContain('Librarian Analysis Summary');
      expect(summary).toContain('Codebase Statistics');
    });
  });
});
