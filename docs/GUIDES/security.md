# Security Guide

How MaxiMinion Community Edition handles your code, which secrets it detects, and how to use it safely. For the threat model, trust boundaries, and layered controls, see the [Security Model](../SECURITY_MODEL.md). To report a vulnerability, see [SECURITY.md](../../SECURITY.md).

## Data Handling

Community Edition runs entirely on your machine.

- **What it reads:** the files you choose to copy or analyse. The upcoming Context Pack (#32) will also read source files in your open workspace, through a guarded reader that skips credential files, binaries, large files, and anything outside the workspace.
- **Where data goes:** to your clipboard when you use Copy for AI or Copy Sanitized File, to local preview tabs and output channels, and, only if you turn on semantic folding, to a local Ollama server at `http://localhost:11434`.
- **What it stores:** extension settings, a first-run notice flag, and the *MaxiMinion Activity* log (file paths and counts, never file content), which VS Code keeps with its logs for recent sessions.
- **What it sends to MaxiMinion or third parties:** nothing. There is no telemetry and no cloud service in Community Edition.

## Secret Detection & Redaction

Secrets are found with regular-expression patterns and replaced with markers such as `[REDACTED_API_KEY]`. Your source files are never changed unless you apply the **Redact** quick fix to an inline warning.

Built-in patterns (see [`regex-patterns.ts`](../../packages/refiner/src/utils/regex-patterns.ts)):

| Category | Patterns |
| --- | --- |
| Cloud and service keys | AWS access key IDs (`AKIA…`) and `aws_secret_access_key` assignments; Azure Storage connection strings; OpenAI project keys (`sk-proj-…`); GitHub personal access tokens (`ghp_…`); Slack bot tokens (`xoxb-…`) |
| Credentials | Private key headers (`-----BEGIN … PRIVATE KEY-----`); database URLs with a user and password; JWTs; `password`, `token`, `api_key`, and `secret` assignments |
| Personal information | Email addresses; US Social Security numbers; 13–16 digit card-like numbers (no checksum validation, so expect false positives) |
| References | Environment variable references such as `process.env.API_KEY` (they name a secret but do not contain one; inline warnings ignore them) |

Detection is pattern-based and not exhaustive. Secrets in other formats, or split across lines, can be missed. **Always review output before sharing it.**

### Custom Patterns

Custom patterns are available programmatically (the CLI has no flags). They are used by `sanitize()`, `detectSecrets()`, and `hasSecrets()`, with the type and confidence you give:

```typescript
import { Refiner, Sanitizer } from '@maximinion/refiner';

// On a Refiner: addCustomSanitizationPattern(name, regexPattern, type?, confidence?)
const refiner = new Refiner();
refiner.addCustomSanitizationPattern('ACME_KEY', 'ACME_[A-Z0-9]{12}', 'API_KEY', 0.9);
refiner.sanitize('const k = "ACME_ABCDEF123456";').text; // const k = "[REDACTED_API_KEY]";

// Or through configuration
const sanitizer = new Sanitizer({
  customRegexPatterns: {
    ACME_KEY: { pattern: 'ACME_[A-Z0-9]{12}', type: 'API_KEY', confidence: 0.9, description: 'ACME key' },
  },
});
```

- Patterns are compiled with the `g` and `i` flags.
- Without a type or confidence, a custom pattern uses `GENERIC_SECRET` and `0.8`.
- A custom pattern with the same name as a built-in pattern replaces it.
- Empty or invalid patterns are rejected. Patterns that can match an empty string are safe but match nothing useful.
- Keep patterns linear: avoid nested quantifiers such as `(a+)+`, because patterns run on untrusted file content.

## Using the VS Code Extension Safely

- **Protection settings are user-only.** Secret redaction and inline warning settings can only be changed in your user settings; a repository's `.vscode/settings.json` cannot turn them off.
- **Credential files need confirmation.** Copy for AI asks before copying files such as `.env`, private keys, or Terraform state, and still redacts them if you go ahead.
- **Hidden Unicode needs confirmation.** Copy for AI asks before copying text with bidirectional controls or invisible characters, which can hide instructions that an AI model still reads.
- **Check the activity log.** **MaxiMinion: Show Activity Log** lists what was copied or sent, how many values were redacted, and what you declined.
- **Check the security status.** The sidebar's **Security** section and **MaxiMinion: Show Security Status** show each protection's live state, read from the code that enforces it.
- **Restricted Mode works.** In untrusted folders, Copy for AI, warnings, and sanitization work, and semantic folding cannot be enabled by the workspace.
- **Semantic folding is local and optional.** It is off by default and only talks to Ollama on `localhost`. Summaries are lossy; review them.

## Network Security

The extension makes no network requests except optional semantic folding to `http://localhost:11434`. The endpoint is fixed, not a setting, and HTTP redirects are refused.

The Proxy Transport library has no CLI and runs in-process; it does not currently open a network port or socket. Its HTTP and WebSocket switches can be turned off explicitly:

```typescript
import { ProxyTransport } from '@maximinion/proxy-transport';

const proxy = new ProxyTransport({ enableHTTP: false, enableWebSocket: false });
```

If you use the libraries directly, you are responsible for where their output goes. For example, `@maximinion/refiner` lets you configure any Ollama endpoint.

## Professional and Enterprise Editions

Hosted gateways, team access control, audit logging, and data residency options are planned for commercial editions. Their security controls will be documented when those editions are available. **Community Edition makes no compliance certification claims** (for example GDPR, HIPAA, SOC 2, or ISO 27001).

## Checking the Project

These run in CI on every pull request and can be run locally:

```bash
npm audit      # known vulnerabilities in dependencies
npm test       # includes security tests: ReDoS limits, forbidden APIs, settings scope, guarded reads
```

CI also runs CodeQL analysis and GitHub dependency review. Release artifacts can be verified as described in [SECURITY.md](../../SECURITY.md#verifying-releases).

## Reporting Vulnerabilities

Do not open a public issue. Use a [private security advisory](https://github.com/dev-rb-hub/maximinion-ce/security/advisories/new) or email support@maximinion.ai, as described in [SECURITY.md](../../SECURITY.md).

## FAQ

**Where is my code stored?**
Nowhere outside your machine. Community Edition keeps no copy of your code; the activity log records file paths and counts only.

**Does MaxiMinion send my code anywhere?**
Only where you put it: the clipboard when you copy, and a local Ollama server if you turn on semantic folding.

**Can a repository I clone weaken MaxiMinion?**
It cannot turn off redaction or warnings, point semantic folding at another server, or enable folding in an untrusted folder. See the [Security Model](../SECURITY_MODEL.md) for the full list of controls and their known gaps.