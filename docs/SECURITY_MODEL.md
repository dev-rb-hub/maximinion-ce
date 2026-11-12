# Security Model

How MaxiMinion Community Edition protects your code and credentials: what it defends against, where its trust boundaries are, and the layers of controls. The layered approach is adapted from the Kiro Crew security architecture, scaled to a local VS Code extension and libraries that run no agent and execute no commands.

This document covers the VS Code extension (`packages/vscode-extension`) and the libraries it uses. To report a vulnerability, see [SECURITY.md](../SECURITY.md). For data handling, see the [Security Guide](GUIDES/security.md).

Counts (patterns, tests, limits) are deliberately left out of the prose; the code and its tests are the source of truth, and numbers written here would go stale.

## Threat model

MaxiMinion helps you send code to AI assistants. The main risks are:

1. **A secret ends up in an AI chat.** You copy code that contains a key, password, or token.
2. **A workspace quietly lowers protection.** A cloned repository ships settings that turn off redaction or warnings.
3. **An automatic scan reads more than it should.** A workspace scan follows a symlink into `~/.ssh`, or reads `.env` files, binaries, or very large files.
4. **Hidden instructions travel with copied code.** Invisible or bidirectional Unicode makes code or comments read differently to you than to a compiler or an AI model (prompt injection, "Trojan Source").
5. **Crafted content hangs the editor.** A file designed to make secret-detection regular expressions backtrack for minutes (ReDoS).
6. **Code goes somewhere unexpected over the network.**

Three principles shape every control:

1. **Workspace content and workspace settings are untrusted.** A repository you open may have been written by someone else. In future features (#33), the AI model calling MaxiMinion tools is untrusted too.
2. **Only you can lower protection.** Your user settings are trusted; a workspace can make MaxiMinion stricter but never weaker.
3. **No single layer is assumed to hold.** For example, a credentials file you copy is caught by a name check *and* by secret redaction; the two fail in different ways.

## Trust boundaries

| Boundary | Trusted side | Untrusted side | Enforced by |
| --- | --- | --- | --- |
| Settings | Your user settings | Workspace, folder, and remote (dev container) settings | `"scope": "application"` and `userSetting()` ([settings.ts](../packages/vscode-extension/src/settings.ts)) |
| Workspace files → automatic analysis | The guarded reader's decision | Any file path, symlink, or content in the workspace | `readForScan()` ([workspace-reader.ts](../packages/vscode-extension/src/guard/workspace-reader.ts)) |
| Extension → clipboard (and from there, AI tools) | Redacted, reviewed payload | Raw file content | `copyToClipboard()` ([egress.ts](../packages/vscode-extension/src/guard/egress.ts)) and the Sanitizer |
| Extension → network | The fixed local Ollama endpoint | Every other host | `OLLAMA_ENDPOINT` and `createRefiner()` ([egress.ts](../packages/vscode-extension/src/guard/egress.ts)); redirects refused |
| File content → sidebar webview | Escaped text under a strict Content Security Policy | Any text from settings or files | `escapeHtml()` and a nonce-based CSP in [extension.ts](../packages/vscode-extension/src/extension.ts) |

## How the layers compose

```
Layer 5  Activity log ...... what was copied or sent, and what was declined (paths and counts only)
Layer 4  Egress ............ redaction at every exit, one clipboard path, one local network endpoint
Layer 3  Input screening ... hidden-Unicode checks, ReDoS-resistant patterns, size limits
Layer 2  Filesystem gate ... workspace-only reads, symlink resolution, credential files, binaries
Layer 1  Settings ceiling .. protection settings are user-only; folding is restricted in untrusted folders
Layer 0  Runtime limits .... no child processes, no eval, no raw network access (enforced by tests)
```

### Layer 0: Runtime limits

The extension runs inside VS Code's extension host with your user permissions, so there is no operating-system sandbox. Instead, tests fail the build if the extension source:

- starts child processes, or uses `eval` or `new Function`;
- calls `fetch`, `XMLHttpRequest`, or `WebSocket`, or imports `http`, `https`, `net`, `tls`, `dgram`, or `http2`;
- writes to the clipboard, creates a `Refiner` (the only network client), or uses Node's `fs` module anywhere except the guard modules that own those capabilities.

The Refiner library has matching tests: no child processes or `eval`, and only the semantic folder makes network requests.

### Layer 1: Settings ceiling

- `maximinion.secretScrubbing.enabled`, `maximinion.secretDiagnostics.enabled`, and `maximinion.secretDiagnostics.minConfidence` use `"scope": "application"`, so they can only be set in your user settings. `application` is used rather than `machine` because a repository's `devcontainer.json` can set `machine` settings. The extension also reads these values from user settings only, so a VS Code fork that ignores the scope cannot be used to bypass it. New settings that weaken protection must follow the same rule: add them to `USER_ONLY_SETTINGS`, and a manifest test checks their scope and how they are read.
- In Restricted Mode (untrusted folders), semantic folding settings cannot be enabled by the workspace (`restrictedConfigurations`).

### Layer 2: Filesystem gate

Automatic workspace analysis must read files only through `readForScan()`. Its first user is the Context Pack (#32), which is in development. The reader refuses:

- files outside the open workspace folders, including files reached through a symlinked folder that points outside (resolved paths are compared);
- symlinked files, and files whose resolved path is in a sensitive folder (for example a folder symlink to `.git`);
- files that usually hold credentials, matched by name: `.env` files (but not templates such as `.env.example`), `.npmrc` and similar credential files, private keys and key stores, Terraform state and variables, and anything under `.ssh`, `.aws`, `.azure`, `.gnupg`, `.kube`, `.docker`, or `.git`;
- files over the size limit, and binary files.

Files you pick yourself (the active editor or an Explorer selection) are not blocked, but **Copy for AI** and **Copy Sanitized File** ask before copying a file whose name matches the credential rules. Its contents are still redacted if you go ahead.

### Layer 3: Input screening

- **Hidden Unicode.** Before copying, MaxiMinion looks for bidirectional controls, invisible tag characters (which can smuggle instructions to a model), and zero-width characters next to code. If it finds any, it asks before copying and can show you the first one. Text is never silently changed. Normal uses, such as a byte order mark at the start of a file or zero-width joiners inside emoji, are not flagged.
- **ReDoS resistance.** Secret patterns run on untrusted content, including on every edit for inline warnings. Tests run every built-in pattern against adversarial inputs with a time limit. The Copy for AI whitespace compaction has the same protection.
- **Size limits.** Inline secret warnings skip very large documents, and automatic scans skip large files.
- **Custom patterns cannot hang the sanitizer.** Patterns that can match an empty string are stepped past rather than looping.

### Layer 4: Egress

- **Redaction at every exit.** Copy for AI, Copy Sanitized File, Preview Sanitized File, and the Refiner redact likely secrets before showing or copying text. Custom patterns passed to the Sanitizer are applied everywhere built-in patterns are.
- **One clipboard path.** All clipboard writes go through `copyToClipboard()`, which also records the activity log entry.
- **One network endpoint.** The only network traffic is optional semantic folding to Ollama at `http://localhost:11434`. The endpoint is a constant, not a setting, so a workspace cannot point it elsewhere. Requests refuse HTTP redirects. MaxiMinion sends no telemetry.
- **No remote models unless you allow them.** A local Ollama server forwards cloud models (for example `gpt-oss:120b-cloud`) to another host. Before sending code, the Refiner looks the model up in Ollama's model list and refuses it if Ollama reports it as remote (`remote_host`/`remote_model`, which also catches renamed copies) or its name has a `cloud` tag. If the list cannot be read, or the model is not in it, nothing is sent: Ollama also accepts spellings the list does not show (such as `library/name`), which could otherwise reach a renamed remote model. The Refiner also treats any endpoint that is not loopback as remote. The extension passes `semanticFolding.allowRemoteModels` from your user settings only (default off), and the setup check refuses remote models before the Refiner is called.
- **Webview.** The sidebar uses a Content Security Policy that blocks everything except inline styles and one nonce-tagged script, and escapes any dynamic text.

### Layer 5: Activity log

**MaxiMinion: Show Activity Log** opens the *MaxiMinion Activity* log channel. It records each clipboard copy (command, file paths, number of values redacted, whether redaction was on, estimated tokens, hidden Unicode found), each request to the local model, each local preview, each copy you declined and why, and workspace settings that were ignored because they would have lowered protection. It never records file content. VS Code timestamps each entry and keeps the logs of recent sessions on disk; nothing leaves your machine.

## Showing the posture to users

Following the Kiro Crew posture panel, users can see these controls working instead of taking them on trust:

- The **Security** section of the extension sidebar lists each control with its live state (on, off in your settings, needs attention, or information), with details on hover.
- **MaxiMinion: Show Security Status** opens a report with each control, its live state, and the code that enforces it.
- If a workspace's settings try to lower protection, the user is told once per workspace, and the event is logged. VS Code removes application-scoped keys from workspace, folder and dev container settings before extensions can see them, so MaxiMinion reads `.vscode/settings.json`, `devcontainer.json` and the `.code-workspace` file directly (read-only, size-limited, never applied) to detect the attempt.

The rule that keeps this honest: **every value shown is read from the constant or function that enforces it** ([posture.ts](../packages/vscode-extension/src/guard/posture.ts)): the pattern count from `SECRET_REGEX_PATTERNS`, the endpoint from `OLLAMA_ENDPOINT`, the credential-file rules from the tables `sensitiveReason()` uses, the scan limits from `SCAN_LIMITS`, and settings through `userSetting()`. Tests check the report against those sources and check that every example rule shown to users matches its rule. The report links to the known gaps below.

## Future surfaces

These rules apply when the matching features are built:

- **Copilot Chat / MCP tools (#33).** The model is an untrusted caller. Tools are read-only, validate their inputs against schemas with length limits, return only sanitized context from the Context Pack, and cannot change settings or `.maximinionignore`.
- **Proxy Transport server (Phase 4).** If a real HTTP or WebSocket server is added, it binds to `127.0.0.1`, requires a per-session token, and checks the `Host` and `Origin` headers to block DNS rebinding and cross-site requests. Today Proxy Transport opens no port.
- **`.maximinionignore` (#32).** The file can only exclude paths, so honouring it in untrusted workspaces cannot widen what is read.
- **User-defined secret patterns and extra sensitive paths (#44).** User settings only: a regex supplied by a workspace is attacker-controlled input and could hang the editor.
- **Commercial editions (#45).** An organisation-pinned governance ceiling, a tamper-evident activity log, and central reporting. None of these are part of Community Edition.

## Known gaps

Each of these is a real limit, stated plainly:

- **Secret detection is pattern-based.** It will miss secrets that do not match a known format and can flag things that are not secrets. Always review output before sharing it.
- **Credential files are recognised by name.** A secret in an ordinarily named file is only caught by redaction.
- **You can turn protection off.** User settings can disable redaction or warnings; that is your choice, and the activity log records when redaction was off.
- **Localhost is trusted.** Any local process listening on port 11434 receives code sent for semantic folding. If that process is a proxy that forwards to another host, or an Ollama server that does not report cloud models as remote, MaxiMinion cannot tell. Folding is off by default.
- **The extension host is shared.** Other installed extensions run with the same permissions as MaxiMinion and are outside its control. The clipboard is readable by other applications.
- **The activity log is not tamper-evident.** It is a local record for your own review, not an audit trail.
- **Hidden-Unicode and ReDoS checks are heuristics.** The tests cover known attack shapes, not every possible input.
- **The libraries are not the extension.** Developers using `@maximinion/refiner` directly can configure the Ollama endpoint. The Refiner refuses remote models and endpoints that are not loopback unless `allowRemoteModels` is set, but the extension-level guards (settings ceiling, filesystem gate, activity log) are not part of the libraries.
- **Semantic folding output is untrusted text.** The summary comes from a local model; review it before relying on it.
