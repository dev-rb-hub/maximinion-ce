/**
 * Phase 4: Proxy Transport - Code Examples
 * 
 * This file demonstrates real-time context delivery and IDE integration.
 */

import { ProxyServer, ProxyOptions, Session } from '@maximinion/proxy-transport';
import * as fs from 'fs';

/**
 * Example 1: Basic Proxy Server
 * Start a local proxy for IDE integration
 */
async function example1_basicProxyServer() {
  const proxy = new ProxyServer({
    port: 3000,
    host: 'localhost',
    manifestPath: './manifest.md',
    cacheSize: 500, // MB
  });

  // Start server
  await proxy.start();
  console.log('✓ Proxy running on http://localhost:3000');
  console.log('  Health check: curl http://localhost:3000/health');

  // Let it run for demo
  setTimeout(() => proxy.stop(), 10000);
}

/**
 * Example 2: Session Management
 * Create and manage IDE sessions
 */
async function example2_sessionManagement() {
  const proxy = new ProxyServer({
    port: 3000,
    manifestPath: './manifest.md',
    maxConcurrentSessions: 100,
    sessionTimeout: 3600000, // 1 hour
  });

  await proxy.start();

  // Create session for VS Code
  const session = proxy.createSession('vscode-instance-1');
  console.log(`✓ Created session: ${session.sessionId}`);
  console.log(`  Client ID: ${session.clientId}`);
  console.log(`  Created at: ${session.createdAt}`);

  // Select context
  const context = session.selectContext({
    tokenBudget: 4096,
    currentFile: 'src/app.ts',
    selectionMethod: 'importance-based',
  });

  console.log('\nSelected context:');
  console.log(`  Files: ${context.selectedFiles.join(', ')}`);
  console.log(`  Total tokens: ${context.totalTokens}`);
  console.log(`  Importance scores: ${context.importance.map(i => i.toFixed(2)).join(', ')}`);

  // Close session
  session.close();
  console.log('\n✓ Session closed');

  await proxy.stop();
}

/**
 * Example 3: Real-Time Streaming
 * Stream context updates to IDE
 */
async function example3_realtimeStreaming() {
  const proxy = new ProxyServer({
    port: 3000,
    manifestPath: './manifest.md',
  });

  await proxy.start();

  const session = proxy.createSession('vscode-instance-1');

  // Subscribe to context updates
  session.stream((updatedContext) => {
    console.log('📤 Context updated:');
    console.log(`  Selected: ${updatedContext.selectedFiles.length} files`);
    console.log(`  Tokens: ${updatedContext.totalTokens}`);
    console.log(`  Timestamp: ${new Date().toISOString()}`);
  });

  console.log('✓ Listening for context updates...');

  // Simulate file changes
  setTimeout(() => {
    console.log('📝 User switched to different file...');
    // Context will automatically update
  }, 2000);

  setTimeout(() => proxy.stop(), 10000);
}

/**
 * Example 4: WebSocket Integration
 * Real-time WebSocket connection (for browsers/IDEs)
 */
async function example4_websocketIntegration() {
  const proxy = new ProxyServer({
    port: 3000,
    manifestPath: './manifest.md',
  });

  await proxy.start();

  // Client code (e.g., VS Code extension)
  const clientCode = `
    // In VS Code extension
    const ws = new WebSocket('ws://localhost:3000/ws');

    ws.addEventListener('open', () => {
      // Join session
      ws.send(JSON.stringify({
        type: 'join',
        sessionId: 'sess_abc123'
      }));
    });

    ws.addEventListener('message', (event) => {
      const { type, data } = JSON.parse(event.data);

      if (type === 'context-update') {
        // Show context in decorator
        console.log('Files to include:', data.selectedFiles);
      }

      if (type === 'metrics') {
        // Show performance metrics
        console.log('Cache hit rate:', data.cacheHitRate);
      }
    });

    ws.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
    });
  `;

  console.log('WebSocket client example:');
  console.log(clientCode);

  setTimeout(() => proxy.stop(), 5000);
}

/**
 * Example 5: Cache Performance
 * Monitor and optimize cache hit rate
 */
async function example5_cachePerformance() {
  const proxy = new ProxyServer({
    port: 3000,
    manifestPath: './manifest.md',
    cachePolicy: 'lru', // Least Recently Used
    cacheSize: 1000, // MB
  });

  await proxy.start();

  const session = proxy.createSession('client-1');

  // Monitor metrics
  const monitorInterval = setInterval(() => {
    const metrics = proxy.getMetrics();

    console.log('Cache Metrics:');
    console.log(`  Active sessions: ${metrics.activeSessionCount}`);
    console.log(`  Cache hit rate: ${(metrics.cacheHitRate * 100).toFixed(2)}%`);
    console.log(`  Average response time: ${metrics.averageResponseTime.toFixed(0)}ms`);
    console.log(`  P95 latency: ${metrics.p95Latency.toFixed(0)}ms`);
    console.log(`  P99 latency: ${metrics.p99Latency.toFixed(0)}ms`);

    // Alert if performance degrades
    if (metrics.cacheHitRate < 0.6) {
      console.log('⚠️  LOW CACHE HIT RATE - Consider increasing cache size');
    }
    if (metrics.p95Latency > 500) {
      console.log('⚠️  HIGH LATENCY - Performance issue detected');
    }
  }, 3000);

  setTimeout(() => {
    clearInterval(monitorInterval);
    proxy.stop();
  }, 15000);
}

/**
 * Example 6: API Requests
 * Make HTTP requests to proxy API
 */
async function example6_apiRequests() {
  const proxy = new ProxyServer({
    port: 3000,
    manifestPath: './manifest.md',
  });

  await proxy.start();

  // Example using fetch or axios
  async function makeApiRequests() {
    // 1. Health check
    const health = await fetch('http://localhost:3000/health');
    const healthData = await health.json();
    console.log('Health:', healthData);

    // 2. Create session
    const createSession = await fetch('http://localhost:3000/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: 'client-123',
        ide: 'vscode',
      }),
    });
    const sessionData = await createSession.json();
    console.log('Session created:', sessionData.sessionId);

    // 3. Select context
    const selectContext = await fetch('http://localhost:3000/context/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionData.sessionId,
        tokenBudget: 4096,
        currentFile: 'src/app.ts',
        selectionMethod: 'importance-based',
      }),
    });
    const contextData = await selectContext.json();
    console.log('Context selected:', contextData.selectedFiles);

    // 4. Get metrics
    const metricsResp = await fetch('http://localhost:3000/metrics');
    const metrics = await metricsResp.json();
    console.log('Proxy metrics:', metrics);
  }

  await makeApiRequests();
  setTimeout(() => proxy.stop(), 5000);
}

/**
 * Example 7: TLS/HTTPS Setup
 * Secure proxy with SSL certificates
 */
async function example7_tlsSetup() {
  // Generate self-signed certificate (for development)
  // openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

  const proxy = new ProxyServer({
    port: 443,
    host: 'api.example.com',
    manifestPath: './manifest.md',
    tlsCert: './cert.pem',
    tlsKey: './key.pem',
  });

  console.log('Proxy Configuration (TLS):');
  console.log(`  URL: https://api.example.com`);
  console.log(`  Certificate: ./cert.pem`);
  console.log(`  Private key: ./key.pem`);
  console.log('\nClient code:');
  console.log(`
    const ws = new WebSocket('wss://api.example.com/ws');
    // Works with secure WebSocket
  `);
}

/**
 * Example 8: Production Deployment
 * Kubernetes deployment with auto-scaling
 */
async function example8_productionDeployment() {
  const kubernetesConfig = `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: maximinion-proxy
spec:
  replicas: 3
  selector:
    matchLabels:
      app: maximinion-proxy
  template:
    metadata:
      labels:
        app: maximinion-proxy
    spec:
      containers:
      - name: proxy
        image: maximinion/proxy-transport:1.0.0
        ports:
        - containerPort: 3000
        env:
        - name: PORT
          value: "3000"
        - name: MANIFEST_PATH
          value: "/config/manifest.md"
        - name: CACHE_SIZE
          value: "1000"
        - name: CACHE_POLICY
          value: "lru"
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: manifest
        configMap:
          name: maximinion-manifest

---
apiVersion: v1
kind: Service
metadata:
  name: maximinion-proxy
spec:
  selector:
    app: maximinion-proxy
  ports:
  - protocol: TCP
    port: 3000
    targetPort: 3000
  type: LoadBalancer

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: maximinion-proxy-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: maximinion-proxy
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  `;

  fs.writeFileSync('./k8s-deployment.yaml', kubernetesConfig);
  console.log('✓ Kubernetes config saved to k8s-deployment.yaml');
  console.log('\nDeploy with:');
  console.log('  kubectl apply -f k8s-deployment.yaml');
  console.log('  kubectl get svc maximinion-proxy');
}

/**
 * Example 9: Monitoring & Alerting
 * Set up Prometheus metrics export
 */
async function example9_monitoringAlerting() {
  const proxy = new ProxyServer({
    port: 3000,
    manifestPath: './manifest.md',
    enableMetrics: true, // Enable Prometheus metrics
  });

  await proxy.start();

  // Metrics endpoint (Prometheus format)
  console.log('Prometheus metrics available at:');
  console.log('  curl http://localhost:3000/metrics');
  console.log('\nExpected output:');
  console.log(`
# HELP maximinion_sessions_total Total sessions processed
# TYPE maximinion_sessions_total counter
maximinion_sessions_total 42

# HELP maximinion_cache_hit_rate Cache hit rate (0-1)
# TYPE maximinion_cache_hit_rate gauge
maximinion_cache_hit_rate 0.72

# HELP maximinion_latency_p95_ms P95 latency in milliseconds
# TYPE maximinion_latency_p95_ms gauge
maximinion_latency_p95_ms 142.5
  `);

  console.log('\nAlerts configuration:');
  console.log(`
groups:
- name: maximinion
  rules:
  - alert: LowCacheHitRate
    expr: maximinion_cache_hit_rate < 0.6
    for: 5m
    annotations:
      summary: Cache hit rate below 60%

  - alert: HighLatency
    expr: maximinion_latency_p95_ms > 500
    for: 5m
    annotations:
      summary: P95 latency exceeds 500ms
  `);

  setTimeout(() => proxy.stop(), 5000);
}

// Run examples
async function main() {
  console.log('=== Phase 4: Proxy Transport Examples ===\n');

  try {
    console.log('Example 1: Basic Proxy Server');
    await example1_basicProxyServer();
    console.log('\n---\n');

    console.log('Example 2: Session Management');
    await example2_sessionManagement();
    console.log('\n---\n');

    console.log('Example 5: Cache Performance');
    await example5_cachePerformance();
    console.log('\n---\n');

    console.log('Example 8: Production Deployment');
    await example8_productionDeployment();
    console.log('\n---\n');

    // More examples...
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

main();
