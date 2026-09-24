/**
 * Phase 2: The Librarian - Semantic Ranker
 * Combines centrality measures into importance scores and generates rankings
 */

import { GraphNode, CentralityScores, RankedNode, CodeCluster } from './types';

export class SemanticRanker {
  private defaultWeights = {
    pageRank: 0.4,
    betweenness: 0.3,
    closeness: 0.15,
    codemetrics: 0.15, // Complexity, size, etc.
  };

  /**
   * Rank nodes by composite importance
   */
  rankNodes(
    nodes: GraphNode[],
    centralities: Map<string, CentralityScores>,
    weights: Partial<typeof SemanticRanker.prototype.defaultWeights> = {}
  ): RankedNode[] {
    const finalWeights = { ...this.defaultWeights, ...weights };

    const rankedNodes = nodes
      .map((node) => {
        const centrality = centralities.get(node.id) || this.getDefaultCentrality();
        const importance = this.calculateImportance(node, centrality, finalWeights);
        const reasoning = this.generateReasoning(node, centrality, importance);

        return {
          ...node,
          centrality,
          importance,
          rank: 0,
          reasoning,
        } as RankedNode;
      })
      .sort((a, b) => b.importance - a.importance)
      .map((node, index) => ({
        ...node,
        rank: index + 1,
      }));

    return rankedNodes;
  }

  /**
   * Calculate composite importance score
   */
  private calculateImportance(
    node: GraphNode,
    centrality: CentralityScores,
    weights: typeof SemanticRanker.prototype.defaultWeights
  ): number {
    // Code metrics component
    const metricsScore = this.scoreCodeMetrics(node);

    // Composite score
    const score =
      weights.pageRank * centrality.pageRank +
      weights.betweenness * centrality.betweenness +
      weights.closeness * centrality.closeness +
      weights.codemetrics * metricsScore;

    return Math.min(Math.max(score, 0), 1); // Clamp to 0-1
  }

  /**
   * Score node based on code metrics
   */
  private scoreCodeMetrics(node: GraphNode): number {
    const metrics = node.metrics;

    // Normalize metrics to 0-1 range
    const complexityScore = Math.min(metrics.complexity / 10, 1); // 0-10 scale
    const sizeScore = Math.min(metrics.lineCount / 500, 1); // Prefer smaller units
    const dependencyScore = Math.min(metrics.dependencies / 10, 1);

    // Weighted combination
    const score =
      complexityScore * 0.4 + // Complex code is important
      (1 - sizeScore) * 0.3 + // Smaller is better (modularity)
      dependencyScore * 0.3; // More dependencies = more important

    return score;
  }

  /**
   * Generate human-readable reasoning
   */
  private generateReasoning(
    node: GraphNode,
    centrality: CentralityScores,
    importance: number
  ): string {
    const reasons: string[] = [];

    // PageRank analysis
    if (centrality.pageRank > 0.7) {
      reasons.push('Frequently referenced throughout codebase');
    } else if (centrality.pageRank > 0.4) {
      reasons.push('Moderately central in dependency graph');
    }

    // Betweenness analysis
    if (centrality.betweenness > 0.6) {
      reasons.push('Bridges important parts of the codebase');
    }

    // Degree analysis
    if (centrality.inDegree > 5) {
      reasons.push(`Referenced by ${centrality.inDegree} other entities`);
    }
    if (centrality.outDegree > 5) {
      reasons.push(`Depends on ${centrality.outDegree} other entities`);
    }

    // Code metrics analysis
    if (node.metrics.complexity > 6) {
      reasons.push('High cyclomatic complexity');
    }
    if (node.metrics.lineCount > 200 && node.type !== 'file') {
      reasons.push('Substantial implementation');
    }

    // Composite importance
    if (importance > 0.8) {
      reasons.push('Critical to codebase structure');
    } else if (importance > 0.5) {
      reasons.push('Contributes significantly to codebase');
    }

    return reasons.join(' • ');
  }

  /**
   * Detect clusters of related code
   */
  detectClusters(
    rankedNodes: RankedNode[],
    maxClusterSize: number = 20
  ): CodeCluster[] {
    const clusters: CodeCluster[] = [];
    const clusterMap = new Map<string, RankedNode[]>();

    // Group by file for initial clustering
    const byFile = new Map<string, RankedNode[]>();
    rankedNodes.forEach((node) => {
      const file = node.filePath;
      if (!byFile.has(file)) {
        byFile.set(file, []);
      }
      byFile.get(file)!.push(node);
    });

    // Create clusters
    let clusterId = 1;
    byFile.forEach((nodes, filePath) => {
      const chunks = [];
      for (let i = 0; i < nodes.length; i += maxClusterSize) {
        chunks.push(nodes.slice(i, i + maxClusterSize));
      }

      chunks.forEach((chunk, index) => {
        const cluster = this.createCluster(clusterId++, chunk, filePath, index);
        clusters.push(cluster);
      });
    });

    return clusters;
  }

  /**
   * Create cluster from group of nodes
   */
  private createCluster(
    id: number,
    nodes: RankedNode[],
    filePath: string,
    groupIndex: number
  ): CodeCluster {
    const avgImportance = nodes.reduce((sum, n) => sum + n.importance, 0) / nodes.length;

    // Count internal vs external edges
    let internalEdges = 0;
    let externalConnections = 0;

    nodes.forEach((node) => {
      if (node.metrics.dependencies > 0) {
        externalConnections += node.metrics.dependencies;
      }
    });

    const density =
      nodes.length > 1
        ? internalEdges / (nodes.length * (nodes.length - 1))
        : 0;

    return {
      id: `cluster_${id}`,
      name: `${filePath}_group_${groupIndex + 1}`,
      nodes,
      internalDensity: density,
      externalConnections,
      purpose: `Cluster of ${nodes.length} entities (avg importance: ${avgImportance.toFixed(2)})`,
    };
  }

  /**
   * Get default centrality scores
   */
  private getDefaultCentrality(): CentralityScores {
    return {
      pageRank: 0,
      betweenness: 0,
      closeness: 0,
      degree: 0,
      inDegree: 0,
      outDegree: 0,
    };
  }

  /**
   * Filter nodes by importance threshold
   */
  filterByImportance(nodes: RankedNode[], threshold: number = 0.3): RankedNode[] {
    return nodes.filter((node) => node.importance >= threshold);
  }

  /**
   * Get nodes by type
   */
  filterByType(
    nodes: RankedNode[],
    type: 'file' | 'function' | 'class' | 'method' | 'variable' | 'module'
  ): RankedNode[] {
    return nodes.filter((node) => node.type === type);
  }

  /**
   * Get top N nodes by importance
   */
  getTopNodes(nodes: RankedNode[], limit: number = 10): RankedNode[] {
    return nodes.slice(0, Math.min(limit, nodes.length));
  }
}
