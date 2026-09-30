#!/usr/bin/env node
// Generated from tools/variants.mjs by scripts/build.mjs. Edit the source, not this copy.
/**
 * variants.mjs: checks law 2 (one page, one URL). It requests the variants of a page (http and
 * https, with and without www, with and without a trailing slash, another letter case) and records
 * where each one ends up, hop by hop.
 *
 * Usage: node variants.mjs <url>
 *
 * The target is the page's own canonical when it declares one, otherwise the URL it finally loads.
 * One more request adds a tracking parameter (?utm_source=blueline), which must not create a page
 * of its own (check 2.5).
 */
import { analyzeHtml, fail, follow, isLocalHost, parseArgs, print, sameUrl, toHttpUrl } from './lib.mjs';

const { positional, values } = parseArgs(process.argv.slice(2), { flags: ['help'] });
if (values.help || positional.length !== 1) fail('usage: node variants.mjs <url>');

const start = toHttpUrl(positional[0]);
const first = await follow(start);
if (!first.final.status) fail(`could not fetch ${start.href}: ${first.final.error}`);

const declared = /html/i.test(first.final.headers['content-type'] ?? '') ? analyzeHtml(first.final.body, first.final.url).canonicals : [];
const canonical = declared.length === 1 && /^https?:\/\//i.test(declared[0]) ? declared[0] : null;
const target = new URL(canonical ?? first.final.url);

// The bare domain and www are compared only for a site's own domain (example.com, example.co.uk),
// never for a subdomain such as app.example.com or a hosting address such as site.vercel.app.
const host = target.host;
const bare = host.replace(/^www\./, '');
const labels = bare.split('.');
const ownDomain = host.startsWith('www.') || labels.length === 2 || (labels.length === 3 && /^(co|com|org|net|ac|gov|edu)$/.test(labels[1]));
const hosts = ownDomain ? [...new Set([bare, `www.${bare}`])] : [host];
const paths = new Set([target.pathname]);
if (target.pathname !== '/') {
  paths.add(target.pathname.endsWith('/') ? target.pathname.slice(0, -1) : `${target.pathname}/`);
  const cased = target.pathname.replace(/[a-z]/, (c) => c.toUpperCase());
  if (cased !== target.pathname) paths.add(cased);
}

// A local development server usually answers on one scheme only, so only that one is tested.
const schemes = isLocalHost(host) ? [target.protocol] : ['http:', 'https:'];
const variants = [];
for (const scheme of schemes) {
  for (const h of hosts) for (const p of paths) variants.push(`${scheme}//${h}${p}${target.search}`);
}

const rows = [];
const signals = [];
const silentHosts = new Map();
const chains = [];
const temporaries = [];
if (!canonical) signals.push({ check: '2.2', message: `the page declares no single absolute canonical, so the target is simply the URL it loads: ${target.href}` });
for (const variant of variants) {
  const { chain, final } = await follow(variant);
  const hops = chain.length - 1;
  const endsAtTarget = final.status === 200 && final.url === target.href;
  const row = {
    variant,
    statuses: chain.map((c) => c.status),
    hops: chain.map((c) => `${c.status || 'no answer'} ${c.url}`),
    final: final.url,
    finalStatus: final.status,
    hops,
    endsAtTarget,
    ...(final.error ? { error: final.error } : {}),
  };
  rows.push(row);
  if (variant === target.href) continue;
  if (final.error && final.status === 0) {
    silentHosts.set(new URL(final.url).origin, final.error);
    continue;
  }
  if (final.status === 200 && final.url !== target.href) {
    const other = /html/i.test(final.headers['content-type'] ?? '') ? analyzeHtml(final.body, final.url).canonicals : [];
    const pointsAtTarget = other.length === 1 && sameUrl(other[0], target.href);
    signals.push({
      check: '2.1',
      message: pointsAtTarget
        ? `${variant} answers 200 at ${final.url}, with a canonical to the target: redirect it instead`
        : `${variant} answers 200 at ${final.url} without a canonical to the target: a duplicate`,
    });
  }
  if (endsAtTarget && hops > 1) chains.push(`${variant} (${hops} hops)`);
  const temporary = chain.filter((c) => c.status === 302 || c.status === 307);
  if (temporary.length) temporaries.push(`${variant} (${temporary.map((c) => `${c.status} at ${c.url}`).join(', ')})`);
}
if (chains.length) signals.push({ check: '2.1', message: `${chains.length} variants need more than one redirect to reach the target: ${chains.slice(0, 4).join('; ')}` });
if (temporaries.length) signals.push({ check: '2.1', message: `${temporaries.length} variants go through a temporary redirect: ${temporaries.slice(0, 4).join('; ')}` });
for (const [silent, error] of silentHosts) {
  signals.push({ check: '2.1', message: `${silent} does not answer (${error}): no duplicate, but visitors who type it reach nothing` });
}

// A tracking parameter must not create a page of its own.
const tracked = new URL(target.href);
tracked.searchParams.set('utm_source', 'blueline');
const withParam = await follow(tracked.href);
const paramCanonicals = /html/i.test(withParam.final.headers['content-type'] ?? '') ? analyzeHtml(withParam.final.body, withParam.final.url).canonicals : [];
const paramRow = {
  variant: tracked.href,
  statuses: withParam.chain.map((c) => c.status),
  final: withParam.final.url,
  finalStatus: withParam.final.status,
  canonical: paramCanonicals.length === 1 ? paramCanonicals[0] : null,
};
rows.push(paramRow);
if (withParam.final.status === 200 && !sameUrl(withParam.final.url, target.href) && !(paramRow.canonical && sameUrl(paramRow.canonical, target.href))) {
  signals.push({ check: '2.5', message: `${tracked.href} answers 200 ${paramRow.canonical ? `with the canonical ${paramRow.canonical}` : 'with no canonical'}: tracking parameters create duplicate pages` });
}

print({
  target: target.href,
  targetFrom: canonical ? 'canonical' : 'final URL',
  schemes,
  ...(target.pathname === '/' ? { note: 'the home page has no trailing-slash or case variants: run this again on an inner page' } : {}),
  rows,
  signals,
});
