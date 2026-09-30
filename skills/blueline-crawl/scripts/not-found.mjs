#!/usr/bin/env node
// Generated from tools/not-found.mjs by scripts/build.mjs. Edit the source, not this copy.
/**
 * not-found.mjs: checks law 3 (a URL that does not exist answers 404). It requests made-up URLs at
 * the root and under each section you name (or each first-level section of the sitemap) and
 * reports what they answer. A 200 is a soft 404; a redirect to the home page often is too.
 *
 * Usage: node not-found.mjs <site> [/blog/ /docs/ ...] [--from-sitemap]
 */
import { fail, follow, parseArgs, parseRobots, parseSitemap, print, randomSlug, sleep, toHttpUrl } from './lib.mjs';

const { positional, values } = parseArgs(process.argv.slice(2), { flags: ['help', 'from-sitemap'] });
if (values.help || positional.length < 1) fail('usage: node not-found.mjs <site> [/section/ ...] [--from-sitemap]');

const site = toHttpUrl(positional[0]);
const sections = new Set(['/']);
for (const s of positional.slice(1)) sections.add(`/${s.replace(/^\/+|\/+$/g, '')}/`.replace('//', '/'));
if (values['from-sitemap']) for (const s of await sectionsFromSitemap(site)) sections.add(s);

const rows = [];
const signals = [];
for (const [i, section] of [...sections].entries()) {
  if (i) await sleep(250);
  const probe = new URL(`${section}${randomSlug()}`, site.origin).href;
  const { chain, final } = await follow(probe);
  const landedHome = final.status === 200 && new URL(final.url).pathname === '/' && chain.length > 1;
  rows.push({ probe, statuses: chain.map((c) => c.status), final: final.url, finalStatus: final.status });
  if (final.status === 200 && !landedHome) signals.push({ check: '3.1', message: `${probe} answers 200: a soft 404` });
  if (landedHome) signals.push({ check: '3.1', message: `${probe} redirects to the home page: search engines may treat that as a soft 404` });
  if (final.status >= 500) signals.push({ check: '3.1', message: `${probe} answers ${final.status}: a missing page should answer 404, not a server error` });
}

print({ site: site.origin, rows, signals });

async function sectionsFromSitemap(root) {
  const robots = await follow(new URL('/robots.txt', root.origin));
  const listed = robots.final.status === 200 ? parseRobots(robots.final.body).sitemaps : [];
  const url = listed[0] ?? new URL('/sitemap.xml', root.origin).href;
  const { final: res } = await follow(url, { binary: true });
  if (res.status !== 200) return [];
  let { kind, entries } = parseSitemap(res.body);
  if (kind === 'index' && entries[0]) {
    const { final: child } = await follow(entries[0].loc, { binary: true });
    entries = child.status === 200 ? parseSitemap(child.body).entries : [];
  }
  const found = new Set();
  for (const { loc } of entries) {
    try {
      const parts = new URL(loc).pathname.split('/').filter(Boolean);
      if (parts.length >= 2) found.add(`/${parts[0]}/`);
    } catch {}
    if (found.size >= 5) break;
  }
  return found;
}
