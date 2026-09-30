# Contributing

Useful contributions include checks that catch real problems, reproducible false alarms and updates to sources. Include a page or a small example that shows the issue.

## How the repository is built

| Folder | What it holds |
|---|---|
| `laws/` | The ten laws and their numbered checks |
| `shared/` | The report format, common rules and fallbacks |
| `src/skills/` | The source of each skill's `SKILL.md` |
| `tools/` | Scripts for Node.js 22 or later, with no dependencies |
| `skills/` | Generated, installable skills. Do not edit these by hand |
| `test/` | Unit tests and test sites in `test/fixtures/` |

`npm run build` copies the references and scripts each skill needs into `skills/`. Each skill can then be installed on its own.

## Before you open a pull request

Run these from the repository root:

```bash
npm run build
npm run check:safety
npm run check
npm test
```

The checks scan for sensitive content, verify generated files and skill structure, and run tests. A passing safety scan does not replace reviewing the diff for private information.

- **Test script changes.** Library tests are in `test/lib.test.mjs`. Script tests in `test/sites.test.mjs` use a broken site with deliberate errors and a clean site that must produce no signals.
- **Keep false alarms reproducible.** Add the triggering case to the clean site or a unit test.
- **Keep check numbers stable.** Reports cite them. Add new checks at the end of a law.

## Writing a law

- **Attribute guidance.** Mark official guidance "Google says", link its source and record the date checked in the law's Sources section. The current references were checked on 30 September 2026. Include an update date when relevant. Mark project thresholds, severities and fixes "our rule".
- **Define the evidence.** State where each check runs, its default severity and what the reviewer must quote to support a finding.
- **Use plain US English.** Write short sentences with active verbs and no long dashes.

## Propose a new check

Open an issue with:

1. The problem and a page or example that shows it.
2. The evidence a reviewer would quote.
3. A supporting source, or a reason to adopt it as "our rule".
4. A default severity: Blocker, Fix soon or Polish.

Follow [SECURITY.md](SECURITY.md) for vulnerabilities rather than opening a public issue.

## Maintainers

Enable the hooks with `git config core.hooksPath .githooks`. They require noreply commit identities and run the safety scan before commits and pushes, including the maintainer's private denylist.
