# @maximinion/proxy-transport

Phase 4: The Proxy Transport — real-time context injection with IDE integration, streaming manifest-derived context to editors over a local transport server.

## Installation

```bash
npm install @maximinion/proxy-transport
```

## Quick Start

```typescript
import { ProxyTransport } from '@maximinion/proxy-transport';

const proxy = new ProxyTransport();
await proxy.initialize(manifest, nodeMap); // from @maximinion/manifest-generator's generate()

const context = await proxy.getContextForCurrentFile('session-1', 4000);
console.log(context.nodes.length, 'nodes returned');
```

`manifest` and `nodeMap` are produced by `@maximinion/manifest-generator`'s `generate()`.

## API

- `initialize(manifest, nodeMap)` — loads a manifest, starts the transport server and (optionally) streaming.
- `queryContext(sessionId, query)` — query context for LLM consumption.
- `getContextForCurrentFile(sessionId, tokenBudget?)` — context for the IDE's active file.
- `getContextForNode(sessionId, nodeId, tokenBudget?)` — context focused on a single manifest node.
- `getRelatedContext(sessionId, nodeId, depth?)` — related nodes (imports/dependents) up to a given depth.
- `startIDEIntegration(sessionId)` — wires up IDE adapter commands/messages.

See [docs/API/proxy-api.md](../../docs/API/proxy-api.md) for extended reference.

## License

MIT
