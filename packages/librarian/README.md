# @maximinion/librarian

Phase 2: The Librarian — dependency graph analysis and centrality scoring (PageRank, betweenness, closeness) for codebases.

## Installation

```bash
npm install @maximinion/librarian
```

## Quick Start

```typescript
import { Librarian } from '@maximinion/librarian';

const librarian = new Librarian({ pageRankIterations: 20 });
const analysis = await librarian.analyze('./src');

const topNodes = librarian.getTopNodes(analysis, 10);
console.log(topNodes.map((n) => n.id));
```

## API

- `analyze(sourcePath, filePattern = '**/*.ts')` — builds the dependency graph and ranks nodes by importance.
- `getTopNodes(analysis, limit)` — most important nodes by composite centrality score.
- `filterByImportance(analysis, threshold?)` — nodes above an importance threshold.
- `getNodesByType(analysis, type)` — nodes of a given type (`file`, `function`, `class`, `method`, `variable`, `module`).
- `selectContext(analysis, tokenBudget, includeTypes)` — select the most important code within a token budget for LLM context.

See [docs/API/librarian-api.md](../../docs/API/librarian-api.md) for extended reference.

## Licensing & Compliance

*"MaxiMinion.AI Community Edition is an independent, zero-cost tool provided strictly under the MIT License. The provision of this free tier does not constitute an operation in trade or commerce under the Australian Consumer Law (ACL), and the standard statutory consumer guarantees do not apply to this zero-cost release."*

## License

MIT
