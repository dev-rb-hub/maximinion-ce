/**
 * Manifest Generator Orchestrator - Phase 3
 *
 * Main API for generating hierarchical codebase manifests.
 * Coordinates hierarchy building, cross-reference resolution,
 * and manifest compilation.
 */

import {
  Manifest,
  ManifestNode,
  ManifestGeneratorConfig,
  GenerationResult,
  DEFAULT_MANIFEST_CONFIG,
  ManifestQuery,
  QueryResult,
  CrossReference,
  ManifestCluster,
} from './types';

import { HierarchyBuilder } from './hierarchy-builder';
import { CrossReferenceResolver } from './cross-reference-resolver';
import { ManifestCompiler } from './manifest-compiler';

export class ManifestGenerator {
  private config: ManifestGeneratorConfig;
  private hierarchyBuilder: HierarchyBuilder;
  private referenceResolver: CrossReferenceResolver;
  private compiler: ManifestCompiler;

  constructor(config?: Partial<ManifestGeneratorConfig>) {
    this.config = { ...DEFAULT_MANIFEST_CONFIG, ...config };
    this.hierarchyBuilder = new HierarchyBuilder(this.config);
    this.referenceResolver = new CrossReferenceResolver();
    this.compiler = new ManifestCompiler();
  }

  /**
   * Generate complete manifest from nodes and references
   * Main entry point for manifest creation
   */
  async generate(
    nodes: ManifestNode[],
    references: CrossReference[],
    codebaseId: string = 'unknown',
  ): Promise<GenerationResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      // Build node map for quick lookup
      const nodeMap = new Map(nodes.map((n) => [n.id, n]));
      const referenceMap = new Map<string, CrossReference[]>();

      // Organize references by source node
      for (const ref of references) {
        if (!referenceMap.has(ref.fromId)) {
          referenceMap.set(ref.fromId, []);
        }
        referenceMap.get(ref.fromId)!.push(ref);
      }

      // Establish parent-child relationships
      this.hierarchyBuilder.establishParentChildRelationships(nodes);

      // Build hierarchy layers
      const layers = this.hierarchyBuilder.buildLayers(nodes, references);

      // Detect circular dependencies
      const circularDeps = this.referenceResolver.detectCircularDependencies(nodes, references);
      if (circularDeps.length > 0) {
        warnings.push(`Found ${circularDeps.length} circular dependencies in codebase`);
      }

      // Compute critical paths
      let criticalPaths: string[][] = [];
      let longestPath: string[] = [];
      let longestPathLength = 0;

      if (this.config.computeCriticalPaths) {
        criticalPaths = this.referenceResolver.computeCriticalPaths(nodes, references);
        longestPath = this.referenceResolver.findLongestPath(nodes, references);
        longestPathLength = longestPath.length;
      }

      // Detect clusters
      let clusters: ManifestCluster[] = [];
      const clusterMap = new Map<string, ManifestCluster>();

      if (this.config.clusterNodes) {
        clusters = this.hierarchyBuilder.detectClusters(nodes, references);
        for (const cluster of clusters) {
          clusterMap.set(cluster.id, cluster);
        }
      }

      // Calculate language distribution
      const languageDistribution: Record<string, number> = {};
      for (const node of nodes) {
        if (node.type === 'file') {
          languageDistribution[node.language] = (languageDistribution[node.language] || 0) + 1;
        }
      }

      // Calculate metrics
      const totalLines = nodes.reduce((sum, n) => sum + n.lineCount, 0);
      const totalFiles = nodes.filter((n) => n.type === 'file').length;
      const averageFileSize = totalFiles > 0 ? totalLines / totalFiles : 0;
      const averageComplexity = nodes.length > 0 ? nodes.reduce((sum, n) => sum + n.complexity, 0) / nodes.length : 0;

      // Identify top-level modules
      const topLevelModules = nodes
        .filter((n) => !n.parentId && n.type !== 'file')
        .sort((a, b) => b.importance - a.importance)
        .map((n) => n.id);

      const processingTimeMs = Date.now() - startTime;

      // Build manifest
      const manifest: Manifest = {
        version: '1.0.0',
        codebaseId,
        language: this.config.language,
        rootPath: this.config.sourcePath,
        layers,
        rootNodes: topLevelModules,
        crossReferences: references,
        circularDependencies: circularDeps,
        totalNodes: nodes.length,
        totalFiles,
        totalLines,
        averageFileSize,
        averageComplexity,
        languageDistribution,
        criticalPaths,
        longestPath,
        longestPathLength,
        clusters,
        topLevelModules,
        generatedAt: Date.now(),
        processingTimeMs,
        analyzedFiles: nodes.filter((n) => n.type === 'file').map((n) => n.path),
      };

      return {
        manifest,
        nodeMap,
        referenceMap,
        clusterMap,
        warnings,
        errors,
      };
    } catch (error) {
      errors.push(`Generation failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Query manifest for specific nodes
   */
  query(manifest: Manifest, nodeMap: Map<string, ManifestNode>, query: ManifestQuery): QueryResult {
    let results = Array.from(nodeMap.values());

    // Filter by nodeId
    if (query.nodeId) {
      results = results.filter((n) => n.id === query.nodeId);
    }

    // Filter by type
    if (query.nodeType) {
      results = results.filter((n) => n.type === query.nodeType);
    }

    // Filter by path (partial match)
    if (query.path) {
      results = results.filter((n) => n.path.includes(query.path!));
    }

    // Filter by tags
    if (query.tags && query.tags.length > 0) {
      results = results.filter((n) => query.tags!.some((tag) => n.tags.includes(tag)));
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

    // Get references for results
    const references = manifest.crossReferences.filter((r) => results.some((n) => n.id === r.fromId || n.id === r.toId));

    // Calculate stats
    const stats = {
      matchCount: results.length,
      averageImportance: results.length > 0 ? results.reduce((sum, n) => sum + n.importance, 0) / results.length : 0,
      averageComplexity: results.length > 0 ? results.reduce((sum, n) => sum + n.complexity, 0) / results.length : 0,
    };

    return { nodes: results, references, stats };
  }

  /**
   * Get nodes by type
   */
  getNodesByType(manifest: Manifest, nodeMap: Map<string, ManifestNode>, type: ManifestNode['type']): ManifestNode[] {
    return Array.from(nodeMap.values()).filter((n) => n.type === type);
  }

  /**
   * Get top N nodes by importance
   */
  getTopNodes(manifest: Manifest, nodeMap: Map<string, ManifestNode>, limit: number = 10): ManifestNode[] {
    return Array.from(nodeMap.values()).sort((a, b) => b.importance - a.importance).slice(0, limit);
  }

  /**
   * Export manifest to string
   */
  export(manifest: Manifest, nodeMap: Map<string, ManifestNode>, format: 'json' | 'markdown' | 'html' | 'yaml' = 'json'): string {
    switch (format) {
      case 'markdown':
        return this.compiler.toMarkdown(manifest, nodeMap);
      case 'html':
        return this.compiler.toHTML(manifest, nodeMap);
      case 'yaml':
        return this.compiler.toYAML(manifest);
      case 'json':
      default:
        return this.compiler.toJSON(manifest);
    }
  }

  /**
   * Update configuration
   */
  configure(config: Partial<ManifestGeneratorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ManifestGeneratorConfig {
    return { ...this.config };
  }

  /**
   * Get compilation statistics
   */
  getStats(manifest: Manifest): Record<string, unknown> {
    return {
      version: manifest.version,
      totalNodes: manifest.totalNodes,
      totalFiles: manifest.totalFiles,
      totalLines: manifest.totalLines,
      averageFileSize: manifest.averageFileSize.toFixed(2),
      averageComplexity: manifest.averageComplexity.toFixed(2),
      circularDependencies: manifest.circularDependencies.length,
      clusters: manifest.clusters.length,
      longestPathLength: manifest.longestPathLength,
      processingTimeMs: manifest.processingTimeMs,
      languageCount: Object.keys(manifest.languageDistribution).length,
    };
  }
}

// Export public API
export { ManifestNode, Manifest, ManifestGeneratorConfig, GenerationResult, CrossReference, ManifestCluster };
export { HierarchyBuilder } from './hierarchy-builder';
export { CrossReferenceResolver } from './cross-reference-resolver';
export { ManifestCompiler } from './manifest-compiler';
