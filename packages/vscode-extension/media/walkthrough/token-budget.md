# Token budget

The status bar shows a shield icon with `~N tokens` for the active file — or for the selection, if you have one. Hover it for details; click it to run **Copy for AI**.

## Why it matters

AI models answer worse when they are given lots of irrelevant code ("lost in the middle"), and you pay for every token. Keeping pasted context focused usually gives better answers for less.

## Setting a budget

`maximinion.tokenBudget` (default **8000**) controls:

- when the status bar turns **amber**, and
- when **Copy for AI** warns that the copy is over budget.

Set it to `0` to turn budget warnings off.

## About the numbers

Counts are estimates at ~4 characters per token. Each model family (GPT, Claude, Gemini, Llama) tokenizes differently, so treat the number as a guide, not an exact limit.
