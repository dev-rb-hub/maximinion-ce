# MaxiMinion for VS Code

Share code with AI assistants safely and efficiently. MaxiMinion redacts likely secrets, compacts whitespace, and shows estimated token counts before you paste code into an LLM chat. Everything runs locally: the source document is never modified unless you apply a quick fix, and file contents are never sent to a remote service (semantic folding, if enabled, calls a **local** Ollama instance only).

## Features

- **Copy for AI (Sanitized)** — `Ctrl+Shift+Alt+M` (`Cmd+Shift+Alt+M` on macOS), the editor context menu, or the Explorer context menu (multi-select supported). Copies the current selection, the active file, or the selected files as Markdown code blocks with file labels, after redacting secrets and compacting whitespace. A notification reports how many values were redacted and the estimated tokens before and after, and warns when the payload exceeds your token budget.
- **Token counter in the status bar** — shows the estimated tokens for the active file or selection, turns amber when over your token budget, and runs Copy for AI when clicked.
- **Inline secret warnings** — likely secrets in open files are underlined and listed in the Problems panel. Use the **Redact with [REDACTED_…]** quick fix to replace the value in your file.
- **Sidebar view** — click the MaxiMinion icon in the Activity Bar for quick actions and current settings.
- **Command Palette actions**:
  - `MaxiMinion: Copy for AI (Sanitized)` — described above.
  - `MaxiMinion: Run Refiner on Active File` — runs the full pipeline (scrub → entropy score → optional fold) and opens the refined text in a preview tab, ready to copy/paste.
  - `MaxiMinion: Sanitize Active File` — secret scrubbing only, opens a sanitized preview.
  - `MaxiMinion: Copy Sanitized Active File` — secret scrubbing only, copies the result to the clipboard.
  - `MaxiMinion: Open Settings` — jumps to the extension's settings (also available via the gear icon in the sidebar title bar).
- **MaxiMinion output channel** — logs the input file, resolved configuration, and a per-step report (scrub count, entropy score, folding result, optimization %) for every Refiner run.

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `maximinion.tokenBudget` | `8000` | Estimated token budget for Copy for AI and the status bar. `0` disables budget warnings. |
| `maximinion.copyForAI.compactWhitespace` | `true` | Remove trailing whitespace (except in Markdown) and collapse repeated blank lines in Copy for AI output. |
| `maximinion.statusBar.enabled` | `true` | Show the estimated token count in the status bar. |
| `maximinion.secretDiagnostics.enabled` | `true` | Show inline warnings for likely secrets in open files. |
| `maximinion.secretDiagnostics.minConfidence` | `0.75` | Minimum pattern confidence (0–1) for inline warnings. Raise it to reduce false positives. |
| `maximinion.secretScrubbing.enabled` | `true` | Enable secret scrubbing for Copy for AI and the Refiner commands. |
| `maximinion.entropyScoring.enabled` | `true` | Enable Shannon entropy scoring. |
| `maximinion.semanticFolding.enabled` | `false` | Enable semantic folding via a local Ollama instance at `http://localhost:11434`. Requires entropy scoring to be enabled. |
| `maximinion.manifest.exportFormat` | `json` | Format (`json` or `markdown`) used for the report logged to the output channel. |

## Notes

- Secret detection is pattern-based and cannot guarantee that every sensitive value is found. Review the output before sharing it.
- Inline warnings skip environment variable references (such as `process.env.API_KEY`) and lower-confidence patterns by default; lower `maximinion.secretDiagnostics.minConfidence` to see more.
- Token counts are estimates (~4 characters per token). Actual counts vary by model.
- The Refiner preview contains only the refined text (no report wrapper), so it can be copied straight into an LLM prompt with minimal token overhead. Full run details are in the **MaxiMinion** output channel.

## Install from source

The extension is not yet published to the Marketplace. From the repository root:

```bash
npm ci
npm run build
npm run package --workspace packages/vscode-extension
code --install-extension packages/vscode-extension/maximinion-<version>.vsix
```

Replace `<version>` with the `version` in [package.json](package.json).

## Licensing & Compliance

*"MaxiMinion.AI Community Edition is an independent, zero-cost tool provided strictly under the MIT License. The provision of this free tier does not constitute an operation in trade or commerce under the Australian Consumer Law (ACL), and the standard statutory consumer guarantees do not apply to this zero-cost release."*

This Community Edition is provided completely free of charge for evaluation and individual use. The software is provided 'AS IS' without warranties of any kind. See [LICENSE](LICENSE).
