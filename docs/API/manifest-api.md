# Phase 3: Manifest Generator - API Reference

Complete API documentation for the Manifest Generator package.

## Installation

```bash
npm install @maximinion/manifest-generator
```

## Quick Start

```typescript
import { ManifestGenerator, ManifestOptions, Manifest } from '@maximinion/manifest-generator';

const generator = new ManifestGenerator({
  format: 'markdown',
  maxHierarchyDepth: 10,
});

const manifest = await generator.generate('./src');
await manifest.export('./MANIFEST.md');
console.log(manifest.summary);
```

## Core Classes

### `ManifestGenerator`

Generates hierarchical codebase documentation.

**Constructor:**
```typescript
constructor(options: ManifestOptions)
```

**Methods:**
- `generate(input: string): Promise<Manifest>`
- `exportToFormat(manifest: Manifest, format: string): Promise<string>`
- `query(manifest: Manifest, criteria: QueryCriteria): DocumentationNode[]`

### `ManifestOptions`

Configuration options.

```typescript
interface ManifestOptions {
  format?: 'json' | 'yaml' | 'markdown' | 'html';
  maxHierarchyDepth?: number;        // 10
  includeCode?: boolean;             // true
  includeDocstrings?: boolean;        // true
  resolveCrossReferences?: boolean;  // true
  compressionLevel?: number;         // 0-9
  timeout?: number;                  // 30000ms
}
```

### `Manifest`

Generated documentation structure.

```typescript
interface Manifest {
  version: string;
  generatedAt: Date;
  codebaseSize: CodebaseStats;
  hierarchy: HierarchyNode[];
  crossReferences: CrossReference[];
  summary: ManifestSummary;
  
  export(path: string, format?: string): Promise<void>;
  query(criteria: QueryCriteria): DocumentationNode[];
  toJSON(): object;
}
```

## Methods

### `generate(input: string | string[]): Promise<Manifest>`

Generate manifest from codebase.

**Example:**
```typescript
const manifest = await generator.generate('./src');
console.log(`Hierarchy depth: ${manifest.hierarchy.length}`);
console.log(`Cross-references: ${manifest.crossReferences.length}`);
```

### `exportToFormat(manifest: Manifest, format: string): Promise<string>`

Export manifest to specific format.

**Supported formats:**
- `'json'` - Structured JSON
- `'yaml'` - YAML format
- `'markdown'` - Readable Markdown
- `'html'` - Interactive HTML

**Example:**
```typescript
const markdown = await generator.exportToFormat(manifest, 'markdown');
fs.writeFileSync('./MANIFEST.md', markdown);
```

### `query(manifest: Manifest, criteria: QueryCriteria): DocumentationNode[]`

Query manifest for specific documentation.

**Example:**
```typescript
const nodes = generator.query(manifest, {
  type: 'function',
  name: /^handle.*/,
  minImportance: 0.5,
});
```

## CLI Usage

```bash
# Generate manifest in Markdown
npx @maximinion/manifest-generator \
  --input ./src \
  --format markdown \
  --output MANIFEST.md

# Generate as JSON for programmatic access
npx @maximinion/manifest-generator \
  --input ./src \
  --format json \
  --output manifest.json

# Query manifest
npx @maximinion/manifest-generator \
  --query "type:function name:handle.*" \
  --manifest ./manifest.json

# With Phase 1 & 2 integration
npx @maximinion/refiner --input ./src --output refined.json && \
npx @maximinion/librarian --input ./src --output graph.json && \
npx @maximinion/manifest-generator \
  --refiner refined.json \
  --librarian graph.json \
  --output manifest.md
```

## Export Formats

### Markdown Format

```markdown
# MyProject Codebase Manifest

## Overview
- Total Files: 42
- Total Lines: 15,234
- Compression Ratio: 85%

## Core Modules
### services.ts (Importance: 0.95)
Description of services module...
```

### JSON Format

```json
{
  "version": "1.0.0",
  "generatedAt": "2026-09-24T10:30:00Z",
  "hierarchy": [
    {
      "name": "services.ts",
      "type": "module",
      "importance": 0.95,
      "children": []
    }
  ]
}
```

### HTML Format

Interactive HTML with collapsible sections and search.

## Examples

See [../EXAMPLES/manifest-example.ts](../EXAMPLES/manifest-example.ts) for complete examples.

---

**Full Documentation:** See [../PHASE_3.md](../PHASE_3.md)
