---
name: blueline-speed
description: Find why a marketing page is slow, and what to fix first, with evidence for every finding. Covers Core Web Vitals from real-user data, render-blocking and third-party scripts, the JavaScript the page loads, dependencies, fonts, the main image, layout shifts, animation, HTML caching, image sizes and formats, declared dimensions, lazy loading, cache lifetimes, expiring image links, video and sharing images. These are laws 8 and 9 of blueline. Use it when asked about page speed, Core Web Vitals, LCP, INP, CLS, Lighthouse or PageSpeed Insights results, heavy images, third-party scripts, fonts, caching or video on a website.
license: MIT
compatibility: Needs a shell. Checks on a live site need network access. The helper scripts need Node.js 22 or later; without Node, the references give equivalent curl commands.
metadata:
  version: "0.1.0"
---

# blueline-speed

Checks that a page loads its own content first and that its media is prepared once: laws 8 and 9 of blueline, the "fast" family. For a review against all ten laws, use the `blueline` skill.

| Law | Reference |
|---|---|
| 8. Your page loads first; everything else waits | [08-page-first.md](references/08-page-first.md) |
| 9. Media is prepared once and cached forever | [09-media-once.md](references/09-media-once.md) |

How to write the review: [report.md](references/report.md).

## Start here

1. **What to review.** Live pages, `localhost` included, and the repository when the user can share it: dependencies and client components live in the code.
2. **Which pages.** Take the pages that matter most for visitors:
   - the home page;
   - the main product page;
   - one article;
   - any page the user says is slow.

   When you cannot ask, make the choices yourself and state them in the report header.
3. **Real-user data first.** Check 8.1 reads field data from the Chrome UX Report through the PageSpeed Insights API: the command is in the reference. Report what it returns, with its date. When there is none, say so. Never estimate a score.

## Collect evidence

```bash
node scripts/page.mjs https://www.example.com/            # scripts in the head, stylesheets, fonts, images in order, video, cache headers
node scripts/assets.mjs https://www.example.com/          # JavaScript and CSS weight, image formats, sizes, cache lifetimes
```

**In the code**, read:
- the production dependencies;
- where client components start;
- how the tag manager loads;
- how fonts are served.

<!-- include: shared/fallbacks.md -->

## Review

1. For each law, read its reference and run its checks against your evidence.
2. File every finding under the check written for it, with its severity, evidence, reason, fix and verification. Put measured numbers next to every speed finding, and say whether they are field data, lab data or file sizes.
3. Write the report as [report.md](references/report.md) describes. The verdict table lists laws 8 and 9.

<!-- include: shared/rules.md -->
