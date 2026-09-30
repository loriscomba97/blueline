---
name: blueline-content
description: Review a page or a draft article so it wins the search it targets, with evidence for every finding. Covers one search intent per page, titles and H1s that lead with the query, descriptions, headings, answer-first writing, plain copy, pages that compete for the same query, coverage against the top results and the gap they leave, the angle only this site can claim, internal links and orphan pages, and the claims a fact-check must confirm before publishing. These are laws 5, 6 and 7 of blueline. Use it when asked to review or improve a blog post, a landing page or product copy for SEO, titles, headings, keyword cannibalization, internal linking or AI search, or before publishing an article.
license: MIT
compatibility: Needs a shell. Checks on a live site need network access. The helper scripts need Node.js 22 or later; without Node, the references give equivalent curl commands.
metadata:
  version: "0.1.0"
---

# blueline-content

Checks that each page answers one question better than what already ranks, and that the site links its pages together: laws 6 and 7 of blueline, the "useful" family, with the claims of law 5. For a review against all ten laws, use the `blueline` skill.

| Law | Reference |
|---|---|
| 5. Every claim can be checked | [05-checkable-claims.md](references/05-checkable-claims.md) |
| 6. Every page answers one question | [06-one-question.md](references/06-one-question.md) |
| 7. No page is an orphan | [07-no-orphans.md](references/07-no-orphans.md) |

How to write the review: [report.md](references/report.md).

## Start here

1. **What to review.** A published page (its URL), or a draft (text, Markdown, a CMS export), or both.
2. **What the page is for.** Ask for the query the page should win. Without an answer, infer it from the title, the H1 and the first paragraph, and say that you inferred it.
3. **What data helps.** Two things make the review much stronger:
   - **The top results.** With the pages that rank first for the query, check 6.9 can compare coverage, format and the gap. Fetch them only when the user asks for the comparison.
   - **Search Console data.** An export of queries and pages settles checks 6.8 and 6.11: which pages already rank for the query, and which compete with each other.

   Without them, those checks are not verified.
4. When you cannot ask, make the choices yourself and state them in the report header.

## Collect evidence

```bash
node scripts/page.mjs https://www.example.com/blog/post   # title, description, headings, first paragraphs, links, anchors
node scripts/links.mjs https://www.example.com            # inbound links per page, orphans, anchors, where the links pile up
```

For a draft, work from the text. Also run `links.mjs` on the live site, so the links the draft proposes can be checked against pages that exist (check 7.6).

<!-- include: shared/fallbacks.md -->

## Review

1. For each law, read its reference and run its checks against your evidence. In a draft, start with the claims (law 5), then the intent and the structure (law 6), then the links (law 7).
2. File every finding under the check written for it, with its severity, evidence, reason, fix and verification.
3. When you propose new titles, headings or links, write them out in full, ready to paste, and mark them as proposals.
4. Write the report as [report.md](references/report.md) describes. The verdict table lists laws 5 to 7.

<!-- include: shared/rules.md -->
