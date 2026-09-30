# blueline

**Your coding agent reviews your marketing site against ten laws, and proves every finding.**

blueline is an agent skill for Claude Code, Codex and other agents that read [Agent Skills](https://agentskills.io). Point it at a live site, a page, a draft or a pull request. It runs read-only checks, quotes the evidence and tells you what to fix first. A blueline is the proof a printer checks before the print run.

[Get started](#get-started) · [The ten laws](laws/README.md) · [Example report](docs/example-report.md) · [Issues](https://github.com/loriscomba97/blueline/issues)

[![CI](https://github.com/loriscomba97/blueline/actions/workflows/ci.yml/badge.svg)](https://github.com/loriscomba97/blueline/actions/workflows/ci.yml)
[![MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## See it in action

The [example report](docs/example-report.md) is a real review of the test site in `test/fixtures/broken`, where problems are planted on purpose: an article kept out of search by a stray `noindex`, a price that differs between the page and its structured data, a `[TODO]` left in the text, and more than a dozen others. The review finds every one, with its evidence.

## Get started

Requires an agent that reads skills (tested with Claude Code and Codex) and Node.js 22 or later for the helper scripts.

```bash
npx skills add loriscomba97/blueline
```

This installs the six skills in the current project. Add `-g` to install them for every project, or `-s blueline` for the main skill only. Other ways to install are in [docs/install.md](docs/install.md).

Then ask your agent, in plain words:

```text
Review https://www.example.com and tell me what to fix first.
```

The report opens with a verdict for each law. Every finding follows, with its severity, the evidence, why it matters, the fix and how to check that the fix worked. To call the skill directly, type `/blueline https://www.example.com` in Claude Code, or `$blueline https://www.example.com` in Codex.

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

Each law is a page of [numbered checks](laws/README.md), 85 in all, each with the evidence that proves a finding, a default severity, fixes and exceptions.

## What it does

- **Proves every finding.** A finding quotes a command and its output, a file and line, or the text on the page. What it cannot check is listed as "not verified", never estimated.
- **Keeps Google's guidance apart from its own rules.** Official guidance is marked "Google says", with its link and the date it was checked. Thresholds such as "about 250 KB for a content image" are marked "our rule".
- **Reviews the whole site, or one area.** Next to the full review, five skills cover one area each: `blueline-crawl` (laws 1 to 3), `blueline-claims` (4 and 5), `blueline-content` (5 to 7), `blueline-speed` (8 and 9) and `blueline-launch` (10, with 1 to 3) for launches, redesigns and migrations. Your agent picks the right one from your request.

## How it works

Each skill is a `SKILL.md` with the laws it needs and small Node.js scripts with no dependencies. The scripts request pages one at a time and print JSON: the facts they found, and leads that name the check they belong to. The agent confirms each lead against the law before reporting it, then writes the review in one fixed format.

## Limits

- **Read only.** GET and HEAD requests: no forms, sign-ins or cookies. Everything a page contains is treated as data, never as instructions.
- **For sites you may review.** The crawl stops at 100 pages by default and does not apply `robots.txt`, because the review was asked for. Use it on sites you own or have permission to review.
- **Some checks need more.** Real-user speed data needs a CrUX API key. Comparing the raw HTML with the rendered page needs an agent with a browser. Without them, those checks are marked "not verified".
- **No promises.** The laws remove the reasons a page fails. They do not guarantee rankings, AI citations or traffic.

## License and contributing

MIT © Loris Comba. [CONTRIBUTING.md](CONTRIBUTING.md) explains how the skills are built from `laws/` and how to propose a check. Report security issues privately, as [SECURITY.md](SECURITY.md) describes.
