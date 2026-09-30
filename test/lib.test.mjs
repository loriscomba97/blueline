import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { gzipSync } from 'node:zlib';
import {
  analyzeHtml,
  decodeEntities,
  isAllowed,
  isExpiringUrl,
  parseAttributes,
  parseCrawlerTable,
  parseRobots,
  parseSitemap,
  rulesFor,
  spread,
  toHttpUrl,
} from '../tools/lib.mjs';

const PAGE = `<!doctype html>
<html lang="en">
<head>
  <title>Pricing for teams | Example</title>
  <meta name="description" content="Plans &amp; prices.">
  <link rel="canonical" href="https://www.example.com/pricing">
  <meta property="og:image" content="/og.png">
  <script src="https://cdn.other.test/tag.js"></script>
  <script src="/app.js" defer></script>
  <script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Organization"},{"@type":"FAQPage"}]}</script>
  <script type="application/ld+json">{ not json</script>
</head>
<body>
  <!-- <h1>Commented out</h1> -->
  <h1>Pricing <em>for teams</em></h1>
  <h3>Skipped a level</h3>
  <p>Monthly plans [TODO: confirm price] for everyone.</p>
  <a href="/blog/how-we-price">Read the pricing guide</a>
  <a href="#">Menu</a>
  <a href="https://elsewhere.test/page">Elsewhere</a>
  <a href="/contact">click here</a>
  <img src="/assets/hero.webp" alt="Two plan cards" width="1200" height="800" loading="lazy">
  <img src="https://bucket.s3.amazonaws.com/cover.png?X-Amz-Expires=3600&X-Amz-Signature=abc">
  <svg><title>An icon</title></svg>
</body>
</html>`;

test('analyzeHtml reads the head, the outline, links, media, scripts and structured data', () => {
  const page = analyzeHtml(PAGE, 'https://www.example.com/pricing');
  assert.equal(page.lang, 'en');
  assert.deepEqual(page.titles, ['Pricing for teams | Example']);
  assert.deepEqual(page.descriptions, ['Plans & prices.']);
  assert.deepEqual(page.canonicals, ['https://www.example.com/pricing']);
  assert.equal(page.canonicalsInHead, 1);
  assert.deepEqual(page.headings, [
    { level: 1, text: 'Pricing for teams' },
    { level: 3, text: 'Skipped a level' },
  ]);

  const internal = page.anchors.filter((a) => a.internal).map((a) => a.url);
  assert.deepEqual(internal, ['https://www.example.com/blog/how-we-price', 'https://www.example.com/contact']);
  assert.equal(page.anchors.filter((a) => a.jsOnly).length, 1);
  assert.equal(page.anchors.filter((a) => a.url && !a.internal && !a.jsOnly).length, 1);

  assert.equal(page.images.length, 2);
  assert.equal(page.images[0].loading, 'lazy');
  assert.equal(page.images[1].alt, null);
  assert.equal(page.expiringUrls.length, 1);
  assert.deepEqual(page.placeholders, ['[TODO: confirm price]']);

  const [tag, app] = page.scripts;
  assert.equal(tag.origin, 'https://cdn.other.test');
  assert.ok(tag.inHead && !tag.async && !tag.defer);
  assert.ok(app.defer);

  assert.equal(page.jsonld.length, 2);
  assert.deepEqual(page.jsonld[0].types.sort(), ['FAQPage', 'Organization']);
  assert.equal(page.jsonld[1].ok, false);
});

test('an empty application root is detected', () => {
  const page = analyzeHtml('<html><head><title>App</title></head><body><div id="root"></div><script src="/main.js"></script></body></html>', 'https://example.com/');
  assert.equal(page.emptyAppRoot, true);
  assert.equal(page.wordCount, 0);
});

test('attributes and entities', () => {
  assert.deepEqual(parseAttributes(` href="/a?b=1&amp;c=2" data-x='y' async`), { href: '/a?b=1&c=2', 'data-x': 'y', async: '' });
  assert.equal(decodeEntities('&lt;p&gt; &#39;x&#39; &#x41; &unknown;'), `<p> 'x' A &unknown;`);
});

test('robots.txt rules are applied as Google applies them', () => {
  const parsed = parseRobots(`User-agent: *
Disallow: /private/
Allow: /private/public/
Disallow: /*.pdf$

User-agent: GPTBot
User-agent: CCBot
Disallow: /

Sitemap: https://www.example.com/sitemap.xml`);
  assert.deepEqual(parsed.sitemaps, ['https://www.example.com/sitemap.xml']);

  const star = rulesFor(parsed, 'SomeBot');
  assert.equal(star.group, '*');
  assert.equal(isAllowed(star.rules, '/'), true);
  assert.equal(isAllowed(star.rules, '/private/notes'), false);
  assert.equal(isAllowed(star.rules, '/private/public/page'), true);
  assert.equal(isAllowed(star.rules, '/guide.pdf'), false);
  assert.equal(isAllowed(star.rules, '/guide.pdf?download=1'), true);

  for (const token of ['GPTBot', 'ccbot']) {
    const named = rulesFor(parsed, token);
    assert.equal(named.group, 'named');
    assert.equal(isAllowed(named.rules, '/'), false);
  }

  assert.equal(isAllowed([{ type: 'disallow', path: '/a' }, { type: 'allow', path: '/a' }], '/a'), true);
  assert.equal(isAllowed([{ type: 'disallow', path: '' }], '/anything'), true);
});

test('the crawler table in ai-crawlers.md is the list the scripts use', () => {
  const rows = parseCrawlerTable(readFileSync(new URL('../laws/ai-crawlers.md', import.meta.url), 'utf8'));
  const tokens = rows.map((r) => r.token);
  assert.ok(rows.length >= 15, `only ${rows.length} rows`);
  for (const token of ['GPTBot', 'CCBot', 'Google-Extended', 'PerplexityBot', 'Applebot-Extended']) assert.ok(tokens.includes(token), token);
  assert.ok(!tokens.includes('Token'));
});

test('sitemaps: url sets, indexes and gzip', () => {
  const xml = `<?xml version="1.0"?><urlset><url><loc>https://example.com/a?x=1&amp;y=2</loc><lastmod>2026-09-01</lastmod></url><url><loc> https://example.com/b </loc></url></urlset>`;
  assert.deepEqual(parseSitemap(xml), {
    kind: 'urlset',
    entries: [
      { loc: 'https://example.com/a?x=1&y=2', lastmod: '2026-09-01' },
      { loc: 'https://example.com/b', lastmod: null },
    ],
  });
  const index = `<sitemapindex><sitemap><loc>https://example.com/posts.xml</loc></sitemap></sitemapindex>`;
  assert.equal(parseSitemap(Buffer.from(index)).kind, 'index');
  assert.equal(parseSitemap(gzipSync(Buffer.from(xml))).entries.length, 2);
});

test('expiring links, sampling and URL parsing', () => {
  assert.equal(isExpiringUrl('https://b.s3.amazonaws.com/x.png?X-Amz-Expires=300'), true);
  assert.equal(isExpiringUrl('https://storage.googleapis.com/b/x.png?X-Goog-Signature=abc'), true);
  assert.equal(isExpiringUrl('https://acct.blob.core.windows.net/c/x.png?se=2026-01-01&sig=abc'), true);
  assert.equal(isExpiringUrl('https://example.com/x.png?w=800'), false);
  assert.deepEqual(spread([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3), [1, 6, 10]);
  assert.equal(toHttpUrl('example.com/x#top').href, 'https://example.com/x');
  assert.throws(() => toHttpUrl('file:///etc/passwd'));
});
