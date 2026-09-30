import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { gzipSync } from 'node:zlib';
import {
  analyzeHtml,
  cssSizedClasses,
  imageInfo,
  isNoindex,
  structuredDataMismatches,
  isStagingHost,
  summarizeLinks,
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

test('a still behind a video counts as its poster; a sibling image does not', () => {
  const wrapped = analyzeHtml('<html><body><div class="bg" style="background-image:url(/still.webp)"><video autoplay muted preload="metadata"><source src="/a.mp4"></video></div></body></html>', 'https://example.com/');
  assert.equal(wrapped.videos[0].wrapperStill, true);
  const sibling = analyzeHtml('<html><body><div style="background-image:url(/still.webp)"></div><video preload="metadata"></video></body></html>', 'https://example.com/');
  assert.equal(sibling.videos[0].wrapperStill, false);
});

test('structured data: the article of the page is compared with the H1, listed articles with the visible text', () => {
  const ld = (data) => `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
  const listing = analyzeHtml(`<html><head>${ld({ '@type': 'Blog', blogPost: [{ '@type': 'BlogPosting', headline: 'How to plan a week' }, { '@type': 'BlogPosting', headline: 'A post nobody lists' }] })}</head><body><h1>Blog</h1><article><h2>How to plan a week</h2></article></body></html>`, 'https://example.com/blog');
  assert.deepEqual(structuredDataMismatches(listing).map((m) => [m.field, m.value]), [['listed headline', 'A post nobody lists']]);
  const article = analyzeHtml(`<html><head>${ld({ '@graph': [{ '@type': 'BlogPosting', headline: 'Another title' }, { '@type': 'WebPage' }] })}</head><body><h1>How to plan a week</h1></body></html>`, 'https://example.com/blog/a');
  assert.deepEqual(structuredDataMismatches(article).map((m) => [m.field, m.against]), [['headline', 'h1']]);
});

test('an empty application root is detected', () => {
  const page = analyzeHtml('<html><head><title>App</title></head><body><div id="root"></div><script src="/main.js"></script></body></html>', 'https://example.com/');
  assert.equal(page.emptyAppRoot, true);
  assert.equal(page.wordCount, 0);
});

test('images carry their wrapper classes, and CSS aspect-ratio rules are found', () => {
  const html = `<html><head><style>.card-cover{aspect-ratio:16/9} @media (min-width: 40em) { .hero img { aspect-ratio: 2 } }</style></head>
<body><a class="card"><div class="card-cover"><img src="/c.webp" alt="Cover"></div></a><template data-dgst="BAILOUT_TO_CLIENT_SIDE_RENDERING"></template></body></html>`;
  const page = analyzeHtml(html, 'https://example.com/');
  assert.deepEqual(page.images[0].context, ['card', 'card-cover']);
  assert.equal(page.clientRendering.length, 1);
  assert.deepEqual([...cssSizedClasses(page.inlineCss)].sort(), ['card-cover', 'hero']);
  assert.deepEqual([...cssSizedClasses('.cov{position:relative;min-height:340px} .ic img{width:22px;height:22px} .wide{height:100%}')].sort(), ['cov', 'ic']);
});

test('the content of the page is read apart from navigation and footer', () => {
  const html = `<html><body><nav><a href="/">Home</a> <a href="/pricing">Pricing and plans for teams</a></nav>
<main><article><h1>How to plan a week</h1><p>Plan the week on Monday morning with the whole team.</p><h2>Owners</h2><p>Give every task one owner, and only one.</p></article>
<aside><h2>Keep reading</h2><p>Three more guides about planning for small teams.</p></aside></main><footer><p>Example, all rights reserved, every year.</p></footer></body></html>`;
  const page = analyzeHtml(html, 'https://example.com/guide');
  assert.equal(page.main.from, 'article');
  assert.deepEqual(page.main.headings.map((h) => h.text), ['How to plan a week', 'Owners']);
  assert.equal(page.main.paragraphs.length, 2);
  assert.ok(page.main.wordCount < page.wordCount);
  const links = Object.fromEntries(page.anchors.map((a) => [a.text, a.chrome]));
  assert.deepEqual(links, { Home: true, 'Pricing and plans for teams': true });
});

test('noindex in all its spellings', () => {
  assert.equal(isNoindex(['index, follow']), false);
  assert.equal(isNoindex(['noindex, nofollow']), true);
  assert.equal(isNoindex(['none']), true);
  assert.equal(isNoindex(['googlebot: none']), true);
  assert.equal(isNoindex(['max-snippet:-1, max-image-preview:large']), false);
});

test('staging and preview hosts are recognized by their names', () => {
  const previews = [
    'staging.example.com', 'staging.website.example.com', 'dev-app.example.com', 'preview.example.org',
    'my-site-git-main.vercel.app', 'my-site-4fk2mz8qa-acme.vercel.app', 'deploy-preview-42--my-site.netlify.app', 'a1b2c3d4.my-site.pages.dev',
  ];
  for (const host of previews) assert.equal(isStagingHost(host), true, host);
  // A platform's production address is production.
  const production = [
    'www.example.com', 'example.com', 'developer.example.com', 'devices.example.com', 'blog.example.com',
    'my-site.vercel.app', 'my-site-acme.vercel.app', 'my-marketing-site.vercel.app', 'my-site.netlify.app', 'my-site.pages.dev',
  ];
  for (const host of production) assert.equal(isStagingHost(host), false, host);
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

test('image formats, intrinsic sizes and provenance metadata are read from the bytes', () => {
  const png = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(png, 0);
  png.write('IHDR', 12, 'latin1');
  png.writeUInt32BE(1200, 16);
  png.writeUInt32BE(630, 20);
  assert.deepEqual([imageInfo(png).format, imageInfo(png).width, imageInfo(png).height], ['png', 1200, 630]);

  const gif = Buffer.alloc(10);
  gif.write('GIF89a', 0, 'latin1');
  gif.writeUInt16LE(320, 6);
  gif.writeUInt16LE(200, 8);
  assert.deepEqual([imageInfo(gif).width, imageInfo(gif).height], [320, 200]);

  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x02, 0x58, 0x03, 0x20, 0x03, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual([imageInfo(jpeg).format, imageInfo(jpeg).width, imageInfo(jpeg).height], ['jpeg', 800, 600]);

  const webp = Buffer.alloc(30);
  webp.write('RIFF', 0, 'latin1');
  webp.write('WEBP', 8, 'latin1');
  webp.write('VP8X', 12, 'latin1');
  webp.writeUIntLE(1919, 24, 3);
  webp.writeUIntLE(1079, 27, 3);
  assert.deepEqual([imageInfo(webp).format, imageInfo(webp).width, imageInfo(webp).height], ['webp', 1920, 1080]);

  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630"><rect/></svg>');
  assert.deepEqual([imageInfo(svg).format, imageInfo(svg).width, imageInfo(svg).height], ['svg', 1200, 630]);

  const tagged = Buffer.concat([png, Buffer.from('<x:xmpmeta><rdf:Description Iptc4xmpExt:DigitalSourceType="http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia"/></x:xmpmeta>')]);
  assert.equal(imageInfo(tagged).digitalSourceType, 'trainedAlgorithmicMedia');
  const element = Buffer.concat([png, Buffer.from('<Iptc4xmpExt:DigitalSourceType>trainedAlgorithmicMedia</Iptc4xmpExt:DigitalSourceType>')]);
  assert.equal(imageInfo(element).digitalSourceType, 'trainedAlgorithmicMedia');
  const resource = Buffer.concat([png, Buffer.from('<Iptc4xmpExt:DigitalSourceType rdf:resource="http://cv.iptc.org/newscodes/digitalsourcetype/compositeWithTrainedAlgorithmicMedia"/>')]);
  assert.equal(imageInfo(resource).digitalSourceType, 'compositeWithTrainedAlgorithmicMedia');
  assert.equal(imageInfo(png).digitalSourceType, null);
});

test('the link summary sets template links apart and finds orphans, broken links and redirects', () => {
  const site = 'https://example.com';
  const nav = [{ url: `${site}/`, text: 'Home' }, { url: `${site}/pricing`, text: 'Pricing' }];
  const filler = Array.from({ length: 6 }, (_, i) => ({ url: `${site}/docs/${i}`, status: 200, final: `${site}/docs/${i}`, links: nav }));
  const pages = [
    ...filler,
    { url: `${site}/`, status: 200, final: `${site}/`, links: [...nav, { url: `${site}/blog/a`, text: 'How we price projects' }] },
    { url: `${site}/pricing`, status: 200, final: `${site}/pricing`, links: nav },
    { url: `${site}/blog/a`, status: 200, final: `${site}/blog/a`, links: [...nav, { url: `${site}/blog/b#top`, text: 'Pricing a website', inText: true }, { url: `${site}/old`, text: 'read more' }, { url: `${site}/blog/c`, text: 'a very long anchor that goes on and on for many more words than anyone needs', inText: true }] },
    { url: `${site}/blog/e`, status: 200, final: `${site}/blog/e`, links: [...nav, { url: `${site}/blog/a`, text: 'Pricing a website', inText: true }, { url: `${site}/blog/c`, text: 'Pricing', inText: true, chrome: true }] },
    { url: `${site}/blog/b`, status: 200, final: `${site}/blog/b`, links: [...nav, { url: `${site}/gone`, text: 'The old checklist' }, { url: `${site}/pricing`, text: 'Pricing', inText: true }] },
    { url: `${site}/blog/c`, status: 200, final: `${site}/blog/c`, links: [...nav, { url: 'http://www.example.com/blog/a', text: 'Planning a week', inText: true }, { url: `${site}/blog/a`, text: 'Planning a week', inText: true }] },
    { url: `${site}/old`, status: 200, final: `${site}/blog/c`, links: [] },
    { url: `${site}/gone`, status: 404, final: `${site}/gone`, links: [] },
  ];
  const summary = summarizeLinks(pages, { sitemapUrls: [`${site}/blog/a`, `${site}/blog/c`, `${site}/blog/d`] });
  assert.deepEqual(summary.templateLinks.sort(), [`${site}/`, `${site}/pricing`]);
  assert.deepEqual(summary.orphans, [`${site}/blog/d`]);
  assert.deepEqual(summary.broken.map((b) => b.target), [`${site}/gone`]);
  assert.deepEqual(summary.redirected.map((r) => [r.target, r.final]), [[`${site}/old`, `${site}/blog/c`]]);
  assert.equal(summary.genericAnchors.length, 1);
  assert.equal(summary.longAnchors.length, 1);
  assert.deepEqual(summary.ambiguousAnchors.map((a) => a.text), ['pricing a website']);
  assert.equal(summary.inbound[`${site}/blog/b`], 1);

  const withFiles = summarizeLinks(
    [{ url: `${site}/`, status: 200, final: `${site}/`, links: [{ url: `${site}/feed.xml`, text: 'RSS' }, { url: `${site}/blog/a`, text: 'Planning' }] }],
    { files: [{ url: `${site}/feed.xml`, status: 404, final: `${site}/feed.xml` }] },
  );
  assert.deepEqual(withFiles.topContentTargets.map((t) => t.url), [`${site}/blog/a`]);
  assert.deepEqual(withFiles.broken.map((b) => b.target), [`${site}/feed.xml`]);
});
