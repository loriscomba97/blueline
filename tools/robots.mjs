#!/usr/bin/env node
/**
 * robots.mjs: reads a site's robots.txt the way Google applies it (RFC 9309: the group that names
 * a crawler wins over `*`, the longest matching rule wins, allow wins a tie) and reports the checks
 * of laws 1 and 10: the status of the file, a site-wide block, blocked CSS and JavaScript, the
 * Sitemap line, and what each AI crawler in ai-crawlers.md may fetch.
 *
 * Usage: node robots.mjs <site>
 */
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fail, follow, isAllowed, parseArgs, parseCrawlerTable, parseRobots, print, rulesFor, toHttpUrl } from './lib.mjs';

const { positional, values } = parseArgs(process.argv.slice(2), { flags: ['help'] });
if (values.help || positional.length !== 1) fail('usage: node robots.mjs <site>');

const site = toHttpUrl(positional[0]);
const robotsUrl = new URL('/robots.txt', site.origin).href;
const { chain, final } = await follow(robotsUrl);
const signals = [];

const result = { url: robotsUrl, status: final.status, chain, ...(final.error ? { error: final.error } : {}) };

if (final.status >= 500 || final.status === 0) {
  signals.push({ check: '10.2', message: `robots.txt answers ${final.status || final.error}: Google stops crawling for 12 hours, then uses the last good copy for up to 30 days` });
  print({ ...result, signals });
  process.exit(0);
}
if (final.status >= 400) {
  if (final.status === 429) signals.push({ check: '10.2', message: 'robots.txt answers 429: the server is rate-limiting crawlers' });
  else signals.push({ check: '10.2', message: `robots.txt answers ${final.status}: crawlers treat that as "no robots.txt", so everything may be crawled and no sitemap is declared` });
  print({ ...result, signals });
  process.exit(0);
}

const text = final.body;
if (Buffer.byteLength(text) > 500 * 1024) signals.push({ check: '10.2', message: 'robots.txt is larger than 500 KiB: Google ignores everything after that' });
const parsed = parseRobots(text);

const assets = ['/_next/static/chunks/app.js', '/static/css/site.css', '/assets/site.js', '/wp-includes/js/site.js', '/wp-content/themes/site.css', '/site.js', '/site.css'];
for (const token of ['googlebot', '*']) {
  const { group, rules } = rulesFor(parsed, token);
  if (token === 'googlebot' && group !== 'named') continue;
  if (!isAllowed(rules, '/')) {
    signals.push({ check: '10.1', message: `the rules for ${token} disallow "/": the whole site is closed to ${token === '*' ? 'every crawler without its own group' : 'Googlebot'}` });
    continue;
  }
  const blocked = assets.filter((p) => !isAllowed(rules, p));
  if (blocked.length) signals.push({ check: '1.6', message: `rules for ${token} block typical CSS or JavaScript paths: ${blocked.join(', ')}` });
}

if (!parsed.sitemaps.length) signals.push({ check: '10.2', message: 'no Sitemap line' });
else {
  const relative = parsed.sitemaps.filter((s) => !/^https?:\/\//i.test(s));
  if (relative.length) signals.push({ check: '10.2', message: `Sitemap lines must be absolute URLs: ${relative.join(', ')}` });
}

const crawlers = loadCrawlers();
const ai = crawlers.map(({ vendor, token, kind }) => {
  const { group, rules } = rulesFor(parsed, token);
  return { vendor, token, kind, group, rootAllowed: isAllowed(rules, '/') };
});
if (crawlers.length && !ai.some((c) => c.group === 'named')) {
  signals.push({ check: '1.7', message: 'no AI crawler is named in robots.txt: the policy is implicit (the * group)' });
}

// Tokens such as Google-Extended never fetch anything: they control how data already crawled is used.
const fetchers = ai.filter((c) => c.kind.toLowerCase() !== 'token');
const tokens = ai.filter((c) => c.kind.toLowerCase() === 'token');
const blockedCount = fetchers.filter((c) => !c.rootAllowed).length;
print({
  ...result,
  sitemaps: parsed.sitemaps,
  aiSummary: `${blockedCount} of ${fetchers.length} AI crawlers may not fetch "/"; ${ai.filter((c) => c.group === 'named').length} tokens are named in a group of their own; ${tokens.filter((t) => !t.rootAllowed).length} of ${tokens.length} usage tokens (${tokens.map((t) => t.token).join(', ')}) are disallowed`,
  groups: parsed.groups.map((g) => ({ agents: g.agents, rules: g.rules.slice(0, 50).map((r) => `${r.type === 'allow' ? 'Allow' : 'Disallow'}: ${r.path}`) })),
  aiCrawlers: ai,
  signals,
});

function loadCrawlers() {
  for (const relative of ['../references/ai-crawlers.md', '../laws/ai-crawlers.md']) {
    const path = fileURLToPath(new URL(relative, import.meta.url));
    if (existsSync(path)) return parseCrawlerTable(readFileSync(path, 'utf8'));
  }
  return [];
}
