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
2. Pull a model, for example `ollama pull phi3`, or use one you already have (`ollama list`). Use a local model: cloud models (names ending in `-cloud`) send your code to another host and are refused unless you allow them in your user settings.
3. Set `maximinion.semanticFolding.model` if you're not using `phi3`, then run **MaxiMinion: Test Semantic Folding Setup (Ollama)**. It checks that Ollama is reachable and the model is installed, then times a sample fold.
4. Turn on `maximinion.semanticFolding.enabled`. MaxiMinion re-checks the setup and turns folding off again if the check fails, telling you why.

The sidebar shows whether folding is ready. If Ollama isn't running or the model isn't installed when you run the Refiner, it tells you and offers to switch to an installed model. A progress notification shows while folding runs, and you can cancel it. The first run can take a while as Ollama loads the model.

Nothing is sent to a remote service.
