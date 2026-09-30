# Law 8. Your page loads first; everything else waits

**The law.** A visitor's browser renders your page before anything else: your HTML, your CSS, your fonts, your main image. Everything else waits:

- **Your JavaScript** runs only where a component needs it.
- **Scripts from other companies** load after the first interaction or when the browser is idle: tag managers, chat widgets, pixels, embeds.
- **Nothing moves** once it is on screen.

## Why it matters

- **Core Web Vitals measure exactly this.** Google treats a page as good when, at the 75th percentile of real visits, measured separately on mobile and desktop, all three hold:
  - Largest Contentful Paint is 2.5 seconds or less;
  - Interaction to Next Paint is 200 milliseconds or less;
  - Cumulative Layout Shift is 0.1 or less.
- **Speed counts, but does not win on its own.** Google says Core Web Vitals are used by its ranking systems, and also that a good page experience alone does not guarantee a top ranking. Speed is the floor, not the ceiling.
- **Third-party scripts are the most common cause of slow marketing pages.** Each one brings its own downloads, its own main-thread work and often its own layout shifts, on code you do not control.
- **Each dependency is paid by every visitor**, on every page. A library that saves the developer an afternoon costs visitors kilobytes forever.

## Checks

### 8.1 Real-user numbers, measured, not guessed

**Where:** live URL · **Default severity:** fix soon when a metric is poor; blocker when the page is unusable on mobile

When field data exists, report LCP, INP and CLS at the 75th percentile for the page and the origin, with the date of the data. Field data is the Chrome UX Report, available through PageSpeed Insights or its API.

```bash
curl -s "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://www.example.com/&strategy=mobile" \
  | node -e 'let s="";process.stdin.on("data",(d)=>(s+=d)).on("end",()=>{const m=JSON.parse(s).loadingExperience?.metrics??{};for(const[k,v]of Object.entries(m))console.log(k,v.percentile,v.category)})'
```

The API reports CLS multiplied by 100: a percentile of `5` means a CLS of 0.05. When there is no field data (small sites often have none), say so. A lab run (Lighthouse) is useful for finding causes, but it is not what visitors experience. Label it as lab data. Never estimate a score.

### 8.2 Nothing from another origin blocks the first render

**Where:** live URL · **Default severity:** fix soon

In the raw HTML `<head>`, report:

- every `<script src>` from another origin without `async` or `defer`: tag managers, A/B testing, chat, consent, fonts;
- stylesheets from another origin, such as a hosted font stylesheet;
- a tag manager that loads immediately rather than after interaction or when idle.

```bash
grep -oiE '<script[^>]+src="https?://[^"]+"[^>]*>' page.html
```

### 8.3 JavaScript is opt-in

**Where:** code, live URL · **Default severity:** fix soon

- Pages and layouts render on the server.
- Interactivity lives in small leaf components.

Report:

- a client boundary at the page or layout level (in React frameworks, a `'use client'` file high in the tree that pulls the header, footer or whole page into the bundle);
- scroll listeners that run code on every frame;
- animation libraries used for effects CSS can do.

When possible, report the JavaScript weight of the first load: the total of the scripts the page requests.

### 8.4 Every dependency pays its way

**Where:** code · **Default severity:** polish; fix soon for a large library on every page

List the production dependencies. For each large one, say what it does and whether a few lines of code would do the same:

- UI kits;
- animation, carousel and icon libraries;
- date and state libraries;
- analytics and CMS SDKs.

A marketing site rarely needs more than its framework and a handful of packages. Report libraries imported for one small feature, and packages that are installed but unused.

### 8.5 Fonts are few and never hide the text

**Where:** live URL, code · **Default severity:** fix soon for invisible text or many files; polish for fonts from another origin

Fonts should be:

- few files, in `woff2` (a variable font covers all weights);
- set to `font-display: swap`, or `optional` when speed comes first, so text shows before the font arrives;
- preloaded only for the font used above the fold.

Report text that stays invisible while fonts load, and more than three font files on first load.

Serving fonts from your own domain saves a connection to another origin, and it keeps visitors' IP addresses away from a third party. The speed gain is small in practice, so measure it before claiming one.

Report fonts loaded from another origin as polish, for the privacy reason more than for speed.

### 8.6 The main image arrives first

**Where:** live URL · **Default severity:** fix soon

The largest element above the fold, usually a hero image, meets three conditions:

- it is not lazy-loaded;
- it carries `fetchpriority="high"`, a hint worth giving to one or two images at most;
- it is discoverable in the HTML, or preloaded when it is set from CSS.

Report a lazy-loaded hero, and a hero that depends on JavaScript to appear.

### 8.7 Nothing shifts

**Where:** live URL · **Default severity:** fix soon

Report:

- images, video and iframes without `width` and `height` (or an `aspect-ratio`);
- embeds with no reserved space;
- banners or bars inserted above the content after load;
- skeletons that change size when data arrives.

### 8.8 Motion is cheap and optional

**Where:** code · **Default severity:** polish

- Animations use `transform` and `opacity`.
- Scroll effects use CSS scroll-driven animations or an `IntersectionObserver`, never a `scroll` listener that measures elements on every frame.
- `prefers-reduced-motion` turns motion off and shows the final state. Content that starts hidden for an animation must still become visible.

### 8.9 HTML is cached close to the visitor

**Where:** live URL · **Default severity:** fix soon when time to first byte is slow

Measure the time to first byte:

```bash
curl -s -o /dev/null -w "%{time_starttransfer}s\n" https://www.example.com/
```

Report a slow first byte on pages that are the same for every visitor. They should be served from a CDN or a cache, with `Cache-Control` settings such as `s-maxage` and `stale-while-revalidate`, not rendered from scratch on every request.

## Fixes

- **Load the tag manager on the first interaction**, with an idle fallback, instead of in the `<head>`. Put analytics, ads and pixels inside it, so the site never hardcodes a vendor tag. Consent is then applied when tags fire, not by delaying the page.
- **Replace heavy embeds with facades:** a static preview that loads the real player on click. Load chat widgets on demand, or when the browser is idle.
- **Preconnect only to origins the page uses within the first seconds.** Browsers close a connection that stays unused for about ten seconds.
- **Self-host fonts** through the framework's font loader, or with `@font-face` and `woff2` files.
- **Keep the dependency list short enough to read on one screen**, and review every addition.

```ts
// lib/tag-manager.ts: load the tag manager after the first interaction, or after 10 s idle
export function loadTagManagerOnInteraction(src: string) {
  const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
  let done = false;
  const load = () => {
    if (done) return;
    done = true;
    events.forEach((e) => removeEventListener(e, load, { capture: true }));
    const s = document.createElement('script');
    s.async = true;
    s.src = src;
    document.head.appendChild(s);
  };
  events.forEach((e) => addEventListener(e, load, { once: true, passive: true, capture: true }));
  setTimeout(load, 10_000);
}
```

Events pushed to the data layer before the script loads are kept and replayed when it arrives, so nothing is lost.

## Exceptions

- **A consent tool** that must run before any tag can load early. Keep it small, and let it set defaults rather than block rendering.
- **A product demo that is the page's whole purpose**, such as an interactive editor, can ship the JavaScript it needs. The text around it still follows [law 1](01-first-html.md).

## Sources

Checked on 30 September 2026.

- web.dev: [Web Vitals](https://web.dev/articles/vitals)
- Google Search Central: [Understanding page experience in Google Search results](https://developers.google.com/search/docs/appearance/page-experience)
- web.dev: [Optimize Largest Contentful Paint](https://web.dev/articles/optimize-lcp)
- web.dev: [Optimize resource loading with the Fetch Priority API](https://web.dev/articles/fetch-priority)
- web.dev: [Efficiently load third-party JavaScript](https://web.dev/articles/efficiently-load-third-party-javascript)
- web.dev: [Best practices for tags and tag managers](https://web.dev/articles/tag-best-practices)
- web.dev: [Best practices for using third-party embeds](https://web.dev/articles/embed-best-practices)
- web.dev: [Best practices for fonts](https://web.dev/articles/font-best-practices)
- web.dev: [Establish network connections early](https://web.dev/articles/preconnect-and-dns-prefetch)
- web.dev: [Optimize Cumulative Layout Shift](https://web.dev/articles/optimize-cls)
