---
name: blueline-claims
description: Check that the facts and claims on a site or in a draft hold up, with evidence for every finding. Covers prices, requirements, FAQ answers, authors and dates stored once and matching the structured data, public numbers with their date and source, real quotes and testimonials, author pages, claims about competitors and about the product itself, AI-generated images declared in the alt text and in the file, and placeholders left in published pages. These are laws 4 and 5 of blueline. Use it when asked to fact-check a website, a landing page or an article, to compare structured data with the page, or to review statistics, testimonials, bylines, E-E-A-T or AI image disclosure.
license: MIT
compatibility: Needs a shell. Checks on a live site need network access. The helper scripts need Node.js 22 or later; without Node, the references give equivalent curl commands.
metadata:
  version: "0.1.0"
---

# blueline-claims

Checks that a site never contradicts itself and never claims more than it can prove: laws 4 and 5 of blueline, the "true" family. For a review against all ten laws, use the `blueline` skill.

| Law | Reference |
|---|---|
| 4. Every fact has one source | [04-one-source.md](references/04-one-source.md) |
| 5. Every claim can be checked | [05-checkable-claims.md](references/05-checkable-claims.md) |

How to write the review: [report.md](references/report.md).

## Start here

1. **What to review.** Any of these:
   - live pages;
   - the site's repository, where prices, FAQ and authors should live in one place;
   - a draft before it is published.
2. **Which pages.** Take the ones that carry facts:
   - pricing;
   - a product page;
   - a page with statistics or testimonials;
   - one article with a byline;
   - any page with an FAQ.

   Add every page the user named. When you cannot ask, make the choices yourself and state them in the report header.
3. **Who confirms.** Most claims can only be confirmed by their owner, for example that a quote is approved, that a number matches its source, or that an image was made by a model. List them under "Open decisions", grouped by who can answer (check 5.9). Do not treat a claim as verified until they do.

## Collect evidence

```bash
node scripts/page.mjs https://www.example.com/pricing --full   # visible text, headings, bylines, and the structured data values to compare
node scripts/assets.mjs https://www.example.com/blog/post      # images: the provenance metadata inside each file, next to its alt text
```

- **In the code.** Search for literal prices, requirements, plan names and support contacts written in more than one file (check 4.3). Also read the modules that should hold them once.
- **In a draft.** List every number, quote, comparison and product claim before judging anything else.

<!-- include: shared/fallbacks.md -->

## Review

1. For each law, read its reference and run its checks against your evidence.
2. File every finding under the check written for it, with its severity, evidence, reason, fix and verification.
3. Write the report as [report.md](references/report.md) describes. The verdict table lists laws 4 and 5, and "Open decisions" lists what only the owner can confirm.

<!-- include: shared/rules.md -->
