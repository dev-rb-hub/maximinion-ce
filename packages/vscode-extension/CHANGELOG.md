# Changelog

All notable changes to the MaxiMinion VS Code extension are documented here.

## 0.3.1

- The README (shown as the Marketplace listing) now explains how to install from the Marketplace instead of saying the extension is unpublished.
- Added this changelog.

## 0.3.0

### Added

- **Copy for AI (Sanitized):** copies the selection, the active file, or files selected in the Explorer as labelled Markdown code blocks, with secrets redacted and whitespace compacted (indentation is kept). Shows how many values were redacted and the estimated tokens before → after, and warns when over your token budget. Shortcut: `Ctrl+Shift+Alt+M` (`Cmd+Shift+Alt+M` on macOS).
- **Status bar token counter** for the active file or selection. It turns amber when over `maximinion.tokenBudget`, and clicking it runs Copy for AI.
- **Inline secret warnings** in the Problems panel (source `MaxiMinion`), with a **MaxiMinion: Redact with [REDACTED_…]** quick fix that replaces only the secret value. Sensitivity is set with `maximinion.secretDiagnostics.minConfidence`.
- **Get Started walkthrough** and a **MaxiMinion: Get Started & Help** command.
- **MaxiMinion submenu** in the editor context menu, the editor title bar, and the Explorer context menu.
- **Semantic folding model setting** (`maximinion.semanticFolding.model`) and a **MaxiMinion: Test Semantic Folding Setup (Ollama)** command. Turning folding on or changing its model runs the setup check; if Ollama or the model is unavailable, folding is turned off again with the reason and fix actions.
- Sidebar sections with explanations, folding readiness status, and help links.
- A Community Edition "AS IS" notice on first run and in the sidebar.

### Changed

- Settings are grouped into **Copy for AI & Tokens**, **Secret Protection**, and **Refiner**, each with an explanation.
- Clearer command titles: **Preview Sanitized File**, **Copy Sanitized File (Plain Text)**, and **Run Refiner on Active File (Signal Report)**.
- All notifications start with "MaxiMinion:".
- The Refiner report explains entropy ratings in plain language.
- The extension activates on startup.

### Fixed

- The extension now works in Restricted Mode (untrusted folders). Semantic folding settings can only be changed in trusted workspaces.
- Semantic folding no longer reports success when Ollama or the model is missing.
- Semantic folding with thinking models (for example `gemma4`) is much faster, because generation options are now sent correctly and thinking is turned off.
- Semantic folding shows a progress notification that you can cancel.

## 0.2.0

- Sidebar view in the Activity Bar.
- **Run Refiner on Active File** with per-step settings (secret scrubbing, entropy scoring, semantic folding, report format) and reports in the **MaxiMinion** output channel.
- MaxiMinion icons for the Activity Bar and the Marketplace.

## 0.1.0

- Initial release: preview a sanitized copy of the active file, or copy it to the clipboard sanitized.
