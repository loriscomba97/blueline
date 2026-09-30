<!-- Generated from laws/02-one-url.md by scripts/build.mjs. Edit the source, not this copy. -->

# Law 2. One page, one URL

**The law.** Every page answers at exactly one address:

- one scheme (`https`);
- one host (`www` or the bare domain: pick one);
- one spelling of the path (lowercase, with one trailing-slash rule);
- no tracking parameters.

Every other variant redirects permanently to that address in a single hop. The page's canonical tag points to itself, and staging and preview copies are never indexable.

## Why it matters

- **Duplicates split your signals.** When the same content answers at several URLs, search engines pick a canonical for you. Until they do, your links and signals are split across the duplicates.
- **Google says** permanent redirects are "a strong signal that the target of the redirect should become canonical", next to the canonical tag. A 308 is equivalent to a 301 ([How to specify a canonical URL](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls), [HTTP status codes](https://developers.google.com/crawling/docs/troubleshooting/http-status-codes)).
- **Google says** URLs are case-sensitive, so `/Pricing` and `/pricing` are different URLs ([URL structure best practices](https://developers.google.com/search/docs/crawling-indexing/url-structure)). With and without a trailing slash, they are different URLs too, except for the root ([To slash or not to slash](https://developers.google.com/search/blog/2010/04/to-slash-or-not-to-slash), 2010).
- **An indexable staging site is a full copy of your content**, competing with production.

## Checks

### 2.1 Every variant redirects, once, permanently

**Where:** live URL · **Default severity:**
- blocker when a variant answers 200 with the same content and no canonical to the page;
- polish when it answers 200 with the right canonical;
- fix soon for chains or temporary redirects.

Request the variants of a page and print the status and the redirect target:

```bash
for u in http://example.com/pricing https://example.com/pricing \
         http://www.example.com/pricing https://www.example.com/pricing/ \
         https://www.example.com/Pricing; do
  curl -s -o /dev/null -w "%{http_code} %{url_effective} -> %{redirect_url}\n" "$u"
done
```

Each variant should answer `301` or `308`, pointing straight at the canonical URL. Google's site-move guide also asks to avoid chains of redirects. Report:

- **Duplicates:** variants that answer `200` without a canonical to the real URL.
- **Chains:** variants that need two or more hops to reach it.
- **Temporary redirects:** `302` or `307` used for a move that is permanent.

Sometimes an extra hop comes from the host rather than from the site, for example a platform's HTTPS redirect that runs before the site's own rule. Report it as polish, and name the layer that owns the fix.

### 2.2 One canonical, pointing at itself

**Where:** live URL · **Default severity:** blocker

The page's `<head>` holds exactly one `<link rel="canonical">`. Its value is the absolute URL of the page itself, identical to the final URL of check 2.1: scheme, host, case, trailing slash, no query string.

Report a canonical that is:

- missing or duplicated;
- relative;
- pointing at another page, for example the home page from every page;
- pointing at a staging or preview host.

### 2.3 Every reference uses the canonical form

**Where:** live URL, code · **Default severity:** fix soon

These all use the exact canonical URL of the page:

- internal links;
- sitemap entries;
- `og:url`;
- the `url` fields in structured data.

Report references to redirected variants, to other hosts, or to preview domains.

### 2.4 Staging and previews stay out of the index; production does not

**Where:** live URL · **Default severity:** blocker

Staging and preview hosts answer with `X-Robots-Tag: noindex` or a `noindex` robots meta tag, and ideally sit behind a password.

**Google says** "block indexing with noindex or password-protect the page" to keep it out of Google. `robots.txt` alone does not do it: a blocked page can still be indexed from links ([Introduction to robots.txt](https://developers.google.com/search/docs/crawling-indexing/robots/intro)).

Production, on the other hand, carries no `noindex` on pages meant for search.

**Our rule:** check both sides at every launch. A production site that goes live with the staging setting is the classic migration accident.

```bash
curl -sI https://staging.example.com/ | grep -i x-robots-tag
curl -s https://www.example.com/ | grep -io '<meta[^>]*robots[^>]*>'
```

### 2.5 Parameters do not create pages

**Where:** live URL · **Default severity:** fix soon

URLs with tracking parameters (`?utm_source=...`, `?ref=...`) either redirect to the clean URL or answer with a canonical pointing at it.

Filtered, sorted and paginated lists are either self-canonical or kept out of the sitemap. **Google says:** "Don't use the first page of a paginated sequence as the canonical page. Instead, give each page its own canonical URL" ([Pagination and incremental page loading](https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading)).

### 2.6 Languages, if there are several, point at each other

**Where:** live URL · **Default severity:** fix soon (only for sites in more than one language)

Each language version:

- is self-canonical;
- lists every version, itself included, with `hreflang`;
- has an `x-default`.

**Google says** the annotations must be reciprocal: each version lists itself and all the others ([Localized versions of your pages](https://developers.google.com/search/docs/specialty/international/localized-versions)). A site in one language needs none of this and should not emit it.

## Fixes

- **Pick the host once.** Write it in one constant and build every absolute URL from it: canonicals, sitemap, `og:url`, structured data.
- **Redirect at the edge or in the framework**, permanently, preserving the path and query. Match the host exactly, so staging and preview hosts are untouched.
- **Default to not indexable.** Production opts in with an explicit setting, so a forgotten variable fails safe ([law 10](https://github.com/loriscomba97/blueline/blob/main/laws/10-gates.md)).

Next.js example:

```ts
// next.config.ts
export default {
  trailingSlash: false,
  async redirects() {
    return [
      {
        // Bare domain to www, matched exactly, path and query preserved.
        source: '/:path*',
        has: [{ type: 'host', value: 'example.com' }],
        destination: 'https://www.example.com/:path*',
        permanent: true,
      },
    ];
  },
};
```

```ts
// lib/site.ts: the only place the host is written
export const SITE_URL = 'https://www.example.com';

export function absoluteUrl(path = '/') {
  if (path === '/' || path === '') return SITE_URL;
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${clean.replace(/\/$/, '')}`;
}
```

## Exceptions

- **Syndication.** A page republished on purpose elsewhere, such as a partner's site, can carry a canonical to your original.
- **Two hosts, both indexable.** When both the bare domain and `www` must stay public, for example during a staged migration, keep canonicals on the one you are moving to. Plan the redirects as the end state.

## Sources

Checked on 30 September 2026.

- Google Search Central: [How to specify a canonical URL](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- Google Search Central: [Redirects and Google Search](https://developers.google.com/search/docs/crawling-indexing/301-redirects)
- Google crawling documentation: [HTTP status codes](https://developers.google.com/crawling/docs/troubleshooting/http-status-codes)
- Google Search Central: [Site moves with URL changes](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes), on redirect chains
- Google Search Central: [Pagination and incremental page loading](https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading)
- Google Search Central: [Introduction to robots.txt](https://developers.google.com/search/docs/crawling-indexing/robots/intro)
- Google Search Central: [URL structure best practices](https://developers.google.com/search/docs/crawling-indexing/url-structure), on case sensitivity
- Google Search Central blog: [To slash or not to slash](https://developers.google.com/search/blog/2010/04/to-slash-or-not-to-slash), April 2010
- Google Search Central: [Block search indexing with noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing)
- Google Search Central: [Localized versions of your pages](https://developers.google.com/search/docs/specialty/international/localized-versions)
