#!/usr/bin/env node
// Generated from tools/links.mjs by scripts/build.mjs. Edit the source, not this copy.
/**
 * links.mjs: checks law 7 (no page is an orphan) and the broken links of law 3. It crawls a site
 * from a start page, following internal <a href> links on the same host, one page at a time, and
 * reports:
 *   - inbound links per URL, with links repeated on almost every page (navigation, footer) set apart;
 *   - sitemap URLs that no crawled page links to (orphans);
 *   - links that answer an error, and links that go through a redirect;
 *   - generic, very long and ambiguous anchor texts.
 *
 * Usage: node links.mjs <start url> [--limit 100] [--delay 250] [--no-sitemap]
 *   --limit       pages to crawl (default 100, our rule; at most 500)
 *   --delay       milliseconds between requests (default 250)
 *   --no-sitemap  skip the orphan check against the sitemap
 *
 * This is a review the site's owner asked for, so robots.txt is not applied; the crawl is polite
 * (one request at a time) and small by default.
 */
import {
  analyzeHtml,
  fail,
  follow,
  normalizeLink,
  parseArgs,
  parseRobots,
  parseSitemap,
  print,
  sleep,
  summarizeLinks,
  toHttpUrl,
} from './lib.mjs';

const { positional, values } = parseArgs(process.argv.slice(2), { flags: ['help', 'no-sitemap'], options: ['limit', 'delay'] });
if (values.help || positional.length !== 1) fail('usage: node links.mjs <start url> [--limit 100] [--delay 250] [--no-sitemap]');
const limit = Math.min(Number(values.limit ?? 100), 500);
const delay = Number(values.delay ?? 250);
if (!Number.isInteger(limit) || limit < 1 || !Number.isFinite(delay) || delay < 0) fail('--limit must be a positive integer and --delay a number of milliseconds');

const start = toHttpUrl(positional[0]);
const FILE = /\.(?:pdf|zip|gz|dmg|pkg|exe|jpe?g|png|gif|webp|avif|svg|ico|mp4|webm|mov|mp3|wav|css|js|json|xml|txt|woff2?)$/i;

const queue = [normalizeLink(start.href)];
const queued = new Set(queue);
const pages = [];
const otherHosts = new Map();
while (queue.length && pages.length < limit) {
  const url = queue.shift();
  if (pages.length) await sleep(delay);
  const { chain, final } = await follow(url);
  const finalUrl = normalizeLink(final.url) ?? final.url;
  const record = { url, status: final.status, final: finalUrl, links: [] };
  pages.push(record);
  if (final.status !== 200 || !/html/i.test(final.headers?.['content-type'] ?? '')) continue;
  if (chain.length > 1 && new URL(finalUrl).host !== start.host) continue;
  const page = analyzeHtml(final.body, final.url);
  for (const anchor of page.anchors) {
    if (!anchor.internal || !anchor.url || /\bnofollow\b/i.test(anchor.rel)) continue;
    const target = normalizeLink(anchor.url);
    if (!target) continue;
    record.links.push({ url: target, text: anchor.text });
    const host = new URL(target).host;
    if (host !== start.host) {
      otherHosts.set(host, (otherHosts.get(host) ?? 0) + 1);
      continue;
    }
    if (!queued.has(target) && !FILE.test(new URL(target).pathname)) {
      queued.add(target);
      queue.push(target);
    }
  }
}

const sitemapUrls = values['no-sitemap'] ? [] : await readSitemap(start);
const summary = summarizeLinks(pages, { sitemapUrls });
const crawled = new Set(pages.map((p) => p.url));
const uncrawled = [...queued].filter((u) => !crawled.has(u)).length;

const signals = [];
if (uncrawled) signals.push({ check: '7.1', message: `the crawl stopped at ${pages.length} pages with ${uncrawled} more queued: inbound counts are a lower bound (raise --limit)` });
if (summary.orphans.length) signals.push({ check: '7.1', message: `${summary.orphans.length} sitemap URLs have no inbound link from the ${summary.pages} crawled pages: ${summary.orphans.slice(0, 5).join(', ')}` });
if (summary.broken.length) signals.push({ check: '3.5', message: `${summary.broken.length} internal links answer an error: ${summary.broken.slice(0, 5).map((b) => `${b.target} (${b.status || 'no answer'})`).join(', ')}` });
if (summary.redirected.length) signals.push({ check: '7.3', message: `${summary.redirected.length} internal links go through a redirect: ${summary.redirected.slice(0, 5).map((r) => `${r.target} -> ${r.final}`).join(', ')}` });
if (otherHosts.size) signals.push({ check: '2.3', message: `internal links point at other host variants: ${[...otherHosts].map(([h, n]) => `${h} (${n})`).join(', ')}` });
if (summary.genericAnchors.length) signals.push({ check: '7.2', message: `${summary.genericAnchors.length} internal links use generic anchor text such as "${summary.genericAnchors[0].text}"` });
if (summary.longAnchors.length) signals.push({ check: '7.2', message: `${summary.longAnchors.length} internal links have anchors longer than 12 words, often links wrapped around a whole card` });
if (summary.ambiguousAnchors.length) signals.push({ check: '7.2', message: `${summary.ambiguousAnchors.length} anchor texts point at different targets, for example "${summary.ambiguousAnchors[0].text}"` });
const top3 = summary.topContentTargets.slice(0, 3).reduce((sum, t) => sum + t.share, 0);
if (summary.contentLinks >= 20 && top3 >= 40) {
  signals.push({ check: '7.5', message: `three pages receive ${top3}% of the in-content links (our rule: investigate above 40%): ${summary.topContentTargets.slice(0, 3).map((t) => t.url).join(', ')}` });
}

print({
  start: start.href,
  crawled: pages.length,
  queuedButNotCrawled: uncrawled,
  sitemapUrls: sitemapUrls.length,
  ...summary,
  signals,
});

async function readSitemap(site) {
  const robots = await follow(new URL('/robots.txt', site.origin));
  const listed = robots.final.status === 200 ? parseRobots(robots.final.body).sitemaps.filter((s) => /^https?:\/\//i.test(s)) : [];
  const urls = [];
  const queueSitemaps = listed.length ? listed : [new URL('/sitemap.xml', site.origin).href];
  let read = 0;
  while (queueSitemaps.length && read < 20) {
    read++;
    const { final } = await follow(queueSitemaps.shift(), { binary: true });
    if (final.status !== 200) continue;
    try {
      const { kind, entries } = parseSitemap(final.body);
      if (kind === 'index') queueSitemaps.push(...entries.map((e) => e.loc));
      else urls.push(...entries.map((e) => normalizeLink(e.loc)).filter(Boolean));
    } catch {
      // An unreadable sitemap is reported by sitemap.mjs.
    }
  }
  return [...new Set(urls)];
}
