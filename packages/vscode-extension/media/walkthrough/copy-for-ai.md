# Copy for AI

**When to use it:** any time you are about to paste code into an AI chat (Copilot Chat, ChatGPT, Claude, Gemini, a local model).

## How

| Where | What gets copied |
| --- | --- |
| `Ctrl+Shift+Alt+M` (`Cmd+Shift+Alt+M` on macOS) | The selection, or the whole file if nothing is selected |
| Right-click in the editor → **MaxiMinion → Copy for AI (Sanitized)** | Same as above |
| Right-click files in the Explorer → **MaxiMinion → Copy for AI (Sanitized)** | All selected files, combined |
| Click the `~N tokens` status bar item | The selection or file |

## What it does

1. Redacts likely secrets as `[REDACTED_API_KEY]`, `[REDACTED_AWS_KEY]`, and so on.
2. Trims trailing whitespace and repeated blank lines (indentation is kept).
3. Wraps each file in a labelled Markdown code block so the AI knows which file is which.
4. Shows a **MaxiMinion:** notification with the number of redactions and the estimated tokens before → after.

Your source file is never modified.

## Copy for AI vs. Copy Sanitized File (Plain Text)

- **Copy for AI** adds file labels and code fences — best for chats.
- **Copy Sanitized File (Plain Text)** copies only the redacted text — best for pasting back into a file or a non-chat tool.
