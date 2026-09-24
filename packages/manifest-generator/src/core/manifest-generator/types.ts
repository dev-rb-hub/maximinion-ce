/**
 * Type definitions for Phase 3: The Manifest Generator
 *
 * Defines hierarchical manifest structures, cross-references,
 * and metadata for codebase documentation.
 */

/**
 * Represents a single item in the manifest hierarchy
 */
export interface ManifestNode {
  id: string;
  name: string;
  type: 'file' | 'module' | 'class' | 'function' | 'interface' | 'type' | 'constant';
  path: string;
  language: string;

  // Content information
  lineStart: number;
  lineEnd: number;
  lineCount: number;
  characterCount: number;
  estimatedTokenCount: number;

  // Hierarchy
  parentId?: string;
  children: string[]; // Array of child node IDs

  // Relationships
  imports: CrossReference[]; // Modules/types this node depends on
  importedBy: CrossReference[]; // Modules/types that depend on this node

  // Metrics
  complexity: number; // 0-1 cyclomatic complexity score
  importance: number; // 0-1 from Librarian
  coverage: number; // 0-1 test coverage if available

  // Documentation
  description?: string;
  docString?: string;
  tags: string[];

  // Visibility
  isPublic: boolean;
  isExported: boolean;
  isDeprecated: boolean;

  // Timestamps
  createdAt: number;
  modifiedAt: number;
}

/**
 * Represents a reference between manifest nodes
 */
export interface CrossReference {
  fromId: string;
  toId: string;
  type: 'import' | 'extends' | 'implements' | 'uses' | 'references';
  strength: number; // 0-1 frequency/strength of reference
  isCircular: boolean;
  context?: string; // Code snippet or context
}

/**
 * Represents a hierarchical layer in the manifest
 */
export interface ManifestLayer {
  level: number; // 0=root, 1=packages, 2=modules, 3=classes, 4+=functions
  nodes: ManifestNode[];
  description: string;
  fileCount: number;
  totalLines: number;
  averageComplexity: number;
}

/**
 * Represents the complete hierarchical manifest
 */
export interface Manifest {
  version: string;
  codebaseId: string;
  language: string;
  rootPath: string;

  // Hierarchy
  layers: ManifestLayer[];
  rootNodes: string[]; // Top-level node IDs

  // Cross-references
  crossReferences: CrossReference[];
  circularDependencies: CrossReference[][];

  // Metrics
  totalNodes: number;
  totalFiles: number;
  totalLines: number;
  averageFileSize: number;
  averageComplexity: number;
  languageDistribution: Record<string, number>;

  // Critical paths (longest dependency chains)
  criticalPaths: string[][];
  longestPath: string[]; // Node IDs representing longest dependency chain
  longestPathLength: number;

  // Clusters and grouping
  clusters: ManifestCluster[];
  topLevelModules: string[];

  // Metadata
  generatedAt: number;
  processingTimeMs: number;
  analyzedFiles: string[];
}

/**
 * Represents a cluster of related nodes
 */
export interface ManifestCluster {
  id: string;
  name: string;
  nodeIds: string[];
  nodeCount: number;
  cohesion: number; // 0-1 internal connectivity
  coupling: number; // 0-1 external dependencies
  complexity: number; // 0-1 average
  description?: string;
}

/**
 * Configuration for manifest generation
 */
export interface ManifestGeneratorConfig {
  // Path settings
  sourcePath: string;
  filePattern: string[];

  // Hierarchy settings
  maxHierarchyDepth: number;
  groupByDirectory: boolean;
  groupByType: boolean;

  // Analysis settings
  includeImports: boolean;
  includeDocstrings: boolean;
  includeMetrics: boolean;
  detectCircularDeps: boolean;
  computeCriticalPaths: boolean;
  clusterNodes: boolean;

  // Output settings
  outputFormat: 'json' | 'markdown' | 'html' | 'yaml';
  includeSourceCode: boolean;
  includeMetadata: boolean;

  // Performance
  enableCaching: boolean;
  maxProcessingTimeMs: number;

  // Context
  language: string;
}

/**
 * Result of manifest generation
 */
export interface GenerationResult {
  manifest: Manifest;
  nodeMap: Map<string, ManifestNode>;
  referenceMap: Map<string, CrossReference[]>;
  clusterMap: Map<string, ManifestCluster>;
  warnings: string[];
  errors: string[];
}

/**
 * Options for querying the manifest
 */
export interface ManifestQuery {
  nodeId?: string;
  nodeType?: ManifestNode['type'];
  path?: string;
  tags?: string[];
  importance?: { min: number; max: number };
  complexity?: { min: number; max: number };
}

/**
 * Result of a manifest query
 */
export interface QueryResult {
  nodes: ManifestNode[];
  references: CrossReference[];
  stats: {
    matchCount: number;
    averageImportance: number;
    averageComplexity: number;
  };
}

/**
 * Default configuration
 */
export const DEFAULT_MANIFEST_CONFIG: ManifestGeneratorConfig = {
  sourcePath: './src',
  filePattern: ['*.ts', '*.tsx', '*.js', '*.jsx'],
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
