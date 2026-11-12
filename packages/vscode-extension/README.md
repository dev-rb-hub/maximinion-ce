# MaxiMinion for VS Code

**MaxiMinion.AI** is a local-first context optimizer for AI-assisted coding.

Before you paste code into Copilot Chat, ChatGPT, Claude, or any LLM, MaxiMinion:

- **Redacts likely secrets**: API keys, cloud credentials, tokens, private keys, and connection strings become `[REDACTED_…]`.
- **Shows token counts**: a status bar counter and before/after estimates warn you when you go over your budget.
- **Copies clean, compact context**: selections, files, or Explorer multi-selections become labelled Markdown blocks with wasted whitespace removed.
- **Warns you while you edit**: likely secrets are flagged in the Problems panel with a one-click redact fix.

Everything runs on your machine. Your source files are only changed if you apply a quick fix. Optional summarization uses your own local Ollama model; your code is never sent to MaxiMinion servers.

*Coming in 0.4.0: dependency-graph ranking that picks the most important files in your workspace to fit your token budget.*

New here? Run **MaxiMinion: Get Started & Help** from the Command Palette for a short walkthrough.

## Where to find MaxiMinion

Everything MaxiMinion adds is labelled with its name:

| Place | What you'll see |
| --- | --- |
| Activity Bar | The MaxiMinion icon opens a sidebar with every action, a one-line explanation of each, and help links |
| Right-click in the editor or on files in the Explorer | A **MaxiMinion** submenu |
| Editor title bar | The MaxiMinion icon, which opens the same submenu |
| Status bar | A shield with `~N tokens`; hover it for details |
| Notifications | Messages start with **MaxiMinion:** |
| Problems panel | Secret warnings have the source **MaxiMinion** |
| Output panel | The **MaxiMinion** channel holds Refiner reports |
| Settings | Search `maximinion`; settings are grouped into three sections, each with an explanation |

## Which command should I use?

| I want to… | Use |
| --- | --- |
| Paste code into an AI chat | **Copy for AI (Sanitized)**: `Ctrl+Shift+Alt+M` (`Cmd+Shift+Alt+M` on macOS) |
| See what would be redacted, without copying | **Preview Sanitized File** |
| Copy redacted text without labels or code fences | **Copy Sanitized File (Plain Text)** |
| Check whether a big file is mostly signal or boilerplate, or summarize it | **Run Refiner on Active File (Signal Report)** |
| Remove a secret from my file permanently | The **MaxiMinion: Redact** quick fix on an underlined value |

## Copy for AI

Copies the current selection, the active file, or the files selected in the Explorer as labelled Markdown code blocks, after redacting secrets and compacting whitespace (indentation is kept). A notification reports how many values were redacted and the estimated tokens before and after, and warns when the copy exceeds your token budget.

The **token counter** in the status bar shows the estimate for the active file or selection, turns amber when over budget, and runs Copy for AI when clicked.

## Inline secret warnings

Likely secrets in open files are underlined and listed in the **Problems** panel with the source `MaxiMinion` and a code such as `API_KEY`. Keys and credentials are warnings; emails, SSNs, and card-like numbers are information.

- **Redact in place:** press `Ctrl+.` on the value and choose **MaxiMinion: Redact with [REDACTED_…]**. Only the value is replaced, so `apiKey = "…"` stays valid code.
- **Keep the file as is:** use Copy for AI, which redacts only the copy.
- **Too noisy?** Raise `maximinion.secretDiagnostics.minConfidence`, or turn warnings off with `maximinion.secretDiagnostics.enabled`. Environment variable references such as `process.env.API_KEY` are never flagged.

## The Refiner

The Refiner is the analysis pipeline behind **Run Refiner on Active File (Signal Report)**. Use it on large files to decide what is worth sending, or to shrink them.

1. **Secret scrubbing:** likely secrets are replaced with `[REDACTED_…]`.
2. **Entropy scoring:** Shannon entropy measures information density. `HIGH` means dense, varied content (usually real logic). `LOW` means repetitive content such as imports, generated code, or long comment blocks, which is a good candidate to trim.
3. **Semantic folding** (optional, off by default): a local [Ollama](https://ollama.com) model summarizes the code. The summary is lossy, so review it. To enable it, start Ollama (`ollama serve`), install a model (`ollama pull phi3`, or use one from `ollama list`), turn on `maximinion.semanticFolding.enabled`, and set `maximinion.semanticFolding.model` if you're not using `phi3`. Run **MaxiMinion: Test Semantic Folding Setup (Ollama)** (also in the sidebar and linked from the setting) to check that Ollama is reachable and the model is installed, and to time a sample fold. Turning folding on, or changing its model, runs the same check; if it fails, folding is turned off again and you're told how to fix it. The sidebar shows whether folding is ready. Folding shows a progress notification that you can cancel.

The refined text opens in a preview tab, and your file is not changed. A report with a plain-English explanation of each step is written to **View → Output → MaxiMinion**.

## Commands

All commands are in the Command Palette under **MaxiMinion:**.

- `Copy for AI (Sanitized)`: see [Copy for AI](#copy-for-ai).
- `Preview Sanitized File`: opens a redacted copy of the active file in a preview tab.
- `Copy Sanitized File (Plain Text)`: copies the redacted text with no labels or fences.
- `Run Refiner on Active File (Signal Report)`: see [The Refiner](#the-refiner).
- `Open Settings`: opens the MaxiMinion settings.
- `Test Semantic Folding Setup (Ollama)`: checks that Ollama is reachable and the folding model is installed, then times a sample fold.
- `Get Started & Help`: opens the walkthrough.

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `maximinion.tokenBudget` | `8000` | Estimated token budget for Copy for AI and the status bar. `0` disables budget warnings. |
| `maximinion.copyForAI.compactWhitespace` | `true` | Remove trailing whitespace (except in Markdown) and collapse repeated blank lines in Copy for AI output. |
| `maximinion.statusBar.enabled` | `true` | Show the estimated token count in the status bar. |
| `maximinion.secretDiagnostics.enabled` | `true` | Show inline warnings for likely secrets in open files. User settings only. |
| `maximinion.secretDiagnostics.minConfidence` | `0.75` | Minimum pattern confidence (0–1) for inline warnings. Raise it to reduce false positives. User settings only. |
| `maximinion.secretScrubbing.enabled` | `true` | Enable secret scrubbing for Copy for AI and the Refiner commands. User settings only. |
| `maximinion.entropyScoring.enabled` | `true` | Enable Shannon entropy scoring. |
| `maximinion.semanticFolding.enabled` | `false` | Enable semantic folding via a local Ollama instance at `http://localhost:11434`. Requires entropy scoring to be enabled. |
| `maximinion.semanticFolding.model` | `phi3` | Installed Ollama model used for semantic folding (see `ollama list`). |
| `maximinion.manifest.exportFormat` | `json` | Format (`json` or `markdown`) used for the report logged to the output channel. |

## Notes

- Secret detection is pattern-based and cannot guarantee that every sensitive value is found. Review the output before sharing it.
- Inline warnings skip environment variable references (such as `process.env.API_KEY`) and lower-confidence patterns by default; lower `maximinion.secretDiagnostics.minConfidence` to see more.
- Token counts are estimates (~4 characters per token). Actual counts vary by model.
- MaxiMinion works in Restricted Mode (untrusted folders). Semantic folding can only be enabled from user settings until the workspace is trusted.
- Secret protection settings (`secretScrubbing.enabled`, `secretDiagnostics.enabled`, `secretDiagnostics.minConfidence`) can only be changed in your user settings. Values in a workspace's `.vscode/settings.json` are ignored, so a repository cannot turn redaction off.
- The Refiner preview contains only the refined text (no report wrapper), so it can be copied straight into an LLM prompt with minimal token overhead. Full run details are in the **MaxiMinion** output channel.

## Install

Install **MaxiMinion** from the Extensions view (search "MaxiMinion"), or run:

```bash
code --install-extension maximinion.maximinion
```

### Build from source

From the root of the [repository](https://github.com/dev-rb-hub/maximinion-ce):

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
