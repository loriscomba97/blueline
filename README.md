# blueline

**Review your marketing site with evidence and a clear order of fixes.**

blueline is an [Agent Skill](https://agentskills.io) tested with Claude Code and Codex. Point it at a site, page, draft or pull request. It guides your agent through ten laws, from the HTML crawlers read to the checks before a launch. A blueline is the proof a printer checks before the print run.

[Get started](#get-started) · [The ten laws](laws/README.md) · [Example report](docs/example-report.md) · [Issues](https://github.com/loriscomba97/blueline/issues)

[![CI](https://github.com/loriscomba97/blueline/actions/workflows/ci.yml/badge.svg)](https://github.com/loriscomba97/blueline/actions/workflows/ci.yml)
[![MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## See it in action

The [example report](docs/example-report.md) is a real review of a test site with deliberate errors. It shows an article blocked by `noindex`, a price mismatch between the page and its structured data, and a published `[TODO]`, with evidence and fixes.

## Get started

Use Claude Code or Codex, with Node.js 22 or later for the scripts. Without Node, use the `curl` commands in each law's reference.

Run this in your project:

```bash
npx skills add loriscomba97/blueline
```

This installs six skills. Add `-g` for all your projects, or `-s blueline` for the main skill only. See [installation options](docs/install.md) for agent selection and setup details.

Then ask your agent:

```text
Review https://www.example.com and tell me what to fix first.
```

Replace the URL with a site you own or may review. To call the skill directly, use `/blueline <url>` in Claude Code or `$blueline <url>` in Codex.

Expect a verdict for each law, then findings with severity, evidence, a fix and a way to verify it. Checks that need unavailable data or tools appear as "not verified".

## The ten laws

1. Everything that matters is in the first HTML response.
2. One page, one URL.
3. No URL dies by accident.
4. Every fact has one source.
5. Every claim can be checked.
6. Every page answers one question.
7. No page is an orphan.
8. Your page loads first; everything else waits.
9. Media is prepared once and cached forever.
10. Nothing ships without a gate.

The laws contain [85 numbered checks](laws/README.md), with evidence requirements, default severities, fixes and exceptions.

## What it does

- **Makes findings traceable.** Each finding must quote a command and output, a file and line, or page text. Missing evidence is recorded, never estimated.
- **Separates sources from rules.** Official guidance is marked "Google says", with a link and the date checked: 30 September 2026. Thresholds and severities are marked "our rule".
- **Fits the review to the task.** Use `blueline` for all ten laws, `blueline-crawl` for laws 1 to 3, `blueline-claims` for 4 and 5, `blueline-content` for 5 to 7, `blueline-speed` for 8 and 9, or `blueline-launch` for 10 with 1 to 3.

## How it works

Each skill includes its instructions, references and scripts. Seven Node.js scripts have no dependencies. They collect facts and flag possible problems as JSON. The agent checks those signals against the laws and writes the report. Some checks require the agent's judgment or additional evidence beyond script output.

## Limits

- **Read only.** Scripts send GET and HEAD requests, one at a time. The crawl defaults to 100 pages and does not apply `robots.txt`, because the review was requested. See [request limits and safety](SECURITY.md).
- **Additional tools.** Real-user speed data needs a CrUX API key in an environment variable. Comparing raw and rendered HTML needs an agent with a browser. Otherwise, those checks are "not verified".
- **Results vary.** The laws do not guarantee rankings, AI citations or traffic.

## License and contributing

[MIT](LICENSE) © Loris Comba. Report reproducible problems, false alarms or outdated sources through [CONTRIBUTING.md](CONTRIBUTING.md). Follow [SECURITY.md](SECURITY.md) to report vulnerabilities privately.
