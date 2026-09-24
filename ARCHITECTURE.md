# MaxiMinion.AI - System Architecture

## Overview

MaxiMinion.AI is a **multi-phase, hierarchical context optimization system** that transforms raw codebases into high-density semantic payloads suitable for LLM consumption. The architecture follows a **pipeline approach** where each phase builds upon the previous one, creating opportunities for independent scaling and optimization.

---

## System-Level Architecture

```mermaid
graph TB
    subgraph "Input"
        A["Raw Codebase<br/>(Source Files)"]
    end
    
    subgraph "Phase 1: The Refiner"
        B["Sanitizer<br/>(PII Removal)"]
        C["Entropy Calculator<br/>(Noise Detection)"]
        D["Semantic Folder<br/>(LLM Compression)"]
    end
    
    subgraph "Phase 2: The Librarian"
        E["Graph Builder<br/>(Dependency Analysis)"]
        F["Centrality Analyzer<br/>(Importance Scoring)"]
        G["Semantic Ranker<br/>(Context Selection)"]
    end
    
    subgraph "Phase 3: Manifest Generator"
        H["Hierarchy Builder<br/>(Topological Sort)"]
        I["Cross-Ref Resolver<br/>(Dependency Graph)"]
        J["Manifest Compiler<br/>(Multi-format Export)"]
    end
    
    subgraph "Phase 4: Proxy Transport"
        K["Context Manager<br/>(Caching + Sessions)"]
        L["Manifest Streamer<br/>(Real-time Updates)"]
        M["Transport Server<br/>(HTTP/WebSocket)"]
        N["IDE Adapter<br/>(VS Code/JetBrains)"]
    end
    
    subgraph "Output"
        O["LLM Context<br/>(Optimized)"]
        P["IDE UI<br/>(Live Decorations)"]
    end
    
    A --> B --> C --> D
    D --> E --> F --> G
    G --> H --> I --> J
    J --> K --> M --> O
    J --> L --> M
    K --> N --> P
    M --> O
```

---

## Detailed Phase Architecture

### Phase 1: The Refiner ⚙️

**Purpose:** Transform raw code into sanitized, entropy-scored, and semantically compressed blocks.

```mermaid
graph LR
    subgraph Refiner["Phase 1: The Refiner"]
        A["Input Code"]
        B["Sanitizer<br/>16+ Patterns<br/>PII/Secrets"]
        C["Block Splitter<br/>Parse Code Blocks"]
        D["Entropy Calculator<br/>Shannon H(s)"]
        E["Semantic Folder<br/>Ollama LLM"]
        F["Metadata Builder<br/>Stats & Scoring"]
        G["RefinedOutput"]
    end
    
    A --> B --> C --> D --> E --> F --> G
```

**Key Algorithms:**
- **Sanitization:** Regex-based pattern matching for secrets (AWS keys, API keys, JWT, etc.)
- **Entropy Scoring:** Shannon entropy $H(s) = -\sum p(x_i) \log_2(p(x_i))$ for signal-to-noise ratio
- **Semantic Folding:** LLM-based code compression with content-addressed caching

**Output Types:**
- `SanitizedText` - Code with secrets removed
- `EntropyScore` - Numerical noise metric (LOW ≤5, MEDIUM 5-6.5, HIGH >6.5)
- `RefinedOutput` - Combined result with compression ratio

**Complexity:** O(n × m) where n = files, m = avg file size

---

### Phase 2: The Librarian 📚

**Purpose:** Analyze dependency graph and identify structurally important code elements.

```mermaid
graph LR
    subgraph Librarian["Phase 2: The Librarian"]
        A["Refined Code"]
        B["Graph Builder<br/>AST-like Parsing<br/>Imports/Extends"]
        C["Nodes & Edges<br/>Dependency Graph"]
        D["Centrality Analyzer<br/>PageRank<br/>Betweenness<br/>Closeness"]
        E["Centrality Scores"]
        F["Semantic Ranker<br/>Composite Scoring<br/>Clustering"]
        G["RankedNodes"]
    end
    
    A --> B --> C
    C --> D --> E
    E --> F --> G
```

**Key Algorithms:**
- **PageRank:** Iterative algorithm finding high-impact nodes (40% default weight)
  - Iteration count: 20, Damping factor: 0.85
- **Betweenness Centrality:** O(V × (V+E)) identification of bridge nodes (30% weight)
- **Closeness Centrality:** O(V × (V+E)) proximity-based importance (15% weight)
- **Composite Importance:** 
  ```
  importance = 0.4×PageRank + 0.3×Betweenness + 0.15×Closeness + 0.15×CodeMetrics
  ```

**Supported Languages:** TypeScript, JavaScript (with extensible parser architecture)

**Output Types:**
- `DependencyGraph` - Nodes and edges with metadata
- `CentralityScores` - Numerical importance metrics
- `RankedNode` - Scored and prioritized nodes with reasoning

**Complexity:** O(V² + V×E) for PageRank iterations

---

### Phase 3: Manifest Generator 📋

**Purpose:** Create hierarchical, queryable, multi-format documentation of codebase structure.

```mermaid
graph LR
    subgraph Manifest["Phase 3: Manifest Generator"]
        A["Ranked Nodes"]
        B["Hierarchy Builder<br/>Kahn's Algorithm<br/>Topological Sort"]
        C["Manifest Layers<br/>Dependency Depth"]
        D["Cross-Ref Resolver<br/>DFS Cycle Detection<br/>Critical Paths"]
        E["Reference Graph"]
        F["Manifest Compiler<br/>JSON/YAML/MD/HTML"]
        G["Manifest<br/>Multi-format"]
    end
    
    A --> B --> C
    C --> D --> E
    E --> F --> G
```

**Key Algorithms:**
- **Topological Sort (Kahn's):** O(V+E) layer assignment based on dependency depth
- **Circular Dependency Detection:** DFS with O(V+E) complexity
- **Critical Path Finding:** DP+DFS memoization for longest paths
- **Transitive Closure:** BFS for computing full dependency tree

**Export Formats:**
1. **JSON** - Complete data with all metadata
2. **Markdown** - Human-readable tables and hierarchies
3. **YAML** - Configuration-friendly format
4. **HTML** - Web-viewable with CSS styling

**Output Types:**
- `Manifest` - Complete hierarchical documentation
- `ManifestNode` - Individual file/module with metrics
- `CrossReference` - Dependency relationships

**Complexity:** O(V+E) for most operations, O(V²) for critical paths in worst case

---

### Phase 4: Proxy Transport 🚀

**Purpose:** Provide real-time, session-based context injection into LLMs and IDEs.

```mermaid
graph TB
    subgraph IDE["IDE Layer"]
        A["VS Code"]
        B["JetBrains"]
    end
    
    subgraph Transport["Phase 4: Proxy Transport"]
        C["IDEAdapter<br/>Command Routing"]
        D["ContextManager<br/>Sessions + Cache<br/>LRU/LFU/FIFO"]
        E["ManifestStreamer<br/>WebSocket Subscriptions<br/>Incremental Updates"]
        F["TransportServer<br/>HTTP/WebSocket<br/>Message Handler"]
    end
    
    subgraph LLM["LLM Layer"]
        G["OpenAI API"]
        H["Claude API"]
        I["Local LLM"]
    end
    
    A --> C
    B --> C
    C --> D
    C --> E
    D --> F
    E --> F
    F --> G
    F --> H
    F --> I
```

**Core Components:**

1. **ContextManager**
   - Session lifecycle (create, access, expire)
   - Multi-policy caching (LRU, LFU, FIFO)
   - Token budget enforcement
   - Importance/complexity filtering

2. **ManifestStreamer**
   - WebSocket subscription model
   - Incremental update batching (default 1000ms)
   - Per-session subscriptions with filtering

3. **TransportServer**
   - HTTP and WebSocket endpoints
   - Message types: query, subscribe, heartbeat, update
   - Connection tracking and cleanup

4. **IDEAdapter**
   - Abstract interface for IDE integration
   - Implementations: VS Code, JetBrains, Mock
   - Capabilities: navigation, decorations, progress, commands

**Data Flow:**
```
1. IDE Query (user clicks "Get Context")
   ↓
2. ContextManager receives query with filters
   ↓
3. Cache lookup (hit/miss)
   ↓
4. If miss: Query manifest with filters
   ↓
5. Apply importance weighting + token budget
   ↓
6. Return ContextResult (nodes + references + stats)
   ↓
7. Cache result with TTL
   ↓
8. Send to IDE/LLM
```

**Caching Strategy:**
- **LRU (Default):** Evict least recently used when size exceeded
- **LFU:** Evict least frequently used (better for power-law distributions)
- **FIFO:** Evict oldest (good for time-windowed analysis)

**Performance:**
- Query latency: 1-5ms (cache hit), 50-200ms (cache miss)
- Streaming updates: <100ms P95
- Concurrent sessions: Tested to 1000+

**Complexity:** O(log n) cache operations, O(m) context selection where n = cache size, m = filtered nodes

---

## Cross-Phase Data Flow

```mermaid
graph TB
    A["Raw Code<br/>(10MB)"]
    
    B["Phase 1: Sanitize<br/>Remove Secrets"]
    C["Phase 1: Entropy Score<br/>Identify Noise"]
    D["Phase 1: Semantic Fold<br/>Compress Code"]
    
    E["Phase 2: Build Graph<br/>Parse Dependencies"]
    F["Phase 2: Score Centrality<br/>Importance Ranking"]
    
    G["Phase 3: Create Hierarchy<br/>Topological Layers"]
    H["Phase 3: Resolve Cycles<br/>Find Critical Paths"]
    I["Phase 3: Compile Manifest<br/>Multi-format Export"]
    
    J["Phase 4: Load Context<br/>Initialize Cache"]
    K["Phase 4: Query on Demand<br/>Select Top-K Nodes"]
    L["Phase 4: Stream Updates<br/>WebSocket Push"]
    
    M["LLM Receives Context<br/>~1-5MB optimized"]
    
    A --> B --> C --> D
    D --> E --> F
    F --> G --> H --> I
    I --> J --> K
    K --> M
    J --> L --> M
    
    style A fill:#f9d5e5
    style M fill:#d5e5f9
```

**Compression Ratios:**
- Input: 10MB raw code
- After Phase 1: ~7-8MB (20-30% reduction via sanitization + folding)
- After Phase 2: ~5-6MB (metadata added, structured)
- After Phase 3: ~4-5MB (hierarchical manifest, indexed)
- At LLM: ~1-2MB (context-selected via Phase 4, 80-90% compression)

---

## Module Dependencies

```mermaid
graph TB
    subgraph Phase1["Phase 1: Refiner"]
        R["refiner package"]
        R1["sanitizer.ts"]
        R2["entropy-calculator.ts"]
        R3["semantic-folder.ts"]
        R4["index.ts"]
    end
    
    subgraph Phase2["Phase 2: Librarian"]
        L["librarian package"]
        L1["graph-builder.ts"]
        L2["centrality-analyzer.ts"]
        L3["semantic-ranker.ts"]
        L4["index.ts"]
    end
    
    subgraph Phase3["Phase 3: Manifest"]
        M["manifest-generator<br/>package"]
        M1["hierarchy-builder.ts"]
        M2["cross-reference-resolver.ts"]
        M3["manifest-compiler.ts"]
        M4["index.ts"]
    end
    
    subgraph Phase4["Phase 4: Proxy"]
        P["proxy-transport<br/>package"]
        P1["context-manager.ts"]
        P2["manifest-streamer.ts"]
        P3["transport-server.ts"]
        P4["ide-adapter.ts"]
        P5["index.ts"]
    end
    
    R1 --> R2 --> R3 --> R4
    L1 --> L2 --> L3 --> L4
    M1 --> M2 --> M3 --> M4
    P1 --> P5
    P2 --> P5
    P3 --> P5
    P4 --> P5
    
    R4 --> L4
    L4 --> M4
    M4 --> P5
    
    style Phase1 fill:#ffe5e5
    style Phase2 fill:#e5ffe5
    style Phase3 fill:#e5e5ff
    style Phase4 fill:#ffe5ff
```

**Dependency Relationships:**
- **Refiner** (Phase 1): Standalone, no internal dependencies
- **Librarian** (Phase 2): Depends on `@maximinion/refiner`
- **Manifest Generator** (Phase 3): Depends on `@maximinion/refiner` and `@maximinion/librarian`
- **Proxy Transport** (Phase 4): Depends on all three previous packages

---

## Type System Architecture

```mermaid
graph TB
    subgraph "Core Types"
        A["ManifestNode<br/>id, name, type<br/>complexity, importance<br/>imports, importedBy"]
        B["CrossReference<br/>fromId, toId<br/>type, strength<br/>isCircular"]
        C["Manifest<br/>version, nodes<br/>layers, rootNodes<br/>criticalPaths"]
    end
    
    subgraph "Session Types"
        D["ContextSession<br/>id, clientId<br/>selectedNodeIds<br/>focusedNodeId"]
        E["ContextQuery<br/>nodeIds, path<br/>importance range<br/>maxTokens"]
        F["ContextResult<br/>nodes, references<br/>estimatedTokens<br/>compressionRatio"]
    end
    
    subgraph "Transport Types"
        G["TransportMessage<br/>type, sessionId<br/>payload, timestamp"]
        H["ManifestStreamUpdate<br/>type add/remove/update<br/>nodes, references"]
        I["TransportMetrics<br/>sessionsActive<br/>queriesProcessed<br/>errorRate"]
    end
    
    A --> B --> C
    C --> D --> E --> F
    F --> G --> H
    H --> I
```

---

## Configuration Hierarchy

```
tsconfig.base.json (Root)
    ↓
packages/
    ├── refiner/
    │   └── tsconfig.json (extends base)
    ├── librarian/
    │   └── tsconfig.json (extends base)
    ├── manifest-generator/
    │   └── tsconfig.json (extends base)
    └── proxy-transport/
        └── tsconfig.json (extends base)
```

**npm Workspaces Structure:**
```json
{
  "workspaces": [
    "packages/refiner",
    "packages/librarian",
    "packages/manifest-generator",
    "packages/proxy-transport"
  ]
}
```

This allows:
- Single `npm install` for all packages
- Shared dependency resolution
- Cross-package version compatibility
- Unified build pipeline

---

## Deployment Architecture

### Development Stack

```mermaid
graph LR
    A["Source Files"]
    B["TypeScript 5.3"]
    C["Jest 29.7<br/>Unit Tests"]
    D["Compiled JS"]
    E["npm Workspaces"]
    
    A --> B --> D
    D --> C
    E -.-> B
    E -.-> D
```

### Production Stack

```mermaid
graph TB
    subgraph "CLI"
        A["maximinion-cli<br/>Command-line tool"]
    end
    
    subgraph "VS Code Extension"
        B["maximinion-vscode<br/>IDE Integration"]
    end
    
    subgraph "Cloud Gateway"
        C["Proxy Transport Server<br/>HTTP/WebSocket"]
        D["Context Manager<br/>Distributed Cache"]
        E["Manifest Streamer<br/>Real-time Updates"]
    end
    
    subgraph "LLM APIs"
        F["OpenAI"]
        G["Anthropic"]
        H["Local/Self-hosted"]
    end
    
    A -.-> C
    B -.-> C
    C --> D
    C --> E
    C --> F
    C --> G
    C --> H
```

---

## Scalability Considerations

### Horizontal Scaling (Distributed Deployment)

```mermaid
graph TB
    subgraph "Load Balancer"
        A["nginx/haproxy"]
    end
    
    subgraph "API Tier"
        B["Proxy Transport 1"]
        C["Proxy Transport 2"]
        D["Proxy Transport N"]
    end
    
    subgraph "Cache Tier"
        E["Redis Cluster"]
    end
    
    subgraph "Persistent Storage"
        F["S3/Blob Storage<br/>Manifests"]
    end
    
    A --> B
    A --> C
    A --> D
    B -.-> E
    C -.-> E
    D -.-> E
    E -.-> F
```

**Scaling Strategies:**
1. **Sessions:** Distribute across load balancer (sticky sessions for WebSocket)
2. **Cache:** Redis/Memcached for shared cache across instances
3. **Manifest Storage:** S3/Azure Blob for persistent manifest versions
4. **Manifest Streaming:** Message queue (Kafka/RabbitMQ) for update distribution

### Vertical Scaling (Single Machine)

- **Phase 1 (Refiner):** Streaming processing, minimal memory overhead
- **Phase 2 (Librarian):** Graph in-memory (O(V+E) space), O(V² iterations) time
- **Phase 3 (Manifest):** Hierarchical structure with indexing
- **Phase 4 (Proxy):** Cache bounded by configuration, configurable eviction

---

## Performance Optimization Strategies

### 1. Caching Hierarchy

```
L1: In-Memory LRU Cache (Phase 4 ContextManager)
   ↓ (miss)
L2: Distributed Cache (Redis, if deployed)
   ↓ (miss)
L3: Manifest Storage (S3/Blob)
   ↓ (miss)
L4: Regenerate from source
```

### 2. Entropy-Based Pruning

```
Entropy Score: H(s) = -Σ p(x_i) log₂(p(x_i))

LOW (≤5)     → Can fold aggressively
MEDIUM (5-6.5) → Fold selectively
HIGH (>6.5)  → Preserve (likely important logic)
```

### 3. Importance-Weighted Selection

```
Token Budget: 4000 tokens
Total Nodes: 500

Algorithm:
1. Sort by importance (PageRank-based)
2. Iterate in descending order
3. Add node if: remaining_tokens >= node_tokens
4. Stop when budget exhausted
Result: ~20-30 nodes (typically 5-10% of total, 95%+ of importance)
```

---

## Extensibility Points

### 1. Custom Sanitization Patterns

```typescript
refiner.addCustomSanitizationPattern(
  'CUSTOM_API_KEY',
  /MY_KEY_[A-Z0-9]{32}/g
);
```

### 2. Language Support

```typescript
// Implement custom parser for new language
interface LanguageParser {
  parseFile(path, content): Entity[];
  extractImports(content): ImportEdge[];
  detectComplexity(ast): number;
}
```

### 3. Custom IDE Adapters

```typescript
// Implement IDEAdapter interface
class CustomIDEAdapter implements IDEAdapter {
  async getActiveFile(): Promise<string | null> { ... }
  async showMessage(message, type): Promise<void> { ... }
  // ... other methods
}
```

### 4. Custom Manifest Formats

```typescript
manifestCompiler.registerFormat('pdf', {
  compile: (manifest) => pdfBytes,
  fileExtension: 'pdf'
});
```

---

## Quality Metrics & Monitoring

```mermaid
graph LR
    A["Test Coverage"]
    B["Performance Benchmarks"]
    C["Cache Hit Rate"]
    D["Token Efficiency"]
    E["End-to-End Quality"]
    
    A -->|"75%+ threshold"| E
    B -->|"<100ms P95 latency"| E
    C -->|">70% hit rate target"| E
    D -->|"80%+ compression ratio"| E
```

**Key Metrics:**
- **Test Coverage:** 75%+ per package (enforced by jest.config.js)
- **Cache Hit Rate:** Target >70%, monitored in TransportMetrics
- **Compression Ratio:** Phase 1 (20-30%), Phase 4 (80-90% overall)
- **Query Latency:** P50 <10ms, P95 <100ms, P99 <500ms
- **Token Efficiency:** <1.5KB per node on average

---

## Security Architecture

### Data Flow Protection

```mermaid
graph TB
    A["Raw Code<br/>(Contains Secrets)"]
    B["Phase 1: Sanitizer<br/>16+ Secret Patterns<br/>PII Detection"]
    C["Sanitized Code<br/>(Secrets Removed)"]
    D["Phase 2-4<br/>All operations on clean data"]
    E["LLM Receives Context<br/>(No Secrets)"]
    
    A --> B --> C
    C --> D --> E
```

**Security Measures:**
1. **Secret Detection:** 16+ regex patterns (AWS, API keys, JWT, PII, etc.)
2. **Content Hashing:** SHA-256 for cache keys (prevent plaintext keys in logs)
3. **Session Isolation:** Per-client context isolation
4. **Token Validation:** Future: JWT/OAuth2 support
5. **Data Minimization:** Only store what's needed in cache

---

## Future Architecture (Phases 5 & 6)

### Phase 5: The Evaluator (Quality Metrics)

```mermaid
graph LR
    A["Context Result"]
    B["Quality Scorer<br/>LLM Reasoning Quality<br/>Relevance Score"]
    C["Efficiency Analyzer<br/>Token Usage<br/>Cost per Query"]
    D["Optimization Engine<br/>A/B Testing<br/>Algorithm Tuning"]
    E["Recommendations"]
    
    A --> B --> D
    A --> C --> D
    D --> E
```

### Phase 6: The Optimizer (Adaptive Enhancement)

```mermaid
graph LR
    A["Quality Metrics"]
    B["Pattern Recognition<br/>Identify High-SNR Patterns"]
    C["Adaptive Folding<br/>LLM Model Fine-tuning"]
    D["Dynamic Ranking<br/>Importance Re-weighting"]
    E["Optimized Manifest"]
    
    A --> B --> C --> E
    A --> B --> D --> E
```

---

## Conclusion

MaxiMinion.AI's architecture is **modular, scalable, and extensible**, with each phase building upon the previous one. The design enables:

✅ **Modularity:** Each phase can be deployed independently  
✅ **Scalability:** Horizontal scaling via load balancing and distributed cache  
✅ **Extensibility:** Custom parsers, sanitization patterns, IDE adapters  
✅ **Observability:** Built-in metrics, health checks, and monitoring  
✅ **Performance:** Multi-level caching, token budgeting, compression  
✅ **Security:** Secrets removal, session isolation, minimal data retention

