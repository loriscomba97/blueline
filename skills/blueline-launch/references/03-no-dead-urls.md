<!-- Generated from laws/03-no-dead-urls.md by scripts/build.mjs. Edit the source, not this copy. -->

# Law 3. No URL dies by accident

**The law.** A URL that has ever been public keeps working, or stops working on purpose.

- **A moved page** redirects permanently to its closest replacement.
- **A removed page** answers `404` or `410`, because someone decided it should.
- **A URL that never existed** answers `404`, never a friendly page with status `200`.
- **The sitemap** lists only live, canonical, indexable URLs.

## Why it matters

- **Links and rankings.** Every URL with links or rankings carries value. A redirect to its replacement passes it on; an accidental `404` throws it away.
- **Soft 404s.** **Google says** a soft 404 is "a page telling the user that the page does not exist and also a 200 (success) status code", and that missing pages should return `404` or `410` ([Troubleshoot crawling errors](https://developers.google.com/search/docs/crawling-indexing/troubleshoot-crawling-errors)).
- **Mass redirects to the home page.** **Google says** redirecting old URLs to an irrelevant page, "such as the home page of the new site", can confuse users and "might be treated as a soft 404 error" ([Site moves with URL changes](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes)).
- **The sitemap is the list of pages you want in search.** **Google says** it should list canonical URLs ([Build and submit a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)). Redirects, errors and `noindex` pages in it contradict the list.

## Checks

### 3.1 A URL that does not exist answers 404

**Where:** live URL · **Default severity:** blocker

```bash
curl -s -o /dev/null -w "%{http_code}\n" "https://www.example.com/this-page-does-not-exist-$RANDOM"
```

Expect `404` (or `410`). A `200` means every mistyped or removed URL looks like a real, empty page. Also try a missing item in each dynamic route, for example `/blog/does-not-exist`.

### 3.2 The 404 page helps

**Where:** live URL · **Default severity:** polish

The not-found page:

- renders inside the normal header and footer;
- says plainly that the page does not exist;
- offers five or six links to the main sections (our rule).

It keeps the `404` status.

### 3.3 The sitemap lists only live pages

**Where:** live URL · **Default severity:** blocker when many entries fail, fix soon otherwise

1. Find the sitemap: the `Sitemap:` line in `robots.txt`, or `/sitemap.xml`.
2. Request every entry, or a sample of 100 on large sites (our rule).
3. Check each entry. Each one:
   - answers `200` without a redirect;
   - is canonical to itself;
   - carries no `noindex`.
4. Report each failing entry with its status.

Check `lastmod` too. Where present, it should change when the page changes. Report a sitemap where every entry carries the same timestamp (usually the build time).

**Google says** it uses `lastmod` only if it is "consistently and verifiably" accurate ([Build and submit a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)).

### 3.4 Redirects are single hops to relevant pages

**Where:** live URL · **Default severity:** fix soon

For every redirect you find (from the sitemap, internal links, or a list of old URLs), report:

- chains of two or more hops;
- loops;
- temporary redirects used for permanent moves;
- groups of unrelated old URLs that all land on the home page.

### 3.5 Internal links do not break

**Where:** live URL · **Default severity:** fix soon for errors, polish for redirects

Collect the internal links on the pages you review. Report:

- each link that answers `4xx` or `5xx`;
- each link that goes through a redirect. Point it straight at the final URL.

### 3.6 Old URLs still resolve

**Where:** live URL, with a list of old URLs · **Default severity:** blocker

The list of URLs that mattered in the past comes from:

- the old sitemap;
- a Search Console export of pages with impressions in the last 16 months, the longest period Search Console keeps;
- analytics landing pages;
- a crawl.

When you have that list, request every URL. Each one either answers `200` at the same path or redirects permanently to the closest page.

This is the check that decides whether a migration keeps its traffic ([law 10](10-gates.md)).

## Fixes

- **Keep the redirect map in the repository**, one line per move, permanent. Old slugs from the CMS can feed it automatically.
- **Answer the real status in dynamic routes.** When a slug does not resolve, return the framework's not-found response. Never render an empty page.
- **Hard 404 for routes you control.** For routes whose pages come from the repository, turn off on-demand generation of unknown paths, so a typo returns a real `404`.
- **Build the sitemap from the same source as the pages**, filtered by the same rules: published, indexable, canonical.

Next.js example:

```tsx
// app/blog/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { getPost } from '@/lib/posts';

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getPost((await params).slug);
  if (!post) notFound(); // a real 404, not an empty page
  return <article>{/* ... */}</article>;
}
```

## Exceptions

- **Expired offers and events.** They can return `404` or `410` on purpose. Note the decision next to the rule that removes them.
- **Utility pages from an old platform.** Pages like search results or tag archives can redirect to the nearest index page, and stay out of the sitemap.

## Sources

Checked on 30 September 2026.

- Google Search Central: [Troubleshoot crawling errors](https://developers.google.com/search/docs/crawling-indexing/troubleshoot-crawling-errors), which defines soft 404s
- Google crawling documentation: [HTTP status codes](https://developers.google.com/crawling/docs/troubleshooting/http-status-codes)
- Google Search Central: [Site moves with URL changes](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes), on redirects to the home page
- Google Search Central: [Build and submit a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
