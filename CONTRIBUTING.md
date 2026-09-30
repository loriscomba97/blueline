# Contributing

Thanks for helping. The most useful contributions are a check that caught a real problem on a real site, a false alarm with the page that triggers it, and a source that changed.

## How the repository is built

| Folder | What it holds |
|---|---|
| `laws/` | The ten laws and their numbered checks: the source of every rule |
| `shared/` | The report format, and the rules and fallbacks every skill includes |
| `src/skills/` | The source of each skill's `SKILL.md` |
| `tools/` | The helper scripts: Node.js 22 or later, no dependencies |
| `skills/` | The installable skills, **generated**: never edit them by hand |
| `test/` | Unit tests, and a broken and a clean test site in `test/fixtures/` |

`npm run build` copies the laws, the report format and the scripts each skill needs into `skills/`, so every skill works when it is installed on its own.

## Before you open a pull request

```bash
npm run build          # regenerate skills/
npm run check          # skills/ matches its sources and follows the Agent Skills format
npm test               # unit tests, and every script against both test sites
npm run check:safety   # no secrets, keys or email addresses
```

- **A script change comes with a test.** Library functions are tested in `test/lib.test.mjs`. The scripts run in `test/sites.test.mjs` against `test/fixtures/broken`, where every planted problem must be found, and `test/fixtures/clean`, where no signal may appear.
- **A false alarm comes with the case that caused it.** Add it to the clean site, or to a unit test, so it cannot come back.
- **Keep the check numbers.** Reports and people cite them. Add a new check at the end of its law.

## Writing a law

- **Say who says so.** Official guidance is marked **Google says** (or the vendor's name), links the page it comes from, and appears in the law's Sources with the date it was checked. A recent change gets its date too, for example *Google update, 8 May 2026*. Everything else, including every number, severity and fix, is **our rule** and is marked as one.
- **Give every check its evidence.** Say where it runs (a live URL, the code, the content), its default severity, and what a reviewer quotes to prove a finding.
- **Plain US English.** Short sentences, one idea each, and no long dashes.

## Propose a new check

Open an issue with:

1. the problem, and a page where it happens;
2. the evidence a reviewer would quote;
3. the source that supports it, or why it should be our rule;
4. a default severity: Blocker, Fix soon or Polish.

## Maintainers

`git config core.hooksPath .githooks` turns on the hooks: noreply commit identities only, and a safety scan before each commit and push that also reads the maintainer's private denylist.
