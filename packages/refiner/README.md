# @maximinion/refiner

Phase 1: The Refiner — local secret/PII sanitization, Shannon entropy scoring, and optional semantic folding (via a local Ollama instance) to reduce token usage before sending code to an LLM.

## Installation

```bash
npm install @maximinion/refiner
```

## Quick Start

```typescript
import { Refiner } from '@maximinion/refiner';

const refiner = new Refiner({ enableSemanticFolding: false });
const output = await refiner.refine(sourceCode);

console.log(output.metadata.sanitizationStats.totalScrubbed, 'secrets redacted');
console.log(output.metadata.compressionRatio);
```

## API

- `refine(input)` — full pipeline: sanitize → split into blocks → entropy score each block → optionally fold. Returns `RefinedOutput` (`sanitizedText`, `blocks`, `metadata`).
- `sanitize(text)` — secret/PII scrubbing only (synchronous).
- `calculateEntropy(text)` — Shannon entropy score only (synchronous).
- `fold(code)` — semantic folding of a single block via Ollama (requires `enableSemanticFolding: true` and Ollama running locally).
- `getStatistics()` — sanitizer and folding-cache stats.
- CLI: `npx refiner` (see `src/cli.ts`).

See [docs/API/refiner-api.md](../../docs/API/refiner-api.md) for extended reference.

## Licensing & Compliance

*"MaxiMinion.AI Community Edition is an independent, zero-cost tool provided strictly under the MIT License. The provision of this free tier does not constitute an operation in trade or commerce under the Australian Consumer Law (ACL), and the standard statutory consumer guarantees do not apply to this zero-cost release."*

## License

MIT
