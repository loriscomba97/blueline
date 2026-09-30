# Law 5. Every claim can be checked

**The law.** Anything a reader could quote can be checked by someone who doubts it:

- **Numbers** carry their date and their source, and round down.
- **Quotes** are verbatim, from a real person who agreed to them.
- **Authors** are real people with their own page.
- **Claims about competitors** are sourced and dated.
- **AI-generated images** are declared.
- **Nothing unfinished** reaches the published page.

## Why it matters

- **Search engines ask who made the content.** **Google says** its questions for judging content include ([Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)):
  - whether it is self-evident who authored it;
  - whether pages carry a byline;
  - whether bylines "lead to further information about the author".
- **Wrong claims get repeated.** A number without a date goes stale silently, and AI answers keep repeating it. A rounded-up number overstates the truth the day it ships.
- **Using AI is allowed; hiding it is not.**
  - **Google says** "Appropriate use of AI or automation is not against our guidelines": it judges quality, not how content is produced ([Google Search's guidance about AI-generated content](https://developers.google.com/search/blog/2023/02/google-search-and-ai-content), February 2023).
  - **Google says** to disclose AI or automation "when it would be reasonably expected" ([Creating helpful content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)).
  - **Google says** mass-producing pages without added value can break its spam policy on scaled content ([Using generative AI content](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content)).
  - For images, the IPTC digital source type records that a file came from a generative model. **Google says** it extracts this field ([Image metadata](https://developers.google.com/search/docs/appearance/structured-data/image-license-metadata)). The AI labels in its image details come from C2PA and SynthID data instead ([About this image](https://support.google.com/websearch/answer/9789430)).
- **One broken claim costs the rest.** A single invented quote or wrong comparison makes readers discount every other claim on the site.

## Checks

### 5.1 Every public number has a date and a source

**Where:** live URL, code · **Default severity:** fix soon; blocker when the number contradicts its source

Find every metric in the copy, for example:

- customer or user counts;
- hours or money saved;
- percentages;
- "X times faster".

**Our rule:** each one shows a date and a scope nearby, for example "Measured across 1,200 teams, as of July 2026". In the code, each one comes from a single place that records where the value came from.

Report:

- numbers with no date or scope;
- numbers typed straight into the copy;
- numbers that differ from their recorded source.

### 5.2 Numbers round in the reader's favor

**Where:** code, content · **Default severity:** fix soon

**Our rule:**

- Counts round down: 71,842 becomes "70,000+", never "75,000+".
- A rate that looks better when smaller (error rate, setup time) rounds up.
- Estimates say "estimated" and show their basis.

Report numbers that round the other way, and estimates presented as measurements.

### 5.3 Nothing unfinished is published

**Where:** live URL, content · **Default severity:** blocker

Search the published HTML and the CMS content for:

- `[TODO`, `[TK]`, `[FACT-CHECK`, `TBD`, `XX%`;
- `lorem ipsum`, `Coming soon` stubs;
- empty headings;
- links to `#`.

```bash
grep -inE '\[(todo|tk|fact-check)|lorem ipsum|\bTBD\b|XX%' page.html
```

Report every hit with its location.

### 5.4 Authors are real and findable

**Where:** live URL · **Default severity:** fix soon

Every article shows a byline that links to a page about that person. The page gives:

- the person's role and background;
- links to their public profiles.

The article's structured data names the same person, with `author.url` pointing at that page. **Google says** `author.url` should be "a link to a web page that uniquely identifies the author of the article" ([Article structured data](https://developers.google.com/search/docs/appearance/structured-data/article)).

Report:

- articles without a byline;
- bylines that do not link;
- author pages that are generic team pages;
- credentials or awards worded differently from how their source names them.

### 5.5 Quotes and testimonials are real

**Where:** content · **Default severity:** blocker until confirmed

Every quote is attributed to a named person, with their role and company. It matches a published source (a review, an interview, a signed case study) word for word, and the person agreed to it.

You usually cannot verify this from the page. List each quote and ask its owner to confirm it before publishing. Do not treat the quote as verified until they do.

### 5.6 Claims about other products are sourced and fair

**Where:** content · **Default severity:** fix soon

Every statement about a competitor carries its source and the date you checked it, usually their own pricing page or documentation. This covers what the competitor supports, costs, or lacks.

A "best tools" page that ranks your own product first says so openly. It judges every product on the same criteria.

Report unsourced competitor claims and comparisons that hide who wrote them.

### 5.7 Product claims stay inside what the product does

**Where:** content · **Default severity:** blocker

Descriptions of your own product match its documentation: what it detects, supports, integrates with, and how long it takes. Report claims that stretch the scope. Examples:

- "works with every CRM" when it supports two;
- a time saving outside the range you measured;
- an integration that is only planned.

### 5.8 AI-generated images are declared twice

**Where:** live URL, content · **Default severity:** fix soon

An image made with a generative model says so twice:

- **In its alt text** (our rule). Add a fixed suffix such as "AI-generated illustration.", appended by the code so the wording lives in one place.
- **In its file metadata** (the IPTC standard). Set the IPTC digital source type for generative AI:

```bash
exiftool -XMP-iptcExt:DigitalSourceType="http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia" cover.webp
```

To read what a published file declares, `node scripts/assets.mjs <page>` reports each image's digital source type next to its alt text. By hand: `curl -s <image-url> | grep -a -o 'DigitalSourceType[^<]*'`. SVG files rarely carry the field; their declaration usually lives in the alt text alone.

A real photo that was edited with a generative tool gets `compositeWithTrainedAlgorithmicMedia` instead. For stores, **Google Merchant Center** requires the generative AI value on AI-generated product images ([AI-generated content](https://support.google.com/merchants/answer/14743464)).

Report AI-made images without either declaration.

Never tag real photos, screenshots or hand-made illustrations as AI-made: a false declaration is still false.

### 5.9 Drafts pass a fact-check before they publish

**Where:** content · **Default severity:** blocker for claims left open in a draft; fix soon on a page that is already live

When reviewing a draft, or a live page about to be promoted, list every claim that someone must confirm, grouped by who can confirm it:

- product behavior;
- supported platforms, integrations and versions;
- prices and dates;
- names, quotes and results.

**Our rule:** the draft publishes only when the list is empty. Well-written prose hides factual errors that the person who knows the product catches in seconds.

## Fixes

- **Keep every public number in one module with its provenance.** Record the as-of date, the scope, how it was measured and how to refresh it. Copy interpolates the value and never retypes it.
- **Render a footnote** such as "Measured {scope}, as of {date}" wherever a number appears.
- **Keep authors in a registry** that feeds bylines, author pages and structured data ([law 4](04-one-source.md)).
- **Stop placeholders and undated metrics in the build**: fail it when published content contains them ([law 10](10-gates.md)).

```ts
// lib/claims.ts: every public number, with its provenance
export const CLAIMS_AS_OF = '2026-07-31';
export const CLAIMS_AS_OF_LABEL = 'July 2026';

const RAW = {
  // Distinct accounts that published at least once, all time. Query: reports/active-accounts.sql
  accounts: 71_842,
} as const;

const floorTo = (n: number, step: number) => Math.floor(n / step) * step;

export const CLAIMS = {
  accounts: `${floorTo(RAW.accounts, 10_000).toLocaleString('en-US')}+`, // "70,000+"
} as const;
```

## Exceptions

- **Numbers that are not claims.** Numbers inside quotes from a published review stay as the reviewer wrote them, with the review linked. So do dates of events.
- **Illustrations everyone recognizes as illustrations** (icons, diagrams, a logo) need no provenance. The AI declaration still applies when a model generated them.

## Sources

Checked on 30 September 2026.

- Google Search Central: [Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- Google Search Central blog: [Google Search's guidance about AI-generated content](https://developers.google.com/search/blog/2023/02/google-search-and-ai-content), February 2023
- Google Search Central: [Using generative AI content on your website](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content)
- Google Search Central: [Article structured data](https://developers.google.com/search/docs/appearance/structured-data/article)
- Google Search Central: [Image metadata in Google Images](https://developers.google.com/search/docs/appearance/structured-data/image-license-metadata)
- Google Merchant Center Help: [AI-generated content](https://support.google.com/merchants/answer/14743464), on product images
- IPTC: [Digital source type vocabulary](https://cv.iptc.org/newscodes/digitalsourcetype/)
