# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest `main` | ✅ |
| Older tags/releases | Security-critical fixes only |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Instead, report privately using one of:

1. **GitHub Security Advisories** (preferred): open a [private advisory](https://github.com/dev-rb-hub/maximinion-ce/security/advisories/new) for this repository.
2. **Email:** support@maximinion.ai — include a detailed reproduction case and the affected version/commit.

We aim to acknowledge reports within 5 business days and, per responsible-disclosure norms, ask that you allow up to 90 days for a fix before any public disclosure.

## Verifying Releases

- **npm packages** (`@maximinion/*`) are published by the [Release workflow](.github/workflows/release.yml) with npm provenance, starting with the first release after provenance was enabled. Earlier versions, up to and including `@maximinion/refiner` 0.2.1, have registry signatures but no provenance. To verify an installed package:

  ```bash
  npm audit signatures
  ```

  The package page on npmjs.com also shows a **Provenance** section that links to the source commit and the workflow run.
- **VS Code extension VSIX** files attached to GitHub releases carry a build provenance attestation:

  ```bash
  gh attestation verify maximinion-<version>.vsix -R dev-rb-hub/maximinion-ce
  ```

## Scope

This policy covers the Community Edition packages in this repository (`packages/refiner`, `packages/librarian`, `packages/manifest-generator`, `packages/proxy-transport`, and `packages/vscode-extension`). See [docs/GUIDES/security.md](docs/GUIDES/security.md) for broader data-handling and compliance information across all editions.
