# Phase 2: The Librarian - API Reference

Complete API documentation for the Librarian package.

## Installation

```bash
npm install @maximinion/librarian
```

## Quick Start

```typescript
import { Librarian, LibrarianOptions, GraphResult } from '@maximinion/librarian';

const librarian = new Librarian({
  pageRankDampingFactor: 0.85,
  pageRankIterations: 40,
});

const graph = await librarian.analyze('./src');
console.log(graph.centrality);
console.log(graph.importantModules);
```

## Core Classes

### `Librarian`

Analyzes codebase structure and importance.

**Constructor:**
```typescript
constructor(options: LibrarianOptions)
```

**Methods:**
- `analyze(input: string): Promise<GraphResult>`
- `getCentrality(fileId: string): CentralityScore`
- `findCriticalPath(): string[]`
- `detectClusters(): Cluster[]`

### `LibrarianOptions`

Configuration options.

```typescript
interface LibrarianOptions {
  pageRankDampingFactor?: number;     // 0.85 (standard)
  pageRankIterations?: number;         // 40 (recommended)
  betweennessWeight?: number;          // 0.3
  closenessWeight?: number;            // 0.15
  maxDependencyDepth?: number;        // 10
  timeoutMs?: number;                  // 30000
}
```

### `GraphResult`

Result from graph analysis.

```typescript
interface GraphResult {
  nodes: FileNode[];
  edges: DependencyEdge[];
  centrality: CentralityScores;
  importantModules: ImportantModule[];
  clusters: Cluster[];
  statistics: GraphStatistics;
}

interface CentralityScores {
  pageRank: Map<string, number>;
  betweenness: Map<string, number>;
  closeness: Map<string, number>;
  composite: Map<string, number>;
}
```

## Methods

### `analyze(input: string | string[]): Promise<GraphResult>`

Analyze directory or file dependency graph.

**Example:**
```typescript
const graph = await librarian.analyze('./src');
const topFiles = Array.from(graph.centrality.composite.entries())
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .map(([file]) => file);
```

### `getCentrality(fileId: string): CentralityScore`

Get importance scores for a specific file.

**Returns:**
```typescript
interface CentralityScore {
  pageRank: number;
  betweenness: number;
  closeness: number;
  composite: number;     // Weighted average
}
```

### `findCriticalPath(): string[]`

Find the longest dependency chain.

**Example:**
```typescript
const path = librarian.findCriticalPath();
console.log('Critical files:', path);
// Output: ['main.ts', 'services.ts', 'db.ts', 'config.ts']
```

### `detectClusters(): Cluster[]`

Find groups of tightly-coupled modules.

**Example:**
```typescript
const clusters = librarian.detectClusters();
clusters.forEach(cluster => {
  console.log(`Cluster: ${cluster.name}`);
  console.log(`  Files: ${cluster.files.join(', ')}`);
  console.log(`  Cohesion: ${cluster.cohesion}`);
});
```

## CLI Usage

```bash
# Analyze a codebase
npx @maximinion/librarian --input ./src

# Export to JSON
npx @maximinion/librarian --input ./src --output graph.json

# Find critical path
npx @maximinion/librarian --input ./src --critical-path

# Detect clusters
npx @maximinion/librarian --input ./src --detect-clusters

# Show statistics
npx @maximinion/librarian --input ./src --statistics
```

## Examples

See [../EXAMPLES/librarian-example.ts](../EXAMPLES/librarian-example.ts) for complete examples.

---

**Full Documentation:** See [../PHASE_2.md](../PHASE_2.md)
