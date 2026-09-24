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

# Or use different port
npx @maximinion/proxy-transport --port 3001
```

---

## Phase 1: The Refiner

### Issue: Sanitization Removes Too Much Code

**Symptoms:** Many lines removed, result looks corrupted

**Cause:** Overly aggressive pattern matching

**Solution:**
```bash
# Use conservative mode
npx @maximinion/refiner --input ./src --mode conservative

# Or disable specific patterns
npx @maximinion/refiner --input ./src --disable-pattern "COMMENT_BLOCK"
```

### Issue: Entropy Score Seems Wrong

**Symptoms:** High entropy for simple code, low for complex code

**Cause:** Algorithm misclassification or insufficient context

**Solution:**
```bash
# Check with different window size
npx @maximinion/refiner --input ./src --entropy-window 50

# View detailed analysis
npx @maximinion/refiner --input ./src --verbose
```

### Issue: Semantic Folding Fails

**Symptoms:** Error about Ollama not responding

**Cause:** Ollama service not running

**Solution:**
```bash
# Start Ollama
ollama serve

# In another terminal, verify connection
ollama list

# Retry refiner with fallback
npx @maximinion/refiner --input ./src --fallback-on-error
```

### Issue: Performance Slow (Large Codebase)

**Symptoms:** Takes >5 minutes for 10MB of code

**Cause:** Processing large files without optimization

**Solution:**
```bash
# Use streaming mode
npx @maximinion/refiner --input ./src --stream

# Or exclude large files
npx @maximinion/refiner --input ./src --ignore "*.bundle.js,dist/**"

# Process in parallel
npx @maximinion/refiner --input ./src --parallel 4
```

---

## Phase 2: The Librarian

### Issue: Dependency Graph Incomplete

**Symptoms:** Missing imports or circular references not detected

**Cause:** Language parser doesn't support your language

**Solution:**
```bash
# Check supported languages
npx @maximinion/librarian --list-languages

# Add language support
npx @maximinion/librarian --add-language python --parser ast

# Or use generic parser
npx @maximinion/librarian --input ./src --force-generic-parser
```

### Issue: PageRank Scores All Equal

**Symptoms:** All files have importance ~1.0

**Cause:** Convergence threshold too high or insufficient iterations

**Solution:**
```bash
# Increase iterations
npx @maximinion/librarian --input ./src --pagerank-iterations 100

# Lower convergence threshold
npx @maximinion/librarian --input ./src --convergence-threshold 0.001

# Check connectivity
npx @maximinion/librarian --input ./src --debug-graph
```

### Issue: Performance Timeout

**Symptoms:** `Error: Analysis exceeded timeout (>30s)`

**Cause:** Very large dependency graph

**Solution:**
```bash
# Increase timeout
npx @maximinion/librarian --input ./src --timeout 120

# Or sample graph
npx @maximinion/librarian --input ./src --max-files 1000

# Run on smaller subset first
npx @maximinion/librarian --input ./src/core --output test.json
```

---

## Phase 3: Manifest Generator

### Issue: Export Format Error

**Symptoms:** `Error: Unknown format 'pdf'`

**Cause:** Unsupported export format

**Solution:**
```bash
# List supported formats
npx @maximinion/manifest-generator --list-formats

# Use supported format
npx @maximinion/manifest-generator --format markdown  # or json, yaml, html
```

### Issue: Cross-References Broken

**Symptoms:** Links in markdown manifest point to wrong sections

**Cause:** Hierarchy depth too deep or name conflicts

**Solution:**
```bash
# Reduce hierarchy depth
npx @maximinion/manifest-generator --input ./src --max-depth 8

# Use unique naming
npx @maximinion/manifest-generator --input ./src --uniquify-names

# Debug hierarchy
npx @maximinion/manifest-generator --input ./src --debug-hierarchy
```

### Issue: Output File Very Large

**Symptoms:** manifest.md is >10MB

**Cause:** Too many cross-references or full code inclusion

**Solution:**
```bash
# Skip code snippets
npx @maximinion/manifest-generator --input ./src --exclude-code

# Summarize only
npx @maximinion/manifest-generator --input ./src --summary-only

# Compress with Phase 1
npx @maximinion/refiner --input ./src | \
npx @maximinion/manifest-generator --compress
```

---

## Phase 4: Proxy Transport

### Issue: IDE Extension Not Connecting

**Symptoms:** "Connection refused" in VS Code

**Cause:** Proxy server not running or wrong port

**Solution:**
```bash
# Start proxy on default port
npx @maximinion/proxy-transport

# Verify it's running
curl http://localhost:3000/health

# Check firewall
# Windows: netsh advfirewall firewall add rule name="MaxiMinion" \
#   dir=in action=allow program="node.exe" localport=3000 protocol=tcp

# Update VS Code settings
# Settings > Extensions > MaxiMinion > API Endpoint: http://localhost:3000
```

### Issue: High Latency in IDE

**Symptoms:** Decorations appear after 1+ seconds

**Cause:** Large manifests or slow network

**Solution:**
```bash
# Check cache hit rate
# In proxy logs: "Cache hit rate: 45%"

# Increase cache size
export CACHE_MAX_SIZE=1000  # MB
npx @maximinion/proxy-transport

# Use faster cache eviction
npx @maximinion/proxy-transport --cache-policy lru

# Pre-load manifests
npx @maximinion/proxy-transport --preload ./manifest.md
```

### Issue: WebSocket Connection Drops

**Symptoms:** "WebSocket connection closed" errors

**Cause:** Idle timeout or network issues

**Solution:**
```bash
# Increase idle timeout
export WEBSOCKET_IDLE_TIMEOUT=120000  # 2 minutes
npx @maximinion/proxy-transport

# Enable reconnection
# VS Code setting: MaxiMinion > Auto Reconnect: enabled

# Check network
ping localhost  # Should work instantly
```

### Issue: Memory Usage Growing

**Symptoms:** Proxy process uses >1GB RAM

**Cause:** Manifest leaks or unclosed sessions

**Solution:**
```bash
# Check running sessions
curl http://localhost:3000/sessions

# Clear old sessions
curl -X POST http://localhost:3000/sessions/cleanup

# Restart proxy
pkill -f proxy-transport
npx @maximinion/proxy-transport

# Limit concurrent sessions
export MAX_CONCURRENT_SESSIONS=100
npx @maximinion/proxy-transport
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
# Phase 1
echo "const secret = 'sk-abc123';" | npx @maximinion/refiner

# Phase 2
npx @maximinion/librarian --input ./packages/refiner/src

# Phase 3
npx @maximinion/manifest-generator --input ./packages/refiner/src

# Phase 4
npx @maximinion/proxy-transport &
curl http://localhost:3000/health
pkill -f proxy-transport
```

---

## Getting Help

1. **GitHub Issues:** [Report a bug](https://github.com/maximinion/maximinion.ai/issues)
2. **Discussions:** [Ask a question](https://github.com/maximinion/maximinion.ai/discussions)
3. **Email:** support@maximinion.ai (Professional/Enterprise)
4. **Chat:** Slack (Enterprise customers)

---

**Last Updated:** 2026-09-24
