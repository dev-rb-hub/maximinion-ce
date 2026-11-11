# The Refiner

The Refiner is MaxiMinion's analysis pipeline. Where **Copy for AI** is for everyday sharing, the Refiner is for **understanding and shrinking** a file before you send it.

## When to use it

- A file is large and you want to know whether it is mostly real logic or mostly boilerplate.
- You want a compressed summary of a big file (with semantic folding and a local Ollama model).
- You want a report of what was redacted and how much smaller the result is.

## What happens when you run it

**Command:** `MaxiMinion: Run Refiner on Active File (Signal Report)`, or right-click → **MaxiMinion**.

1. **Secret scrubbing** — likely secrets are replaced with `[REDACTED_…]`.
2. **Entropy scoring** — measures information density (Shannon entropy, bits per character):
   - `HIGH`: dense, varied content — usually real logic worth sending.
   - `MEDIUM`: a mix.
   - `LOW`: repetitive content (imports, generated code, long comment blocks) — a good candidate to trim.
3. **Semantic folding** *(optional, off by default)* — a local Ollama model summarizes the code. This is lossy, so check the summary.

## Where the results go

- A **preview tab** with the refined text, ready to copy into a chat. Your file is not changed.
- A **report** in the Output panel: **View → Output → MaxiMinion**.

## Enabling semantic folding

1. Install [Ollama](https://ollama.com) and start it (`ollama serve`).
2. Pull a small model, for example `ollama pull phi3`.
3. Turn on `maximinion.semanticFolding.enabled`.

Nothing is sent to a remote service.
