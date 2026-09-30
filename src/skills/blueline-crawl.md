---
name: blueline-crawl
description: Check whether search engines and AI assistants can read a site, with evidence for every finding. Covers what is in the raw HTML before JavaScript runs, head tags and structured data, real links, robots.txt and each AI crawler's access, one URL per page (https, www, trailing slash, case, parameters, canonical tags, staging), redirects, soft 404s, sitemaps and broken internal links. These are laws 1 to 3 of blueline. Use it when asked whether Google or AI assistants can crawl, render or index a site, or about canonicals, duplicate URLs, redirects, robots.txt, sitemaps, 404 errors, JavaScript rendering or llms.txt.
license: MIT
compatibility: Needs a shell. Checks on a live site need network access. The helper scripts need Node.js 22 or later; without Node, the references give equivalent curl commands.
metadata:
  version: "0.1.0"
---

# blueline-crawl

Checks whether search engines and AI assistants can read a site: the first three laws of blueline, the "readable" family. For a review against all ten laws, use the `blueline` skill.

| Law | Reference |
|---|---|
| 1. Everything that matters is in the first HTML response | [01-first-html.md](references/01-first-html.md) |
| 2. One page, one URL | [02-one-url.md](references/02-one-url.md) |
| 3. No URL dies by accident | [03-no-dead-urls.md](references/03-no-dead-urls.md) |

The AI crawlers and what each one does: [ai-crawlers.md](references/ai-crawlers.md). How to write the review: [report.md](references/report.md).

## Start here

1. **What to review.** A live site or page, `localhost` included. Add the repository when the user can share it: redirects, canonicals and the robots file are often set in code.
2. **Which pages.** Take one page per template:
   - the home page;
   - a product or service page;
   - one article;
   - one listing page;
   - a made-up URL for the 404.

   Add every page the user named. When you cannot ask, make the choices yourself and state them in the report header.
3. **What data.** A Search Console export of pages, or the old sitemap, lets check 3.6 test the URLs that mattered in the past. Without one, that check is not verified.

## Collect evidence

```bash
node scripts/page.mjs https://www.example.com/pricing       # raw HTML: head tags, canonical, links, structured data, rendering markers
node scripts/variants.mjs https://www.example.com/pricing   # http and https, www, slash, case and parameter variants, hop by hop
node scripts/robots.mjs https://www.example.com             # robots.txt as Google applies it, and each AI crawler's access
node scripts/sitemap.mjs https://www.example.com            # sitemap entries: live, canonical, indexable; lastmod
node scripts/not-found.mjs https://www.example.com --from-sitemap   # made-up URLs must answer 404
node scripts/links.mjs https://www.example.com              # broken internal links and links through redirects
```

<!-- include: shared/fallbacks.md -->

## Review

1. For each law, read its reference and run its checks against your evidence.
2. File every finding under the check written for it, with its severity, evidence, reason, fix and verification.
3. Write the report as [report.md](references/report.md) describes. The verdict table lists laws 1 to 3.

<!-- include: shared/rules.md -->
