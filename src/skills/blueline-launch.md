---
name: blueline-launch
description: Check that a site can go live, or move, without losing its traffic, with evidence for every finding. Covers production indexable and staging not, robots.txt, the sitemap, canonicals, redirects for every old URL, real 404s, build checks that refuse broken content, one publish switch, fact-checks, tracking that works only in production, the two-person launch gate, and parity before improvements in a migration. This is law 10 of blueline, with laws 1 to 3. Use it before a launch, a redesign, a domain, platform or hosting change, or when search traffic dropped after one.
license: MIT
compatibility: Needs a shell. Checks on a live site need network access. The helper scripts need Node.js 22 or later; without Node, the references give equivalent curl commands.
metadata:
  version: "0.1.0"
---

# blueline-launch

Checks that nothing ships without a gate: law 10 of blueline, the "safe" family, with the crawl laws 1 to 3 that every launch depends on. For a review against all ten laws, use the `blueline` skill.

| Law | Reference |
|---|---|
| 10. Nothing ships without a gate | [10-gates.md](references/10-gates.md) |
| 1. Everything that matters is in the first HTML response | [01-first-html.md](references/01-first-html.md) |
| 2. One page, one URL | [02-one-url.md](references/02-one-url.md) |
| 3. No URL dies by accident | [03-no-dead-urls.md](references/03-no-dead-urls.md) |

The AI crawlers and what each one does: [ai-crawlers.md](references/ai-crawlers.md). How to write the review: [report.md](references/report.md).

## Start here

1. **What kind of change.** Ask which change is coming, because the checks differ:
   - **A first launch:** the launch gate (10.8).
   - **A redesign or a platform migration:** parity first (10.9), plus the launch gate.
   - **A domain change:** redirects of every URL, and the Change of Address tool.
   - **A hosting change with the same URLs:** the hosting checklist in 10.9.
2. **Which hosts.** Ask for every host the site answers on: production, staging, previews (hosting platforms often create one per deployment), and, for a migration, the old site. Check 10.1 runs on all of them. A launch on a platform address (`*.vercel.app`, `*.netlify.app`) followed later by a custom domain is a domain change: say so in "Open decisions".
3. **Closed on purpose?** When the site is kept out of search until launch day, run the gate twice, as check 10.8 describes: before the switch, to prove everything else is ready, and after it.
4. **The old URLs.** A migration needs the list of URLs that mattered: the old sitemap, a Search Console export of the last 16 months, and a crawl. Without it, check 10.9 is not verified, and saying so is the most important line of the report.
5. **The code.** The repository settles checks 10.1, 10.3, 10.4, 10.5, 10.7 and 10.10: the indexing setting, the build guards, the fail-soft data layer, the publish switch, tracking, and the checks that run on every change.
6. When you cannot ask, make the choices yourself and state them in the report header.

## Collect evidence

```bash
node scripts/page.mjs https://www.example.com/              # noindex, canonical, head tags on the production host
node scripts/page.mjs https://staging.example.com/          # the same on staging: it must be noindex
node scripts/robots.mjs https://www.example.com             # robots.txt status, rules, Sitemap line, AI crawlers
node scripts/sitemap.mjs https://www.example.com            # sitemap entries: live, canonical, indexable
node scripts/variants.mjs https://www.example.com/          # bare domain and www, http and https, and a parameter
node scripts/variants.mjs https://www.example.com/pricing   # an inner page too: trailing-slash and case variants
node scripts/not-found.mjs https://www.example.com --from-sitemap
node scripts/links.mjs https://www.example.com              # broken internal links, linked files, pages kept out of the index
```

For a migration, request every old URL. Each one must answer `200` at the same path, or redirect once, permanently, to the closest page (check 3.6).

<!-- include: shared/fallbacks.md -->

## Review

1. Read law 10's reference first, then the crawl laws the change touches.
2. File every finding under the check written for it, with its severity, evidence, reason, fix and verification.
3. End the report with the launch gate of check 10.8 as a closing section (see [report.md](references/report.md)), each line marked done, failed or not verified, with its evidence. Record the reviewer, and leave the two human checks for the people who sign them.
4. Write the report as [report.md](references/report.md) describes. The verdict table lists laws 1 to 3 and 10.

<!-- include: shared/rules.md -->
