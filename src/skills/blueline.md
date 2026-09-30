---
name: blueline
description: Review a marketing website, a single page, a draft article or a code change against the ten laws of a marketing site, and prove every finding with evidence. Covers what search engines and AI assistants can read in the HTML, one URL per page, redirects and 404s, facts that must match everywhere, claims that must be checkable, search intent and copy, internal links, loading speed, images and video, and the gates that make launches and migrations safe. Use it when asked to review, audit or check a website, landing page, product page, blog post, sitemap, robots.txt, structured data, SEO, AI search visibility, Core Web Vitals, a redesign, a migration or a launch, or a pull request that changes a marketing site.
license: MIT
compatibility: Needs a shell. Checks on a live site need network access. The helper scripts need Node.js 22 or later; without Node, the references give equivalent curl commands.
metadata:
  version: "0.1.0"
---

# blueline

blueline reviews a marketing site against ten laws and reports only what it can prove. Each law has numbered checks, a default severity for each check, and the public sources behind it. They are all in `references/`.

## The ten laws

| Job | Law | Reference |
|---|---|---|
| Readable | 1. Everything that matters is in the first HTML response | [01-first-html.md](references/01-first-html.md) |
| | 2. One page, one URL | [02-one-url.md](references/02-one-url.md) |
| | 3. No URL dies by accident | [03-no-dead-urls.md](references/03-no-dead-urls.md) |
| True | 4. Every fact has one source | [04-one-source.md](references/04-one-source.md) |
| | 5. Every claim can be checked | [05-checkable-claims.md](references/05-checkable-claims.md) |
| Useful | 6. Every page answers one question | [06-one-question.md](references/06-one-question.md) |
| | 7. No page is an orphan | [07-no-orphans.md](references/07-no-orphans.md) |
| Fast | 8. Your page loads first; everything else waits | [08-page-first.md](references/08-page-first.md) |
| | 9. Media is prepared once and cached forever | [09-media-once.md](references/09-media-once.md) |
| Safe | 10. Nothing ships without a gate | [10-gates.md](references/10-gates.md) |

The AI crawlers and what each one does: [ai-crawlers.md](references/ai-crawlers.md). How to write the review: [report.md](references/report.md).

## Start here

1. **Find out what to review.** It can be:
   - a live site or page, including `localhost`;
   - the site's repository;
   - a draft (text, Markdown, a CMS export);
   - a change (a diff or a pull request).

   If the request does not say, ask one question: which site or page, and a full review or one area? When the user just points at a site, do a full review.

   When you cannot ask, for example in a one-shot or delegated run, do not wait. Make the choices yourself, and state them in the report header.
2. **Find out what evidence you can collect.** Network access, the repository, and any data the user can share:
   - a Search Console export (queries and pages);
   - field data;
   - for content checks, the query the page targets and the top results for it.

   Say up front which checks will be "not verified" for lack of them.
3. **Pick the pages.** Take one page per template:
   - the home page;
   - a product or service page;
   - pricing;
   - one article;
   - one listing page, such as the blog index;
   - a made-up URL for the 404.

   Add every page the user named. State the list before you start.

   When the site has no page of a template (no pricing page, say), note it in the header and take the closest page instead. A missing template is not a finding.
4. **Pick the laws.** A full review covers all ten. A narrower request maps to a family:

   | The user asks about | Laws |
   |---|---|
   | Whether search engines and AI assistants can read the site | 1, 2, 3 |
   | Facts, numbers, quotes, authors, trust | 4, 5 |
   | The content or SEO of a page, or a draft before publishing | 6, 7, and 5 |
   | Speed, Core Web Vitals, images, video | 8, 9 |
   | A launch, a redesign or a migration | 10, and 1, 2, 3 |
   | A code change | the checks the diff can break (check 10.10) |

   Each family is also its own skill, for when the user wants one area only: `blueline-crawl` (1 to 3), `blueline-claims` (4 and 5), `blueline-content` (5 to 7), `blueline-speed` (8 and 9) and `blueline-launch` (10, with 1 to 3).

## Collect evidence

The scripts in `scripts/` need Node.js 22 or later and nothing else.

```bash
node scripts/page.mjs https://www.example.com/pricing        # raw HTML: head tags, headings, links, images, scripts, structured data
node scripts/variants.mjs https://www.example.com/pricing    # http and https, www, slash, case and parameter variants, hop by hop
node scripts/robots.mjs https://www.example.com              # robots.txt as Google applies it, and each AI crawler's access
node scripts/sitemap.mjs https://www.example.com             # sitemap entries: live, canonical, indexable; lastmod
node scripts/not-found.mjs https://www.example.com --from-sitemap   # made-up URLs must answer 404
node scripts/links.mjs https://www.example.com               # internal links: orphans, broken links, redirects, anchors
node scripts/assets.mjs https://www.example.com/pricing      # what the page downloads: JavaScript, CSS, images and their metadata
```

<!-- include: shared/fallbacks.md -->

- **Code.** Read the files that render the sampled pages: the framework configuration, the layouts, the metadata, and the modules that hold prices, FAQ and authors.
- **A draft.** Read it whole, then list its claims before judging its structure.
- **A diff.** Read the diff first, then check only what it can break.

## Review

1. For each law in scope, read its reference and run its checks against your evidence. Read a reference only when you need it.
2. For each finding, record:
   - the law and the check number;
   - the evidence and the severity;
   - why it matters, the fix, and how to verify the fix.
3. Record every check you could not run, and what would settle it.
4. Write the report exactly as [report.md](references/report.md) describes.

<!-- include: shared/rules.md -->
