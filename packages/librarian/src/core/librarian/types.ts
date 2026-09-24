/**
 * Phase 2: The Librarian - Types
 * Graph theory and dependency analysis types for codebase structure analysis
 */

// Graph node representing a code entity (file, function, class, etc.)
export interface GraphNode {
  id: string;
  name: string;
  type: 'file' | 'function' | 'class' | 'method' | 'variable' | 'module';
  filePath: string;
  startLine: number;
  endLine: number;
  codeSnippet: string;
  metrics: CodeMetrics;
  metadata: Record<string, unknown>;
}

// Metrics associated with each code node
export interface CodeMetrics {
  lineCount: number;
  complexity: number;
  dependencies: number;
  referencedBy: number;
  entropy?: number;
  tokenCount?: number;
}

// Edge in the dependency graph
export interface GraphEdge {
  source: string; // node ID
  target: string; // node ID
  type: 'import' | 'call' | 'reference' | 'extends' | 'implements';
  weight: number; // Strength of relationship (0-1)
}

// Centrality scores for a node
export interface CentralityScores {
  pageRank: number; // Overall importance (0-1)
  betweenness: number; // Bridge importance (0-1)
  closeness: number; // Network proximity (0-1)
  degree: number; // Direct connections
  inDegree: number; // Incoming references
  outDegree: number; // Outgoing references
}

// Ranked code entity with importance scores
export interface RankedNode extends GraphNode {
  centrality: CentralityScores;
  importance: number; // Composite importance score (0-1)
  rank: number; // Position in ranked list
  reasoning: string; // Why this node is important
}

// Dependency graph result
export interface DependencyGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: GraphMetadata;
}

// Graph metadata
export interface GraphMetadata {
  totalNodes: number;
  totalEdges: number;
  averageDegree: number;
  density: number; // Edge ratio (actual edges / possible edges)
  connectedComponents: number;
  processingTimeMs: number;
  codebaseSize: number; // Total lines of code
}

// Librarian analysis result
export interface LibrarianAnalysis {
  graph: DependencyGraph;
  rankedNodes: RankedNode[];
  criticalPaths: CriticalPath[];
  clusters: CodeCluster[];
  metadata: AnalysisMetadata;
}

// A critical path through the codebase
export interface CriticalPath {
  nodes: RankedNode[];
  totalLength: number;
  importance: number;
  reasoning: string;
}

// Cluster of related code entities
export interface CodeCluster {
  id: string;
  name: string;
  nodes: RankedNode[];
  internalDensity: number;
  externalConnections: number;
  purpose: string;
}

// Analysis metadata
export interface AnalysisMetadata {
  startTime: number;
  endTime: number;
  processingTimeMs: number;
  filesAnalyzed: number;
  language: string;
  graphBuildTimeMs: number;
  centralityCalcTimeMs: number;
  rankingTimeMs: number;
}

// Configuration for Librarian
export interface LibrarianConfig {
  enableClusterDetection: boolean;
  enableCriticalPathAnalysis: boolean;
  maxNodesPerCluster: number;
  minImportanceThreshold: number;
  pageRankIterations: number;
  centrailityWeights: {
    pageRank: number;
    betweenness: number;
    closeness: number;
  };
}

// Language-specific parser configuration
export interface ParserConfig {
  language: string;
  extensions: string[];
  parseFunction?: (filePath: string, content: string) => GraphNode[];
}

// Result of AST parsing
export interface ASTParseResult {
  nodes: GraphNode[];
  imports: Array<{ from: string; to: string; type: string }>;
  language: string;
}
