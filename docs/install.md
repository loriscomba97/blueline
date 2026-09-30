# Install blueline

blueline includes six [Agent Skills](https://agentskills.io). Each folder contains a `SKILL.md`, references and scripts. Compatibility has been tested with Claude Code and Codex only.

## Requirements

- Node.js 22 or later for the scripts. Without Node, use the `curl` commands in each law's reference.
- Network access for reviews of live sites.

## With the skills installer

Run this in the project where you want to use blueline:

```bash
npx skills add loriscomba97/blueline
```

This installs the six skills. Files go to `.agents/skills/`, which Codex reads, with links for the agents you choose, such as `.claude/skills/` for Claude Code.

| Option | What it does |
|---|---|
| `-g` | Installs for your user, in `~/.agents/skills/` and `~/.claude/skills/`, instead of the project |
| `-s blueline` | Installs the main skill only. Use any of the six names; `-s '*'` installs all six |
| `-a claude-code codex` | Selects the agents to install for |
| `-y` | Skips the questions |

The installer collects anonymous usage data. Set `DISABLE_TELEMETRY=1` to turn it off.

## Check and use the install

Run `npx skills list`, or ask your agent which skills are available. The six names start with `blueline`; if you selected one, expect only that skill.

Call the main skill directly, replacing the URL with a site you own or may review:

- **Claude Code:** `/blueline https://www.example.com`
- **Codex:** `$blueline https://www.example.com`, or `/skills` to select a skill.

Use the other skill names in the same way for a focused review. You can also ask in plain words so the agent can select a matching skill:

| Skill | Covers | Example request |
|---|---|---|
| `blueline` | All ten laws | "Review this site and tell me what to fix first." |
| `blueline-crawl` | Laws 1 to 3: HTML, URLs and crawl access | "Check whether crawlers can read these pages." |
| `blueline-claims` | Laws 4 and 5: facts, structured data and claims | "Check the prices and FAQ on this page." |
| `blueline-content` | Laws 5 to 7: claims, content and internal links | "Review this article before publishing." |
| `blueline-speed` | Laws 8 and 9: speed and media | "Check what slows down this page." |
| `blueline-launch` | Law 10, with 1 to 3: launches and migrations | "Review this site before the migration." |

The report lists findings with evidence, severity, fixes and verification steps. Checks that cannot run are marked "not verified". Real-user speed data for check 8.1 needs a CrUX API key in the `CRUX_API_KEY` environment variable. Comparing raw and rendered HTML needs an agent with a browser.

## Update or remove

`npx skills update` updates installed skills. `npx skills remove blueline` removes the main skill; use another skill's name to remove that one.

## By hand

Copy the folders you need from [`skills/`](../skills) into your agent's skills folder. Keep each folder intact: its references and scripts are included.

| Agent | For one project | For your user |
|---|---|---|
| Claude Code | `.claude/skills/` | `~/.claude/skills/` |
| Codex | `.agents/skills/` | `~/.agents/skills/` |

## When many skills are installed

Codex keeps its skills list within about 2% of the model's context window, or 8,000 characters when the window is unknown. With many skills installed, it shortens descriptions first, then leaves skills out.

If blueline does not start automatically, call it directly or turn off skills and plugins you do not use.
