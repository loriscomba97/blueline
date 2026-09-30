<!-- Generated from laws/10-gates.md by scripts/build.mjs. Edit the source, not this copy. -->

# Law 10. Nothing ships without a gate

**The law.** A gate stops the mistakes that cost traffic or trust, so memory does not have to:

- **Build checks.** The build fails on empty content, placeholders, broken internal links and malformed slugs.
- **Fact-check.** Content goes live only after its claims have been checked.
- **Launch check.** A launch or a migration goes live only after two people have checked it.
- **Parity first.** A migration first reproduces the old site exactly, and only then improves it.

## Why it matters

- **The most expensive mistakes take one line and are silent** (our experience). A `noindex` left over from staging, a `Disallow: /` in `robots.txt`, an expired CMS token that ships an empty blog. None of them breaks the build unless you make it.
- **`robots.txt` does not remove pages from search.** **Google says** a page blocked by `robots.txt` can still be indexed from links, and that `noindex` works only when crawlers are allowed to fetch the page ([Block search indexing with noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing)). Getting indexing right takes an explicit, tested setting.
- **Migrations fail on parity.** **Google says**, in its guide to site moves ([Site moves with URL changes](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes)):
  - map every old URL;
  - redirect permanently, without chains;
  - update internal links and sitemaps;
  - keep the redirects "generally at least 1 year";
  - watch Search Console closely after the move.
- **People forget; checks do not** (our rule). A checklist that runs in the build is applied every time, by everyone.

## Checks

### 10.1 Production is indexable, and nothing else is

**Where:** live URL, code · **Default severity:** blocker

- **On production:** no `noindex` in the robots meta tag or the `X-Robots-Tag` header of pages meant for search, and no `Disallow: /` in `robots.txt`.
- **On staging and preview hosts:** the opposite, `noindex` on everything, plus a password where possible.

**Our rule:** in the code, indexing is an explicit setting that defaults to off. Only the production build turns it on, so a missing variable fails safe. Keep analytics behind a separate setting: indexing and tracking are different decisions.

```ts
// lib/site.ts: not indexable unless the production build says so
export const IS_INDEXABLE = process.env.SITE_INDEXABLE === 'true';
```

**Our rule, from Google's guidance:** to keep a site out of search, do one of two things:
- serve `noindex` on pages that crawlers may fetch;
- put the site behind a password.

`Disallow: /` alone does not keep URLs out of the index. Next to a `noindex`, it also hides the `noindex` from crawlers, so the combination is wrong whatever the intent.

### 10.2 robots.txt is deliberate

**Where:** live URL · **Default severity:** blocker when it blocks the site; fix soon otherwise

`/robots.txt`:

- answers `200`;
- allows crawling of the pages you want found;
- does not block CSS or JavaScript;
- ends with the `Sitemap:` line pointing at the absolute sitemap URL.

**Google says** not to block the resources Google needs to render the page, such as CSS and JavaScript ([Understand JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)).

**Google says** the status of `robots.txt` itself matters ([How Google interprets the robots.txt specification](https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec)):
- a `404` or other `4xx` (except `429`) counts as "no robots.txt": everything may be crawled;
- a `5xx` stops Google from crawling the site for the first 12 hours, then Google uses the last good version for up to 30 days;
- content after the first 500 KiB of the file is ignored.

A `robots.txt` that answers server errors is a blocker.

**Our rule:** when migrating, the file reproduces the old file's intentional rules exactly and adds no new blocks. The policy for AI crawlers is written down ([law 1](01-first-html.md), check 1.7).

### 10.3 The build refuses broken content

**Where:** code · **Default severity:** fix soon (list the missing guards)

**Our rule:** a pre-build script fails the production build when any of these happens:

- the CMS token is set but zero published items come back (usually an expired or rotated token);
- a slug is malformed or duplicated;
- an author is missing from the author registry;
- an image lacks alt text, or its AI-generated declaration ([law 5](05-checkable-claims.md));
- content points at an expiring file URL ([law 9](09-media-once.md));
- published content contains a placeholder (`[TODO`, `[TK]`, `[FACT-CHECK`);
- an internal link points at a route that does not exist.

Report which of these guards exist and which are missing. In our experience, each takes 10 to 20 lines of code.

### 10.4 Outages fail soft; empty builds fail loud

**Where:** code · **Default severity:** fix soon

- **At request time:** when the CMS is down, pages render an honest empty state, never a `500`.
- **At build time:** a production build that finds no content where content is expected stops, instead of shipping an empty blog and an empty sitemap.

Report each missing half.

### 10.5 One switch publishes, and drafts never leak

**Where:** code, live URL · **Default severity:** blocker when drafts are public

Editorial content goes live through one explicit switch that editors control, such as a "Published" checkbox. The server filters on it when querying.

Unpublished items never appear in:

- the site's pages;
- the sitemap and the feeds;
- search results or `llms.txt`;
- guessable URLs.

A preview mode, if there is one, needs a secret.

Report drafts reachable by URL, and lists that filter published items only in the browser.

### 10.6 Claims are checked before content publishes

**Where:** content · **Default severity:** blocker for open claims

Every claim in a draft about products, prices, dates, integrations, people or competitors is confirmed by someone who can confirm it. Nothing publishes with an open flag. See [law 5](05-checkable-claims.md), check 5.9.

### 10.7 Tracking works, only where it should

**Where:** live URL, code · **Default severity:** fix soon

- **Only in production.** Analytics runs in production only, never on staging, previews or localhost.
- **Every page view counts.** Page views fire on client-side navigations, not only on the first load.
- **Conversions reach the backend.** Conversions come from the server or the payment provider's webhook where possible, not from a thank-you page alone.
- **Consent comes first.** Where the law requires it, consent defaults to denied before any tag fires.

After every change to tracking, check conversions in the vendor's debug view.

### 10.8 The launch gate: two people, five minutes

**Where:** live URL · **Default severity:** blocker

**Our rule:** at every launch, and after every migration cutover, two people check together:

1. Production is indexable (10.1).
2. `robots.txt` is open and lists the sitemap (10.2).
3. The sitemap is live and lists only live pages ([law 3](03-no-dead-urls.md)).
4. Canonicals are self-referencing, on the production host ([law 2](02-one-url.md)).
5. The bare domain and `www`, and the trailing-slash variants, redirect as intended.
6. A missing URL answers `404`.
7. Tracking fires, and a test conversion is recorded.
8. HTTPS is valid on every host.

Record who checked, and when.

### 10.9 A migration keeps what worked

**Where:** live URL, with the old site and its data · **Default severity:** blocker

**Before the cutover** (our rules, built on Google's site-move guide):

1. Build the full URL inventory from three sources: the old sitemap, a Search Console export of the last 16 months, and a crawl. Every URL returns `200` at the same path or has a documented permanent redirect ([law 3](03-no-dead-urls.md), check 3.6).
2. Reproduce first, improve later. Reproduce these per URL:
   - titles, descriptions and H1s;
   - canonicals, structured data and internal links.
3. Run a crawl diff of the new site against the old one. Compare status, title, description, H1, canonical and word count.
4. Record a performance baseline of the old site, so the new one can be compared.

**After the cutover:**

1. Run the launch gate (10.8).
2. Resubmit the sitemap. **Google says** to use Search Console's Change of Address tool when the domain changed.
3. Keep the old site recoverable for 30 days (our rule). **Google says** to keep the redirects "generally at least 1 year".
4. For 14 days, watch Search Console daily: coverage, crawl errors, spikes in 404s, impressions (our rule).

A prolonged drop means a parity item was missed. Recheck URLs, canonicals and robots before anything else.

**When only the hosting changes** and every URL stays the same, **Google says** ([Changing your web hosting](https://developers.google.com/search/docs/crawling-indexing/site-move-no-url-changes)):

- lower the DNS time-to-live about a week before the switch;
- make sure the new host's firewall or bot protection does not block search engine crawlers;
- keep the Search Console verification working on the new host;
- watch the logs on both servers, and shut the old one down once its traffic reaches zero.

### 10.10 Every change passes the laws before it merges

**Where:** code · **Default severity:** polish

- The build guards (10.3) run in continuous integration on every pull request.
- The review checks the diff against these laws. Typical findings:
  - a third-party script added to the layout;
  - a page turned into a client component;
  - a URL changed without a redirect;
  - a price typed into a component.

## Fixes

- **Write the guards once**, as a pre-build script with no dependencies, and let them fail loudly with the file and the reason.
- **Keep indexing, analytics and live integrations behind separate settings.** Each defaults to the safe value, and each is combined with a check that its configuration exists.
- **Never flip promotional or launch settings automatically on a date.** A person decides, and the change is one line to roll back.
- **Keep the launch gate and the migration inventory as documents**, with names and dates, next to the code.

```js
// scripts/check-content.mjs: runs before every production build
const posts = await getPublishedPosts();
const problems = [];
if (process.env.CMS_TOKEN && posts.length === 0) problems.push('no published posts: is the CMS token valid?');
const seen = new Set();
for (const p of posts) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug)) problems.push(`${p.slug}: malformed slug`);
  if (seen.has(p.slug)) problems.push(`${p.slug}: duplicate slug`);
  seen.add(p.slug);
  if (/\[(TODO|TK|FACT-CHECK)/i.test(p.body)) problems.push(`${p.slug}: placeholder in the body`);
}
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
```

## Exceptions

- **Local development and preview builds** run the same guards as warnings instead of failures, so work in progress can be shared.
- **A deliberate change** that a guard blocks is fixed in the guard: adjust it and write down why. Never bypass it silently.

## Sources

Checked on 30 September 2026.

- Google Search Central: [Block search indexing with noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing)
- Google Search Central: [Introduction to robots.txt](https://developers.google.com/search/docs/crawling-indexing/robots/intro)
- Google crawling documentation: [How Google interprets the robots.txt specification](https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec)
- Google Search Central: [Site moves with URL changes](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes)
- Google Search Central: [Changing your web hosting](https://developers.google.com/search/docs/crawling-indexing/site-move-no-url-changes), for moves without URL changes
