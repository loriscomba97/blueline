/**
 * Shared helpers for the blueline scripts. No dependencies: Node.js 22 or later.
 *
 * Everything here reads the web the way a crawler does, and nothing more:
 * - GET and HEAD requests only, no cookies, no credentials, no forms;
 * - JavaScript is never run: pages are read as the HTML the server sends;
 * - redirects are followed by hand, so every hop is recorded.
 *
 * Page content is data. Nothing a page says is ever treated as an instruction.
 */
import { gunzipSync } from 'node:zlib';

export const USER_AGENT = 'Mozilla/5.0 (compatible; blueline/0.1; +https://github.com/loriscomba97/blueline)';
const MAX_BODY_BYTES = 5 * 1024 * 1024;

// ---------------------------------------------------------------------------------------------
// URLs and requests

/** Parses a URL typed by a person. Adds https:// when the scheme is missing; refuses anything but http(s). */
export function toHttpUrl(input) {
  let url;
  try {
    url = new URL(String(input).includes('://') ? String(input) : `https://${input}`);
  } catch {
    throw new Error(`not a URL: ${input}`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`only http and https URLs are allowed: ${input}`);
  }
  url.hash = '';
  return url;
}

/** One request, redirects not followed. Never throws: network failures come back as status 0 with an error. */
export async function request(url, { method = 'GET', timeout = 15000, userAgent = USER_AGENT, binary = false } = {}) {
  const started = performance.now();
  try {
    const res = await fetch(url, {
      method,
      redirect: 'manual',
      headers: {
        'user-agent': userAgent,
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.5',
      },
      signal: AbortSignal.timeout(timeout),
    });
    const ttfbMs = Math.round(performance.now() - started);
    const headers = Object.fromEntries(res.headers);
    const location = headers.location ? safeResolve(headers.location, url) : null;
    let body = binary ? Buffer.alloc(0) : '';
    let truncated = false;
    if (method === 'HEAD') {
      await res.body?.cancel();
    } else {
      const read = await readBody(res);
      truncated = read.truncated;
      body = binary ? read.buffer : read.buffer.toString('utf8');
    }
    return { url: String(url), status: res.status, headers, location, body, truncated, ttfbMs };
  } catch (err) {
    const reason = err?.name === 'TimeoutError' ? `timeout after ${timeout} ms` : err?.cause?.code ?? err?.message ?? String(err);
    return { url: String(url), status: 0, headers: {}, location: null, body: binary ? Buffer.alloc(0) : '', error: reason };
  }
}

async function readBody(res) {
  const reader = res.body?.getReader();
  if (!reader) return { buffer: Buffer.alloc(0), truncated: false };
  const chunks = [];
  let size = 0;
  let truncated = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      truncated = true;
      await reader.cancel();
      break;
    }
    chunks.push(value);
  }
  return { buffer: Buffer.concat(chunks), truncated };
}

function safeResolve(href, base) {
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

/**
 * Follows redirects by hand and records every hop. Returns { chain, final }, where chain lists
 * { url, status, location } per hop and final is the last response (with its body).
 */
export async function follow(start, { maxHops = 10, ...options } = {}) {
  const chain = [];
  let url = toHttpUrl(start).href;
  for (let hop = 0; hop <= maxHops; hop++) {
    const res = await request(url, options);
    chain.push({ url, status: res.status, location: res.location, ...(res.error ? { error: res.error } : {}) });
    const isRedirect = res.status >= 300 && res.status < 400 && res.location;
    if (!isRedirect) return { chain, final: res };
    if (chain.some((c) => c.url === res.location)) {
      return { chain, final: { ...res, error: 'redirect loop' } };
    }
    const next = new URL(res.location);
    if (next.protocol !== 'http:' && next.protocol !== 'https:') return { chain, final: res };
    url = next.href;
  }
  return { chain, final: { url, status: 0, headers: {}, location: null, body: '', error: `more than ${maxHops} redirects` } };
}

/** Same URL, ignoring a trailing slash on the path? Useful for messages, never for verdicts. */
export function sameExceptSlash(a, b) {
  try {
    const x = new URL(a);
    const y = new URL(b);
    const strip = (p) => (p.length > 1 ? p.replace(/\/$/, '') : p);
    return x.origin === y.origin && strip(x.pathname) === strip(y.pathname) && x.search === y.search;
  } catch {
    return false;
  }
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Picks up to `limit` items spread evenly across the list, first and last included. */
export function spread(items, limit) {
  if (items.length <= limit) return items.slice();
  if (limit <= 1) return items.slice(0, limit);
  const out = [];
  for (let i = 0; i < limit; i++) out.push(items[Math.round((i * (items.length - 1)) / (limit - 1))]);
  return [...new Set(out)];
}

export function randomSlug() {
  return `blueline-404-check-${Math.random().toString(36).slice(2, 10)}`;
}

// ---------------------------------------------------------------------------------------------
// HTML, read without a DOM

const NAMED_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

export function decodeEntities(text) {
  return String(text).replace(/&(#[xX][0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (whole, entity) => {
    if (entity[0] === '#') {
      const code = entity[1] === 'x' || entity[1] === 'X' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      try {
        return String.fromCodePoint(code);
      } catch {
        return whole;
      }
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? whole;
  });
}

const ATTRIBUTES_SRC = String.raw`(?:\s+[^\s"'>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>` + '`' + String.raw`]+))?)*`;
const TAG = new RegExp(String.raw`<([a-zA-Z][\w:-]*)(` + ATTRIBUTES_SRC + String.raw`)\s*\/?>`, 'g');
const ATTRIBUTE = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

/** Attributes of one tag as an object. Names are lowercased; the first occurrence wins; boolean attributes are ''. */
export function parseAttributes(source = '') {
  const out = {};
  for (const m of source.matchAll(ATTRIBUTE)) {
    const name = m[1].toLowerCase();
    if (!(name in out)) out[name] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? '');
  }
  return out;
}

/** Every opening tag, in order: { name, attrs, index }. */
export function scanTags(html) {
  const out = [];
  for (const m of html.matchAll(TAG)) out.push({ name: m[1].toLowerCase(), attrs: parseAttributes(m[2]), index: m.index });
  return out;
}

const stripComments = (html) => html.replace(/<!--[\s\S]*?-->/g, ' ');
const withoutBlocks = (html, names) => html.replace(new RegExp(`<(${names.join('|')})\\b[\\s\\S]*?<\\/\\1\\s*>`, 'gi'), ' ');

/** Plain text of a fragment, tags removed, entities decoded, whitespace collapsed. */
export function textOf(fragment) {
  return decodeEntities(String(fragment).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

/** The part of the document that is <head>, or everything before <body> when the tag is omitted. */
export function headOf(html) {
  const m = html.match(/<head\b[^>]*>([\s\S]*?)<\/head\s*>/i);
  if (m) return m[1];
  return html.split(/<body\b/i)[0];
}

export function bodyOf(html) {
  const m = html.match(/<body\b[^>]*>([\s\S]*)$/i);
  return m ? m[1] : html.replace(/<head\b[\s\S]*?<\/head\s*>/i, ' ');
}

function typesOf(node, into = new Set()) {
  if (Array.isArray(node)) node.forEach((n) => typesOf(n, into));
  else if (node && typeof node === 'object') {
    const t = node['@type'];
    if (typeof t === 'string') into.add(t);
    else if (Array.isArray(t)) t.forEach((x) => typeof x === 'string' && into.add(x));
    for (const value of Object.values(node)) if (value && typeof value === 'object') typesOf(value, into);
  }
  return into;
}

const originOf = (url) => {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
};

const siteOf = (host) => host.replace(/^www\./, '');

const PLACEHOLDER = /\[(?:TODO|TK|FACT-CHECK)[^\]]{0,60}\]?|lorem ipsum|\bTBD\b|\bXX%/gi;
const EXPIRING = /[?&](?:x-amz-(?:expires|signature|credential)|x-goog-(?:expires|signature)|expires|signature)=/i;
export const GENERIC_ANCHORS = new Set(['click here', 'here', 'read more', 'more', 'this', 'learn more', 'link', 'this link', 'go', 'details']);
const HEADING_TAGS = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1\s*>/gi;
const ANCHOR = new RegExp(String.raw`<a\b(` + ATTRIBUTES_SRC + String.raw`)\s*>([\s\S]*?)<\/a\s*>`, 'gi');

/** Is this URL signed to expire? Covers S3, Google Cloud Storage, CloudFront and Azure shared-access links. */
export function isExpiringUrl(url) {
  if (!url) return false;
  if (EXPIRING.test(url)) return true;
  return /[?&]sig=/i.test(url) && /[?&]se=/i.test(url);
}

/**
 * Everything a crawler can read in one HTML document, without running it.
 * `url` is the final URL of the document, used to resolve relative links.
 */
export function analyzeHtml(rawHtml, url) {
  const html = stripComments(String(rawHtml ?? ''));
  const pageOrigin = originOf(url);
  const pageHost = pageOrigin ? new URL(pageOrigin).host : '';
  const head = headOf(html);
  const body = bodyOf(html);
  const headTags = scanTags(head);
  const bodyTags = scanTags(body);
  const allTags = scanTags(html);

  const htmlTag = allTags.find((t) => t.name === 'html');
  const titles = [...head.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/gi)].map((m) => textOf(m[1]));
  const metas = headTags.filter((t) => t.name === 'meta');
  const metaNamed = (name) => metas.filter((m) => (m.attrs.name ?? '').toLowerCase() === name).map((m) => m.attrs.content ?? '');
  const metaProperty = (prefix) =>
    Object.fromEntries(
      metas
        .filter((m) => (m.attrs.property ?? m.attrs.name ?? '').toLowerCase().startsWith(prefix))
        .map((m) => [(m.attrs.property ?? m.attrs.name).toLowerCase(), m.attrs.content ?? '']),
    );
  const links = headTags.filter((t) => t.name === 'link');
  const rels = (t) => (t.attrs.rel ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  const canonicalTags = allTags.filter((t) => t.name === 'link' && rels(t).includes('canonical'));
  const refresh = metas.find((m) => (m.attrs['http-equiv'] ?? '').toLowerCase() === 'refresh');

  // Structured data
  const scriptBlocks = [...html.matchAll(new RegExp(String.raw`<script\b(` + ATTRIBUTES_SRC + String.raw`)\s*>([\s\S]*?)<\/script\s*>`, 'gi'))].map((m) => ({
    attrs: parseAttributes(m[1]),
    content: m[2],
    index: m.index,
  }));
  const jsonld = scriptBlocks
    .filter((s) => (s.attrs.type ?? '').toLowerCase() === 'application/ld+json')
    .map((s) => {
      try {
        const data = JSON.parse(s.content.trim());
        return { ok: true, types: [...typesOf(data)], data };
      } catch (err) {
        return { ok: false, error: err.message.slice(0, 120) };
      }
    });

  // Scripts and styles
  const headEnd = html.search(/<\/head\s*>/i);
  const scripts = scriptBlocks
    .filter((s) => (s.attrs.type ?? '').toLowerCase() !== 'application/ld+json')
    .map((s) => {
      const src = s.attrs.src ? safeResolve(s.attrs.src, url) : null;
      const type = (s.attrs.type ?? '').toLowerCase();
      return {
        src,
        origin: src ? originOf(src) : null,
        inHead: headEnd === -1 ? false : s.index < headEnd,
        async: 'async' in s.attrs,
        defer: 'defer' in s.attrs,
        module: type === 'module',
        inline: !src,
        bytes: src ? null : s.content.length,
      };
    });
  const stylesheets = links
    .filter((t) => rels(t).includes('stylesheet') && t.attrs.href)
    .map((t) => {
      const href = safeResolve(t.attrs.href, url);
      return { href, origin: originOf(href) };
    });
  const preloads = links
    .filter((t) => rels(t).includes('preload'))
    .map((t) => ({ href: safeResolve(t.attrs.href ?? '', url), as: t.attrs.as ?? '', fetchpriority: t.attrs.fetchpriority ?? '' }));
  const preconnects = links.filter((t) => rels(t).includes('preconnect')).map((t) => t.attrs.href ?? '');

  // Headings, text, links
  const content = withoutBlocks(body, ['script', 'style', 'template', 'noscript', 'svg']);
  const headings = [...content.matchAll(HEADING_TAGS)].map((m) => ({ level: Number(m[1]), text: textOf(m[2]) }));
  const text = textOf(content);
  const anchors = [...content.matchAll(ANCHOR)].map((m) => {
    const attrs = parseAttributes(m[1]);
    const inner = m[2];
    let label = textOf(inner);
    if (!label) label = attrs['aria-label'] ?? (inner.match(/<img\b[^>]*\balt\s*=\s*(?:"([^"]*)"|'([^']*)')/i)?.slice(1).find(Boolean) ?? '');
    const raw = attrs.href;
    const jsOnly = raw === undefined ? 'onclick' in attrs : raw.trim() === '' || raw.trim() === '#' || /^javascript:/i.test(raw.trim());
    // A link without a real target leads nowhere a crawler can follow: it has no URL.
    const absolute = raw !== undefined && !jsOnly ? safeResolve(raw, url) : null;
    let host = '';
    try {
      host = absolute ? new URL(absolute).host : '';
    } catch {}
    return {
      href: raw ?? null,
      url: absolute,
      text: label.trim(),
      rel: attrs.rel ?? '',
      internal: Boolean(host) && siteOf(host) === siteOf(pageHost),
      jsOnly,
    };
  });

  // Media. `context` holds the classes of the elements written just before an image, usually its
  // wrappers, so a stylesheet rule such as `.card-cover { aspect-ratio: 16/9 }` can be matched to it.
  const contextClasses = (index) => {
    const before = body.slice(Math.max(0, index - 400), index);
    const found = [...before.matchAll(/\bclass\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)].flatMap((m) => (m[1] ?? m[2]).split(/\s+/)).filter(Boolean);
    return [...new Set(found.slice(-8))];
  };
  const images = bodyTags
    .filter((t) => t.name === 'img')
    .map((t) => ({
      src: t.attrs.src ? safeResolve(t.attrs.src, url) : null,
      alt: 'alt' in t.attrs ? t.attrs.alt : null,
      width: t.attrs.width ?? null,
      height: t.attrs.height ?? null,
      loading: t.attrs.loading ?? null,
      fetchpriority: t.attrs.fetchpriority ?? null,
      srcset: Boolean(t.attrs.srcset),
      sizes: Boolean(t.attrs.sizes),
      class: t.attrs.class ?? '',
      style: t.attrs.style ?? '',
      context: contextClasses(t.index),
    }));
  const videos = bodyTags
    .filter((t) => t.name === 'video')
    .map((t) => ({
      src: t.attrs.src ? safeResolve(t.attrs.src, url) : null,
      poster: t.attrs.poster ?? null,
      preload: t.attrs.preload ?? null,
      autoplay: 'autoplay' in t.attrs,
      muted: 'muted' in t.attrs,
      width: t.attrs.width ?? null,
      height: t.attrs.height ?? null,
    }));
  const iframes = bodyTags
    .filter((t) => t.name === 'iframe')
    .map((t) => ({
      src: t.attrs.src ? safeResolve(t.attrs.src, url) : null,
      width: t.attrs.width ?? null,
      height: t.attrs.height ?? null,
      loading: t.attrs.loading ?? null,
    }));

  // Everything that points somewhere, for expiring-link checks
  const referenced = new Set();
  for (const t of allTags) {
    for (const key of ['src', 'href', 'poster', 'content', 'data-src']) {
      const v = t.attrs[key];
      if (v && /^(https?:)?\/\//i.test(v)) referenced.add(v);
    }
    if (t.attrs.srcset) for (const part of t.attrs.srcset.split(',')) referenced.add(part.trim().split(/\s+/)[0]);
  }

  const placeholders = [...new Set([...text.matchAll(PLACEHOLDER)].map((m) => m[0]))];
  const emptyRoot = /<div\b[^>]*\bid\s*=\s*["'](?:root|app|__next|__nuxt)["'][^>]*>\s*<\/div>/i.test(body);
  // Markers that frameworks leave when part of a page is rendered only in the browser.
  const clientRendering = [
    [/BAILOUT_TO_CLIENT_SIDE_RENDERING/, 'a component bailed out to client-side rendering (Next.js marker)'],
    [/You need to enable JavaScript to run this app/i, 'the page asks for JavaScript to show anything'],
  ]
    .filter(([pattern]) => pattern.test(String(rawHtml ?? '')))
    .map(([, label]) => label);
  const inlineCss = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)].map((m) => m[1]).join('\n');

  return {
    url,
    lang: htmlTag?.attrs.lang ?? null,
    titles,
    descriptions: metaNamed('description'),
    robots: [...metaNamed('robots'), ...metaNamed('googlebot')],
    canonicals: canonicalTags.map((t) => t.attrs.href ?? ''),
    canonicalsInHead: links.filter((t) => rels(t).includes('canonical')).length,
    og: metaProperty('og:'),
    twitter: metaProperty('twitter:'),
    hreflang: allTags
      .filter((t) => t.name === 'link' && rels(t).includes('alternate') && t.attrs.hreflang)
      .map((t) => ({ hreflang: t.attrs.hreflang, href: t.attrs.href ?? '' })),
    metaRefresh: refresh ? refresh.attrs.content ?? '' : null,
    headings,
    wordCount: text ? text.split(' ').length : 0,
    emptyAppRoot: emptyRoot,
    clientRendering,
    inlineCss,
    anchors,
    images,
    videos,
    iframes,
    scripts,
    stylesheets,
    preloads,
    preconnects,
    jsonld,
    placeholders,
    expiringUrls: [...referenced].filter(isExpiringUrl),
  };
}

/** Class names used in CSS rules that set an aspect-ratio, so images inside those elements keep their space. */
export function aspectRatioClasses(css) {
  const classes = new Set();
  const clean = String(css).replace(/\/\*[\s\S]*?\*\//g, ' ');
  for (const m of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!/aspect-ratio\s*:/i.test(m[2])) continue;
    for (const c of m[1].matchAll(/\.([A-Za-z_][\w-]*)/g)) classes.add(c[1]);
  }
  return classes;
}

// ---------------------------------------------------------------------------------------------
// robots.txt (RFC 9309, as Google applies it)

/** Groups of user agents with their rules, plus the Sitemap lines. */
export function parseRobots(text) {
  const groups = [];
  const sitemaps = [];
  let current = null;
  let lastWasAgent = false;
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (key === 'user-agent') {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (key === 'sitemap') sitemaps.push(value);
    else if ((key === 'allow' || key === 'disallow') && current) current.rules.push({ type: key, path: value });
  }
  return { groups, sitemaps };
}

/** The rules a crawler obeys: every group that names its token, or else every `*` group. */
export function rulesFor(parsed, token) {
  const wanted = token.toLowerCase();
  const named = parsed.groups.filter((g) => g.agents.includes(wanted));
  if (named.length) return { group: 'named', rules: named.flatMap((g) => g.rules) };
  const star = parsed.groups.filter((g) => g.agents.includes('*'));
  return { group: star.length ? '*' : 'none', rules: star.flatMap((g) => g.rules) };
}

function ruleRegex(path) {
  const anchored = path.endsWith('$');
  const body = (anchored ? path.slice(0, -1) : path)
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${body}${anchored ? '$' : ''}`);
}

/** Is `path` (with its query) allowed? The longest matching rule wins; on a tie, allow wins. */
export function isAllowed(rules, path) {
  let best = null;
  for (const rule of rules) {
    if (rule.path === '') continue;
    if (!ruleRegex(rule.path).test(path)) continue;
    const length = rule.path.length;
    if (!best || length > best.length || (length === best.length && rule.type === 'allow')) best = { length, type: rule.type };
  }
  return !best || best.type === 'allow';
}

/**
 * The crawler table in ai-crawlers.md, parsed: [{ vendor, token, kind }].
 * The table is the only list of crawler names in blueline, so scripts read it instead of repeating it.
 */
export function parseCrawlerTable(markdown) {
  const out = [];
  for (const line of String(markdown).split('\n')) {
    const m = line.match(/^\|\s*([^|`]+?)\s*\|\s*`([^`]+)`\s*\|\s*([^|]+?)\s*\|/);
    if (m) out.push({ vendor: m[1], token: m[2], kind: m[3] });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Sitemaps

/** Reads a sitemap or a sitemap index. Accepts gzip. Returns { kind, entries: [{ loc, lastmod }] }. */
export function parseSitemap(bufferOrText) {
  let text = bufferOrText;
  if (Buffer.isBuffer(bufferOrText)) {
    const gz = bufferOrText[0] === 0x1f && bufferOrText[1] === 0x8b;
    text = (gz ? gunzipSync(bufferOrText) : bufferOrText).toString('utf8');
  }
  const kind = /<sitemapindex\b/i.test(text) ? 'index' : 'urlset';
  const block = kind === 'index' ? /<sitemap\b[^>]*>([\s\S]*?)<\/sitemap\s*>/gi : /<url\b[^>]*>([\s\S]*?)<\/url\s*>/gi;
  const entries = [];
  for (const m of text.matchAll(block)) {
    const loc = m[1].match(/<loc\b[^>]*>\s*([\s\S]*?)\s*<\/loc\s*>/i)?.[1];
    const lastmod = m[1].match(/<lastmod\b[^>]*>\s*([\s\S]*?)\s*<\/lastmod\s*>/i)?.[1] ?? null;
    if (loc) entries.push({ loc: decodeEntities(loc.replace(/^<!\[CDATA\[|\]\]>$/g, '')).trim(), lastmod });
  }
  return { kind, entries };
}

// ---------------------------------------------------------------------------------------------
// Images, read from their bytes

/**
 * Format and intrinsic size of an image from its bytes (PNG, GIF, JPEG, WebP, AVIF, SVG), plus the
 * provenance metadata that law 5 cares about: the IPTC digital source type and a C2PA manifest.
 */
export function imageInfo(bytes) {
  const b = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes ?? []);
  const info = { format: 'unknown', width: null, height: null };
  const ascii = (start, end) => b.toString('latin1', start, end);
  try {
    if (b.length >= 24 && b.readUInt32BE(0) === 0x89504e47) {
      Object.assign(info, { format: 'png', width: b.readUInt32BE(16), height: b.readUInt32BE(20) });
    } else if (b.length >= 10 && ascii(0, 3) === 'GIF') {
      Object.assign(info, { format: 'gif', width: b.readUInt16LE(6), height: b.readUInt16LE(8) });
    } else if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8) {
      info.format = 'jpeg';
      let i = 2;
      while (i + 9 < b.length) {
        if (b[i] !== 0xff) {
          i++;
          continue;
        }
        const marker = b[i + 1];
        if (marker === 0xd8 || marker === 0x01 || marker === 0xff || (marker >= 0xd0 && marker <= 0xd7)) {
          i += marker === 0xff ? 1 : 2;
          continue;
        }
        const isFrame = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
        if (isFrame) {
          info.height = b.readUInt16BE(i + 5);
          info.width = b.readUInt16BE(i + 7);
          break;
        }
        i += 2 + b.readUInt16BE(i + 2);
      }
    } else if (b.length >= 30 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') {
      info.format = 'webp';
      const chunk = ascii(12, 16);
      if (chunk === 'VP8 ') Object.assign(info, { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff });
      else if (chunk === 'VP8L') {
        const bits = b.readUInt32LE(21);
        Object.assign(info, { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 });
      } else if (chunk === 'VP8X') Object.assign(info, { width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3) });
    } else if (b.length >= 12 && ascii(4, 8) === 'ftyp' && /avi[fs]/.test(ascii(8, 12))) {
      info.format = 'avif';
      const at = b.indexOf('ispe');
      if (at > 0 && at + 16 <= b.length) Object.assign(info, { width: b.readUInt32BE(at + 8), height: b.readUInt32BE(at + 12) });
    } else {
      const head = b.toString('utf8', 0, Math.min(b.length, 4000));
      const tag = head.match(/<svg\b[^>]*>/i)?.[0];
      if (tag) {
        info.format = 'svg';
        const number = (name) => {
          const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*["']?([\\d.]+)(px)?["'\\s>]`, 'i'));
          return m ? Number(m[1]) : null;
        };
        info.width = number('width');
        info.height = number('height');
        const box = tag.match(/viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
        if (!info.width && box) Object.assign(info, { width: Number(box[1]), height: Number(box[2]) });
      }
    }
  } catch {
    // A truncated or unusual file: keep what was read.
  }
  const text = b.toString('latin1');
  const source = text.match(/DigitalSourceType\s*(?:=\s*["']|>)\s*(?:https?:\/\/cv\.iptc\.org\/newscodes\/digitalsourcetype\/)?([A-Za-z]+)/);
  info.digitalSourceType = source ? source[1] : null;
  info.c2pa = /c2pa/.test(text);
  return info;
}

// ---------------------------------------------------------------------------------------------
// Internal links, as a graph

/** A link target as the crawler compares it: no fragment, no utm_ tracking parameters. */
export function normalizeLink(href) {
  try {
    const url = new URL(href);
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) if (/^utm_/i.test(key)) url.searchParams.delete(key);
    return url.href;
  } catch {
    return null;
  }
}

export function sameSite(a, b) {
  try {
    return siteOf(new URL(a).host) === siteOf(new URL(b).host);
  } catch {
    return false;
  }
}

/**
 * Summarizes crawled pages ([{ url, status, final, links: [{ url, text }] }]) into the facts of law 7:
 * inbound links per URL, the links repeated on almost every page (navigation and footer), broken
 * and redirected targets, and anchor text problems.
 */
export function summarizeLinks(pages, { sitemapUrls = [] } = {}) {
  const ok = pages.filter((p) => p.status === 200);
  const byUrl = new Map(pages.map((p) => [p.url, p]));
  const pagesLinking = new Map();
  const presence = new Map();
  const instances = [];
  for (const page of ok) {
    const seen = new Set();
    for (const link of page.links) {
      const target = normalizeLink(link.url);
      if (!target || seen.has(target)) continue;
      seen.add(target);
      presence.set(target, (presence.get(target) ?? 0) + 1);
      if (target !== page.url) pagesLinking.set(target, (pagesLinking.get(target) ?? 0) + 1);
    }
    for (const link of page.links) {
      const target = normalizeLink(link.url);
      if (target && target !== page.url) instances.push({ source: page.url, target, text: link.text });
    }
  }
  // A link present on at least 80% of the pages that have links belongs to the template (navigation,
  // footer, a sidebar). Our rule, and only with ten such pages or more: on a smaller site every page
  // may link to every other one.
  const linking = ok.filter((p) => p.links.length).length;
  const templateTargets = new Set(linking >= 10 ? [...presence].filter(([, n]) => n / linking >= 0.8).map(([t]) => t) : []);
  // Content links: one per linking page and target, template links left out.
  const pairs = new Set();
  const contentInbound = new Map();
  for (const { source, target } of instances) {
    const key = `${source} ${target}`;
    if (pairs.has(key)) continue;
    pairs.add(key);
    if (!templateTargets.has(target)) contentInbound.set(target, (contentInbound.get(target) ?? 0) + 1);
  }
  const inboundCount = (url) => pagesLinking.get(url) ?? 0;

  const broken = [];
  const redirected = [];
  for (const target of pagesLinking.keys()) {
    const page = byUrl.get(target);
    if (!page) continue;
    const from = [...new Set(instances.filter((i) => i.target === target).map((i) => i.source))].slice(0, 3);
    if (page.status === 0 || page.status >= 400) broken.push({ target, status: page.status, linkedFrom: from });
    else if (page.final && page.final !== target) redirected.push({ target, final: page.final, linkedFrom: from });
  }

  const orphans = sitemapUrls.filter((u) => inboundCount(normalizeLink(u)) === 0);
  const texts = new Map();
  for (const { target, text } of instances) {
    const t = text.trim().toLowerCase();
    if (!t || GENERIC_ANCHORS.has(t)) continue;
    if (!texts.has(t)) texts.set(t, new Set());
    texts.get(t).add(target);
  }
  const ranked = [...contentInbound].sort((a, b) => b[1] - a[1]);
  const contentTotal = ranked.reduce((sum, [, n]) => sum + n, 0);
  return {
    pages: ok.length,
    templateLinks: [...templateTargets],
    inbound: Object.fromEntries([...pagesLinking].sort((a, b) => b[1] - a[1])),
    topContentTargets: ranked.slice(0, 5).map(([url, n]) => ({ url, inbound: n, share: contentTotal ? Math.round((n / contentTotal) * 100) : 0 })),
    contentLinks: contentTotal,
    orphans,
    broken,
    redirected,
    genericAnchors: instances.filter((i) => GENERIC_ANCHORS.has(i.text.trim().toLowerCase())).map((i) => ({ source: i.source, target: i.target, text: i.text })),
    longAnchors: instances.filter((i) => i.text.split(/\s+/).filter(Boolean).length > 12).map((i) => ({ source: i.source, target: i.target, text: i.text.slice(0, 80) })),
    ambiguousAnchors: [...texts].filter(([, targets]) => targets.size > 1).map(([text, targets]) => ({ text, targets: [...targets].slice(0, 4) })),
  };
}

// ---------------------------------------------------------------------------------------------
// Output

/** Prints the result as JSON. Scripts report facts and signals; the reviewer decides what is a finding. */
export function print(result) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

export function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

/** Minimal argument parsing: positional values plus --flag and --key value. */
export function parseArgs(argv, { flags = [], options = [] } = {}) {
  const positional = [];
  const values = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      if (flags.includes(key)) values[key] = true;
      else if (options.includes(key)) values[key] = argv[++i];
      else fail(`unknown option: ${a}`);
    } else positional.push(a);
  }
  return { positional, values };
}
