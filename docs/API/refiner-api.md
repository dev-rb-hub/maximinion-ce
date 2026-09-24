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

**Example:**
```typescript
const compressed = await refiner.fold(code);
// Reduces boilerplate while preserving logic
```

## CLI Usage

```bash
# Sanitize a file
npx @maximinion/refiner --input ./src/app.ts

# Export to JSON
npx @maximinion/refiner --input ./src --output result.json

# With semantic folding
npx @maximinion/refiner --input ./src --enable-folding --ollama-model mistral

# Show detailed analysis
npx @maximinion/refiner --input ./src --verbose

# Custom secret pattern
npx @maximinion/refiner --input ./src --add-pattern "MY_SECRET_.*"
```

## Examples

See [../EXAMPLES/refiner-example.ts](../EXAMPLES/refiner-example.ts) for complete examples.

---

**Full Documentation:** See [../PHASE_1.md](../PHASE_1.md)
