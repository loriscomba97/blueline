<!-- Generated from laws/01-first-html.md by scripts/build.mjs. Edit the source, not this copy. -->

# Law 1. Everything that matters is in the first HTML response

**The law.** Every indexable page is complete in the HTML your server sends, before any JavaScript runs:

- the title, the meta description, the canonical and the robots directives;
- the H1 and the body copy;
- the links;
- the images with their alt text;
- the structured data.

A browser runs your JavaScript and shows the finished page. Crawlers are less patient.

- Google renders JavaScript, but in a later pass, and some signals are read before rendering happens.
- Many other crawlers, including most AI crawlers, read the HTML as it arrives and do not run scripts at all.

What is missing from the first response may be seen late, seen wrong, or not seen.

## Why it matters

- **Google renders later, and reads some signals first.** Google says pages wait in a rendering queue, and the wait "can take longer" than a few seconds ([JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)):
  - **Google update, 15 December 2025:** a `noindex` in the original HTML may make Google skip rendering and JavaScript altogether.
  - **Google update, 17 December 2025:** JavaScript should not change the canonical to something other than the one in the original HTML.
- **Server-side rendering helps everyone.** Google says server-side rendering or pre-rendering is "a great idea": it makes pages faster for people and crawlers, and not every bot can run JavaScript ([Dynamic rendering as a workaround](https://developers.google.com/search/docs/crawling-indexing/javascript/dynamic-rendering)).
- **Google follows real links.** Google says it can generally crawl a link only when it is an `<a>` element with an `href` ([Make your links crawlable](https://developers.google.com/search/docs/crawling-indexing/links-crawlable)).
- **Other readers need the HTML even more.**
  - **Study (Vercel and MERJ, December 2024):** only Google's and Apple's crawlers executed JavaScript. The other AI crawlers it measured did not, although some downloaded the script files (details in [ai-crawlers.md](ai-crawlers.md)).
  - Social networks and chat apps build link previews from the [Open Graph](https://ogp.me/) tags they find in the HTML.
- **People benefit too.** Text in the HTML can paint before any script has downloaded.

**Google update, 4 March 2026:** Google says loading content with JavaScript does not, by itself, make a page harder for Google Search. This law is about three other things: the signals Google reads before rendering, the readers that never render, and speed.

## Checks

Fetch the page the way a crawler does, without running JavaScript, and keep the file:

```bash
curl -sL -A "Mozilla/5.0 (compatible; blueline)" https://example.com/page -o page.html
```

### 1.1 The main content is in the raw HTML

**Where:** live URL · **Default severity:** blocker

1. Look for the H1, the first paragraph of copy and the main navigation links in `page.html`.
2. Compare with the page in a browser.
3. Report each heading, paragraph or link that the browser shows and `page.html` lacks.

**Evidence:** the missing text, and a command that shows it absent. For example, `grep -c "Plan your week in minutes" page.html` returns `0`.

Usual causes:

- content fetched in the browser (a `useEffect`, a client-side API call);
- an empty `<div id="root">` filled by scripts;
- a page component rendered only on the client.

**Without a browser**, the comparison cannot be made. Look for the signs instead:
- an empty application root;
- a framework's bail-out marker, such as Next.js's `BAILOUT_TO_CLIENT_SIDE_RENDERING`;
- text that appears only inside a JSON payload in a `<script>`.

Then mark the comparison itself as not verified.

### 1.2 Head tags are in the raw HTML, once

**Where:** live URL · **Default severity:** blocker

`<head>` in `page.html` contains exactly one each of:

- `<title>`;
- `<meta name="description">`;
- `<link rel="canonical">`.

It also contains the robots meta tag, if you use one, and the Open Graph tags.

Report every tag that is missing or duplicated, or that appears only after JavaScript runs.

- **A canonical or robots value that a script changes after load** is a blocker: the raw value is the one crawlers may keep.
- **A canonical that exists only after scripts run** is fix soon. Google tolerates it but does not recommend it, and crawlers that do not run scripts never see it.

### 1.3 Nothing important waits for a click

**Where:** live URL · **Default severity:** fix soon

Tabs, accordions, "read more" and "load more" are fine when their content is already in the HTML and only hidden with CSS or `<details>`.

Report content that is fetched or mounted only when the visitor clicks, for example:

- FAQ answers;
- feature descriptions;
- pricing details;
- the second page of a list that has no crawlable link.

### 1.4 Links are links

**Where:** live URL, code · **Default severity:** fix soon

Every navigation, pagination and in-text link is an `<a href="...">` with a real URL. Crawlers follow `href`, not click handlers.

Report elements that navigate only with JavaScript:

- `onclick` handlers;
- `<div>` or `<button>` routers;
- `href="#"` or `javascript:` placeholders.

### 1.5 Structured data is in the raw HTML

**Where:** live URL · **Default severity:** fix soon

JSON-LD blocks (`<script type="application/ld+json">`) are present in `page.html` and parse as JSON.

Report structured data that only a tag manager or a client script injects, and any block that fails to parse. What the structured data must say is [law 4](https://github.com/loriscomba97/blueline/blob/main/laws/04-one-source.md).

### 1.6 Crawlers can fetch the page and what it needs

**Where:** live URL · **Default severity:** blocker for search engines, fix soon for AI crawlers

- `robots.txt` does not block the CSS and JavaScript files the page needs to render.
- The CDN or firewall does not turn away the crawlers you want. Fetch the page with a crawler's user agent from [ai-crawlers.md](ai-crawlers.md). A `403`, a challenge page or a CAPTCHA is a signal that the crawler is blocked, whatever `robots.txt` says.

The vendors' pages, linked from [ai-crawlers.md](ai-crawlers.md), give each crawler's full user-agent string; the token alone is not one. Many CDNs verify crawlers by IP address, so a request that only borrows the user agent can be treated differently from the real crawler. Treat the result as a lead, and confirm it in the CDN's bot settings or in the server logs.

Blocking a crawler is a valid choice. Blocking one by accident is the finding.

### 1.7 The AI crawler policy is a decision, written down

**Where:** live URL · **Default severity:** polish

**Our rule:** `robots.txt` states your intent for AI crawlers, as two separate decisions.

- **Assistants that fetch a page to answer a question and cite it** (search and user-triggered agents): allow them if you want to appear in AI answers.
- **Crawlers that collect training data**: decide about them separately.

The `User-agent: *` rule already covers crawlers you do not name. Naming them turns the decision into a record, so nobody reverses it by accident.

`robots.txt` is not the only control, and not always the strongest:
- the vendors say that agents fetching a page because a user asked may ignore it;
- **Google update, 31 August 2026:** a separate setting in Search Console now lets any site leave AI Overviews and AI Mode.

The crawlers, what each one does and the other controls are in [ai-crawlers.md](ai-crawlers.md).

### 1.8 An llms.txt, if you publish one, is generated

**Where:** live URL · **Default severity:** polish

`/llms.txt` is a proposed format: a Markdown index of the pages that matter.

- **Google update, 15 June 2026:** Google says Search ignores the file. Publishing one "will neither harm nor help" a site in Google Search ([Optimizing your website for generative AI features](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)).
- **Google says** its AI features need no special files or markup ([AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)).
- **No AI company says** that its crawlers or answers read the file, as of 30 September 2026.

**Our rule:** if you publish one anyway, generate it from the same list that builds your sitemap, so the two cannot drift. Do not maintain it by hand. Not having one is not a finding.

## Fixes

- **Render on the server.** Render marketing pages at build time or on the server: static generation, server-side rendering or incremental regeneration. Keep client-side rendering for logged-in areas and interactive tools.
- **Fetch on the server.** Fetch content on the server and pass it to interactive components as props.
- **Set metadata on the server.** Set title, description, canonical and robots through the framework's server-side metadata, never through a client-side head manager.
- **Keep FAQ answers in the HTML.** Put them in the markup and let `<details>` open and close them:

  ```html
  <details>
    <summary>Can I cancel at any time?</summary>
    <p>Yes. Cancel from the billing page and your plan stays active until the end of the period.</p>
  </details>
  ```

- **Use real links.** Replace JavaScript-only navigation with `<a href>`. Framework link components already render one.

In the Next.js App Router, pages are server components unless they opt out. Keep them that way, and read the data where the page renders:

```tsx
// app/pricing/page.tsx: a server component, so the plans are in the HTML
import { PLANS } from '@/lib/pricing';

export const metadata = {
  title: 'Pricing for teams and freelancers | Example',
  description: 'Monthly and yearly plans, with the same features on both.',
  alternates: { canonical: '/pricing' },
};

export default function PricingPage() {
  return (
    <main>
      <h1>Pricing for teams and freelancers</h1>
      {PLANS.map((plan) => (
        <section key={plan.id}>
          <h2>{plan.name}</h2>
          <p>{plan.priceLabel}</p>
        </section>
      ))}
    </main>
  );
}
```

## Exceptions

- **Private areas.** Logged-in areas, dashboards and checkout flows can render on the client. Keep them out of the index ([law 10](https://github.com/loriscomba97/blueline/blob/main/laws/10-gates.md)).
- **Interactive tools.** A calculator or a configurator can be a client component, as long as the page around it is in the HTML: the H1, the explanation, the FAQ and the links.
- **Personal details.** A greeting or a cart count can load later. They are not content a crawler needs.

## Sources

Checked on 30 September 2026.

- Google Search Central: [Understand JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- Google Search Central: [Dynamic rendering as a workaround](https://developers.google.com/search/docs/crawling-indexing/javascript/dynamic-rendering)
- Google Search Central: [Make your links crawlable](https://developers.google.com/search/docs/crawling-indexing/links-crawlable)
- Google Search Central: [Introduction to robots.txt](https://developers.google.com/search/docs/crawling-indexing/robots/intro)
- Google Search Central: [AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)
- Google Search Central: [Optimizing your website for generative AI features on Google Search](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
- Vercel and MERJ: [The rise of the AI crawler](https://vercel.com/blog/the-rise-of-the-ai-crawler), December 2024 (third-party study)
- [llmstxt.org](https://llmstxt.org/), the llms.txt proposal
- The vendors' own crawler documentation, listed in [ai-crawlers.md](ai-crawlers.md)
