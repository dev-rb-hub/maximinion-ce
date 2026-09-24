/**
 * Phase 2: The Librarian - Main Orchestrator
 * Coordinates graph building, centrality analysis, and semantic ranking
 */

import {
  LibrarianAnalysis,
  LibrarianConfig,
  RankedNode,
  CriticalPath,
  CodeCluster,
  AnalysisMetadata,
} from './types';
import { GraphBuilder } from './graph-builder';
import { CentralityAnalyzer } from './centrality-analyzer';
import { SemanticRanker } from './semantic-ranker';

export class Librarian {
  private config: LibrarianConfig;

  constructor(config: Partial<LibrarianConfig> = {}) {
    this.config = {
      enableClusterDetection: config.enableClusterDetection ?? true,
      enableCriticalPathAnalysis: config.enableCriticalPathAnalysis ?? true,
      maxNodesPerCluster: config.maxNodesPerCluster ?? 20,
      minImportanceThreshold: config.minImportanceThreshold ?? 0.3,
      pageRankIterations: config.pageRankIterations ?? 20,
      centrailityWeights: config.centrailityWeights || {
        pageRank: 0.4,
        betweenness: 0.3,
        closeness: 0.15,
      },
    };
  }

  /**
   * Analyze a codebase directory
   */
  async analyze(sourcePath: string, filePattern = '**/*.ts'): Promise<LibrarianAnalysis> {
    const overallStartTime = Date.now();

    // Step 1: Build dependency graph
    const graphStartTime = Date.now();
    const graphBuilder = new GraphBuilder();
    const graph = graphBuilder.buildGraph(sourcePath, filePattern);
    const graphBuildTimeMs = Date.now() - graphStartTime;

    // Step 2: Calculate centrality measures
    const centralityStartTime = Date.now();
    const analyzer = new CentralityAnalyzer(graph.nodes, graph.edges);
    const centralities = analyzer.calculateCentralities();
    const centralityCalcTimeMs = Date.now() - centralityStartTime;

    // Step 3: Rank nodes by importance
    const rankingStartTime = Date.now();
    const ranker = new SemanticRanker();
    const rankedNodes = ranker.rankNodes(graph.nodes, centralities);
    const rankingTimeMs = Date.now() - rankingStartTime;

    // Step 4: Detect clusters (optional)
    let clusters: CodeCluster[] = [];
    if (this.config.enableClusterDetection) {
      clusters = ranker.detectClusters(rankedNodes, this.config.maxNodesPerCluster);
    }

    // Step 5: Find critical paths (optional)
    let criticalPaths: CriticalPath[] = [];
    if (this.config.enableCriticalPathAnalysis) {
      criticalPaths = this.findCriticalPaths(rankedNodes);
    }

    const overallEndTime = Date.now();

    // Create analysis result
    const analysis: LibrarianAnalysis = {
      graph,
      rankedNodes,
      criticalPaths,
      clusters,
      metadata: {
        startTime: overallStartTime,
        endTime: overallEndTime,
        processingTimeMs: overallEndTime - overallStartTime,
        filesAnalyzed: graph.nodes.filter((n) => n.type === 'file').length,
        language: 'typescript',
        graphBuildTimeMs,
        centralityCalcTimeMs,
        rankingTimeMs,
      },
    };

    return analysis;
  }

  /**
   * Get most important nodes
   */
  getTopNodes(analysis: LibrarianAnalysis, limit: number = 10): RankedNode[] {
    const ranker = new SemanticRanker();
    return ranker.getTopNodes(analysis.rankedNodes, limit);
  }

  /**
   * Filter nodes by importance threshold
   */
  filterByImportance(analysis: LibrarianAnalysis, threshold?: number): RankedNode[] {
    const ranker = new SemanticRanker();
    return ranker.filterByImportance(
      analysis.rankedNodes,
      threshold ?? this.config.minImportanceThreshold
    );
  }

  /**
   * Get nodes of specific type
   */
  getNodesByType(
    analysis: LibrarianAnalysis,
    type: 'file' | 'function' | 'class' | 'method' | 'variable' | 'module'
  ): RankedNode[] {
    const ranker = new SemanticRanker();
    return ranker.filterByType(analysis.rankedNodes, type);
  }

  /**
   * Find critical paths through codebase
   */
  private findCriticalPaths(rankedNodes: RankedNode[]): CriticalPath[] {
    const paths: CriticalPath[] = [];

    // Find top N nodes as path starts
    const topNodes = rankedNodes.slice(0, Math.min(5, rankedNodes.length));

    topNodes.forEach((startNode, index) => {
      // Create path from top ranked nodes
      const pathNodes = rankedNodes.slice(index, Math.min(index + 5, rankedNodes.length));

      const path: CriticalPath = {
        nodes: pathNodes,
        totalLength: pathNodes.reduce((sum, n) => sum + n.metrics.lineCount, 0),
        importance: pathNodes.reduce((sum, n) => sum + n.importance, 0) / pathNodes.length,
        reasoning: `Critical path through ${pathNodes.length} key entities affecting codebase structure`,
      };

      paths.push(path);
    });

    return paths;
  }

  /**
   * Generate context selection for LLM
   * Returns the most important code to send to LLM
   */
  selectContext(
    analysis: LibrarianAnalysis,
    tokenBudget: number = 4000,
    includeTypes: ('file' | 'function' | 'class' | 'method' | 'variable' | 'module')[] = [
      'class',
      'function',
    ]
  ): {
    selectedNodes: RankedNode[];
    totalTokens: number;
    coverage: number;
  } {
    const ranker = new SemanticRanker();

    // Filter by type and importance
    let candidates = analysis.rankedNodes.filter(
      (n) => includeTypes.includes(n.type) && n.importance >= this.config.minImportanceThreshold
    );

    // Sort by importance
    candidates = candidates.sort((a, b) => b.importance - a.importance);

    // Select nodes to fit token budget
    const selectedNodes: RankedNode[] = [];
    let totalTokens = 0;

    candidates.forEach((node) => {
      const nodeTokens = node.metrics.tokenCount || 0;
      if (totalTokens + nodeTokens <= tokenBudget) {
        selectedNodes.push(node);
        totalTokens += nodeTokens;
      }
    });

    // Calculate coverage
    const totalCodeTokens = analysis.rankedNodes.reduce(
      (sum, n) => sum + (n.metrics.tokenCount || 0),
      0
    );
    const coverage =
      totalCodeTokens > 0 ? (totalTokens / totalCodeTokens) * 100 : 0;

    return {
      selectedNodes,
      totalTokens,
      coverage,
    };
  }

  /**
   * Get analysis summary
   */
  getSummary(analysis: LibrarianAnalysis): string {
    const topNodes = this.getTopNodes(analysis, 5);
    const avgImportance =
      analysis.rankedNodes.reduce((sum, n) => sum + n.importance, 0) /
      analysis.rankedNodes.length;

    let summary = `
# Librarian Analysis Summary

## Codebase Statistics
- Total Entities: ${analysis.graph.metadata.totalNodes}
- Total Dependencies: ${analysis.graph.metadata.totalEdges}
- Code Base Size: ${analysis.graph.metadata.codebaseSize} lines
- Graph Density: ${(analysis.graph.metadata.density * 100).toFixed(2)}%
- Connected Components: ${analysis.graph.metadata.connectedComponents}

## Average Importance: ${avgImportance.toFixed(3)}

## Top 5 Critical Entities
${topNodes
  .map(
    (n, i) => `${i + 1}. **${n.name}** (${n.type})
   - Importance: ${n.importance.toFixed(3)}
   - PageRank: ${n.centrality.pageRank.toFixed(3)}
   - Reasoning: ${n.reasoning}`
  )
  .join('\n\n')}

## Clusters Detected: ${analysis.clusters.length}
## Critical Paths: ${analysis.criticalPaths.length}

## Performance
- Graph Build: ${analysis.metadata.graphBuildTimeMs}ms
- Centrality Calculation: ${analysis.metadata.centralityCalcTimeMs}ms
- Ranking: ${analysis.metadata.rankingTimeMs}ms
- Total: ${analysis.metadata.processingTimeMs}ms
    `;

    return summary;
  }

  /**
   * Update configuration
   */
  configure(config: Partial<LibrarianConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Export all types and classes
export * from './types';
export { GraphBuilder };
export { CentralityAnalyzer };
export { SemanticRanker };
