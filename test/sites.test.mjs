/**
 * Runs every script against two local test sites:
 *   - broken: every problem is planted on purpose, and each script must find the ones it can see;
 *   - clean: follows every law the scripts can check, and must raise no signal at all.
 * A third server plays another company's origin, for third-party scripts.
 */
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { startSite } from './fixtures/server.mjs';

const run = promisify(execFile);
const here = (path) => fileURLToPath(new URL(path, import.meta.url));
let other;
let broken;
let clean;

before(async () => {
  other = await startSite(here('./fixtures/third-party'));
  broken = await startSite(here('./fixtures/broken'), { other: other.origin });
  clean = await startSite(here('./fixtures/clean'), { other: other.origin });
});

after(async () => {
  await Promise.all([other, broken, clean].map((site) => site?.close()));
});

async function script(name, ...args) {
  const { stdout } = await run(process.execPath, [here(`../tools/${name}`), ...args], { timeout: 60000, maxBuffer: 1 << 24 });
  return JSON.parse(stdout);
}

const checks = (result) => [...new Set(result.signals.map((s) => s.check))];

function assertChecks(result, expected, label) {
  const found = checks(result);
  const missing = expected.filter((c) => !found.includes(c));
  assert.deepEqual(missing, [], `${label}: missing ${missing.join(', ')}. Signals: ${JSON.stringify(result.signals, null, 1)}`);
}

// ---------------------------------------------------------------------------------------------
// The broken site

test('page.mjs finds every problem planted in the article', async () => {
  const r = await script('page.mjs', `${broken.origin}/blog/post`);
  assertChecks(r, ['1.2', '5.3', '6.2', '6.3', '6.4', '6.5', '7.2', '8.2', '8.6', '9.3', '9.5', '9.7', '9.8', '9.9', '10.1'], '/blog/post');
});

test('page.mjs finds the head, link and structured data problems of the FAQ page', async () => {
  const r = await script('page.mjs', `${broken.origin}/blog/faq`);
  assertChecks(r, ['1.2', '1.4', '1.5', '4.1', '8.2', '8.5', '9.9'], '/blog/faq');
  assert.ok(r.signals.some((s) => s.check === '4.1' && s.message.includes('Yes, 30 days')), 'the FAQ answer that differs from the page');
});

test('page.mjs sees a page that only JavaScript fills', async () => {
  const r = await script('page.mjs', `${broken.origin}/blog/js-only`);
  assertChecks(r, ['1.1', '6.3'], '/blog/js-only');
});

test('page.mjs compares the offer price with the visible price', async () => {
  const r = await script('page.mjs', `${broken.origin}/pricing`);
  assertChecks(r, ['1.2', '4.1'], '/pricing');
});

test('variants.mjs finds duplicates, a missing canonical and a parameter duplicate', async () => {
  const r = await script('variants.mjs', `${broken.origin}/pricing`);
  assertChecks(r, ['2.1', '2.2', '2.5'], 'variants');
  assert.deepEqual(r.schemes, ['http:'], 'a local server is tested on its own scheme only');
  assert.ok(r.signals.some((s) => s.check === '2.1' && s.message.includes('/pricing/') && s.message.includes('duplicate')));
  assert.ok(r.signals.some((s) => s.check === '2.1' && s.message.includes('/Pricing')));
});

test('robots.mjs finds blocked assets, no sitemap line and no AI policy', async () => {
  const r = await script('robots.mjs', broken.origin);
  assertChecks(r, ['1.6', '10.2', '1.7'], 'robots');
});

test('sitemap.mjs finds entries that are not live, canonical and indexable, and a fake lastmod', async () => {
  const r = await script('sitemap.mjs', broken.origin, '--delay', '0');
  assertChecks(r, ['3.3'], 'sitemap');
  assert.equal(r.urls, 6);
  assert.ok(r.problems.redirects >= 1 && r.problems.errors >= 1 && r.problems.noindex >= 1 && r.problems.canonical >= 1, JSON.stringify(r.problems));
  assert.ok(r.signals.some((s) => s.message.includes('share the lastmod')));
});

test('not-found.mjs finds the soft 404', async () => {
  const r = await script('not-found.mjs', broken.origin, '--from-sitemap', '--delay', '0');
  assertChecks(r, ['3.1'], 'not-found');
});

test('links.mjs finds the orphan, the broken link, the redirect and the weak anchors', async () => {
  const r = await script('links.mjs', `${broken.origin}/`, '--delay', '0');
  assertChecks(r, ['7.1', '3.5', '7.3', '7.2'], 'links');
  assert.deepEqual(r.orphans, [`${broken.origin}/blog/orphan`]);
  assert.deepEqual(r.broken.map((b) => b.target).sort(), [`${broken.origin}/assets/brochure.pdf`, `${broken.origin}/gone`]);
  assert.equal(r.filesChecked, 1);
  assert.ok(r.noindexPages.includes(`${broken.origin}/blog/post`), 'the pages kept out of the index are named');
});

test('assets.mjs finds heavy and oversized images, short caching, an undeclared AI image and a missing file', async () => {
  const r = await script('assets.mjs', `${broken.origin}/blog/post`);
  assertChecks(r, ['9.1', '9.2', '9.6', '5.8', '8.2', '3.5'], 'assets');
  const messages = r.signals.map((s) => s.message);
  assert.equal(messages.length, new Set(messages).size, 'an image shown twice is reported once');
  assert.equal(r.images.filter((i) => i.url.endsWith('/assets/hero.png')).length, 1);
  const hero = r.images.find((i) => i.url.endsWith('/assets/hero.png'));
  assert.equal(hero.intrinsic, '3000x2000');
  assert.equal(hero.declared, '300x200');
});

// ---------------------------------------------------------------------------------------------
// The clean site

test('the clean site raises no signal in any script', async () => {
  for (const path of ['/', '/pricing', '/blog/guide', '/about']) {
    const r = await script('page.mjs', `${clean.origin}${path}`);
    assert.deepEqual(r.signals, [], `page.mjs ${path}`);
  }
  const missing = await script('page.mjs', `${clean.origin}/a-page-that-does-not-exist`);
  assert.equal(missing.status, 404);
  assert.deepEqual(missing.signals, [], 'the not-found page helps');
  for (const [name, ...args] of [
    ['variants.mjs', `${clean.origin}/pricing`],
    ['variants.mjs', `${clean.origin}/`],
    ['robots.mjs', clean.origin],
    ['sitemap.mjs', clean.origin, '--delay', '0'],
    ['not-found.mjs', clean.origin, '--from-sitemap', '--delay', '0'],
    ['links.mjs', `${clean.origin}/`, '--delay', '0'],
    ['assets.mjs', `${clean.origin}/`],
  ]) {
    const r = await script(name, ...args);
    assert.deepEqual(r.signals, [], name);
  }
});
