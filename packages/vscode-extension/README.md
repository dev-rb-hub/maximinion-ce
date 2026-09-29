# MaxiMinion for VS Code

Run Phase 1 (the Refiner) on the active editor document locally — secret scrubbing, entropy scoring, and optional semantic folding — and review the result in a new, unsaved editor. The source document is never modified, and file contents are never sent to a remote service (semantic folding, if enabled, calls a **local** Ollama instance only).

## Features

- **Sidebar view** — click the MaxiMinion icon in the Activity Bar for quick access to the Refiner and current settings.
- **Command Palette actions**:
  - `MaxiMinion: Run Refiner on Active File` — runs the full pipeline (scrub → entropy score → optional fold) and opens the refined text in a preview tab, ready to copy/paste.
  - `MaxiMinion: Sanitize Active File` — secret scrubbing only, opens a sanitized preview.
  - `MaxiMinion: Copy Sanitized Active File` — secret scrubbing only, copies the result to the clipboard.
  - `MaxiMinion: Open Settings` — jumps to the extension's settings (also available via the gear icon in the sidebar title bar).
- **MaxiMinion output channel** — logs the input file, resolved configuration, and a per-step report (scrub count, entropy score, folding result, optimization %) for every Refiner run.

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `maximinion.secretScrubbing.enabled` | `true` | Enable secret scrubbing. |
| `maximinion.entropyScoring.enabled` | `true` | Enable Shannon entropy scoring. |
| `maximinion.semanticFolding.enabled` | `false` | Enable semantic folding via a local Ollama instance at `http://localhost:11434`. Requires entropy scoring to be enabled. |
| `maximinion.manifest.exportFormat` | `json` | Format (`json` or `markdown`) used for the report logged to the output channel. |

## Notes

- Secret detection is pattern-based and cannot guarantee that every sensitive value is found. Review the output before sharing it.
- The Refiner preview contains only the refined text (no report wrapper), so it can be copied straight into an LLM prompt with minimal token overhead. Full run details are in the **MaxiMinion** output channel.

## Licensing & Compliance

*"MaxiMinion.AI Community Edition is an independent, zero-cost tool provided strictly under the MIT License. The provision of this free tier does not constitute an operation in trade or commerce under the Australian Consumer Law (ACL), and the standard statutory consumer guarantees do not apply to this zero-cost release."*
