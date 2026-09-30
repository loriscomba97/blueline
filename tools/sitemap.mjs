#!/usr/bin/env node
/**
 * sitemap.mjs: checks law 3 (the sitemap lists only live pages). It finds the sitemap (the
 * Sitemap lines of robots.txt, else /sitemap.xml), reads sitemap indexes and gzip files, and
 * requests a sample of the listed URLs: each should answer 200 without a redirect, declare itself
 * as canonical, and carry no noindex. It also reports whether lastmod looks real.
 *
 * Usage: node sitemap.mjs <site or sitemap URL> [--limit 100] [--delay 250]
 *   --limit   URLs to request, spread across the sitemap (default 100, our rule)
 *   --delay   milliseconds between requests (default 250), to stay polite
 */
import { analyzeHtml, fail, follow, parseArgs, parseRobots, parseSitemap, print, sleep, spread, toHttpUrl } from './lib.mjs';

const { positional, values } = parseArgs(process.argv.slice(2), { flags: ['help'], options: ['limit', 'delay'] });
if (values.help || positional.length !== 1) fail('usage: node sitemap.mjs <site or sitemap URL> [--limit 100] [--delay 250]');
const limit = Number(values.limit ?? 100);
const delay = Number(values.delay ?? 250);
if (!Number.isInteger(limit) || limit < 1 || !Number.isFinite(delay) || delay < 0) fail('--limit must be a positive integer and --delay a number of milliseconds');

const input = toHttpUrl(positional[0]);
const signals = [];
let sources = [];
if (/\.xml(\.gz)?$/i.test(input.pathname)) sources = [input.href];
else {
  const robots = await follow(new URL('/robots.txt', input.origin));
  if (robots.final.status === 200) sources = parseRobots(robots.final.body).sitemaps.filter((s) => /^https?:\/\//i.test(s));
  if (!sources.length) sources = [new URL('/sitemap.xml', input.origin).href];
}

// Read every sitemap, following indexes one level deep (at most 50 child sitemaps).
const entries = [];
const read = [];
const queue = [...sources];
while (queue.length && read.length < 50) {
  const url = queue.shift();
  const { chain, final: res } = await follow(url, { binary: true });
  const item = { url, status: res.status, ...(res.error ? { error: res.error } : {}) };
  read.push(item);
  if (chain.length > 1) signals.push({ check: '3.3', message: `sitemap ${url} redirects to ${res.url}: list the final URL in robots.txt` });
  if (res.status !== 200) {
    signals.push({ check: '3.3', message: `sitemap ${url} answers ${res.status || res.error}` });
    continue;
  }
  let parsed;
  try {
    parsed = parseSitemap(res.body);
  } catch (err) {
    signals.push({ check: '3.3', message: `sitemap ${url} cannot be read: ${err.message}` });
    continue;
  }
  item.kind = parsed.kind;
  item.entries = parsed.entries.length;
  if (parsed.kind === 'index') queue.push(...parsed.entries.map((e) => e.loc));
  else entries.push(...parsed.entries);
}

const lastmods = entries.map((e) => e.lastmod).filter(Boolean);
const distinctLastmods = new Set(lastmods).size;
const counts = new Map();
for (const value of lastmods) counts.set(value, (counts.get(value) ?? 0) + 1);
const [commonLastmod, commonCount] = [...counts].sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
if (lastmods.length >= 3 && commonCount / lastmods.length >= 0.8) {
  signals.push({ check: '3.3', message: `${commonCount} of ${lastmods.length} dated entries share the lastmod ${commonLastmod}: probably the build time, not each page's change date` });
}
const hosts = new Set(entries.map((e) => safeHost(e.loc)));
if (hosts.size > 1) signals.push({ check: '2.3', message: `the sitemap lists URLs on ${hosts.size} hosts: ${[...hosts].join(', ')}` });

const sample = spread(entries, limit);
const rows = [];
for (const [i, entry] of sample.entries()) {
  if (i) await sleep(delay);
  const { chain, final } = await follow(entry.loc);
  const html = /html/i.test(final.headers?.['content-type'] ?? '');
  const page = html ? analyzeHtml(final.body, final.url) : null;
  const canonical = page?.canonicals.length === 1 ? page.canonicals[0] : null;
  const noindex = [...(page?.robots ?? []), final.headers?.['x-robots-tag'] ?? ''].some((v) => /noindex/i.test(v));
  const problems = [];
  if (chain.length > 1) problems.push(`redirects to ${final.url}`);
  if (final.status !== 200) problems.push(`answers ${final.status || final.error}`);
  if (page && canonical !== entry.loc) problems.push(canonical ? `canonical is ${canonical}` : 'no single canonical');
  if (noindex) problems.push('noindex');
  rows.push({ url: entry.loc, lastmod: entry.lastmod, status: chain.map((c) => c.status), ...(problems.length ? { problems } : {}) });
}
const failing = rows.filter((r) => r.problems);
const byKind = { redirects: 0, errors: 0, canonical: 0, noindex: 0 };
for (const r of failing) {
  for (const p of r.problems) {
    if (p.startsWith('redirects')) byKind.redirects++;
    else if (p.startsWith('answers')) byKind.errors++;
    else if (p === 'noindex') byKind.noindex++;
    else byKind.canonical++;
  }
}
if (failing.length) {
  const parts = Object.entries(byKind).filter(([, n]) => n).map(([kind, n]) => `${n} ${kind === 'errors' ? 'not answering 200' : kind === 'canonical' ? 'with another or no canonical' : kind === 'redirects' ? 'redirecting' : 'noindex'}`);
  signals.push({ check: '3.3', message: `${failing.length} of ${rows.length} sampled URLs have a problem: ${parts.join(', ')}` });
}

print({
  sitemaps: read,
  urls: entries.length,
  withLastmod: lastmods.length,
  distinctLastmods,
  sampled: rows.length,
  failing: failing.length,
  problems: byKind,
  commonLastmod: commonCount > 1 ? { value: commonLastmod, entries: commonCount } : null,
  rows: failing.length ? failing : rows.slice(0, 10),
  signals,
});

function safeHost(url) {
  try {
    return new URL(url).host;
  } catch {
    return 'invalid URL';
  }
}
