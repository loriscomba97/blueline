# Example report

This is a real review by the `blueline` skill, run in a coding agent against the test site in [`test/fixtures/broken`](../test/fixtures/broken), where problems are planted on purpose. The request was: "Can you review my marketing site and tell me what to fix first?" Only the local addresses were shortened, to `localhost:4100` for the site and `localhost:4200` for the other company's server it loads a script from. Everything else is as the agent wrote it.

---

# blueline review: http://localhost:4100/

30 September 2026 · Reviewed: http://localhost:4100/ (full review, all ten laws) · Evidence: the live local site only. There's no site source code in this repository and no field data.
Pages sampled: `/` (home, which also serves as the product page), `/pricing`, `/blog/post` (the article), `/blog/faq`, `/blog/js-only`, `/blog/orphan` (it's in the sitemap), and a made-up URL for the 404. The site has no blog listing page: `/blog` answers the "does not exist" page. No product page is separate from home. No staging host is known.
Choices made without asking: I treated the local server as production, so the https and www checks don't apply here. The crawl used the script defaults (100 pages; 7 reached). I didn't check any competitor or top search results.
Outside this review: none (full review)
Sources in the references checked on 30 September 2026

## Before anything else

### 1. The main blog guide tells search engines not to index it · Law 10, check 10.1 ([law 10](../laws/10-gates.md))

- **Severity:** Blocker
- **Evidence:** `curl -s http://localhost:4100/blog/post | grep -i robots` → `<meta name="robots" content="noindex">`. This page is the "Blog" link in the navigation, the "guide to weekly planning" link on home, and an entry in the sitemap.
- **Why it matters:** **Google says** `noindex` keeps the page out of search results ([Block search indexing with noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing)). This is the site's only article.
- **Fix:** Remove the robots meta tag from production. Put indexing behind one setting that is on only in the production build (our rule).
- **Verify:** `node scripts/page.mjs http://localhost:4100/blog/post` shows `"robots": []`.

## Verdict

| Law | Status | In one line | Findings |
|---|---|---|---|
| 1. First HTML | Broken | robots.txt blocks the CSS and JS; the planner page is empty without JavaScript | 7, 11, 17, 18, 34 |
| 2. One URL | Broken | The FAQ has two canonicals, one to a page that doesn't exist; pricing has none | 4, 5, 6 |
| 3. No dead URLs | Broken | Every made-up URL answers 200; 4 of 6 sitemap entries fail | 2, 12, 13, 14, 15, 35 |
| 4. One source | Broken | Price and trial length differ between the page and the structured data | 3, 8 |
| 5. Checkable claims | Broken | A `[TODO]` is published in the article | 9, 29 |
| 6. One question | Partly | The home title is "Home"; the article has two H1s and a 98-character title | 19, 20, 21, 22, 31 |
| 7. No orphans | Partly | One sitemap page has no inbound link; generic anchors | 16, 32 |
| 8. Page first | Partly | A third-party script blocks rendering in the article's `<head>` | 23 |
| 9. Media once | Broken | An image uses a signed URL that expires after 300 s | 10, 24, 25, 26, 27, 28, 33 |
| 10. Gates | Broken | `noindex` on the main article; no Sitemap line in robots.txt | 1, 30 |

## Blockers

### 2. Every URL that doesn't exist answers 200 · Law 3, check 3.1

- **Severity:** Blocker
- **Evidence:** `node scripts/not-found.mjs … --from-sitemap` → `/blueline-404-check-ldufp9an` and `/blog/blueline-404-check-addu1cty` both answer `200`. A manual check shows `HTTP/1.1 200 OK` with `<h1>This page does not exist</h1>`. `/faq` and `/blog` also serve that body with status 200.
- **Why it matters:** **Google says** a soft 404 is "a page telling the user that the page does not exist and also a 200 (success) status code", and that missing pages should return 404 or 410 ([Troubleshoot crawling errors](https://developers.google.com/search/docs/crawling-indexing/troubleshoot-crawling-errors)).
- **Fix:** Send status 404 from the catch-all route that renders "This page does not exist". `/gone` already returns a real 404, so reuse that response.
- **Verify:** `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4100/made-up-123` prints `404`.

### 3. The pricing structured data says 15 €; the page says 12 € · Law 4, check 4.1

- **Severity:** Blocker
- **Evidence:** In `/pricing`, the JSON-LD has `"offers":{"@type":"Offer","price":"15","priceCurrency":"EUR"}`, but the visible text says "The team plan costs 12 euros per person per month".
- **Why it matters:** **Google says** "Don't mark up content that is not visible to readers of the page" ([General structured data guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)). Search and AI answers can quote either price.
- **Fix:** Store the price once and build both the text and the `Offer` from that one value. Which price is correct is Open decision 2.
- **Verify:** The 4.1 signal disappears from `node scripts/page.mjs http://localhost:4100/pricing`.

### 4. The FAQ declares two canonicals, one pointing at a page that doesn't exist · Law 2, check 2.2

- **Severity:** Blocker
- **Evidence:** `/blog/faq` has `<link rel="canonical" href="http://localhost:4100/blog/faq">` and `<link rel="canonical" href="http://localhost:4100/faq">`. `/faq` serves `<h1>This page does not exist</h1>`.
- **Why it matters:** Our rule: exactly one absolute canonical, pointing at the page itself. Here the second canonical tells search engines the real page is a soft 404.
- **Fix:** Remove the second `<link rel="canonical">`.
- **Verify:** `page.mjs …/blog/faq` shows `"canonicals": ["http://localhost:4100/blog/faq"]`.

### 5. Pricing has no canonical · Law 2, check 2.2

- **Severity:** Blocker
- **Evidence:** `page.mjs …/pricing` → `"canonicals": []`. It also touches 2.5: `/pricing?utm_source=blueline` answers 200 with `"canonical": null`.
- **Why it matters:** Our rule: every page carries one self-canonical. Without one, every parameter or variant URL looks like a separate page.
- **Fix:** Add `<link rel="canonical" href="…/pricing">` to the pricing page. Better, add it in the shared layout for all pages.
- **Verify:** `node scripts/variants.mjs http://localhost:4100/pricing` reports no 2.2 or 2.5 signal.

### 6. Pricing URL variants answer 200 instead of redirecting · Law 2, check 2.1

- **Severity:** Blocker
- **Evidence:** `variants.mjs` → `/pricing/` 200 and `/Pricing` 200, neither with a canonical to `/pricing`.
- **Why it matters:** **Google says** URLs are case-sensitive, so `/Pricing` and `/pricing` are different URLs ([URL structure best practices](https://developers.google.com/search/docs/crawling-indexing/url-structure)). The same goes for trailing slashes ([To slash or not to slash](https://developers.google.com/search/blog/2010/04/to-slash-or-not-to-slash)).
- **Fix:** Add 301 redirects in the server or framework: strip the trailing slash and lowercase the path, in one hop.
- **Verify:** Rerun `variants.mjs`. Each variant should show one `301` ending at `/pricing`.

### 7. robots.txt blocks the site's CSS and JavaScript · Law 1, check 1.6

- **Severity:** Blocker
- **Evidence:** `curl -s …/robots.txt` → `User-agent: *` / `Disallow: /assets/`. The home page loads `/assets/site.css`, and the planner page loads `/assets/app.js`. It also blocks every image under `/assets/`.
- **Why it matters:** **Google says** not to block the resources Google needs to render the page, such as CSS and JavaScript ([JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)).
- **Fix:** Remove `Disallow: /assets/`. If some files there must stay private, block only those paths.
- **Verify:** `node scripts/robots.mjs http://localhost:4100` shows no 1.6 signal.

### 8. The FAQ offers a 14-day trial on the page and 30 days in the markup · Law 4, check 4.1

- **Severity:** Blocker (the default is fix soon; I raised it because a trial length is a billing term, and one of the two values is false to a buyer)
- **Evidence:** The visible text says "Yes, every plan starts with a 14-day trial, and no card is needed to start it." The FAQPage JSON-LD says `"text":"Yes, 30 days."`
- **Why it matters:** **Google says** structured data must describe what is visible ([General structured data guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)).
- **Fix:** Render the visible FAQ and the `FAQPage` from the same array. The correct value is Open decision 3.
- **Verify:** `page.mjs …/blog/faq` shows no 4.1 signal.

### 9. A `[TODO]` is published in the article · Law 5, check 5.3

- **Severity:** Blocker
- **Evidence:** `/blog/post` says "Most weekly plans fail by Wednesday [TODO: add the survey number] because nobody owns them…" (`links.mjs` → `unfinishedPages`). It also touches 5.1: the claim has no source or date.
- **Why it matters:** Our rule: nothing unfinished reaches a published page. Readers and AI answers quote the sentence as it stands.
- **Fix:** Add the survey number with its source and date, or cut the claim. Then add a build check that fails on `[TODO` (check 10.3).
- **Verify:** `curl -s …/blog/post | grep -ic '\[todo'` prints `0`.

### 10. An image points at a signed URL that expires · Law 9, check 9.7

- **Severity:** Blocker
- **Evidence:** `/blog/post` has `<img src="/assets/cover-signed.png?X-Amz-Expires=300&X-Amz-Signature=abc">`.
- **Why it matters:** Our rule: a signed link stops working after its expiry (300 s here). Everyone who visits after that sees a broken image.
- **Fix:** Re-host the file at a permanent URL. This belongs to the CMS or storage layer.
- **Verify:** `curl -s …/blog/post | grep -ciE 'x-amz-(expires|signature)'` prints `0`.

### 11. The planner page is empty before JavaScript runs · Law 1, check 1.1

- **Severity:** Blocker
- **Evidence:** `page.mjs …/blog/js-only` → `"wordCount": 0`, `"headings": []`, and the signal "an empty application root element". The only content is `/assets/app.js`, which robots.txt also blocks (see 7). It also touches 6.3: there's no H1.
- **Why it matters:** **Google says** server-side rendering or pre-rendering is "a great idea" ([Dynamic rendering](https://developers.google.com/search/docs/crawling-indexing/javascript/dynamic-rendering)). Most AI crawlers don't run scripts (Vercel and MERJ, 2024).
- **Fix:** Render the H1, the explanation and the links on the server, and keep only the interactive planner on the client.
- **Verify:** `page.mjs` shows an H1 and body copy on `/blog/js-only`.

### 12. 4 of the 6 sitemap entries fail · Law 3, check 3.3

- **Severity:** Blocker (4 of 6 entries fail)
- **Evidence:** `sitemap.mjs` shows:
  - `/old` answers `302, 301, 200`;
  - `/gone` answers `404`;
  - `/blog/post` is `noindex`;
  - `/pricing` has "no single canonical".

  All 6 entries share `lastmod` `2026-01-01T00:00:00Z`.
- **Why it matters:** **Google says** the sitemap should list canonical URLs, and that it uses `lastmod` only if it is "consistently and verifiably" accurate ([Build and submit a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)).
- **Fix:** Build the sitemap from the list of published, indexable pages. Drop `/old` and `/gone`, and set each page's real `lastmod`.
- **Verify:** `node scripts/sitemap.mjs http://localhost:4100` → `"failing": 0`.

## Fix soon

### 13. Two home page links are broken · Law 3, check 3.5
- **Severity:** Fix soon
- **Evidence:** `links.mjs` → `/gone` 404 ("checklist that moved") and `/assets/brochure.pdf` 404 ("the product brochure"), both linked from `/`.
- **Why it matters:** Our rule: internal links that answer an error waste visitors and crawl budget.
- **Fix:** Point each link at its new URL, or remove it. Add a 301 from `/gone` if the checklist moved (Open decision 5).
- **Verify:** `links.mjs` → `"broken": []`.

### 14. The article loads an image that doesn't exist · Law 3, check 3.5
- **Severity:** Fix soon
- **Evidence:** `assets.mjs …/blog/post` → `/assets/missing.png` `"status": 404`.
- **Why it matters:** Our rule: every file a page asks for must load.
- **Fix:** Restore the file or remove the `<img>`.
- **Verify:** `assets.mjs` shows no 3.5 signal.

### 15. `/old` redirects in two hops, the first one temporary · Law 3, check 3.4
- **Severity:** Fix soon
- **Evidence:** `/old` → `302` to `/old-2` → `301` to `/pricing`. The home page links to it (also check 7.3).
- **Why it matters:** **Google says** to redirect permanently, without chains ([Site moves](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes)).
- **Fix:** Make `/old` a single 301 to `/pricing`, and link to `/pricing` directly from home.
- **Verify:** `curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" …/old` → `301 …/pricing`.

### 16. `/blog/orphan` has no inbound link · Law 7, check 7.1
- **Severity:** Fix soon
- **Evidence:** `links.mjs` → `"orphans": ["…/blog/orphan"]`. It's in the sitemap, and the crawl reached every linked page.
- **Why it matters:** **Google says** "Every page you care about should have a link from at least one other page on your site" ([Make your links crawlable](https://developers.google.com/search/docs/crawling-indexing/links-crawlable)).
- **Fix:** Link it from a related page, or remove it from the sitemap if it shouldn't be public (Open decision 6).
- **Verify:** `links.mjs` → `"orphans": []`.

### 17. One of the FAQ's JSON-LD blocks doesn't parse · Law 1, check 1.5
- **Severity:** Fix soon
- **Evidence:** `<script type="application/ld+json">{ "broken": </script>` → "Unexpected end of JSON input".
- **Why it matters:** Our rule: every structured-data block in the raw HTML parses.
- **Fix:** Delete the block.
- **Verify:** `page.mjs …/blog/faq` shows only `"ok": true` blocks.

### 18. The FAQ's "Menu" link goes nowhere · Law 1, check 1.4
- **Severity:** Fix soon
- **Evidence:** `<nav><a href="/">Home</a> <a href="#">Menu</a></nav>`. The FAQ nav also lacks the Pricing and Blog links that other pages have.
- **Why it matters:** **Google says** it can generally follow only `<a>` elements with a real `href` ([Make your links crawlable](https://developers.google.com/search/docs/crawling-indexing/links-crawlable)).
- **Fix:** Use the same nav as the other pages. A menu toggle should be a `<button>`.
- **Verify:** `page.mjs …/blog/faq` shows no 1.4 signal.

### 19. The home page title is "Home" · Law 6, check 6.2
- **Severity:** Fix soon
- **Evidence:** `<title>Home</title>` on `/`, with no meta description (see 31).
- **Why it matters:** **Google says** titles should be "descriptive and concise" ([Influencing your title links](https://developers.google.com/search/docs/appearance/title-link)).
- **Fix:** For example, "Weekly planner for small teams | Example".
- **Verify:** `page.mjs /` shows the new title.

### 20. The article title is 98 characters · Law 6, check 6.2
- **Severity:** Fix soon
- **Evidence:** "The complete, definitive, step-by-step guide to planning a week for a small team in 2026 | Example"
- **Why it matters:** Our rule: about 60 characters, starting with the query.
- **Fix:** For example, "Weekly planning for small teams: a step-by-step guide | Example" (about 60 characters).
- **Verify:** `page.mjs` shows no 6.2 signal.

### 21. The article has two H1s · Law 6, check 6.3
- **Severity:** Fix soon
- **Evidence:** The article has two H1s: `h1` "Weekly planning" and `h1` "A guide for small teams".
- **Why it matters:** Our rule: one H1 that names the subject.
- **Fix:** Use one H1, "Weekly planning: a guide for small teams", and demote the other.
- **Verify:** `page.mjs` shows no 6.3 signal.

### 22. The article's headings skip a level · Law 6, check 6.5
- **Severity:** Fix soon
- **Evidence:** The heading jumps from h1 to h3 at "Why plans fail".
- **Why it matters:** Our rule: headings form an outline with no skipped levels.
- **Fix:** Make "Why plans fail" an h2.
- **Verify:** `page.mjs` shows no 6.5 signal.

### 23. A third-party script blocks the article's first render · Law 8, check 8.2
- **Severity:** Fix soon
- **Evidence:** In the article's `<head>`: `<script src="http://localhost:4200/tag.js">`, with no async or defer. The FAQ also loads `https://fonts.googleapis.com/css2?family=Inter` as a stylesheet in `<head>` (also check 8.5).
- **Why it matters:** **web.dev says** third-party JavaScript can badly hurt performance ([Efficiently load third-party JavaScript](https://web.dev/articles/efficiently-load-third-party-javascript)).
- **Fix:** Load the tag after the first interaction, or at least with `defer`. Self-host Inter as `woff2`.
- **Verify:** `page.mjs` shows no 8.2 signal on either page.

### 24. The article's hero image is 10× wider than it's shown · Law 9, check 9.1
- **Severity:** Fix soon
- **Evidence:** `hero.png` is 3000×2000, 264 KB, and displayed at `300×200` and `150×100`. It's also PNG (check 9.2, Open decision 7).
- **Why it matters:** Our rule: at most twice the display width, and about 250 KB for a content image.
- **Fix:** Export at 600 px wide, in WebP if it's a photo. Use `srcset` for the 150 px copy.
- **Verify:** `assets.mjs` shows no 9.1 signal.

### 25. `tile.png` has no width and height · Law 9, check 9.3
- **Severity:** Fix soon
- **Evidence:** `tile.png` has `"width": null, "height": null`, and its real size is 400×300.
- **Why it matters:** **web.dev says** to always set width and height, or reserve the space with `aspect-ratio` ([Optimize CLS](https://web.dev/articles/optimize-cls)).
- **Fix:** Add `width="400" height="300"`.
- **Verify:** `page.mjs` shows no 9.3 signal.

### 26. `tile.png` has no alt attribute · Law 9, check 9.5
- **Severity:** Fix soon
- **Evidence:** `tile.png` has `"alt": null`.
- **Why it matters:** Our rule: content images describe what is visible, and decorative images get `alt=""`.
- **Fix:** Add a description, or `alt=""` if the image is decorative.
- **Verify:** `page.mjs` shows no 9.5 signal.

### 27. Images are cached for 60 seconds · Law 9, check 9.6
- **Severity:** Fix soon
- **Evidence:** `assets.mjs` shows `"cacheControl": "max-age=60"` on every image under `/assets/`.
- **Why it matters:** **web.dev says** to cache versioned files for a year and change the URL to update them ([HTTP cache](https://web.dev/articles/http-cache)).
- **Fix:** Use hashed or versioned filenames, plus `Cache-Control: public, max-age=31536000, immutable`. This is set on the host or CDN.
- **Verify:** `curl -sI …/assets/hero.png | grep -i cache-control`.

### 28. The article's video downloads on load and has no poster · Law 9, check 9.8
- **Severity:** Fix soon
- **Evidence:** `<video src="/assets/clip.mp4">` has `preload: null`, `poster: null`, and no width or height.
- **Why it matters:** Our rule: video costs nothing until it plays.
- **Fix:** Add `preload="none"`, a `poster`, and `width`/`height`.
- **Verify:** `page.mjs` shows no 9.8 signal.

### 29. The AI cover image is declared in its alt text but not in its file · Law 5, check 5.8
- **Severity:** Fix soon
- **Evidence:** `cover-ai.png` has alt text "…AI-generated illustration.", but `"digitalSourceType": null` and `"c2pa": false`.
- **Why it matters:** **Google says** it extracts the IPTC digital source type ([Image metadata](https://developers.google.com/search/docs/appearance/structured-data/image-license-metadata)).
- **Fix:** `exiftool -XMP-iptcExt:DigitalSourceType="http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia" cover-ai.png`
- **Verify:** `assets.mjs` shows the digital source type on that image.

### 30. robots.txt has no Sitemap line · Law 10, check 10.2
- **Severity:** Fix soon
- **Evidence:** robots.txt contains only `User-agent: *` / `Disallow: /assets/` (`"sitemaps": []`).
- **Why it matters:** Our rule: robots.txt ends with the absolute sitemap URL.
- **Fix:** Add `Sitemap: https://<production host>/sitemap.xml`.
- **Verify:** `robots.mjs` lists the sitemap.

## Polish

### 31. Home and the article have no meta description · Law 6, check 6.4
- **Evidence:** `"descriptions": []` on `/` and `/blog/post` · **Fix:** Write one per page, about 150 characters · **Verify:** `page.mjs` shows no 6.4 signal.

### 32. Anchors are generic or too long · Law 7, check 7.2
- **Evidence:** "click here" (home to FAQ), "more" (article to pricing), and a 13-word-plus anchor "frequently asked questions about weekly planning for teams that work remotely…" · **Fix:** Use 2–8 descriptive words, such as "weekly planning FAQ" and "team plan pricing" · **Verify:** `links.mjs` shows no 7.2 signal.

### 33. Sharing images are missing or relative · Law 9, check 9.9
- **Evidence:** No `og:image` on `/`, `/pricing`, `/blog/post` or `/blog/js-only`. On `/blog/faq` it's `"/assets/og.png"`, a relative URL · **Fix:** Use an absolute image of at least 1200×630 on every page · **Verify:** `page.mjs` shows no 9.9 signal.

### 34. The AI crawler policy is only implicit · Law 1, check 1.7
- **Evidence:** `robots.mjs` reports "no AI crawler is named in robots.txt" (all 16 are allowed through `*`) · **Fix:** Name the search and user-triggered agents, and decide on training crawlers separately · **Verify:** `robots.mjs` shows named groups.

### 35. The not-found page offers one link · Law 3, check 3.2
- **Evidence:** The page is `<h1>This page does not exist</h1><p>Go back to the <a href="/">home page</a>.</p>`, with no nav or stylesheet · **Fix:** Render it inside the normal layout, with links to the main sections (after fixing 2) · **Verify:** `page.mjs` on a made-up URL shows the nav links and status 404.

## Open decisions

1. Is the `noindex` on `/blog/post` deliberate? If the post is meant to stay hidden, it shouldn't be the "Blog" nav link or a sitemap entry. (1, 12)
2. Which is the team plan price: 12 € or 15 € per person per month? (3)
3. Is the trial 14 days or 30 days? (8)
4. What is the survey figure behind "most weekly plans fail by Wednesday", and what's its source and date? (9)
5. Where did the checklist at `/gone` move? It needs a 301 there, or a deliberate 404. (13)
6. Is `/blog/orphan` meant to be public? (16)
7. Is `hero.png` a photo (so it should be WebP) or a flat graphic (so it can stay PNG)? (24)

## Not verified

| Check | Why not | What would settle it |
|---|---|---|
| 8.1 | No CrUX API key or PageSpeed result, and a localhost site has no field data | Run the check 8.1 CrUX query on the production origin with `CRUX_API_KEY` |
| 1.1 (all pages) | No browser to compare raw and rendered HTML | Open each page in a browser and compare it with `page.mjs` output |
| 8.6 / 9.4 | `tile.png` is the first image and is `loading="lazy"`, but I can't tell whether it's on the first screen | A browser at desktop and phone widths |
| 1.6 (CDN) | Localhost has no CDN or firewall | Fetch production with crawler user agents, and check the bot settings |
| 2.4 / 10.1 staging | No staging or preview hosts known | Share them, then run `page.mjs` on each home page |
| 3.6 | No list of old URLs | A Search Console export of the last 16 months |
| 6.1, 6.8–6.11 | No Search Console data or target queries | Search Console queries, and the target query for each page |
| 4.3, 8.3, 8.4, 10.3–10.5 | No site source code in this repository | Access to the site repository |
| 10.7, 10.8 | No tracking tag found (`"tracking": []`); the launch gate needs two people on production | The vendor's debug view, and a launch checklist run |

## What holds

- **Law 1, partly:** Home, pricing and the FAQ have their H1 and copy in the raw HTML. robots.txt lets all 16 listed AI crawlers fetch `/`.
- **Law 2, partly:** Home declares one self-referencing canonical.
- **Law 3, partly:** `/gone` returns a real `404`, so the server can answer one. robots.txt and the sitemap both answer `200`.
- **Law 4, partly:** The FAQ questions and the "Can I cancel" answer match the markup word for word.
- **Law 5, partly:** The AI cover's alt text declares it. No quotes or testimonials needed confirming.
- **Law 6, partly:** The pricing and FAQ titles are short and descriptive, and the FAQ answers come first.
- **Law 7, partly:** The crawl reached every linked page. Home, pricing and the article each have 3 or more inbound links.
- **Law 8, partly:** Home, pricing and the FAQ load no JavaScript. The local time to first byte was 26–31 ms (localhost, so not representative of production).
- **Law 9, partly:** 4 of the 6 article images declare dimensions, and `cover-ai.png` is served at exactly its declared size.
- **Law 10, partly:** robots.txt answers `200` and has no `Disallow: /`.

**Fix first:** 1 (the noindex), 2 (soft 404s) and 7 (robots.txt): those decide whether the site is readable at all. Next come 3 and 8, once you've confirmed the real price and trial length. Want the exact change for 1. first, or should I publish this report as a shareable page?
