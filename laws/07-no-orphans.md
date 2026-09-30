# Law 7. No page is an orphan

**The law.** Every page that matters is linked from at least one other page on the site, with an anchor that says where the link leads.

- **Structure.** Pages on the same topic form a cluster: a hub links to each page, and each page links back to the hub and to its closest neighbors.
- **Targets.** Internal links point at live, canonical URLs.

## Why it matters

- **Crawlers find pages by following links.** **Google says:** "Every page you care about should have a link from at least one other page on your site" ([Make your links crawlable](https://developers.google.com/search/docs/crawling-indexing/links-crawlable)). A sitemap helps discovery, but it does not replace links.
- **The anchor text tells readers and search engines what the target is about.** **Google says** good anchor text is "descriptive, reasonably concise, and relevant", and advises: "Don't chain up links next to each other" (same page).
- **Links spread attention** (our rule, from experience). Links concentrated on two or three pages leave the rest of the library with nothing, however good those pages are.

## Checks

### 7.1 Every page in the sitemap has inbound links

**Where:** live URL · **Default severity:** fix soon; blocker for pages that sell

1. Crawl the site from the home page, following internal `<a href>` links. On large sites, crawl the sitemap's URLs and their links.
2. Count the inbound links to each URL.

Report sitemap URLs with zero inbound links (orphans), and the pages that sell (product, pricing, sign-up) that are reachable only through the sitemap.

### 7.2 Anchors say where they lead

**Where:** live URL, content · **Default severity:** polish

Good anchors are two to eight words (our rule) that describe the target, placed inside a real sentence. A card that is one big link (a title, a summary, an image) is different: its anchor is the whole card, and that is fine when the card starts with a descriptive title. The word count applies to links inside sentences.

Report:

- generic anchors: "click here", "read more", "this", "here";
- bare URLs used as anchors in body copy;
- the same anchor text pointing at different targets inside the body copy. Menus, footers and cards reuse product names on purpose, so `links.mjs` counts only links inside the text;
- links chained next to each other with no text between them.

### 7.3 Links point at live, canonical URLs

**Where:** live URL · **Default severity:** fix soon

Report internal links that answer `4xx` or `5xx`, go through a redirect, or point at a non-canonical variant (see [law 2](02-one-url.md) and [law 3](03-no-dead-urls.md)).

### 7.4 Topics have hubs, and hubs link both ways

**Where:** live URL, content · **Default severity:** fix soon

For each topic with three or more pages, check the structure:

- one hub page links to every page in the cluster;
- every page in the cluster links back to the hub;
- every page links to one or two neighbors.

Breadcrumbs, when present, reflect the same structure, and their `BreadcrumbList` markup matches the visible trail.

Report clusters with no hub, and pages that link nowhere inside their cluster.

### 7.5 Links are spread, not piled up

**Where:** live URL · **Default severity:** polish

Compare inbound link counts across the library. Report:

- the few pages that collect a large share of internal links while most pages have one or none;
- the same two or three cornerstone pages linked from every article.

### 7.6 New pages get linked, and link out

**Where:** content · **Default severity:** fix soon

A new article links to three to five related pages from its own text (our rule). Links in a related-posts module help, but they count separately. Check every target against the live sitemap before publishing, so no link points at an unpublished page.

At least one existing page links to it on the day it goes live. Report drafts with no internal links, links to URLs that are not live, and new pages with no inbound link.

### 7.7 "Related" modules cannot leave a page out

**Where:** code · **Default severity:** polish

A related-posts module that picks "same category, most recent" links to the newest posts over and over, and leaves older ones with nothing. **Our rule:** make one slot orphan-proof by construction.

- sort the posts by date;
- let post *n* link to post *n + 1*, wrapping around at the end.

Every post is then linked from at least one other, whatever its category.

Report modules that can leave a page with no inbound link.

### 7.8 Product and content link to each other

**Where:** live URL · **Default severity:** polish

- Product and pricing pages link to the two or three guides that best explain them.
- Guides mention and link the product where it naturally solves the problem they describe: once, in context, not in every paragraph.

## Fixes

- **Plan links with the content plan.** Every new piece lists its hub, its neighbors and the existing pages that will link to it.
- **Propose, review, then apply.** For a linking pass over an existing library:
  1. Propose links in a table: source page, target, the exact anchor, and the sentence it goes into.
  2. Have a person strike the forced ones.
  3. Apply only the approved rows.

  Keep a backup of every edited paragraph so the pass can be undone.
- **Set limits** so no page is stuffed and no target is over-linked. Our rule for one pass: at most four new links per page, and eight new inbound links per target.

Next.js example of an orphan-proof related slot:

```ts
// lib/related.ts: one slot always links to the next post by date, wrapping around
export function relatedPosts<T extends { slug: string; category: string }>(posts: T[], current: T, count = 3) {
  const i = posts.findIndex((p) => p.slug === current.slug);
  if (i === -1 || posts.length < 2) return [];
  const ring = posts[(i + 1) % posts.length];
  const rest = posts.filter((p) => p.slug !== current.slug && p.slug !== ring.slug);
  const sameCategory = rest.filter((p) => p.category === current.category);
  const others = rest.filter((p) => p.category !== current.category);
  return [ring, ...sameCategory, ...others].slice(0, count);
}
```

`posts` is sorted by date. Every post is the "next" of exactly one other post, so none is left out.

## Exceptions

- **Pages kept out of the index on purpose** do not need inbound links: thank-you pages, campaign landing pages, partner-only downloads. Keep them out of the sitemap too.
- **Very small sites** (five pages or fewer) can rely on the navigation alone.

## Sources

Checked on 30 September 2026.

- Google Search Central: [Make your links crawlable](https://developers.google.com/search/docs/crawling-indexing/links-crawlable)
- Google Search Central: [Build and submit a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- Google Search Central: [Breadcrumb (BreadcrumbList) structured data](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb)
