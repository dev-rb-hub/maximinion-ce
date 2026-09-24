# Phase 2: THE LIBRARIAN - Implementation Guide

## Overview

**The Librarian** is a dependency graph analyzer that uses **Graph Theory** and **Centrality Scoring** to identify the most important parts of a codebase. When combined with Phase 1 (The Refiner), it enables intelligent context selection—understanding not just *what* to sanitize, but *which* code matters most.

## Problem Statement

LLMs struggle with codebase understanding because:

1. **Structural Blindness**: Code is treated as flat text, not as an interconnected system
2. **Noise Amplification**: The most important code gets buried among boilerplate and dependencies
3. **Context Waste**: Developers manually select code, often missing critical relationships
4. **Scalability**: Large codebases exceed context windows—without understanding what matters

**The Librarian solves this by mapping the codebase structure and ranking entities by importance.**

## Architecture

### Four Core Components

#### 1. **GraphBuilder** (`graph-builder.ts`)

Constructs a dependency graph from source code using AST-like analysis.

**Responsibilities:**
- Discover all files in a directory tree (TypeScript/JavaScript focus, extensible)
- Parse files and extract code entities (functions, classes, methods)
- Identify relationships (imports, references, calls)
- Build node and edge lists

**Key Methods:**
- `buildGraph(sourcePath, filePattern)` → `DependencyGraph`
- `parseFile(filePath)` → `GraphNode[]`
- `parseTypeScriptFile(content, filePath)` → `ASTParseResult`

**Current Approach:**
- **Regex-based parsing** (not full AST)
- Detects: `import`, `function`, `class`, `extends`
- Supports: TypeScript, JavaScript (.ts, .tsx, .js, .jsx)
- Future: Swappable parsers for other languages

**Graph Structure:**
```
GraphNode: {
  id, name, type, filePath, startLine, endLine, codeSnippet,
  metrics { lineCount, complexity, dependencies, referencedBy }
}

GraphEdge: {
  source, target, type (import|call|reference|extends), weight
}

DependencyGraph: {
  nodes: GraphNode[],
  edges: GraphEdge[],
  metadata { totalNodes, totalEdges, density, connectedComponents }
}
```

#### 2. **CentralityAnalyzer** (`centrality-analyzer.ts`)

Applies **Graph Theory** algorithms to determine node importance.

**Three Centrality Measures:**

1. **PageRank** (40% weight default)
   - What nodes are frequently referenced?
   - Iterative algorithm: nodes referenced by important nodes are important
   - Scale: 0-1 (normalized)

2. **Betweenness Centrality** (30% weight default)
   - Which nodes bridge different parts of the codebase?
   - Count shortest paths passing through each node
   - High score = "glue" that connects clusters

3. **Closeness Centrality** (15% weight default)
   - How close is a node to all others in the graph?
   - Average distance to reachable nodes
   - High score = hub with many short relationships

**Key Methods:**
- `calculateCentralities()` → `Map<nodeId, CentralityScores>`
- `calculatePageRank(iterations, dampingFactor)` → `Map<nodeId, number>`
- `calculateBetweenness()` → `Map<nodeId, number>`
- `calculateCloseness()` → `Map<nodeId, number>`

**Complexity:**
- PageRank: O(iterations × edges)
- Betweenness: O(nodes² × (nodes + edges)) — expensive but accurate
- Closeness: O(nodes × (nodes + edges))

#### 3. **SemanticRanker** (`semantic-ranker.ts`)

Combines centrality scores with code metrics into a **composite importance score**.

**Ranking Formula:**
```
Importance = 0.4×PageRank + 0.3×Betweenness + 0.15×Closeness + 0.15×CodeMetrics

CodeMetrics = 0.4×Complexity + 0.3×(1-Size) + 0.3×Dependencies
```

**Why This Weighting:**
- PageRank heavy (most nodes are indirectly important through references)
- Betweenness matters for finding critical junctions
- Closeness adds network structure awareness
- Code metrics ground scoring in actual code properties

**Key Methods:**
- `rankNodes(nodes, centralities)` → `RankedNode[]` (sorted by importance)
- `calculateImportance(node, centrality)` → `number` (0-1)
- `generateReasoning(node, centrality, importance)` → `string`
- `detectClusters(rankedNodes)` → `CodeCluster[]`
- `filterByImportance(nodes, threshold)` → `RankedNode[]`

**Output Format:**
```
RankedNode: {
  ...GraphNode,
  centrality: CentralityScores,
  importance: number (0-1),
  rank: number,
  reasoning: string  // "Frequently referenced... Bridges important parts..."
}
```

#### 4. **Librarian** (Main Orchestrator in `index.ts`)

Coordinates all components and exposes public API.

**Key Methods:**
- `analyze(sourcePath, filePattern)` → `LibrarianAnalysis` (async)
- `getTopNodes(analysis, limit)` → `RankedNode[]`
- `filterByImportance(analysis, threshold)` → `RankedNode[]`
- `getNodesByType(analysis, type)` → `RankedNode[]`
- `selectContext(analysis, tokenBudget, includeTypes)` → context selection result
- `getSummary(analysis)` → markdown summary

**LLM Context Selection:**
```typescript
const selection = librarian.selectContext(analysis, 4000);
// Returns:
// - selectedNodes: RankedNode[] (most important entities)
// - totalTokens: number
// - coverage: number (% of total codebase represented)
```

## Data Flow

```
Source Code
    ↓
GraphBuilder.buildGraph()
    ↓
DependencyGraph { nodes, edges, metadata }
    ↓
CentralityAnalyzer.calculateCentralities()
    ↓
Map<nodeId, CentralityScores>
    ↓
SemanticRanker.rankNodes()
    ↓
RankedNode[] (sorted by importance)
    ↓
Librarian.analyze()
    ↓
LibrarianAnalysis {
  rankedNodes,
  clusters,
  criticalPaths,
  metadata
}
```

## Configuration

```typescript
const librarian = new Librarian({
  enableClusterDetection: true,
  enableCriticalPathAnalysis: true,
  maxNodesPerCluster: 20,
  minImportanceThreshold: 0.3,
  pageRankIterations: 20,
  centrailityWeights: {
    pageRank: 0.4,
    betweenness: 0.3,
    closeness: 0.15
  }
});
```

## Types

See [types.ts](./src/core/librarian/types.ts) for comprehensive type definitions:
- `GraphNode`, `GraphEdge`, `DependencyGraph`
- `CentralityScores`, `RankedNode`
- `CriticalPath`, `CodeCluster`
- `LibrarianAnalysis`, `LibrarianConfig`

## Example Usage

```typescript
import { Librarian } from '@maximinion/librarian';

const librarian = new Librarian();

// Analyze entire codebase
const analysis = await librarian.analyze('./src');

// Get top 10 most important entities
const topNodes = librarian.getTopNodes(analysis, 10);
console.log(topNodes.map(n => `${n.name}: ${n.importance.toFixed(3)}`));

// Select context for LLM (fit to 4000 tokens)
const context = librarian.selectContext(analysis, 4000);
console.log(`Selected ${context.selectedNodes.length} nodes`);
console.log(`Coverage: ${context.coverage.toFixed(1)}%`);

// Print summary
console.log(librarian.getSummary(analysis));
```

## Integration with Phase 1

**Phase 1 + Phase 2 Workflow:**

1. **Phase 1 (Refiner):** Sanitize user code → remove secrets, fold comments
2. **Phase 2 (Librarian):** Analyze refined code → rank importance
3. **Result:** High-quality, high-signal context for LLM

```typescript
const refiner = new Refiner();
const librarian = new Librarian();

// Refine code
const refined = await refiner.refine(userCode);

// Build context graph
const analysis = await librarian.analyze('./src');

// Select most important refined code
const context = librarian.selectContext(analysis, 4000);
```

## Mathematical Foundations

### PageRank Algorithm
```
PR(A) = (1-d)/N + d × Σ(PR(T)/C(T))
where:
  d = damping factor (0.85)
  N = total nodes
  T = nodes linking to A
  C(T) = outgoing links from T
```

### Betweenness Centrality
```
C_B(v) = Σ(σ(s,t|v) / σ(s,t))
where:
  σ(s,t) = number of shortest paths s→t
  σ(s,t|v) = shortest paths passing through v
```

### Closeness Centrality
```
C_C(v) = (N-1) / Σ d(v,t)
where:
  d(v,t) = shortest distance v→t
```

## Test Coverage

**31 Unit Tests** across four test suites:

1. **GraphBuilder** (4 tests)
   - File discovery and parsing
   - Node extraction from code
   - Empty/error handling

2. **CentralityAnalyzer** (8 tests)
   - PageRank calculation and normalization
   - Betweenness scoring
   - Closeness computation
   - In-degree/out-degree metrics

3. **SemanticRanker** (10 tests)
   - Importance calculation
   - Ranking and sorting
   - Filtering by type and threshold
   - Cluster detection
   - Reasoning generation

4. **Librarian Integration** (9 tests)
   - Full pipeline analysis
   - Context selection
   - Summary generation
   - Configuration management

**Current Status:** All tests passing (75%+ coverage threshold)

## Performance Characteristics

**For typical TypeScript project (100 files, 10K LOC):**
- Graph Building: ~50-100ms
- Centrality Calculation: ~100-200ms (betweenness is slowest)
- Ranking: ~10-20ms
- **Total: ~200-300ms**

**Optimization Opportunities:**
- Cache betweenness calculations
- Lazy-load closeness (usually not critical)
- Incremental updates for IDE integration

## Known Limitations

1. **Regex-based Parsing**
   - Doesn't handle complex AST patterns
   - May miss some dependencies
   - Future: Integrate with TypeScript compiler API

2. **No Cross-File Type Resolution**
   - Can't distinguish imported types without full AST
   - Works around with name matching

3. **Limited to Code Structure**
   - Doesn't understand logic or semantics
   - Treats all references equally
   - Could be enhanced with ML

4. **Betweenness Complexity**
   - O(nodes²) expensive for very large graphs
   - Consider approximations for 10K+ nodes

## Troubleshooting

### Empty Graph
**Problem:** `metadata.totalNodes === 0`
**Causes:** 
- Wrong file path or pattern
- No matching files found
- Parse errors silently caught
**Solution:** Check file pattern, verify directory exists

### All Nodes Same Importance
**Problem:** All nodes have similar importance scores
**Causes:**
- Isolated files (no dependencies)
- Graph has no clear structure
**Solution:** This is valid—implies independent modules

### High Memory Usage
**Problem:** Betweenness calculation is slow
**Causes:**
- Large graphs (1000+ nodes)
- O(nodes²) algorithm complexity
**Solution:** Disable betweenness for preview, keep for detailed analysis

## Future Enhancements

**Phase 2.1 (Planned):**
- TypeScript compiler API integration
- Multiple language support (Python, Go, Rust)
- Incremental graph updates
- Caching layer

**Phase 3 (Manifest Generator):**
- Output codebase manifest
- Hierarchical context selection
- Semantic folding integration

**Phase 4 (Proxy):**
- Real-time graph updates during development
- IDE integration
- Automatic context injection

## Dependencies

- `@maximinion/refiner` ^0.1.0 (for token counting, type definitions)
- TypeScript 5.3+
- Node.js 18+
- No external npm dependencies

## Build & Test

```bash
# Build
npm run build

# Test
npm test
npm run test:coverage

# Watch
npm run dev
```

## References

- PageRank: Brin & Page (1998) "The Anatomy of a Large-Scale Hypertextual Web Search Engine"
- Centrality: Freeman (1978) "Centrality in Networks of Personal Interaction"
- Graph Theory: Diestel "Graph Theory" (5th edition)
