# MaxiMinion.AI: Precision Context Orchestration

MaxiMinion.AI - the operational research engine for Context Window Management and Token Economics

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests: 277/277 Passing](https://img.shields.io/badge/Tests-277%2F277-brightgreen.svg)](#)
[![Engine: Operations Research](https://img.shields.io/badge/Engine-Operations%20Research-blue.svg)](#)
[![Focus: Signal-to-Noise Ratio](https://img.shields.io/badge/Focus-SNR%20Optimization-green.svg)](#)
[![Node.js: 18+](https://img.shields.io/badge/Node.js-18%2B-darkgreen.svg)](#)
[![TypeScript: 5.3+](https://img.shields.io/badge/TypeScript-5.3%2B-blue.svg)](#)

## 🎯 Mission

**Maximize Value. Minimize Tokens. Optimize Intelligence.**

MaxiMinion.AI solves the **Context Paradox**: the phenomenon where providing more information to an LLM actually results in *lower* reasoning quality. We use Operations Research, graph theory, and semantic compression to deliver high-signal context at token-efficient scale.

---

## 🚨 The Problem: Context Paradox

Current LLM workflows waste tokens and sacrifice quality:

| Problem | Impact | Example |
|---------|--------|---------|
| **Context Bloat** | 70% of tokens wasted on boilerplate | Sending full 500-line files to LLM |
| **Signal-to-Noise Decay** | LLM reasoning degrades as context size grows | "Lost in the Middle" (Liu et al., 2023) |
| **Structural Blindness** | LLM can't understand code dependencies | Recommends changes that break imports |
| **Privacy Leakage** | Secrets accidentally shared with LLM | API keys, database credentials exposed |
| **Cost Explosion** | More tokens = exponential price increase | 1M tokens @ OpenAI = $15-90/month per user |

---

## ✨ The Solution: MaxiMinion Protocol

We transform your codebase into **high-density semantic payloads** via four precision phases:

### Phase 1️⃣ : The Refiner ⚙️
**Sanitization & Semantic Compression**
- Remove secrets (16+ patterns: API keys, passwords, PII)
- Measure entropy (Shannon H) to identify noise
- Compress via semantic folding (Ollama LLM integration)
- **Goal:** fewer tokens spent on boilerplate and no secrets in prompts (semantic folding is optional and lossy; review output before sharing)

📖 [Learn More →](docs/PHASE_1.md) | 🧪 Tests: 80/80 ✅

### Phase 2️⃣ : The Librarian 📚
**Dependency Graph Analysis & Importance Scoring**
- Parse code into AST-like dependency graphs
- Calculate centrality (PageRank 40%, Betweenness 30%, Closeness 15%)
- Rank components by actual importance
- Identify critical paths and bottlenecks
- **Goal:** identify which code matters most for a task

📖 [Learn More →](docs/PHASE_2.md) | 🧪 Tests: 16/16 ✅

### Phase 3️⃣ : Manifest Generator 📋
**Hierarchical Documentation & Multi-Format Export**
- Create topologically-sorted code hierarchies
- Resolve cross-references with cycle detection
- Export to JSON, YAML, Markdown, HTML
- Generate queryable manifests
- **Goal:** compact, structured context maps (compression varies by codebase)

📖 [Learn More →](docs/PHASE_3.md) | 🧪 Tests: 25/25 ✅

### Phase 4️⃣ : Proxy Transport Foundations 🚀
**Context Selection and Transport APIs**
- Context selection, session, cache, and transport message-handling foundations
- IDE adapter interfaces; live VS Code and JetBrains integrations are not implemented yet
- **Result:** TypeScript APIs for context queries and transport integration

📖 [Learn More →](docs/PHASE_4.md) | 🧪 Tests: 34/34 ✅

---

## 📊 Verified Results

**Current Workspace Status:**
- ✅ 277/277 unit tests passing across five workspaces
- ✅ 548 packages audited, 0 known vulnerabilities
- ✅ TypeScript strict mode, full type coverage
- ✅ Comprehensive documentation with 12+ Mermaid diagrams
- ✅ Dual-licensed (MIT Phase 1-4, Commercial Phase 5-6)
- 🧩 VS Code extension 0.3.0 on the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=maximinion.maximinion): Copy for AI with token estimates, inline secret warnings, and local sanitization

**Verified Capabilities:**
- 🎯 **Privacy:** Pattern-based secret detection and redaction; review output before sharing
- 🎯 **Extension:** Copy for AI, token estimates, inline secret warnings, and sanitization all run locally

---

## 🚀 Quick Start

### Installation

#### Option 1: VS Code Extension (Marketplace)

Install **MaxiMinion** from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=maximinion.maximinion), search for "MaxiMinion" in the Extensions view, or run:

```bash
code --install-extension maximinion.maximinion
```

It adds **Copy for AI** (sanitized, token-estimated copy of a selection, file, or Explorer selection), a status bar token counter, and inline secret warnings with a redact quick fix. Run **MaxiMinion: Get Started & Help** for a short walkthrough; see [its README](packages/vscode-extension/README.md) for details.

To build and install the extension from source instead:

```bash
npm ci
npm run build
npm run package --workspace packages/vscode-extension
code --install-extension packages/vscode-extension/maximinion-<version>.vsix
```

Replace `<version>` with the version in [packages/vscode-extension/package.json](packages/vscode-extension/package.json).

To release, run the **VS Code Extension Release** GitHub Actions workflow twice. First run it with action `package`: it builds a versioned VSIX, attests its provenance, and attaches it to a GitHub prerelease, so you can test that exact file. Then run it with action `publish`: it does not rebuild. It downloads the tested VSIX from the prerelease, verifies that this workflow built it on `main` at the tagged commit, and publishes it unchanged. Publishing requires the `VSCE_PAT` secret on the `vscode-marketplace` environment and approval of that environment's deployment. Azure DevOps global PATs are scheduled for retirement on December 1, 2026, so migrate the publishing credential before then.

#### Option 2: Refiner CLI
Only `@maximinion/refiner` ships a command-line tool (`refiner`):
```bash
npm install -g @maximinion/refiner   # or use npx @maximinion/refiner <command>
```

#### Option 3: npm Packages (programmatic)
```bash
npm install @maximinion/refiner @maximinion/librarian @maximinion/manifest-generator @maximinion/proxy-transport
```

### First Use

```bash
# Sanitize a file (prints redacted text and a list of removed secrets)
npx @maximinion/refiner sanitize src/app.ts

# Full refinement pipeline; output goes to stdout
npx @maximinion/refiner refine src/app.ts > refined.txt

# Refine every .ts/.js file in a directory (non-recursive)
npx @maximinion/refiner batch ./src

# Try it on built-in sample code
npx @maximinion/refiner demo
```

The Librarian, Manifest Generator, and Proxy Transport are TypeScript libraries without a CLI:

```typescript
import { Librarian } from '@maximinion/librarian';

const analysis = await new Librarian().analyze('./src');
console.log(analysis.rankedNodes.slice(0, 10)); // most central components first
```

See the [API reference](docs/API/) and [examples](docs/EXAMPLES/) for manifest generation and context transport.
---

## 📚 Documentation

**Navigation Hub:**
- 📖 [docs/index.md](docs/index.md) - Complete documentation guide by audience & use case

**Core Documentation:**
- 🏗️ [ARCHITECTURE.md](ARCHITECTURE.md) - System design with 12+ Mermaid diagrams
- 🤝 [CONTRIBUTORS.md](CONTRIBUTORS.md) - Development setup, contribution guidelines, review process

**Phase Documentation:**
- ⚙️ [docs/PHASE_1.md](docs/PHASE_1.md) - Refiner (sanitization, entropy, compression)
- 📚 [docs/PHASE_2.md](docs/PHASE_2.md) - Librarian (graph analysis, centrality, ranking)
- 📋 [docs/PHASE_3.md](docs/PHASE_3.md) - Manifest Generator (hierarchy, export, querying)
- 🚀 [docs/PHASE_4.md](docs/PHASE_4.md) - Proxy Transport (IDE integration, streaming, caching)

**Guides & Tutorials:**
- 🛠️ [docs/GUIDES/local-setup.md](docs/GUIDES/local-setup.md) - Development environment setup
- 🚀 [docs/GUIDES/deployment.md](docs/GUIDES/deployment.md) - Deployment & hosting options
- 🔒 [docs/GUIDES/security.md](docs/GUIDES/security.md) - Data handling, secret detection, and safe use
- 🛡️ [docs/SECURITY_MODEL.md](docs/SECURITY_MODEL.md) - Threat model, trust boundaries, layered controls, known gaps
- 🐛 [docs/GUIDES/troubleshooting.md](docs/GUIDES/troubleshooting.md) - Common issues & fixes

**API Reference:**
- [docs/API/refiner-api.md](docs/API/refiner-api.md) - Phase 1 API
- [docs/API/librarian-api.md](docs/API/librarian-api.md) - Phase 2 API
- [docs/API/manifest-api.md](docs/API/manifest-api.md) - Phase 3 API
- [docs/API/proxy-api.md](docs/API/proxy-api.md) - Phase 4 API

**Code Examples:**
- [docs/EXAMPLES/refiner-example.ts](docs/EXAMPLES/refiner-example.ts)
- [docs/EXAMPLES/librarian-example.ts](docs/EXAMPLES/librarian-example.ts)
- [docs/EXAMPLES/manifest-example.ts](docs/EXAMPLES/manifest-example.ts)
- [docs/EXAMPLES/proxy-example.ts](docs/EXAMPLES/proxy-example.ts)

**By Audience:**
- 👨‍💻 Individual Developer? Start with [Quick Start](#quick-start) above, then [docs/GUIDES/local-setup.md](docs/GUIDES/local-setup.md)
- 🤝 Team Lead? See [ARCHITECTURE.md](ARCHITECTURE.md)
- 🏢 Enterprise? See the [Pricing & Licensing](#-pricing--licensing) section below, or contact support@maximinion.ai
- 🔬 Researcher? See [ARCHITECTURE.md](ARCHITECTURE.md) - includes algorithm citations
- 🛠️ Contributor? See [CONTRIBUTORS.md](CONTRIBUTORS.md) and [docs/index.md](docs/index.md)

---

## 🎯 Use Cases

| Goal | Phase(s) | Time to Value |
|------|----------|----------------|
| Remove secrets from code | Phase 1 | 5 min |
| Understand code structure | Phase 2 | 15 min |
| Generate documentation | Phase 3 | 20 min |
| Sanitize the active file in VS Code | Phase 1 + extension | 1 min |
| Copy files for an AI chat with secrets redacted and token estimates | Phase 1 + extension | 1 min |
| Deploy for team | Phase 4 + hosting | 1-2 hours |

---

## 💰 Pricing & Licensing

### Community Edition (Free)
- ✅ Core libraries for Phases 1-4
- ✅ MIT License (perpetual)
- ✅ Refiner CLI + local VS Code extension (Copy for AI, token estimates, inline secret warnings)
- ✅ Local deployment only
- 📍 **For:** Individuals, open-source projects, evaluation

### Professional Edition ($29/month)
- ✅ Everything in Community
- ✅ Hosted cloud gateway
- ✅ Live IDE integrations (VS Code + JetBrains)
- ✅ 100 concurrent sessions, 500 manifests
- ✅ Email support
- 📍 **For:** Small teams, startups, consultants

### Enterprise Edition ($2,999/month)
- ✅ Everything in Professional
- ✅ **Phase 5: The Evaluator** (quality metrics & optimization)
- ✅ On-premise + private cloud deployment
- ✅ Unlimited scale, custom integrations
- ✅ SSO/SAML, RBAC, SLA 99.9%
- 📍 **For:** Fortune 500, regulated industries, large teams

## Licensing & Compliance

*"MaxiMinion.AI Community Edition is an independent, zero-cost tool provided strictly under the MIT License. The provision of this free tier does not constitute an operation in trade or commerce under the Australian Consumer Law (ACL), and the standard statutory consumer guarantees do not apply to this zero-cost release."*

---

## 🔒 Security & Compliance

- **Privacy:** Pattern-based secret detection (17 patterns); detection is not exhaustive, so review output before sharing
- **Data:** No codebase sent to 3rd parties (runs locally by default)
- **Licensing:** MIT (Community) + Commercial dual-license (Enterprise features)
- **Compliance:** Community Edition makes no compliance certification claims; compliance support is planned for commercial editions

📖 [Security Model →](docs/SECURITY_MODEL.md) (threat model, layered controls, known gaps) | [Security Guide →](docs/GUIDES/security.md)

---

## 🛠️ Deployment Options

| Environment | Community | Professional | Enterprise |
|-------------|-----------|--------------|-----------|
| **Local** | ✅ | ✅ | ✅ |
| **Cloud (Managed)** | ❌ | ✅ AWS/Azure/GCP | ✅ Managed or BYOC |
| **On-Premise** | ❌ | ❌ | ✅ Full control |
| **Kubernetes** | ❌ | ❌ | ✅ Helm charts |

📖 [Deployment Guide →](ARCHITECTURE.md#deployment-architecture)

---

## 📈 Roadmap

### Community Edition (free, MIT)

| Status | Item | Issue |
|--------|------|-------|
| ✅ 0.3.0 | Marketplace readiness: accurate docs and Quick Start, AS IS notices, listing metadata | [#30](https://github.com/dev-rb-hub/maximinion-ce/issues/30) |
| ✅ 0.3.0 | Copy for AI with token estimates, budget warnings, and status bar counter | [#34](https://github.com/dev-rb-hub/maximinion-ce/issues/34) |
| ✅ 0.3.0 | Inline secret warnings with a redact quick fix | [#31](https://github.com/dev-rb-hub/maximinion-ce/issues/31) |
| ✅ 0.4.0 | Security guardrails: credential-file and hidden Unicode checks, activity log, security status | [#41](https://github.com/dev-rb-hub/maximinion-ce/issues/41) |
| 🗓️ 0.5.0 | Workspace context pack: Librarian ranking in the sidebar, token-budget selection, manifest sync on save | [#32](https://github.com/dev-rb-hub/maximinion-ce/issues/32) |
| 🔜 Later | User-defined secret patterns and extra sensitive paths (user settings only) | [#44](https://github.com/dev-rb-hub/maximinion-ce/issues/44) |
| 🔜 Later | Per-function semantic folding that keeps signatures | [#36](https://github.com/dev-rb-hub/maximinion-ce/issues/36) |
| 🔜 Later | Copilot Chat / MCP integration on top of Proxy Transport | [#33](https://github.com/dev-rb-hub/maximinion-ce/issues/33) |

### Core libraries and commercial editions

**Phase 1-3:** Core libraries implemented and covered by unit tests

**Phase 4:** Context and transport foundations implemented; live IDE integration remains future work (see [#33](https://github.com/dev-rb-hub/maximinion-ce/issues/33)).

**Phase 5: The Evaluator** (2026)
- Quality metrics & LLM reasoning scoring
- A/B testing framework for algorithm tuning
- Optimization engine
- *Access:* Enterprise Edition

**Phase 6: The Optimizer** (2026+)
- Adaptive algorithm fine-tuning
- Model fine-tuning (SFT/DPO)
- Dynamic importance re-weighting
- *Access:* Enterprise Edition add-on

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTORS.md](CONTRIBUTORS.md) for:
- Development setup
- Testing & commit standards
- PR review process
- Good first issues

**Quick Setup:**
```bash
git clone https://github.com/dev-rb-hub/maximinion-ce.git
cd maximinion-ce
npm install
npm test  # Run all tests
npm run build  # Compile all packages
```

---

## 📊 Project Statistics

| Metric | Value |
|--------|-------|
| Tests Passing | 277/277 ✅ |
| Type Coverage | 100% (strict mode) |
| Packages | 4 core libraries + VS Code extension |
| Lines of Code | ~8,000 |
| Dependencies | 548 packages audited, 0 known vulnerabilities |
| License | MIT (Community), Commercial (Enterprise) |
| VS Code Extension | 0.3.0 on the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=maximinion.maximinion) |

---

## 🔗 Quick Links

| Resource | Link |
|----------|------|
| **GitHub** | [dev-rb-hub/maximinion-ce](https://github.com/dev-rb-hub/maximinion-ce) |
| **npm Package** | [@maximinion/refiner](https://www.npmjs.com/package/@maximinion/refiner) |
| **VS Code Extension** | [MaxiMinion on the Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=maximinion.maximinion) |
| **Documentation** | [docs/index.md](docs/index.md) |
| **Issues & Bugs** | [GitHub Issues](https://github.com/dev-rb-hub/maximinion-ce/issues) |
| **Discussions** | [GitHub Discussions](https://github.com/dev-rb-hub/maximinion-ce/discussions) |

---

## 💬 FAQ

**Q: Is MaxiMinion free?**  
A: Yes, Community Edition (Phases 1-4) is MIT-licensed and free forever. Professional & Enterprise editions have paid tiers for managed hosting and proprietary features.

**Q: Will my code be sent to MaxiMinion servers?**  
A: No. Community Edition runs entirely locally. Professional/Enterprise use managed cloud servers (your choice of region, data stays encrypted).

**Q: Can I use this in production?**  
A: The core packages have passing unit tests, but the Phase 4 live IDE integration is not implemented. Validate the specific workflow and security requirements before production use. Professional/Enterprise tiers include SLA guarantees and support.

**Q: What's the learning curve?**  
A: ~30 minutes for basic usage, ~2 hours for full system understanding. See [docs/index.md](docs/index.md).

**Q: How do I contribute?**  
A: See [CONTRIBUTORS.md](CONTRIBUTORS.md#getting-started). Good first issues available!

**Q: What's the licensing for proprietary projects?**  
A: Community Edition (MIT) is fine for any use. Phase 5-6 (Enterprise) features are licensed separately — contact support@maximinion.ai for terms.

---

## 📞 Support

- 💬 **Community:** [GitHub Discussions](https://github.com/dev-rb-hub/maximinion-ce/discussions)
- 🐛 **Bug Reports:** [GitHub Issues](https://github.com/dev-rb-hub/maximinion-ce/issues)
- 📧 **Professional Support:** support@maximinion.ai
- 🎯 **Enterprise Support:** [Contact Sales](https://maximinion.ai/contact)

---

## 📜 License

- **Phases 1-4 (Community Edition):** MIT License (this repository)
- **Phases 5-6 (Enterprise Features):** Commercial License + Subscription, maintained in a separate private repository — contact support@maximinion.ai for terms

---

## 🙏 Acknowledgments

MaxiMinion.AI stands on the shoulders of giants:

**Academic Foundations:**
- PageRank (Brin & Page, 1998)
- Shannon Entropy (Shannon, 1948)
- Topological Sort (Kahn, 1962)
- Lost in the Middle (Liu et al., 2023)

**Open Source:**
- TypeScript, Node.js, Jest, Ollama, AST parsers

---

**Status:** Core tests pass; VS Code extension 0.3.0 is published on the Visual Studio Marketplace

**Last Updated:** 2026-11-11  
**Maintained By:** MaxiMinion.AI Team

**Questions?** Open an issue in the [Community Edition repository](https://github.com/dev-rb-hub/maximinion-ce/issues).


## 🚨 The Problem: The Context Paradox

Current LLM workflows suffer from three critical inefficiencies:

1.  **Token Bloat & Cost:** Developers often paste entire files or large code blocks into LLM chats. This wastes expensive tokens on boilerplate, imports, and redundant comments.
2.  **Signal-to-Noise Decay (SNR):** As context windows expand, the "signal" (actual logic) gets buried under "noise" (formatting, metadata, irrelevant code). This leads to hallucination and degraded reasoning.
3.  **Structural Blindness:** LLMs lack an inherent understanding of a codebase's dependency graph. They see code as flat text rather than a dynamic web of interconnected logic.
4.  **Privacy Leakage:** Manual context sharing risks leaking sensitive PII, environment variables, or proprietary secrets into third-party LLM providers.

---

## 🛠️ The Solution: The MaxiMinion Protocol

MaxiMinion.AI does not just "add context"—it **refines** it. Using a multi-layered approach driven by Operations Research (OR) and Abstract Syntax Tree (AST) analysis, it transforms your workspace into a high-density semantic payload.
