# Changelog

All notable changes to the MaxiMinion VS Code extension are documented here.

## Unreleased

### Added

- **Credential file check:** Copy for AI and Copy Sanitized File ask before copying files that usually hold credentials, such as `.env`, private keys, `.npmrc`, or Terraform state. Explorer selections can skip just those files.
- **Hidden Unicode check:** Copy for AI and Copy Sanitized File ask before copying text with bidirectional controls, invisible tag characters, or zero-width characters, which can hide instructions from you that an AI model still reads. **Show** jumps to the first one. Text is never changed.
- **MaxiMinion: Show Activity Log** opens the **MaxiMinion Activity** log: what was copied or sent to the local model, how many values were redacted, and which copies you declined. Paths and counts only, never file content.
- **Security status:** a **Security** section in the sidebar and a **MaxiMinion: Show Security Status** report show each protection's live state and the code that enforces it.
- If a workspace's settings try to lower secret protection, MaxiMinion tells you once (the settings were already ignored) and records it in the activity log.

### Security

- Secret detection patterns for email addresses and database URLs no longer slow down sharply on long runs of text, which could freeze the editor on large files. Copy for AI whitespace compaction has the same fix.
- Requests to the local Ollama server refuse HTTP redirects, and the endpoint is fixed to `http://localhost:11434`.
- See the new [Security Model](https://github.com/dev-rb-hub/maximinion-ce/blob/main/docs/SECURITY_MODEL.md).

## 0.3.2

### Security

- Secret protection settings (`maximinion.secretScrubbing.enabled`, `maximinion.secretDiagnostics.enabled`, and `maximinion.secretDiagnostics.minConfidence`) can now only be changed in your user settings. Previously, a repository's `.vscode/settings.json` could turn off secret redaction in Copy for AI or hide inline secret warnings. If you changed these settings for a single workspace, set them in your user settings instead.

## 0.3.1

- The README (shown as the Marketplace listing) now explains how to install from the Marketplace instead of saying the extension is unpublished.
- New Marketplace description and listing introduction.
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
