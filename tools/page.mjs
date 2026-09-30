#!/usr/bin/env node
/**
 * page.mjs: reads one page the way a crawler does, without running JavaScript, and prints what it
 * finds as JSON: the redirect chain, the head tags, headings, links, images, scripts, structured
 * data, and "signals" that point at the law checks worth a closer look.
 *
 * Usage: node page.mjs <url> [--user-agent "..."] [--full]
 *   --full   include every link, image and script instead of the first 25 of each, and
 *            structured data blocks of any size
 *
 * A signal is a lead, not a verdict: confirm it before reporting a finding.
 */
import { analyzeHtml, aspectRatioClasses, fail, follow, GENERIC_ANCHORS, parseArgs, print, request, sameExceptSlash, toHttpUrl, USER_AGENT } from './lib.mjs';

const { positional, values } = parseArgs(process.argv.slice(2), { flags: ['full', 'help'], options: ['user-agent'] });
if (values.help || positional.length !== 1) fail('usage: node page.mjs <url> [--user-agent "..."] [--full]');

const start = toHttpUrl(positional[0]);
const { chain, final } = await follow(start, { userAgent: values['user-agent'] ?? USER_AGENT });
const limit = values.full ? Infinity : 25;
const cap = (list) => (list.length > limit ? { total: list.length, first: list.slice(0, limit) } : list);

const result = {
  requested: start.href,
  final: final.url,
  status: final.status,
  error: final.error ?? null,
  chain,
  headers: pick(final.headers, ['content-type', 'cache-control', 'cdn-cache-control', 'x-robots-tag', 'content-encoding', 'server', 'age', 'x-cache', 'x-cache-status', 'cf-cache-status', 'x-vercel-cache', 'x-nextjs-cache']),
  timeToFirstByteMs: final.ttfbMs ?? null,
  truncated: final.truncated ?? false,
};

const contentType = final.headers?.['content-type'] ?? '';
if (!final.status || final.status >= 400 || !/html/i.test(contentType)) {
  result.signals = final.error ? [signal('1.6', `the page could not be fetched: ${final.error}`)] : [];
  print(result);
  process.exit(0);
}

const page = analyzeHtml(final.body, final.url);
const pageOrigin = new URL(final.url).origin;
const signals = [];

// Law 1: the first HTML response
for (const marker of page.clientRendering) signals.push(signal('1.1', `${marker}: compare the raw HTML with the page in a browser`));
if (page.emptyAppRoot) signals.push(signal('1.1', 'an empty application root element (root, app, __next or __nuxt): the content is probably rendered by JavaScript'));
if (page.wordCount < 50 && !page.emptyAppRoot) signals.push(signal('1.1', `only ${page.wordCount} words of text in the raw HTML: a short page, or content that arrives with JavaScript`));
if (page.titles.length !== 1) signals.push(signal('1.2', `${page.titles.length} <title> elements in the head`));
if (page.descriptions.length !== 1) signals.push(signal('1.2', `${page.descriptions.length} meta descriptions`));
if (page.canonicals.length !== 1) signals.push(signal('1.2', `${page.canonicals.length} canonical link elements`));
if (page.canonicals.length && page.canonicalsInHead === 0) signals.push(signal('1.2', 'the canonical link is outside <head>'));
const jsOnly = page.anchors.filter((a) => a.jsOnly);
if (jsOnly.length) signals.push(signal('1.4', `${jsOnly.length} links without a real URL (href="#", javascript: or onclick only)`));
const brokenJsonld = page.jsonld.filter((j) => !j.ok);
if (brokenJsonld.length) signals.push(signal('1.5', `${brokenJsonld.length} JSON-LD blocks do not parse: ${brokenJsonld.map((j) => j.error).join('; ')}`));

// Law 2: one URL
if (chain.length > 2) signals.push(signal('2.1', `reaching the page took ${chain.length - 1} redirects`));
const temporary = chain.filter((c) => c.status === 302 || c.status === 307);
if (temporary.length) signals.push(signal('2.1', `temporary redirects in the chain: ${temporary.map((c) => `${c.status} ${c.url}`).join(', ')}`));
if (page.canonicals.length === 1) {
  const href = page.canonicals[0];
  if (!/^https?:\/\//i.test(href)) signals.push(signal('2.2', `the canonical is relative: ${href}`));
  else if (href !== final.url) {
    const how = sameExceptSlash(href, final.url) ? 'differs only by a trailing slash' : new URL(href).host !== new URL(final.url).host ? 'points at another host' : 'points at another URL';
    signals.push(signal('2.2', `the canonical ${how}: ${href} (page: ${final.url})`));
  }
}
if (page.og['og:url'] && page.canonicals[0] && page.og['og:url'] !== page.canonicals[0]) {
  signals.push(signal('2.3', `og:url ${page.og['og:url']} differs from the canonical ${page.canonicals[0]}`));
}

// Law 5: nothing unfinished
if (page.placeholders.length) signals.push(signal('5.3', `placeholder text in the page: ${page.placeholders.join(', ')}`));

// Law 6: one question
const title = page.titles[0] ?? '';
if (title && title.length > 65) signals.push(signal('6.2', `the title is ${title.length} characters (our rule: about 60)`));
const h1s = page.headings.filter((h) => h.level === 1);
if (h1s.length !== 1) signals.push(signal('6.3', `${h1s.length} H1 headings`));
const description = page.descriptions[0] ?? '';
if (!description) signals.push(signal('6.4', 'no meta description'));
else if (description.length > 170) signals.push(signal('6.4', `the description is ${description.length} characters (our rule: about 150)`));
const skips = [];
for (let i = 1; i < page.headings.length; i++) {
  if (page.headings[i].level > page.headings[i - 1].level + 1) skips.push(`h${page.headings[i - 1].level} to h${page.headings[i].level} at "${page.headings[i].text.slice(0, 50)}"`);
}
if (skips.length) signals.push(signal('6.5', `heading levels skipped: ${skips.slice(0, 5).join('; ')}`));

// Law 7: anchors
const generic = page.anchors.filter((a) => a.internal && GENERIC_ANCHORS.has(a.text.toLowerCase()));
if (generic.length) signals.push(signal('7.2', `${generic.length} internal links with generic anchor text: ${[...new Set(generic.map((a) => `"${a.text}"`))].join(', ')}`));
const long = page.anchors.filter((a) => a.internal && a.text.split(/\s+/).length > 12);
if (long.length) signals.push(signal('7.2', `${long.length} internal links have anchors longer than 12 words, often a link wrapped around a whole card: "${long[0].text.slice(0, 70)}..."`));

// Law 8: the page first
const blocking = page.scripts.filter((s) => s.inHead && s.src && s.origin !== pageOrigin && !s.async && !s.defer && !s.module);
if (blocking.length) signals.push(signal('8.2', `render-blocking scripts from other origins in <head>: ${blocking.map((s) => s.src).join(', ')}`));
const foreignCss = page.stylesheets.filter((s) => s.origin && s.origin !== pageOrigin);
if (foreignCss.length) signals.push(signal('8.2', `stylesheets from other origins: ${foreignCss.map((s) => s.href).join(', ')}`));
const fontOrigins = [...page.stylesheets.map((s) => s.href), ...page.preconnects].filter((h) => /fonts\.googleapis\.com|fonts\.gstatic\.com|use\.typekit\.net|fonts\.bunny\.net/i.test(h ?? ''));
if (fontOrigins.length) signals.push(signal('8.5', `fonts from another origin: ${[...new Set(fontOrigins)].join(', ')}`));
const firstImage = page.images[0];
if (firstImage?.loading === 'lazy') signals.push(signal('8.6', `the first image in the page is lazy-loaded: ${firstImage.src} (check whether it is visible on load)`));
const priority = page.images.filter((i) => (i.fetchpriority ?? '').toLowerCase() === 'high');
if (priority.length > 2) signals.push(signal('8.6', `${priority.length} images carry fetchpriority="high"`));
if (final.ttfbMs > 1000) signals.push(signal('8.9', `first byte after ${final.ttfbMs} ms from here (our rule: investigate above 1 s)`));

// Law 9: media
const noDimensions = page.images.filter((i) => !i.width || !i.height);
if (noDimensions.length) {
  const sizedClasses = await cssAspectRatioClasses(page, pageOrigin);
  const unsized = noDimensions.filter((i) => !/aspect-ratio/i.test(i.style) && ![...i.class.split(/\s+/), ...i.context].some((c) => sizedClasses.has(c)));
  if (unsized.length) {
    signals.push(signal('9.3', `${unsized.length} of ${page.images.length} images have no width and height, and no aspect-ratio rule was found for their classes: ${unsized.slice(0, 3).map((i) => i.src).join(', ')}`));
  }
  result.cssAspectRatioClasses = [...sizedClasses].slice(0, 20);
}
const iframesNoSize = page.iframes.filter((f) => !f.width || !f.height);
if (iframesNoSize.length) signals.push(signal('9.3', `${iframesNoSize.length} iframes have no width and height attributes`));
const noAlt = page.images.filter((i) => i.alt === null);
if (noAlt.length) signals.push(signal('9.5', `${noAlt.length} images have no alt attribute`));
if (page.expiringUrls.length) signals.push(signal('9.7', `links that expire: ${page.expiringUrls.slice(0, 5).join(', ')}`));
const heavyVideos = page.videos.filter((v) => v.preload !== 'none' && v.preload !== 'metadata');
if (heavyVideos.length) signals.push(signal('9.8', `${heavyVideos.length} videos without preload="none" or "metadata"`));
const noPoster = page.videos.filter((v) => !v.poster);
if (noPoster.length) signals.push(signal('9.8', `${noPoster.length} videos without a poster image`));
const eagerEmbeds = page.iframes.filter((f) => /youtube|vimeo/i.test(f.src ?? '') && f.loading !== 'lazy');
if (eagerEmbeds.length) signals.push(signal('9.8', `${eagerEmbeds.length} video embeds load eagerly`));
const ogImage = page.og['og:image'];
if (!ogImage) signals.push(signal('9.9', 'no og:image'));
else if (!/^https?:\/\//i.test(ogImage)) signals.push(signal('9.9', `og:image is not an absolute URL: ${ogImage}`));

// Law 10: indexing
const noindex = [...page.robots, final.headers['x-robots-tag'] ?? ''].some((v) => /noindex/i.test(v));
if (noindex) signals.push(signal('10.1', 'this URL carries noindex: right for staging, a blocker on a production page meant for search'));
if (page.metaRefresh) signals.push(signal('2.1', `meta refresh: ${page.metaRefresh}`));

result.page = {
  lang: page.lang,
  title,
  titles: page.titles,
  description,
  descriptions: page.descriptions,
  canonicals: page.canonicals,
  robots: page.robots,
  og: page.og,
  twitter: page.twitter,
  hreflang: page.hreflang,
  wordCount: page.wordCount,
  headings: cap(page.headings),
  links: {
    internal: page.anchors.filter((a) => a.internal).length,
    external: page.anchors.filter((a) => a.url && !a.internal).length,
    list: cap(page.anchors.filter((a) => a.url).map((a) => ({ url: a.url, text: a.text.slice(0, 80), internal: a.internal }))),
  },
  images: cap(page.images),
  videos: page.videos,
  iframes: page.iframes,
  scripts: cap(page.scripts),
  stylesheets: page.stylesheets,
  preloads: page.preloads,
  preconnects: page.preconnects,
  structuredData: page.jsonld.map((j) => {
    if (!j.ok) return j;
    const json = JSON.stringify(j.data);
    return values.full || json.length <= 8000 ? { ok: true, types: j.types, data: j.data } : { ok: true, types: j.types, preview: `${json.slice(0, 8000)}...`, note: 'run with --full for the whole block' };
  }),
};
result.signals = signals;
print(result);

/** Classes that get an aspect-ratio from the page's inline CSS or from up to three of its own stylesheets. */
async function cssAspectRatioClasses(page, origin) {
  const classes = aspectRatioClasses(page.inlineCss);
  for (const sheet of page.stylesheets.filter((s) => s.origin === origin).slice(0, 3)) {
    const res = await request(sheet.href);
    if (res.status === 200) for (const c of aspectRatioClasses(res.body)) classes.add(c);
  }
  return classes;
}

function signal(check, message) {
  return { check, message };
}

function pick(object = {}, keys) {
  return Object.fromEntries(keys.filter((k) => k in object).map((k) => [k, object[k]]));
}
