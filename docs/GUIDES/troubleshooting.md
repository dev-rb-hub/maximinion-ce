# Troubleshooting Guide

Solutions for common issues and error messages.

## General

### "Command not found: npx"

**Symptoms:** `npx: command not found`

**Solutions:**
1. Reinstall Node.js from https://nodejs.org
2. Verify installation: `node --version` (should be 18+)
3. Update npm: `npm install -g npm@latest`

### "Cannot find module '@maximinion/...'"

**Symptoms:** `Error: Cannot find module '@maximinion/refiner'`

**Solutions:**
1. Reinstall dependencies: `npm install`
2. Clear npm cache: `npm cache clean --force`
3. Rebuild packages: `npm run build`
4. Check node_modules: `ls node_modules/@maximinion/`

### Port Already in Use

**Symptoms:** `EADDRINUSE: address already in use :::3000`

**Solutions:**
```bash
# Find process using port
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

Note: MaxiMinion CE packages do not currently open network ports themselves.

---

## Phase 1: The Refiner

### Issue: Sanitization Removes Too Much Code

**Symptoms:** Many lines removed, result looks corrupted

**Cause:** Overly aggressive pattern matching

**Solution:**
```bash
# See exactly what was redacted (type and position of each match)
npx @maximinion/refiner sanitize src/app.ts
```

Built-in patterns cannot be disabled or tuned yet. If a pattern produces false
positives, please report it via GitHub Issues with a minimal sample.

### Issue: Entropy Score Seems Wrong

**Symptoms:** High entropy for simple code, low for complex code

**Cause:** Algorithm misclassification or insufficient context

**Solution:**
```bash
# View per-line entropy scores
npx @maximinion/refiner entropy src/app.ts

# View per-block scores and token counts from the full pipeline
npx @maximinion/refiner refine src/app.ts
```

The entropy calculation is not configurable yet (there is no window-size setting).

### Issue: Semantic Folding Fails

**Symptoms:** Error about Ollama not responding

**Cause:** Ollama service not running

**Solution:**
```bash
# Start Ollama
ollama serve

# In another terminal, verify connection
ollama list
```

Semantic folding is only used programmatically (the CLI always disables it).
If Ollama is unavailable, disable folding in your code:

```typescript
const refiner = new Refiner({ enableSemanticFolding: false });
```

### Issue: Performance Slow (Large Codebase)

**Symptoms:** Takes >5 minutes for 10MB of code

**Cause:** Processing large files without optimization

**Solution:**
```bash
# Refine individual files instead of a whole directory
npx @maximinion/refiner refine src/app.ts > refined.txt

# batch is non-recursive (.ts/.js files directly in the directory),
# so point it at a smaller directory that excludes bundles and dist/
npx @maximinion/refiner batch ./src/core > refined.txt
```

Streaming, ignore globs, and parallel processing are not available yet.

---

## Phase 2: The Librarian

### Issue: Dependency Graph Incomplete

**Symptoms:** Missing imports or circular references not detected

**Cause:** Language parser doesn't support your language

**Solution:** The Librarian (programmatic API only, no CLI) currently analyzes
`.ts`, `.tsx`, `.js`, and `.jsx` files, skipping `node_modules` and dot-directories.
Other languages are not supported yet and cannot be added via configuration.

```typescript
const analysis = await new Librarian().analyze('./src');
console.log(analysis.graph.nodes.length, analysis.graph.edges.length);
```

### Issue: PageRank Scores All Equal

**Symptoms:** All files have importance ~1.0

**Cause:** Convergence threshold too high or insufficient iterations

**Solution:**
```typescript
// Increase iterations (default: 20)
const librarian = new Librarian({ pageRankIterations: 100 });
const analysis = await librarian.analyze('./src');

// Check connectivity
console.log(librarian.getSummary(analysis));
console.log(analysis.graph.edges.length); // 0 edges => all scores equal
```

### Issue: Performance Timeout

**Symptoms:** `Error: Analysis exceeded timeout (>30s)`

**Cause:** Very large dependency graph

**Solution:**
```typescript
// Run on a smaller subset first
const analysis = await new Librarian().analyze('./src/core');

// Optionally skip the more expensive passes
const fast = new Librarian({ enableClusterDetection: false, enableCriticalPathAnalysis: false });
```

Timeout and file-sampling settings are not available yet.

---

## Phase 3: Manifest Generator

### Issue: Export Format Error

**Symptoms:** `Error: Unknown format 'pdf'`

**Cause:** Unsupported export format

**Solution:** The Manifest Generator (programmatic API only, no CLI) supports
`json`, `markdown`, `yaml`, and `html`:

```typescript
const { manifest, nodeMap } = await generator.generate(nodes, references);
const output = generator.export(manifest, nodeMap, 'markdown'); // or 'json', 'yaml', 'html'
```

### Issue: Cross-References Broken

**Symptoms:** Links in markdown manifest point to wrong sections

**Cause:** Hierarchy depth too deep or name conflicts

**Solution:**
```typescript
// Reduce hierarchy depth
const generator = new ManifestGenerator({ maxHierarchyDepth: 8 });

// Inspect generation warnings/errors and stats
const result = await generator.generate(nodes, references);
console.log(result.warnings, result.errors, generator.getStats(result.manifest));
```

Ensure each `ManifestNode.id` you pass in is unique; there is no automatic renaming.

### Issue: Output File Very Large

**Symptoms:** manifest.md is >10MB

**Cause:** Too many cross-references or full code inclusion

**Solution:**
```typescript
// Skip source code and docstrings (includeSourceCode is false by default)
const generator = new ManifestGenerator({ includeSourceCode: false, includeDocstrings: false });

// Or export only the most important nodes
const top = generator.getTopNodes(result.manifest, result.nodeMap, 50);
```

---

## Phase 4: Proxy Transport

### Issue: IDE Extension Not Connecting

**Symptoms:** "Connection refused" in VS Code

**Cause:** The Proxy Transport has no CLI and does not currently run a network
server, and the VS Code extension does not connect to it (live context
injection is not available yet).

**Solution:** Use the Proxy Transport in-process from TypeScript and check its health:
```typescript
import { ProxyTransport } from '@maximinion/proxy-transport';

const proxy = new ProxyTransport();
await proxy.initialize(manifest, nodeMap);
console.log(proxy.getHealth());
```

### Issue: High Latency in IDE

**Symptoms:** Decorations appear after 1+ seconds

**Cause:** Large manifests or slow network

**Solution:**
```typescript
// Check cache hit rate
console.log(proxy.getCacheStats()); // { size, entries, hitRate }

// Increase cache size (bytes; default 200MB) and use LRU eviction (default)
const proxy = new ProxyTransport({ cacheMaxSize: 1000 * 1024 * 1024, cacheEvictionPolicy: 'LRU' });
```

### Issue: WebSocket Connection Drops

**Symptoms:** "WebSocket connection closed" errors

**Cause:** Idle timeout or network issues

**Solution:**
```typescript
// Increase session idle timeout (milliseconds; default 1 hour)
const proxy = new ProxyTransport({ sessionTimeout: 2 * 60 * 60 * 1000 });
```

### Issue: Memory Usage Growing

**Symptoms:** Proxy process uses >1GB RAM

**Cause:** Manifest leaks or unclosed sessions

**Solution:**
```typescript
// Check running sessions
console.log(proxy.getSessionStats()); // { active, peak, totalCreated }

// Limit concurrent sessions (default: 100)
proxy.configure({ maxConcurrentSessions: 50 });

// Release resources when done
proxy.shutdown();
```

---

## Cloud Deployment

### Issue: Database Connection Timeout

**Symptoms:** `ETIMEDOUT: connection attempt failed`

**Cause:** Network/firewall blocking database

**Solution:**
```bash
# Verify connection string
echo $DB_HOST $DB_PORT  # Should show your database endpoint

# Test connectivity
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME

# Check firewall rules
# AWS: Security Group should allow inbound port 5432
# Azure: Firewall rules should allow your IP

# Increase timeout
export DB_CONNECT_TIMEOUT=30000
npm start
```

### Issue: High API Error Rate

**Symptoms:** 50%+ of requests return 5xx errors

**Cause:** Service overload, database issues, or memory exhaustion

**Solution:**
```bash
# Check logs
docker logs maximinion-api

# Monitor resources
docker stats maximinion-api

# Scale up
docker-compose scale api=5

# Or use managed service autoscaling
# AWS: Enable Auto Scaling Group
# Azure: Enable Autoscale
# GCP: Enable Cloud Run autoscaling
```

### Issue: Certificate Validation Error

**Symptoms:** `Error: unable to verify the first certificate`

**Cause:** SSL/TLS certificate issues

**Solution:**
```bash
# Verify certificate
openssl s_client -connect api.maximinion.ai:443

# Update CA certificates
npm install -g npm-windows-upgrade  # Windows
sudo update-ca-certificates  # Linux

# Or disable cert verification (dev only!)
export NODE_TLS_REJECT_UNAUTHORIZED=0
```

---

## Testing & Validation

### Verify Installation

```bash
# Test all phases
npm test

# Should output:
# PASS  packages/refiner/__tests__/refiner.test.ts
# PASS  packages/librarian/__tests__/librarian.test.ts
# PASS  packages/manifest-generator/__tests__/manifest.test.ts
# PASS  packages/proxy-transport/__tests__/proxy.test.ts
# Test Suites: 4 passed, 4 total
# Tests: 106 passed, 106 total
```

### CLI Smoke Tests

```bash
# Phase 1 (the only package with a CLI)
npx @maximinion/refiner demo
npx @maximinion/refiner sanitize packages/refiner/src/cli.ts
```

Phases 2–4 have no CLI; they are covered by `npm test` above.

---

## Getting Help

1. **GitHub Issues:** [Report a bug](https://github.com/maximinion/maximinion.ai/issues)
2. **Discussions:** [Ask a question](https://github.com/maximinion/maximinion.ai/discussions)
3. **Email:** support@maximinion.ai (Professional/Enterprise)
4. **Chat:** Slack (Enterprise customers)

---

**Last Updated:** 2026-09-24
