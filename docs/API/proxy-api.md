# Phase 4: Proxy Transport - API Reference

Complete API documentation for the Proxy Transport package.

## Installation

```bash
npm install @maximinion/proxy-transport
```

## Quick Start

```typescript
import { ProxyServer, ProxyOptions } from '@maximinion/proxy-transport';

const proxy = new ProxyServer({
  port: 3000,
  manifestPath: './manifest.md',
  cacheSize: 500,  // MB
});

await proxy.start();
console.log('Proxy running on http://localhost:3000');
```

## Core Classes

### `ProxyServer`

HTTP/WebSocket server for real-time context delivery.

**Constructor:**
```typescript
constructor(options: ProxyOptions)
```

**Methods:**
- `start(): Promise<void>`
- `stop(): Promise<void>`
- `loadManifest(path: string): Promise<void>`
- `createSession(clientId: string): Session`
- `getMetrics(): ProxyMetrics`

### `ProxyOptions`

Configuration options.

```typescript
interface ProxyOptions {
  port?: number;                    // 3000
  host?: string;                    // 'localhost'
  manifestPath?: string;            // Path to manifest
  cachePolicy?: 'lru' | 'lfu' | 'fifo';  // 'lru'
  cacheSize?: number;               // MB, default 500
  maxConcurrentSessions?: number;   // 1000
  sessionTimeout?: number;          // ms, 3600000
  requestTimeout?: number;          // ms, 30000
  enableMetrics?: boolean;          // true
  tlsCert?: string;                 // Path to cert (optional)
  tlsKey?: string;                  // Path to key (optional)
}
```

### `Session`

Represents an IDE session.

```typescript
interface Session {
  clientId: string;
  createdAt: Date;
  lastActivity: Date;
  manifest: Manifest;
  contextWindow: ContextWindow;
  
  selectContext(criteria: SelectionCriteria): SelectedContext;
  stream(callback: StreamCallback): void;
  close(): void;
}
```

## REST API Endpoints

### `GET /health`

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 3600,
  "sessions": 42,
  "cacheHitRate": 0.72
}
```

### `POST /sessions`

Create new session.

**Request:**
```json
{
  "clientId": "vscode-123",
  "ide": "vscode",
  "version": "1.0.0"
}
```

**Response:**
```json
{
  "sessionId": "sess_abc123",
  "createdAt": "2026-09-24T10:30:00Z"
}
```

### `GET /sessions/{sessionId}`

Get session info.

### `DELETE /sessions/{sessionId}`

Close session.

### `POST /context/select`

Select context for given criteria.

**Request:**
```json
{
  "sessionId": "sess_abc123",
  "tokenBudget": 4096,
  "currentFile": "src/app.ts",
  "selectionMethod": "importance-based"
}
```

**Response:**
```json
{
  "selectedFiles": ["services.ts", "db.ts", "config.ts"],
  "totalTokens": 3842,
  "importance": [0.95, 0.87, 0.72]
}
```

## WebSocket Events

### Connection

```javascript
const ws = new WebSocket('ws://localhost:3000/ws');

ws.addEventListener('open', () => {
  ws.send(JSON.stringify({
    type: 'join',
    sessionId: 'sess_abc123'
  }));
});
```

### Context Update

```javascript
ws.addEventListener('message', (event) => {
  const { type, data } = JSON.parse(event.data);
  
  if (type === 'context-update') {
    console.log('New context:', data.selectedFiles);
  }
});
```

### Metrics Event

```javascript
ws.addEventListener('message', (event) => {
  const { type, data } = JSON.parse(event.data);
  
  if (type === 'metrics') {
    console.log('Cache hit rate:', data.cacheHitRate);
  }
});
```

## Programmatic Usage

### Direct Context Selection

```typescript
const session = proxy.createSession('client-123');
const context = session.selectContext({
  tokenBudget: 4096,
  currentFile: 'src/app.ts',
  criteria: 'importance'
});

console.log(context.selectedFiles);  // Most important files
console.log(context.totalTokens);    // Actual token count
```

### Streaming Updates

```typescript
session.stream((context) => {
  console.log('Updated context:', context);
  // Called whenever context changes
});
```

## CLI Usage

```bash
# Start proxy server
npx @maximinion/proxy-transport --port 3000

# With manifest file
npx @maximinion/proxy-transport \
  --port 3000 \
  --manifest ./MANIFEST.md

# With TLS
npx @maximinion/proxy-transport \
  --port 443 \
  --tls-cert ./cert.pem \
  --tls-key ./key.pem

# Show metrics
npx @maximinion/proxy-transport --metrics
```

## Metrics

### Performance Metrics

```typescript
interface ProxyMetrics {
  startTime: Date;
  activeSessionCount: number;
  totalSessionsProcessed: number;
  cacheSize: number;
  cacheHitRate: number;      // 0-1
  averageResponseTime: number; // ms
  averageContextSize: number;  // tokens
  p95Latency: number;          // ms
  p99Latency: number;          // ms
}
```

### Retrieving Metrics

```typescript
const metrics = proxy.getMetrics();
console.log(`Cache hit rate: ${(metrics.cacheHitRate * 100).toFixed(2)}%`);
console.log(`P95 latency: ${metrics.p95Latency}ms`);
console.log(`Active sessions: ${metrics.activeSessionCount}`);
```

## Examples

See [../EXAMPLES/proxy-example.ts](../EXAMPLES/proxy-example.ts) for complete examples.

---

**Full Documentation:** See [../PHASE_4.md](../PHASE_4.md)
