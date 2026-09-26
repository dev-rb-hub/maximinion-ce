# Contributing

Full guidelines (dev setup, coding standards, testing requirements, review process) live in [CONTRIBUTORS.md](CONTRIBUTORS.md).

## Quick summary

- All changes land via pull request — direct pushes to `main` are blocked by branch protection.
- Every PR requires an approving review from the repo owner ([CODEOWNERS](.github/CODEOWNERS)).
- CI (build, lint, test, `npm audit`, CodeQL) must pass before merge.
- Do not include secrets, credentials, or PII in commits or PR descriptions — see [SECURITY.md](SECURITY.md).
