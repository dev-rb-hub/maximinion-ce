# Inline secret warnings

MaxiMinion checks open files as you type and underlines values that look like secrets.

## How to recognize them

- In the **Problems** panel the source column shows **MaxiMinion**, for example `MaxiMinion(API_KEY)`.
- Hovering the underline shows the same source. The code (such as `API_KEY`) links to this help.
- Emails, SSNs, and card-like numbers are shown as information (blue); keys and credentials as warnings (yellow).

## What to do

- **Redact in place:** put the cursor on the value, press `Ctrl+.` (or click the lightbulb), and choose **Redact with [REDACTED_…]**. Only the value is replaced, so `apiKey = "…"` stays valid code.
- **Leave the file alone:** use **Copy for AI** instead — it redacts in the copy only.
- **Too noisy?** Raise `maximinion.secretDiagnostics.minConfidence`, or turn warnings off with `maximinion.secretDiagnostics.enabled`.

Environment variable references such as `process.env.API_KEY` are never flagged, because they name a secret without containing it.

Detection is pattern-based and cannot find every secret. Always review what you share.
