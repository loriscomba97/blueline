#!/usr/bin/env node
// Generated from tools/links.mjs by scripts/build.mjs. Edit the source, not this copy.
/**
 * links.mjs: checks law 7 (no page is an orphan) and the broken links of law 3. It crawls a site
 * from a start page, following internal <a href> links on the same host, one page at a time, and
 * reports:
 *   - inbound links per URL, with links repeated on almost every page (navigation, footer) set apart;
 *   - sitemap URLs that no crawled page links to (orphans);
 *   - links that answer an error, and links that go through a redirect;
 *   - generic, very long and ambiguous anchor texts;
 *   - pages that show unfinished text ([TODO], [FACT-CHECK], lorem ipsum), since every page is downloaded anyway.
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
  isAllowed,
  isFileUrl,
  isNoindex,
  normalizeLink,
  parseArgs,
  parseRobots,
  parseSitemap,
  print,
  rulesFor,
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

const queue = [normalizeLink(start.href)];
const queued = new Set(queue);
const pages = [];
const fileLinks = new Set();
const noindexPages = [];
const unfinishedPages = [];
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
  if (isNoindex([...page.robots, final.headers['x-robots-tag'] ?? ''])) noindexPages.push(finalUrl);
  if (page.placeholders.length) unfinishedPages.push({ url: finalUrl, found: page.placeholders.slice(0, 3) });
  for (const anchor of page.anchors) {
    if (!anchor.internal || !anchor.url || /\bnofollow\b/i.test(anchor.rel)) continue;
    const target = normalizeLink(anchor.url);
    if (!target) continue;
    record.links.push({ url: target, text: anchor.text, block: anchor.block, inText: anchor.inText, chrome: anchor.chrome });
    const host = new URL(target).host;
    if (host !== start.host) {
      const entry = otherHosts.get(host) ?? { links: 0, examples: [] };
      entry.links++;
      if (entry.examples.length < 3 && !entry.examples.some((e) => e.target === target)) entry.examples.push({ target, from: url });
      otherHosts.set(host, entry);
      continue;
    }
    if (isFileUrl(target)) fileLinks.add(target);
    else if (!queued.has(target)) {
      queued.add(target);
      queue.push(target);
    }
  }
}

// Linked files (feeds, sitemaps, PDFs, images) are not crawled, but their status is checked: at most 30.
const files = [];
for (const url of [...fileLinks].slice(0, 30)) {
  await sleep(delay);
  let { final } = await follow(url, { method: 'HEAD' });
  if (final.status === 405 || final.status === 501) ({ final } = await follow(url));
  files.push({ url, status: final.status, final: normalizeLink(final.url) ?? final.url, links: [] });
}

const robots = await follow(new URL('/robots.txt', start.origin));
const robotsRules = robots.final.status === 200 ? parseRobots(robots.final.body) : null;
const sitemapUrls = values['no-sitemap'] ? [] : await readSitemap(start, robotsRules);
const summary = summarizeLinks(pages, { sitemapUrls, files });
const crawled = new Set(pages.map((p) => p.url));
const uncrawled = [...queued].filter((u) => !crawled.has(u)).length;

const signals = [];
if (uncrawled) signals.push({ check: '7.1', message: `the crawl stopped at ${pages.length} pages with ${uncrawled} more queued: inbound counts are a lower bound (raise --limit)` });
if (summary.orphans.length) {
  const how = uncrawled ? 'candidates, because the crawl stopped early' : 'the crawl reached every linked page';
  signals.push({ check: '7.1', message: `${summary.orphans.length} sitemap URLs have no inbound link from the ${summary.pages} crawled pages (${how}): ${summary.orphans.slice(0, 5).join(', ')}` });
}
if (unfinishedPages.length) {
  const where = unfinishedPages.slice(0, 5).map((p) => `${p.url} (${p.found[0].slice(0, 40)})`).join(', ');
  signals.push({ check: '5.3', message: `${unfinishedPages.length} crawled pages show unfinished text to readers: ${where}` });
}
if (noindexPages.length) {
  signals.push({ check: '10.1', message: `${noindexPages.length} of ${summary.pages} crawled pages carry noindex, so search engines keep them out of the index: ${noindexPages.slice(0, 5).join(', ')} (is each one deliberate?)` });
}
if (robotsRules && !isAllowed(rulesFor(robotsRules, '*').rules, '/')) signals.push({ check: '10.2', message: 'robots.txt disallows "/" for every crawler without its own group: search engines cannot follow any of these links' });
if (summary.broken.length) signals.push({ check: '3.5', message: `${summary.broken.length} internal links answer an error: ${summary.broken.slice(0, 5).map((b) => `${b.target} (${b.status || 'no answer'})`).join(', ')}` });
if (summary.redirected.length) signals.push({ check: '7.3', message: `${summary.redirected.length} internal links go through a redirect: ${summary.redirected.slice(0, 5).map((r) => `${r.target} -> ${r.final}`).join(', ')}` });
if (otherHosts.size) {
  const hosts = [...otherHosts].map(([h, { links, examples }]) => `${h} (${links} links, for example ${examples[0].target} on ${examples[0].from})`);
  signals.push({ check: '2.3', message: `internal links point at other host variants: ${hosts.join('; ')}` });
}
if (summary.genericAnchors.length) signals.push({ check: '7.2', message: `${summary.genericAnchors.length} internal links use generic anchor text such as "${summary.genericAnchors[0].text}"` });
if (summary.longAnchors.length) signals.push({ check: '7.2', message: `${summary.longAnchors.length} links inside the text have anchors longer than 12 words (our rule: two to eight)` });
if (summary.ambiguousAnchors.length) signals.push({ check: '7.2', message: `${summary.ambiguousAnchors.length} anchor texts point at different targets, for example "${summary.ambiguousAnchors[0].text}"` });
const top3 = summary.topContentTargets.slice(0, 3).reduce((sum, t) => sum + t.share, 0);
if (summary.contentLinks >= 20 && top3 >= 40) {
  signals.push({ check: '7.5', message: `three pages receive ${top3}% of the in-content links (our rule: investigate above 40%): ${summary.topContentTargets.slice(0, 3).map((t) => t.url).join(', ')}` });
}

print({
  start: start.href,
  crawled: pages.length,
  queuedButNotCrawled: uncrawled,
  filesChecked: files.length,
  sitemapUrls: sitemapUrls.length,
  noindexPages,
  unfinishedPages,
  otherHosts: Object.fromEntries(otherHosts),
  ...summary,
  signals,
});

async function readSitemap(site, robotsRules) {
  const listed = robotsRules ? robotsRules.sitemaps.filter((s) => /^https?:\/\//i.test(s)) : [];
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
      // An unreadable sitemap is a finding for check 3.3, not for this crawl.
    }
  }
  return [...new Set(urls)];
}
