# Phase 3: The Manifest Generator

## Overview

The Manifest Generator creates hierarchical, comprehensive documentation of a codebase by combining insights from Phases 1 (Refiner) and 2 (Librarian). It generates multi-format manifests (JSON, Markdown, HTML, YAML) with:

- **Hierarchical Structure**: Organize code by layers (leaf → root dependencies)
- **Cross-Reference Resolution**: Track imports, extends, implements relationships
- **Circular Dependency Detection**: Identify problematic cycles
- **Critical Path Analysis**: Find longest dependency chains
- **Cluster Detection**: Group related code entities
- **Multi-Format Export**: JSON, Markdown, HTML, YAML outputs

## Architecture

### 4 Core Components

#### 1. HierarchyBuilder
**Purpose**: Organize flat node lists into hierarchical layers

**Key Methods**:
- `buildLayers(nodes, references)` - Create dependency-based layers (depth 0 = leaves, depth N = roots)
- `buildDirectoryHierarchy(nodes)` - Organize by file path structure
- `buildTypeHierarchy(nodes)` - Group by entity type (file, class, function, etc.)
- `establishParentChildRelationships(nodes)` - Build containment relationships
- `detectClusters(nodes, references)` - Find cohesive groups using BFS

**Algorithms**:
- Topological sort (Kahn's algorithm) for layer assignment
- Breadth-first search for cluster detection
- Cohesion/coupling calculation for cluster metrics

#### 2. CrossReferenceResolver
**Purpose**: Resolve, validate, and analyze code relationships

**Key Methods**:
- `resolveReferences(nodes)` - Validate and connect import statements
- `detectCircularDependencies(nodes, references)` - Find cycles via DFS
- `computeCriticalPaths(nodes, references)` - Find longest dependency chains
- `findLongestPath(nodes, references)` - Get the maximum depth chain
- `getTransitiveDependencies(nodeId, references)` - Full dependency closure
- `getTransitiveDependents(nodeId, references)` - Full dependent closure
- `findPaths(start, end, references)` - Enumerate all paths between nodes

**Algorithms**:
- Depth-first search with cycle detection
- Memoized DFS for critical path computation
- BFS for transitive closure

#### 3. ManifestCompiler
**Purpose**: Export manifests in multiple formats

**Output Formats**:
- **JSON**: Complete structured data (default)
- **Markdown**: Readable documentation with tables and hierarchies
- **HTML**: Styled web version with CSS
- **YAML**: Human-friendly configuration format

**Features**:
- Markdown-to-HTML conversion
- Table generation for statistics
- Circular dependency highlighting
- Critical path visualization

#### 4. ManifestGenerator (Orchestrator)
**Purpose**: Coordinate all components and provide public API

**Key Methods**:
- `generate(nodes, references)` - Full pipeline (build → resolve → compile)
- `query(manifest, query)` - Filter nodes by type, tags, importance, complexity
- `export(manifest, format)` - Output to any format
- `getTopNodes(manifest, limit)` - Get most important entities
- `getStats(manifest)` - Summary statistics

## Data Flow

```
Input: Nodes (from Phase 2: Librarian) + References
  ↓
[HierarchyBuilder] → Organize into layers, establish relationships
  ↓
[CrossReferenceResolver] → Detect cycles, compute critical paths
  ↓
[Clustering] → Detect cohesive groups
  ↓
[Statistics] → Calculate metrics (complexity, importance, coverage)
  ↓
[ManifestGenerator] → Assemble complete Manifest object
  ↓
[ManifestCompiler] → Export to JSON/Markdown/HTML/YAML
  ↓
Output: Comprehensive hierarchical documentation
```

## Type Definitions

### ManifestNode
Represents a single code entity in the hierarchy

```typescript
interface ManifestNode {
  id: string;
  name: string;
  type: 'file' | 'module' | 'class' | 'function' | 'interface' | 'type' | 'constant';
  path: string;
  language: string;
  
  // Location and content
  lineStart: number;
  lineEnd: number;
  lineCount: number;
  characterCount: number;
  estimatedTokenCount: number;
  
  // Hierarchy
  parentId?: string;
  children: string[]; // Child node IDs
  
  // Relationships
  imports: CrossReference[];      // Dependencies
  importedBy: CrossReference[];   // Dependents
  
  // Metrics
  complexity: number;    // 0-1 cyclomatic complexity
  importance: number;    // 0-1 from Librarian
  coverage: number;      // 0-1 test coverage
  
  // Metadata
  description?: string;
  docString?: string;
  tags: string[];
  isPublic: boolean;
  isExported: boolean;
  isDeprecated: boolean;
}
```

### CrossReference
Represents a link between nodes

```typescript
interface CrossReference {
  fromId: string;
  toId: string;
  type: 'import' | 'extends' | 'implements' | 'uses' | 'references';
  strength: number;      // 0-1 frequency
  isCircular: boolean;
  context?: string;      // Code snippet
}
```

### ManifestLayer
Represents a depth level in the hierarchy

```typescript
interface ManifestLayer {
  level: number;                    // 0=leaves, N=roots
  nodes: ManifestNode[];
  description: string;              // "Leaf dependencies", etc.
  fileCount: number;
  totalLines: number;
  averageComplexity: number;
}
```

### Manifest
Complete codebase documentation

```typescript
interface Manifest {
  version: string;
  codebaseId: string;
  language: string;
  rootPath: string;
  
  // Hierarchy
  layers: ManifestLayer[];
  rootNodes: string[];              // Top-level node IDs
  
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
  
  // Analysis
  criticalPaths: string[][];        // Node ID paths
  longestPath: string[];
  longestPathLength: number;
  
  // Clusters
  clusters: ManifestCluster[];
  topLevelModules: string[];
  
  // Metadata
  generatedAt: number;
  processingTimeMs: number;
  analyzedFiles: string[];
}
```

## Configuration

```typescript
interface ManifestGeneratorConfig {
  // Paths
  sourcePath: string;
  filePattern: string[];
  
  // Hierarchy
  maxHierarchyDepth: number;
  groupByDirectory: boolean;
  groupByType: boolean;
  
  // Analysis
  includeImports: boolean;
  includeDocstrings: boolean;
  includeMetrics: boolean;
  detectCircularDeps: boolean;
  computeCriticalPaths: boolean;
  clusterNodes: boolean;
  
  // Output
  outputFormat: 'json' | 'markdown' | 'html' | 'yaml';
  includeSourceCode: boolean;
  includeMetadata: boolean;
  
  // Performance
  enableCaching: boolean;
  maxProcessingTimeMs: number;
  
  language: string;
}
```

## Algorithms

### 1. Layer Assignment (Topological Sort)
Uses Kahn's algorithm to assign depth levels based on dependency direction:
- Leaf nodes (no outgoing dependencies) = Level 0
- Nodes depending only on Level 0 = Level 1
- Continues until all nodes assigned
- Handles acyclic graphs; identifies cycles separately

**Time Complexity**: O(V + E) where V = nodes, E = edges

### 2. Circular Dependency Detection (DFS)
Depth-first search with recursion stack tracking:
- Maintains visited set for visited nodes
- Recursion stack for current path
- When reaching a node in recursion stack, a cycle is found
- Backtracks and continues searching for all cycles

**Time Complexity**: O(V + E)

### 3. Critical Path Finding (Memoized DFS)
Finds longest paths in DAG using dynamic programming:
- For each node, recursively find longest subpaths
- Memoize results to avoid recomputation
- Combines subpaths to get global longest paths
- Sorts by length to identify critical paths

**Time Complexity**: O(V + E) with memoization

### 4. Cluster Detection (BFS)
Connected component finding with size constraints:
- Build undirected adjacency from references
- Start BFS from unvisited nodes
- Limit cluster size to avoid huge groups
- Calculate cohesion (internal edges) and coupling (external edges)

**Time Complexity**: O(V + E)

## Integration with Previous Phases

### Phase 1 (Refiner) Integration
- Input: Sanitized, entropy-scored code blocks
- Purpose: Prepare clean source for analysis
- Output: Cleaned text for parsing

### Phase 2 (Librarian) Integration
- Input: Ranked nodes with importance scores
- Purpose: Use importance scores in manifest
- Output: Node IDs, importance, relationships
- Example:
  ```typescript
  const librarian = new Librarian();
  const analysis = await librarian.analyze('./src');
  
  const generator = new ManifestGenerator();
  const result = await generator.generate(analysis.rankedNodes, analysis.references);
  ```

## Test Coverage

**31 Tests** across 4 test suites:

### HierarchyBuilder Tests (7)
- Build layers from nodes
- Establish parent-child relationships
- Build directory and type hierarchies
- Detect and measure clusters

### CrossReferenceResolver Tests (7)
- Resolve cross-references
- Detect circular dependencies
- Compute critical paths
- Get transitive dependencies/dependents
- Find paths between nodes

### ManifestCompiler Tests (4)
- Compile to JSON, Markdown, YAML
- Get file extensions for formats
- HTML generation

### Integration Tests (8)
- Full pipeline generation
- Configuration management
- Query and filtering
- Export to all formats
- Statistics calculation

**Coverage Target**: 75% across statements, branches, functions, lines

## Performance Characteristics

### Graph Building
- **Small project** (10 files): ~50ms
- **Medium project** (100 files): ~100-200ms
- **Large project** (1000 files): ~500ms-1s

### Analysis Stages
- **Hierarchy Building**: O(V + E)
- **Cycle Detection**: O(V + E)
- **Critical Paths**: O(V × (V + E)) worst case, O(V + E) typical
- **Clustering**: O(V + E)

### Memory Usage
- **Nodes**: ~1KB per node
- **References**: ~200 bytes per edge
- **100 nodes**: ~200KB
- **1000 nodes**: ~2-3MB

### Optimization Tips
1. Enable caching for repeated analyses
2. Limit cluster size for large codebases (maxClusterSize)
3. Use file pattern matching to exclude unrelated files
4. Disable source code inclusion unless needed
5. Run critical path computation selectively for very large graphs

## Known Limitations

1. **Regex-based parsing**: Cannot resolve complex cross-module type references
   - Limitation: Dynamic imports, re-exports not fully tracked
   - Workaround: Phase 2 (Librarian) handles most common patterns

2. **Circular dependency reporting**: May over-report in complex graphs
   - Limitation: Every cycle variant reported separately
   - Workaround: Filter by cycle strength/frequency

3. **Cluster detection**: Limited to connected components
   - Limitation: Cannot find overlapping clusters
   - Workaround: Analyze subsets or adjust threshold

4. **Documentation extraction**: Basic pattern matching
   - Limitation: JSDoc and complex comments partially parsed
   - Workaround: Phase 1 (Refiner) provides semantic analysis

## Future Enhancements

1. **Semantic Type Resolution**: Use TypeScript compiler API for precise types
2. **Change Impact Analysis**: Show what breaks when modifying a node
3. **Dead Code Detection**: Identify unreferenced entities
4. **Dependency Metrics**: Calculate fan-in/fan-out per node
5. **Interactive Visualization**: Web UI for exploring manifests
6. **Version Diff**: Compare manifests across commits
7. **Custom Exporters**: Plugin system for format extensions
8. **Graph Database Export**: Neo4j, ArangoDB outputs
9. **IDE Integration**: VS Code, JetBrains plugins
10. **Real-time Updates**: Watch mode for live manifest generation

## Troubleshooting

### Issue: Very long processing time
- Check if `detectCircularDeps` is enabled (can be O(V²) in worst case)
- Reduce `maxHierarchyDepth`
- Use file pattern to exclude node_modules, dist, etc.

### Issue: Memory exhaustion on large codebases
- Reduce `maxClusterSize`
- Disable `computeCriticalPaths` if not needed
- Process in smaller batches by directory

### Issue: Inaccurate relationships
- Check that Phase 2 (Librarian) graph is correct
- Verify file patterns include all relevant files
- Review circular dependency warnings

### Issue: Missing nodes in output
- Verify language/file type is recognized
- Check `filePattern` configuration
- Ensure nodes have valid `type` field

## CLI Usage

```bash
# Generate manifest from codebase
npx ts-node src/cli.ts analyze ./src

# Export to Markdown
npx ts-node src/cli.ts analyze ./src --format markdown

# Detect circular dependencies only
npx ts-node src/cli.ts cycles ./src

# Generate critical paths report
npx ts-node src/cli.ts critical-paths ./src
```

## API Example

```typescript
import { ManifestGenerator } from '@maximinion/manifest-generator';
import { Librarian } from '@maximinion/librarian';

// 1. Use Librarian to analyze codebase
const librarian = new Librarian();
const analysis = await librarian.analyze('./src');

// 2. Generate manifest
const generator = new ManifestGenerator({
  language: 'typescript',
  computeCriticalPaths: true,
  clusterNodes: true,
});

const result = await generator.generate(
  analysis.rankedNodes,
  analysis.references,
  'my-project'
);

// 3. Query manifest
const highImportance = generator.query(
  result.manifest,
  result.nodeMap,
  { importance: { min: 0.7, max: 1.0 } }
);

// 4. Export
const markdown = generator.export(
  result.manifest,
  result.nodeMap,
  'markdown'
);

console.log(markdown);
```

## Statistics Example

```typescript
const stats = generator.getStats(result.manifest);
// {
//   version: "1.0.0",
//   totalNodes: 248,
//   totalFiles: 42,
//   totalLines: 12500,
//   averageFileSize: "297.62",
//   averageComplexity: "0.48",
//   circularDependencies: 3,
//   clusters: 8,
//   longestPathLength: 12,
//   processingTimeMs: 234,
//   languageCount: 2
// }
```

---

**Phase 3** completes the analysis stack, providing comprehensive documentation for LLM context or IDE integration. Ready for Phase 4: The Proxy Transport (real-time context injection).
