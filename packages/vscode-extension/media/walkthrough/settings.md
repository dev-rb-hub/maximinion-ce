# MaxiMinion settings

Open **Settings** and search for `maximinion`, or use **MaxiMinion: Open Settings**. Settings are grouped into three sections, and each one explains what it affects.

| Section | Settings | Affects |
| --- | --- | --- |
| **Copy for AI & Tokens** | Token budget, compact whitespace, status bar | Copy for AI and the status bar counter |
| **Secret Protection** | Secret scrubbing, inline warnings, warning confidence | Every copy and preview command, and the Problems panel |
| **Refiner** | Entropy scoring, semantic folding, report format | Run Refiner on Active File only |

## Quick reference: which command should I use?

| I want to… | Use |
| --- | --- |
| Paste code into an AI chat | **Copy for AI (Sanitized)** — `Ctrl+Shift+Alt+M` |
| See what would be redacted, without copying | **Preview Sanitized File** |
| Copy redacted text with no labels or fences | **Copy Sanitized File (Plain Text)** |
| Check whether a big file is mostly signal or boilerplate | **Run Refiner on Active File (Signal Report)** |
| Remove a secret from my file permanently | The **Redact** quick fix on an underlined value |

## Restricted Mode

MaxiMinion works in untrusted folders. Semantic folding can only be enabled from your user settings until you trust the workspace.

## Disclaimer

MaxiMinion.AI Community Edition is provided completely free of charge for evaluation and individual use. The software is provided 'AS IS' without warranties of any kind.
