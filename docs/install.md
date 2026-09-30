# Install blueline

blueline is six [Agent Skills](https://agentskills.io): folders with a `SKILL.md`, the laws they need and their helper scripts. Any agent that reads skills can use them. They are tested with Claude Code and Codex.

## Requirements

- Node.js 22 or later, for the helper scripts. Without Node, each law's reference gives equivalent `curl` commands.
- Network access, for reviews of live sites.

## With the skills installer

```bash
npx skills add loriscomba97/blueline
```

This installs the six skills in the project you run it from. The files go to `.agents/skills/`, which Codex reads, with links for the agents you choose, such as `.claude/skills/` for Claude Code.

| Option | What it does |
|---|---|
| `-g` | Installs for your user, in `~/.agents/skills/` and `~/.claude/skills/`, instead of the project |
| `-s blueline` | Installs one skill. Use any of the six names; `-s '*'` installs all of them |
| `-a claude-code codex` | Chooses the agents to install for |
| `-y` | Skips the questions |

`npx skills update` updates the skills and `npx skills remove blueline` removes one. The installer collects anonymous usage data; set `DISABLE_TELEMETRY=1` to turn it off, as [its README](https://github.com/vercel-labs/skills) describes.

## By hand

Copy the folders in [`skills/`](../skills) into your agent's skills folder. Each skill is self-contained: its references and scripts are inside its own folder.

| Agent | For one project | For your user |
|---|---|---|
| Claude Code | `.claude/skills/` | `~/.claude/skills/` |
| Codex | `.agents/skills/` | `~/.agents/skills/` |

## Use it

Ask in plain words. Your agent picks the skill that matches the request:

| Skill | Covers | Try |
|---|---|---|
| `blueline` | All ten laws | "Review https://www.example.com and tell me what to fix first." |
| `blueline-crawl` | Laws 1 to 3: what crawlers and AI assistants can read | "Can Google and AI assistants crawl and index https://www.example.com?" |
| `blueline-claims` | Laws 4 and 5: facts, structured data, claims | "Fact-check the prices and the FAQ on https://www.example.com/pricing." |
| `blueline-content` | Laws 5 to 7: search intent, copy, internal links | "Review this blog post before we promote it." |
| `blueline-speed` | Laws 8 and 9: speed, images, video | "Why is https://www.example.com/blog/post slow?" |
| `blueline-launch` | Law 10, with 1 to 3: launches and migrations | "We move the site to a new platform next week. What do we check?" |

To call a skill directly:

- **Claude Code:** `/blueline https://www.example.com`, or `/blueline-speed` and the other names.
- **Codex:** `$blueline https://www.example.com`, or `/skills` to pick one.

## When many skills are installed

Agents list every installed skill for the model, and the list has a limit. Codex keeps it within about 2% of the model's context window, or 8,000 characters when the window is unknown. With many skills installed, it shortens their descriptions first, then leaves some skills out, as the Skills page of the Codex documentation explains.

If blueline does not start on its own, call it directly as above, or turn off the skills and plugins you do not use.

## Check the install

Ask your agent which skills it has, or run `npx skills list`. The six names start with `blueline`.
