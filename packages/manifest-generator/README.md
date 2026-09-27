# @maximinion/manifest-generator

Phase 3: The Manifest Generator — builds a hierarchical, cross-referenced manifest of a codebase from ranked nodes (typically produced by `@maximinion/librarian`).

## Installation

```bash
npm install @maximinion/manifest-generator
```

## Quick Start

```typescript
import { ManifestGenerator } from '@maximinion/manifest-generator';

const generator = new ManifestGenerator({ computeCriticalPaths: true, clusterNodes: true });
const result = await generator.generate(nodes, crossReferences, 'my-codebase');

console.log(result.manifest.totalNodes, result.manifest.criticalPaths);
```

`nodes` and `crossReferences` are typically produced by `@maximinion/librarian`'s graph analysis.

## API

- `generate(nodes, references, codebaseId?)` — establishes parent/child relationships, builds hierarchy layers, resolves cross-references, detects circular dependencies and clusters, and compiles the final manifest. Returns `{ manifest, nodeMap, referenceMap, clusterMap, warnings, errors }`.

See [docs/API/manifest-api.md](../../docs/API/manifest-api.md) for extended reference.

## License

MIT
