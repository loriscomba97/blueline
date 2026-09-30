# Changelog

## 1.0.0 (unreleased)

First public release.

- **Ten laws with 85 numbered checks.** Each check defines its scope, evidence and default severity, with fixes, exceptions and dated sources. Official guidance is distinguished from project rules.
- **Six skills.** `blueline` covers all ten laws. `blueline-crawl`, `blueline-claims`, `blueline-content`, `blueline-speed` and `blueline-launch` cover specific areas. Each includes its own references and scripts.
- **Seven scripts.** `page`, `variants`, `robots`, `sitemap`, `not-found`, `links` and `assets` require Node.js 22 or later and have no dependencies. They make read-only requests one at a time and return facts and signals for review.
- **A shared report format.** Verdicts, findings with evidence and verification steps, open decisions, checks not verified and checks that hold.
- **Unit and fixture tests.** Scripts are tested against a site with deliberate errors and a clean site that must produce no signals.
