/**
 * Phase 2: The Librarian - Centrality Analyzer
 * Computes graph centrality scores (PageRank, Betweenness, Closeness)
 */

import { GraphNode, GraphEdge, CentralityScores } from './types';

export class CentralityAnalyzer {
  private nodes: Map<string, GraphNode>;
  private edges: GraphEdge[];
  private adjacencyList: Map<string, string[]>;
  private reverseAdjacencyList: Map<string, string[]>;

  constructor(nodes: GraphNode[], edges: GraphEdge[]) {
    this.nodes = new Map(nodes.map((n) => [n.id, n]));
    this.edges = edges;
    this.adjacencyList = new Map();
    this.reverseAdjacencyList = new Map();

    this.buildAdjacencyLists();
  }

  /**
   * Build adjacency lists for efficient graph traversal
   */
  private buildAdjacencyLists(): void {
    // Initialize all nodes in both lists
    this.nodes.forEach((node) => {
      this.adjacencyList.set(node.id, []);
      this.reverseAdjacencyList.set(node.id, []);
    });

    // Populate edges
    this.edges.forEach((edge) => {
      const outgoing = this.adjacencyList.get(edge.source) || [];
      const incoming = this.reverseAdjacencyList.get(edge.target) || [];

      outgoing.push(edge.target);
      incoming.push(edge.source);

      this.adjacencyList.set(edge.source, outgoing);
      this.reverseAdjacencyList.set(edge.target, incoming);
    });
  }

  /**
   * Calculate all centrality measures for all nodes
   */
  calculateCentralities(): Map<string, CentralityScores> {
    const pageRankScores = this.calculatePageRank();
    const betweennessScores = this.calculateBetweenness();
    const closenessScores = this.calculateCloseness();

    const centralities = new Map<string, CentralityScores>();

    this.nodes.forEach((node) => {
      const outgoing = this.adjacencyList.get(node.id) || [];
      const incoming = this.reverseAdjacencyList.get(node.id) || [];

      centralities.set(node.id, {
        pageRank: pageRankScores.get(node.id) || 0,
        betweenness: betweennessScores.get(node.id) || 0,
        closeness: closenessScores.get(node.id) || 0,
        degree: outgoing.length + incoming.length,
        inDegree: incoming.length,
        outDegree: outgoing.length,
      });
    });

    return centralities;
  }

  /**
   * Calculate PageRank scores (iterative algorithm)
   * Higher rank = more frequently referenced
   */
  private calculatePageRank(
    iterations: number = 20,
    dampingFactor: number = 0.85
  ): Map<string, number> {
    const ranks = new Map<string, number>();
    const nodeArray = Array.from(this.nodes.keys());
    const initialRank = 1 / nodeArray.length;

    // Initialize ranks
    nodeArray.forEach((nodeId) => {
      ranks.set(nodeId, initialRank);
    });

    // Iterative calculation
    for (let iter = 0; iter < iterations; iter++) {
      const newRanks = new Map<string, number>();

      nodeArray.forEach((nodeId) => {
        let rank = (1 - dampingFactor) / nodeArray.length;
        const incomingEdges = this.reverseAdjacencyList.get(nodeId) || [];

        incomingEdges.forEach((sourceId) => {
          const sourceOutDegree = (this.adjacencyList.get(sourceId) || []).length;
          if (sourceOutDegree > 0) {
            rank += (dampingFactor / sourceOutDegree) * (ranks.get(sourceId) || 0);
          }
        });

        newRanks.set(nodeId, rank);
      });

      // Update ranks
      nodeArray.forEach((nodeId) => {
        ranks.set(nodeId, newRanks.get(nodeId) || 0);
      });
    }

    // Normalize to 0-1 range
    return this.normalizeScores(ranks);
  }

  /**
   * Calculate betweenness centrality
   * Nodes that appear on many shortest paths between other nodes
   */
  private calculateBetweenness(): Map<string, number> {
    const betweenness = new Map<string, number>();
    const nodeArray = Array.from(this.nodes.keys());

    // Initialize
    nodeArray.forEach((nodeId) => {
      betweenness.set(nodeId, 0);
    });

    // For each pair of nodes, find shortest paths
    nodeArray.forEach((source) => {
      const distances = this.bfs(source);

      nodeArray.forEach((target) => {
        if (source !== target) {
          const pathNodes = this.getShortestPathNodes(source, target, distances);
          pathNodes.forEach((nodeId) => {
            if (nodeId !== source && nodeId !== target) {
              betweenness.set(nodeId, (betweenness.get(nodeId) || 0) + 1);
            }
          });
        }
      });
    });

    // Normalize
    return this.normalizeScores(betweenness);
  }

  /**
   * Breadth-first search for shortest paths
   */
  private bfs(start: string): Map<string, number> {
    const distances = new Map<string, number>();
    const queue: string[] = [start];

    this.nodes.forEach((node) => {
      distances.set(node.id, Infinity);
    });

    distances.set(start, 0);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentDistance = distances.get(current)!;
      const neighbors = this.adjacencyList.get(current) || [];

      neighbors.forEach((neighbor) => {
        if (distances.get(neighbor)! > currentDistance + 1) {
          distances.set(neighbor, currentDistance + 1);
          queue.push(neighbor);
        }
      });
    }

    return distances;
  }

  /**
   * Get nodes on shortest path between two nodes
   */
  private getShortestPathNodes(
    source: string,
    target: string,
    distances: Map<string, number>
  ): string[] {
    const path: string[] = [];
    let current = target;

    while (current !== source) {
      path.push(current);
      const currentDist = distances.get(current) || Infinity;
      const neighbors = this.reverseAdjacencyList.get(current) || [];

      let nextNode = source;
      for (const neighbor of neighbors) {
        if ((distances.get(neighbor) || Infinity) === currentDist - 1) {
          nextNode = neighbor;
          break;
        }
      }

      current = nextNode;
    }

    path.push(source);
    return path;
  }

  /**
   * Calculate closeness centrality
   * How close a node is to all other nodes
   */
  private calculateCloseness(): Map<string, number> {
    const closeness = new Map<string, number>();

    Array.from(this.nodes.keys()).forEach((nodeId) => {
      const distances = this.bfs(nodeId);
      let totalDistance = 0;
      let reachableNodes = 0;

      distances.forEach((distance) => {
        if (distance !== Infinity) {
          totalDistance += distance;
          reachableNodes++;
        }
      });

      const score =
        reachableNodes > 0 && totalDistance > 0
          ? (reachableNodes - 1) / totalDistance
          : 0;

      closeness.set(nodeId, score);
    });

    // Normalize
    return this.normalizeScores(closeness);
  }

  /**
   * Normalize scores to 0-1 range
   */
  private normalizeScores(scores: Map<string, number>): Map<string, number> {
    const values = Array.from(scores.values());
    const minValue = Math.min(...values, 0);
    const maxValue = Math.max(...values, 1);
    const range = maxValue - minValue || 1;

    const normalized = new Map<string, number>();

    scores.forEach((value, key) => {
      normalized.set(key, (value - minValue) / range);
    });

    return normalized;
  }

  /**
   * Get top N nodes by score
   */
  getTopNodes(
    scores: Map<string, number>,
    limit: number = 10
  ): Array<{ nodeId: string; score: number }> {
    const sorted = Array.from(scores.entries())
      .map(([nodeId, score]) => ({ nodeId, score }))
      .sort((a, b) => b.score - a.score);

    return sorted.slice(0, limit);
  }
}
