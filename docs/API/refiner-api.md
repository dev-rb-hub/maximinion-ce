# Phase 1: The Refiner - API Reference

Complete API documentation for the Refiner package.

## Installation

```bash
npm install @maximinion/refiner
```

## Quick Start

```typescript
import { Refiner, RefinerOptions, RefinerResult } from '@maximinion/refiner';

const refiner = new Refiner({
  enableSemanticFolding: true,
  entropyThreshold: 0.3,
});

const result = await refiner.process('./src');
console.log(result.sanitized);
console.log(result.entropyScore);
```

## Core Classes

### `Refiner`

Main class for code sanitization and compression.

**Constructor:**
```typescript
constructor(options: RefinerOptions)
```

**Methods:**
- `process(input: string): Promise<RefinerResult>`
- `sanitize(code: string): string`
- `calculateEntropy(code: string): number`
- `fold(code: string): Promise<string>`

### `RefinerOptions`

Configuration options.

```typescript
interface RefinerOptions {
  enableSemanticFolding?: boolean;      // Use LLM compression
  entropyThreshold?: number;             // Signal-to-noise threshold (0-1)
  secretPatterns?: string[];             // Custom regex patterns
  mode?: 'aggressive' | 'balanced' | 'conservative';
  ollamaModel?: string;                  // e.g., 'mistral', 'llama2'
  allowRemoteModels?: boolean;           // Default false: refuse Ollama cloud models and non-loopback endpoints
  compressionRatio?: number;             // Target: 0.2-0.5
}
```

### `RefinerResult`

Result object from processing.

```typescript
interface RefinerResult {
  sanitized: string;
  entropyScore: number;
  removalStats: RemovalStats;
  compressionRatio: number;
  executionTime: number;
}

interface RemovalStats {
  secretsRemoved: number;
  piiRemoved: number;
  commentsRemoved: number;
  boilerplateRemoved: number;
}
```

## Methods

### `process(input: string | string[]): Promise<RefinerResult>`

Process a file or directory.

**Example:**
```typescript
const result = await refiner.process('./src/core.ts');
```

### `sanitize(code: string): string`

Remove secrets and PII synchronously.

**Example:**
```typescript
const sanitized = refiner.sanitize('const token = "sk-abc123";');
// Result: 'const token = "[SANITIZED_API_KEY]";'
```

### `calculateEntropy(code: string): number`

Calculate Shannon entropy.

**Returns:** 0-1 (0 = pure signal, 1 = pure noise)

**Example:**
```typescript
const entropy = refiner.calculateEntropy(code);
if (entropy > 0.7) {
  console.log('High noise detected');
}
```

### `fold(code: string): Promise<string>`

Compress code via semantic folding (requires Ollama).

Before sending code, the Refiner looks the model up in Ollama's model list. Remote (cloud) models, which Ollama forwards to another host, and endpoints that are not loopback are refused unless `allowRemoteModels: true` is set. `listOllamaModels()` reports `remote` and `remoteHost` for each model.

**Example:**
```typescript
const compressed = await refiner.fold(code);
// Reduces boilerplate while preserving logic
```

## CLI Usage

```bash
# Sanitize a file (prints sanitized text, redacted secrets, and stats)
npx @maximinion/refiner sanitize src/app.ts

# Per-line entropy scores
npx @maximinion/refiner entropy src/app.ts

# Full pipeline (sanitize, entropy, block token counts); save via redirection
npx @maximinion/refiner refine src/app.ts > refined.txt

# Refine all .ts/.js files directly in a directory (non-recursive; default ./src)
npx @maximinion/refiner batch ./src

# Built-in demo / usage
npx @maximinion/refiner demo
npx @maximinion/refiner help
```

The CLI takes no flags. Semantic folding is disabled in the CLI, and custom
secret patterns are programmatic only:

```typescript
const refiner = new Refiner({ enableSemanticFolding: true, ollamaModel: 'mistral' });
refiner.addCustomSanitizationPattern('my-secret', 'MY_SECRET_\\w+', 'GENERIC_SECRET');
```

## Examples

See [../EXAMPLES/refiner-example.ts](../EXAMPLES/refiner-example.ts) for complete examples.

---

**Full Documentation:** See [../PHASE_1.md](../PHASE_1.md)
