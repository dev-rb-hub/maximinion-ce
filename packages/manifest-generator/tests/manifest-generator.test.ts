/**
 * Unit tests for Phase 3: The Manifest Generator
 *
 * Tests for hierarchy building, cross-reference resolution,
 * manifest compilation, and orchestration.
 */

import {
  ManifestGenerator,
  ManifestNode,
  CrossReference,
  ManifestGeneratorConfig,
} from '../src/core/manifest-generator/index';
import { HierarchyBuilder } from '../src/core/manifest-generator/hierarchy-builder';
import { CrossReferenceResolver } from '../src/core/manifest-generator/cross-reference-resolver';
import { ManifestCompiler } from '../src/core/manifest-generator/manifest-compiler';

describe('Phase 3: THE MANIFEST GENERATOR - Unit Tests', () => {
  // Mock data
  const mockNodes: ManifestNode[] = [
    {
      id: 'node1',
      name: 'config.ts',
      type: 'file',
      path: 'src/config.ts',
      language: 'typescript',
      lineStart: 1,
      lineEnd: 50,
      lineCount: 50,
      characterCount: 1200,
      estimatedTokenCount: 300,
      children: ['node2', 'node3'],
      imports: [],
      importedBy: [],
      complexity: 0.3,
      importance: 0.7,
      coverage: 0.8,
      description: 'Configuration module',
      tags: ['config', 'core'],
      isPublic: true,
      isExported: true,
      isDeprecated: false,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    },
    {
      id: 'node2',
      name: 'parseConfig',
      type: 'function',
      path: 'src/config.ts',
      language: 'typescript',
      lineStart: 5,
      lineEnd: 20,
      lineCount: 15,
      characterCount: 400,
      estimatedTokenCount: 100,
      parentId: 'node1',
      children: [],
      imports: [{ fromId: 'node2', toId: 'node4', type: 'import', strength: 0.8, isCircular: false }],
      importedBy: [],
      complexity: 0.2,
      importance: 0.5,
      coverage: 0.9,
      tags: ['function', 'parser'],
      isPublic: true,
      isExported: true,
      isDeprecated: false,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    },
    {
      id: 'node3',
      name: 'validateConfig',
      type: 'function',
      path: 'src/config.ts',
      language: 'typescript',
      lineStart: 22,
      lineEnd: 35,
      lineCount: 13,
      characterCount: 350,
      estimatedTokenCount: 88,
      parentId: 'node1',
      children: [],
      imports: [{ fromId: 'node3', toId: 'node5', type: 'uses', strength: 0.6, isCircular: false }],
      importedBy: [],
      complexity: 0.4,
      importance: 0.6,
      coverage: 0.75,
      tags: ['function', 'validation'],
      isPublic: true,
      isExported: true,
      isDeprecated: false,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    },
    {
      id: 'node4',
      name: 'utils.ts',
      type: 'file',
      path: 'src/utils.ts',
      language: 'typescript',
      lineStart: 1,
      lineEnd: 100,
      lineCount: 100,
      characterCount: 2500,
      estimatedTokenCount: 600,
      children: [],
      imports: [],
      importedBy: [{ fromId: 'node2', toId: 'node4', type: 'import', strength: 0.8, isCircular: false }],
      complexity: 0.5,
      importance: 0.8,
      coverage: 0.85,
      tags: ['utils', 'helpers'],
      isPublic: true,
      isExported: true,
      isDeprecated: false,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    },
    {
      id: 'node5',
      name: 'validators.ts',
      type: 'file',
      path: 'src/validators.ts',
      language: 'typescript',
      lineStart: 1,
      lineEnd: 80,
      lineCount: 80,
      characterCount: 2000,
      estimatedTokenCount: 500,
      children: [],
      imports: [],
      importedBy: [{ fromId: 'node3', toId: 'node5', type: 'uses', strength: 0.6, isCircular: false }],
      complexity: 0.45,
      importance: 0.65,
      coverage: 0.8,
      tags: ['validation', 'helpers'],
      isPublic: true,
      isExported: true,
      isDeprecated: false,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    },
  ];

  const mockReferences: CrossReference[] = [
    {
      fromId: 'node2',
      toId: 'node4',
      type: 'import',
      strength: 0.8,
      isCircular: false,
    },
    {
      fromId: 'node3',
      toId: 'node5',
      type: 'uses',
      strength: 0.6,
      isCircular: false,
    },
  ];

  describe('HierarchyBuilder', () => {
    let hierarchyBuilder: HierarchyBuilder;
    let config: ManifestGeneratorConfig;

    beforeEach(() => {
      config = {
        sourcePath: './src',
        filePattern: ['*.ts'],
        maxHierarchyDepth: 10,
        groupByDirectory: true,
        groupByType: true,
        includeImports: true,
        includeDocstrings: true,
        includeMetrics: true,
        detectCircularDeps: true,
        computeCriticalPaths: true,
        clusterNodes: true,
        outputFormat: 'json',
        includeSourceCode: false,
        includeMetadata: true,
        enableCaching: true,
        maxProcessingTimeMs: 30000,
        language: 'typescript',
      };
      hierarchyBuilder = new HierarchyBuilder(config);
    });

    test('should build hierarchy layers', () => {
      const layers = hierarchyBuilder.buildLayers(mockNodes, mockReferences);
      expect(layers.length).toBeGreaterThan(0);
      expect(layers[0]).toHaveProperty('level');
      expect(layers[0]).toHaveProperty('nodes');
      expect(layers[0]).toHaveProperty('description');
    });

    test('should establish parent-child relationships', () => {
      const nodes = [...mockNodes];
      hierarchyBuilder.establishParentChildRelationships(nodes);
      const parent = nodes.find((n) => n.id === 'node1');
      expect(parent?.children).toContain('node2');
      expect(parent?.children).toContain('node3');
    });

    test('should build directory hierarchy', () => {
      const dirHierarchy = hierarchyBuilder.buildDirectoryHierarchy(mockNodes);
      expect(dirHierarchy.size).toBeGreaterThan(0);
      expect(dirHierarchy.has('src')).toBeTruthy();
    });

    test('should build type hierarchy', () => {
      const typeHierarchy = hierarchyBuilder.buildTypeHierarchy(mockNodes);
      expect(typeHierarchy.has('file')).toBeTruthy();
      expect(typeHierarchy.has('function')).toBeTruthy();
    });

    test('should detect clusters', () => {
      const clusters = hierarchyBuilder.detectClusters(mockNodes, mockReferences);
      expect(clusters.length).toBeGreaterThan(0);
      expect(clusters[0]).toHaveProperty('nodeCount');
      expect(clusters[0]).toHaveProperty('cohesion');
      expect(clusters[0]).toHaveProperty('coupling');
    });
  });

  describe('CrossReferenceResolver', () => {
    let resolver: CrossReferenceResolver;

    beforeEach(() => {
      resolver = new CrossReferenceResolver();
    });

    test('should resolve cross-references', () => {
      const resolved = resolver.resolveReferences(mockNodes);
      expect(resolved.length).toBeGreaterThan(0);
      expect(resolved[0]).toHaveProperty('fromId');
      expect(resolved[0]).toHaveProperty('toId');
      expect(resolved[0]).toHaveProperty('type');
    });

    test('should detect circular dependencies', () => {
      const circular = resolver.detectCircularDependencies(mockNodes, mockReferences);
      expect(Array.isArray(circular)).toBeTruthy();
    });

    test('should compute critical paths', () => {
      const paths = resolver.computeCriticalPaths(mockNodes, mockReferences);
      expect(Array.isArray(paths)).toBeTruthy();
    });

    test('should find longest path', () => {
      const longest = resolver.findLongestPath(mockNodes, mockReferences);
      expect(Array.isArray(longest)).toBeTruthy();
    });

    test('should get transitive dependencies', () => {
      const deps = resolver.getTransitiveDependencies('node2', mockReferences);
      expect(deps instanceof Set).toBeTruthy();
    });

    test('should get transitive dependents', () => {
      const dependents = resolver.getTransitiveDependents('node4', mockReferences);
      expect(dependents instanceof Set).toBeTruthy();
    });

    test('should find paths between nodes', () => {
      const paths = resolver.findPaths('node2', 'node4', mockReferences);
      expect(Array.isArray(paths)).toBeTruthy();
    });
  });

  describe('ManifestCompiler', () => {
    let compiler: ManifestCompiler;

    beforeEach(() => {
      compiler = new ManifestCompiler();
    });

    test('should compile to JSON', () => {
      const json = compiler.toJSON({} as any);
      expect(typeof json).toBe('string');
      expect(() => JSON.parse(json)).not.toThrow();
    });

    test('should compile to Markdown', () => {
      const manifest = {
        version: '1.0.0',
        codebaseId: 'test',
        language: 'typescript',
        rootPath: './src',
        layers: [],
        rootNodes: [],
        crossReferences: [],
        circularDependencies: [],
        totalNodes: 5,
        totalFiles: 2,
        totalLines: 328,
        averageFileSize: 164,
        averageComplexity: 0.41,
        languageDistribution: { typescript: 5 },
        criticalPaths: [],
        longestPath: [],
        longestPathLength: 0,
        clusters: [],
        topLevelModules: [],
        generatedAt: Date.now(),
        processingTimeMs: 100,
        analyzedFiles: [],
      };
      const nodeMap = new Map(mockNodes.map((n) => [n.id, n]));
      const md = compiler.toMarkdown(manifest, nodeMap);
      expect(md).toContain('# Codebase Manifest');
      expect(md).toContain('## Summary');
    });

    test('should compile to YAML', () => {
      const manifest = {
        version: '1.0.0',
        codebaseId: 'test',
        language: 'typescript',
        rootPath: './src',
        layers: [],
        rootNodes: [],
        crossReferences: [],
        circularDependencies: [],
        totalNodes: 5,
        totalFiles: 2,
        totalLines: 328,
        averageFileSize: 164,
        averageComplexity: 0.41,
        languageDistribution: { typescript: 5 },
        criticalPaths: [],
        longestPath: [],
        longestPathLength: 0,
        clusters: [],
        topLevelModules: [],
        generatedAt: Date.now(),
        processingTimeMs: 100,
        analyzedFiles: [],
      };
      const yaml = compiler.toYAML(manifest);
      expect(yaml).toContain('version:');
      expect(yaml).toContain('metrics:');
    });

    test('should get file extension for format', () => {
      expect(compiler.getFileExtension('json')).toBe('json');
      expect(compiler.getFileExtension('markdown')).toBe('md');
      expect(compiler.getFileExtension('html')).toBe('html');
      expect(compiler.getFileExtension('yaml')).toBe('yml');
    });
  });

  describe('ManifestGenerator Integration', () => {
    let generator: ManifestGenerator;

    beforeEach(() => {
      generator = new ManifestGenerator();
    });

    test('should initialize with default config', () => {
      expect(generator.getConfig()).toBeDefined();
      expect(generator.getConfig().language).toBe('typescript');
    });

    test('should initialize with custom config', () => {
      const customGen = new ManifestGenerator({ language: 'python' });
      expect(customGen.getConfig().language).toBe('python');
    });

    test('should update configuration', () => {
      generator.configure({ language: 'javascript' });
      expect(generator.getConfig().language).toBe('javascript');
    });

    test('should generate manifest', async () => {
      const result = await generator.generate(mockNodes, mockReferences, 'test-codebase');
      expect(result.manifest).toBeDefined();
      expect(result.manifest.totalNodes).toBe(5);
      expect(result.manifest.totalFiles).toBe(3);
      expect(result.nodeMap.size).toBe(5);
    });

    test('should export manifest to JSON', async () => {
      const result = await generator.generate(mockNodes, mockReferences);
      const json = generator.export(result.manifest, result.nodeMap, 'json');
      expect(json).toContain('"version"');
    });

    test('should export manifest to Markdown', async () => {
      const result = await generator.generate(mockNodes, mockReferences);
      const md = generator.export(result.manifest, result.nodeMap, 'markdown');
      expect(md).toContain('# Codebase Manifest');
    });

    test('should query manifest', async () => {
      const result = await generator.generate(mockNodes, mockReferences);
      const queryResult = generator.query(result.manifest, result.nodeMap, { nodeType: 'file' });
      expect(queryResult.nodes.length).toBe(3);
    });

    test('should get top nodes', async () => {
      const result = await generator.generate(mockNodes, mockReferences);
      const topNodes = generator.getTopNodes(result.manifest, result.nodeMap, 2);
      expect(topNodes.length).toBeLessThanOrEqual(2);
      expect(topNodes[0].importance).toBeGreaterThanOrEqual(topNodes[1]?.importance || 0);
    });

    test('should get stats', async () => {
      const result = await generator.generate(mockNodes, mockReferences);
      const stats = generator.getStats(result.manifest);
      expect(stats.totalNodes).toBe(5);
      expect(stats.totalFiles).toBe(3);
      expect(stats.processingTimeMs).toBeGreaterThanOrEqual(0);
    });
  });
});
