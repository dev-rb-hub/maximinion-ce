/**
 * Hierarchy Builder Module for Phase 3: The Manifest Generator
 *
 * Constructs hierarchical tree structures from flat node lists,
 * organizing code entities by directory, type, and relationships.
 */

import {
  ManifestNode,
  ManifestLayer,
  ManifestCluster,
  ManifestGeneratorConfig,
  CrossReference,
} from './types';

export class HierarchyBuilder {
  private config: ManifestGeneratorConfig;

  constructor(config: ManifestGeneratorConfig) {
    this.config = config;
  }

  /**
   * Build hierarchical layers from flat node list
   * Organizes nodes into depth levels based on relationships
   */
  buildLayers(nodes: ManifestNode[], references: CrossReference[]): ManifestLayer[] {
    const layers: ManifestLayer[] = [];
    const nodesByLevel = new Map<number, Set<string>>();

    // Calculate depth of each node based on dependency hierarchy
    const nodeDepths = this.calculateNodeDepths(nodes, references);

    // Group nodes by their depth level
    for (let i = 0; i < this.config.maxHierarchyDepth; i++) {
      const nodesAtLevel = nodes.filter((n) => nodeDepths.get(n.id) === i);

      if (nodesAtLevel.length === 0 && i > 0) continue; // Stop if no more nodes

      const layer: ManifestLayer = {
        level: i,
        nodes: nodesAtLevel,
        description: this.getLayerDescription(i),
        fileCount: nodesAtLevel.filter((n) => n.type === 'file').length,
        totalLines: nodesAtLevel.reduce((sum, n) => sum + n.lineCount, 0),
        averageComplexity:
          nodesAtLevel.length > 0
            ? nodesAtLevel.reduce((sum, n) => sum + n.complexity, 0) / nodesAtLevel.length
            : 0,
      };

      layers.push(layer);
    }

    return layers;
  }

  /**
   * Calculate depth of each node in dependency hierarchy
   * Nodes with no dependencies = depth 0 (leaf)
   * Nodes depending on depth N = depth N+1 (root)
   */
  private calculateNodeDepths(nodes: ManifestNode[], references: CrossReference[]): Map<string, number> {
    const depths = new Map<string, number>();
    const inDegree = new Map<string, number>();
    const outDegree = new Map<string, number>();

    // Initialize degrees
    nodes.forEach((n) => {
      inDegree.set(n.id, n.importedBy.length);
      outDegree.set(n.id, n.imports.length);
      depths.set(n.id, 0);
    });

    // Topological sort using Kahn's algorithm
    const queue = nodes.filter((n) => inDegree.get(n.id) === 0);
    let level = 0;

    while (queue.length > 0) {
      const levelNodes = [...queue];
      queue.length = 0;

      for (const node of levelNodes) {
        depths.set(node.id, level);

        // Process outgoing edges
        for (const ref of node.importedBy) {
          const targetId = ref.fromId;
          const current = inDegree.get(targetId) || 0;
          inDegree.set(targetId, current - 1);

          if (inDegree.get(targetId) === 0) {
            const targetNode = nodes.find((n) => n.id === targetId);
            if (targetNode) queue.push(targetNode);
          }
        }
      }

      level++;
    }

    return depths;
  }

  /**
   * Build directory-based hierarchy
   * Groups nodes by their file path structure
   */
  buildDirectoryHierarchy(nodes: ManifestNode[]): Map<string, ManifestNode[]> {
    const hierarchy = new Map<string, ManifestNode[]>();

    for (const node of nodes) {
      if (node.type === 'file') {
        const dirPath = this.getDirectoryPath(node.path);
        if (!hierarchy.has(dirPath)) {
          hierarchy.set(dirPath, []);
        }
        hierarchy.get(dirPath)!.push(node);
      }
    }

    return hierarchy;
  }

  /**
   * Build type-based hierarchy
   * Groups nodes by their entity type
   */
  buildTypeHierarchy(nodes: ManifestNode[]): Map<ManifestNode['type'], ManifestNode[]> {
    const hierarchy = new Map<ManifestNode['type'], ManifestNode[]>();

    for (const node of nodes) {
      if (!hierarchy.has(node.type)) {
        hierarchy.set(node.type, []);
      }
      hierarchy.get(node.type)!.push(node);
    }

    return hierarchy;
  }

  /**
   * Establish parent-child relationships
   */
  establishParentChildRelationships(nodes: ManifestNode[]): void {
    for (const node of nodes) {
      node.children = [];
    }

    // Find parent for each node
    for (const node of nodes) {
      if (node.parentId) {
        const parent = nodes.find((n) => n.id === node.parentId);
        if (parent && !parent.children.includes(node.id)) {
          parent.children.push(node.id);
        }
      }
    }
  }

  /**
   * Detect code clusters from nodes and references
   */
  detectClusters(
    nodes: ManifestNode[],
    references: CrossReference[],
    maxClusterSize: number = 20,
  ): ManifestCluster[] {
    const clusters: ManifestCluster[] = [];
    const visited = new Set<string>();
    let clusterId = 0;

    // Build adjacency for cluster detection
    const adjacency = new Map<string, Set<string>>();
    for (const node of nodes) {
      adjacency.set(node.id, new Set());
    }

    for (const ref of references) {
      if (adjacency.has(ref.fromId) && adjacency.has(ref.toId)) {
        adjacency.get(ref.fromId)!.add(ref.toId);
        adjacency.get(ref.toId)!.add(ref.fromId);
      }
    }

    // BFS to find clusters
    for (const startNode of nodes) {
      if (visited.has(startNode.id)) continue;

      const cluster: ManifestCluster = {
        id: `cluster_${clusterId++}`,
        name: `Cluster ${clusterId}`,
        nodeIds: [],
        nodeCount: 0,
        cohesion: 0,
        coupling: 0,
        complexity: 0,
      };

      const queue = [startNode.id];
      const localVisited = new Set<string>();

      while (queue.length > 0 && cluster.nodeIds.length < maxClusterSize) {
        const current = queue.shift()!;
        if (localVisited.has(current)) continue;

        localVisited.add(current);
        cluster.nodeIds.push(current);
        visited.add(current);

        // Add neighbors
        const neighbors = adjacency.get(current) || new Set();
        for (const neighbor of neighbors) {
          if (!localVisited.has(neighbor) && cluster.nodeIds.length < maxClusterSize) {
            queue.push(neighbor);
          }
        }
      }

      cluster.nodeCount = cluster.nodeIds.length;
      cluster.cohesion = this.calculateCohesion(cluster, references);
      cluster.coupling = this.calculateCoupling(cluster, references, nodes);
      cluster.complexity =
        nodes
          .filter((n) => cluster.nodeIds.includes(n.id))
          .reduce((sum, n) => sum + n.complexity, 0) / cluster.nodeIds.length;

      clusters.push(cluster);
    }

    return clusters;
  }

  /**
   * Calculate cluster cohesion (internal connectivity)
   */
  private calculateCohesion(cluster: ManifestCluster, references: CrossReference[]): number {
    const internalRefs = references.filter(
      (r) => cluster.nodeIds.includes(r.fromId) && cluster.nodeIds.includes(r.toId),
    );

    const maxPossible = (cluster.nodeIds.length * (cluster.nodeIds.length - 1)) / 2;
    return maxPossible > 0 ? Math.min(internalRefs.length / maxPossible, 1) : 0;
  }

  /**
   * Calculate cluster coupling (external dependencies)
   */
  private calculateCoupling(
    cluster: ManifestCluster,
    references: CrossReference[],
    allNodes: ManifestNode[],
  ): number {
    const externalRefs = references.filter(
      (r) =>
        (cluster.nodeIds.includes(r.fromId) && !cluster.nodeIds.includes(r.toId)) ||
        (!cluster.nodeIds.includes(r.fromId) && cluster.nodeIds.includes(r.toId)),
    );

    const externalNodes = allNodes.filter((n) => !cluster.nodeIds.includes(n.id));
    const maxPossible = cluster.nodeIds.length * externalNodes.length;

    return maxPossible > 0 ? Math.min(externalRefs.length / maxPossible, 1) : 0;
  }

  /**
   * Get directory path from file path
   */
  private getDirectoryPath(filePath: string): string {
    const parts = filePath.split(/[/\\]/);
    return parts.slice(0, -1).join('/');
  }

  /**
   * Get description for hierarchy layer
   */
  private getLayerDescription(level: number): string {
    const descriptions = [
      'Leaf dependencies (no outgoing dependencies)',
      'Second layer (depends only on leaf nodes)',
      'Core modules (mid-level dependencies)',
      'Domain logic (higher-level abstractions)',
      'API/Interface layer',
      'Orchestration layer',
    ];

    return descriptions[level] || `Level ${level} (${level} layers deep)`;
  }
}
