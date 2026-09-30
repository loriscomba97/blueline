# Changelog

## 1.0.0 (unreleased)

First public release.

- **The ten laws of a marketing site**, in five families (readable, true, useful, fast, safe): 85 numbered checks, each with where it runs, a default severity, the evidence that proves a finding, fixes, exceptions and dated sources. Official guidance and our own rules are marked apart.
- **Six skills:** `blueline` for a full review, and `blueline-crawl`, `blueline-claims`, `blueline-content`, `blueline-speed` and `blueline-launch` for one area each. Every skill carries the laws and the scripts it needs, so each one works when installed on its own.
- **Seven helper scripts** with no dependencies, on Node.js 22 or later: `page`, `variants`, `robots`, `sitemap`, `not-found`, `links` and `assets`. They send read-only requests, one at a time, and print the facts they find with leads for each check.
- **One report format:** a verdict for each law, then every finding with its severity, evidence, reason, fix and verification; the open decisions, what could not be verified, and what holds.
- **Tests:** unit tests, and every script run against a test site with planted problems and against a clean one that must raise no signal.
