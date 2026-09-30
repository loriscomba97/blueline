#!/usr/bin/env node
// Generated from tools/assets.mjs by scripts/build.mjs. Edit the source, not this copy.
/**
 * assets.mjs: checks what one page downloads on first load, for laws 8, 9 and 5:
 *   - JavaScript and CSS weight, split between the site and other origins (check 8.3);
 *   - for each image: format, bytes, intrinsic size against its declared size (9.1, 9.2),
 *     cache lifetime (9.6), and the provenance metadata inside the file (5.8).
 *
 * Usage: node assets.mjs <url> [--images 30] [--scripts 40]
 *
 * Only what the HTML asks for is counted: scripts and stylesheets loaded later by JavaScript are
 * not, so the JavaScript total is a lower bound.
 */
import { analyzeHtml, fail, follow, imageInfo, parseArgs, print, sameSite, toHttpUrl } from './lib.mjs';

const { positional, values } = parseArgs(process.argv.slice(2), { flags: ['help'], options: ['images', 'scripts'] });
if (values.help || positional.length !== 1) fail('usage: node assets.mjs <url> [--images 30] [--scripts 40]');
const maxImages = Number(values.images ?? 30);
const maxScripts = Number(values.scripts ?? 40);

const start = toHttpUrl(positional[0]);
const { final } = await follow(start);
if (final.status !== 200 || !/html/i.test(final.headers?.['content-type'] ?? '')) fail(`not an HTML page: ${start.href} answered ${final.status || final.error}`);
const page = analyzeHtml(final.body, final.url);
const signals = [];

// Scripts and stylesheets the HTML asks for, preloads included.
const scriptUrls = [...new Set([...page.scripts.filter((s) => s.src).map((s) => s.src), ...page.preloads.filter((p) => p.as === 'script' && p.href).map((p) => p.href)])].slice(0, maxScripts);
const styleUrls = [...new Set([...page.stylesheets.map((s) => s.href), ...page.preloads.filter((p) => p.as === 'style' && p.href).map((p) => p.href)])].slice(0, 20);

/** One file: its final status after redirects, its uncompressed size, and its cache lifetime. */
async function measure(url, { binary = false } = {}) {
  const { chain, final: res } = await follow(url, { binary });
  const decoded = binary ? res.body.length : Buffer.byteLength(res.body ?? '');
  return {
    url,
    status: res.status,
    redirects: chain.length - 1,
    firstParty: sameSite(url, final.url),
    contentType: res.headers['content-type'] ?? null,
    bytes: decoded,
    cacheControl: res.headers['cache-control'] ?? null,
    body: res.body,
    error: res.error,
  };
}

const scripts = [];
for (const url of scriptUrls) scripts.push(await measure(url));
const styles = [];
for (const url of styleUrls) styles.push(await measure(url));

const inlineScriptBytes = page.scripts.filter((s) => s.inline).reduce((sum, s) => sum + (s.bytes ?? 0), 0);
const sum = (list, first) => list.filter((a) => a.firstParty === first).reduce((total, a) => total + a.bytes, 0);
const weight = {
  javascript: { firstPartyBytes: sum(scripts, true), thirdPartyBytes: sum(scripts, false), inlineBytes: inlineScriptBytes, files: scripts.length },
  css: { firstPartyBytes: sum(styles, true), thirdPartyBytes: sum(styles, false), files: styles.length },
  note: 'uncompressed bytes of the files the HTML asks for; transfer sizes are smaller when the server compresses, and JavaScript loaded later is not counted',
};
const kb = (n) => `${Math.round(n / 1024)} KB`;
weight.summary = `the HTML asks for ${scripts.length} scripts, ${kb(weight.javascript.firstPartyBytes)} uncompressed from the site and ${kb(weight.javascript.thirdPartyBytes)} from other origins, plus ${kb(inlineScriptBytes)} inline (check 8.3)`;
const thirdParty = [...new Set(scripts.filter((s) => !s.firstParty).map((s) => new URL(s.url).host))];
if (thirdParty.length) signals.push({ check: '8.2', message: `scripts from ${thirdParty.length} other origins: ${thirdParty.join(', ')}` });

// Images
const images = [];
for (const img of page.images.filter((i) => i.src).slice(0, maxImages)) {
  const res = await measure(img.src, { binary: true });
  const info = res.status === 200 ? imageInfo(res.body) : { format: 'unknown', width: null, height: null, digitalSourceType: null, c2pa: false };
  const declared = Number(img.width) || null;
  const row = {
    url: img.src,
    status: res.status,
    format: info.format,
    contentType: res.contentType,
    bytes: res.bytes,
    redirects: res.redirects,
    intrinsic: info.width ? `${info.width}x${info.height}` : null,
    declared: img.width && img.height ? `${img.width}x${img.height}` : null,
    cacheControl: res.cacheControl,
    alt: img.alt,
    digitalSourceType: info.digitalSourceType,
    c2pa: info.c2pa,
  };
  images.push(row);

  if (declared && info.width && info.format !== 'svg' && info.width > 2 * declared) {
    signals.push({ check: '9.1', message: `${img.src} is ${info.width} px wide for a declared width of ${declared} px (our rule: at most twice)` });
  }
  if (info.format !== 'svg' && row.bytes > 250 * 1024) signals.push({ check: '9.1', message: `${img.src} weighs ${kb(row.bytes)} (our rule: about 250 KB for a content image)` });
  if (info.format === 'png' && row.bytes > 200 * 1024) signals.push({ check: '9.2', message: `${img.src} is a ${kb(row.bytes)} PNG: if it is a photo, WebP or AVIF would be much smaller` });
  const maxAge = Number(row.cacheControl?.match(/max-age=(\d+)/)?.[1] ?? 0);
  if (res.status === 200 && (!row.cacheControl || /no-store|no-cache/.test(row.cacheControl) || maxAge < 7 * 86400)) {
    signals.push({ check: '9.6', message: `${img.src} is cached for ${row.cacheControl ? `"${row.cacheControl}"` : 'no declared time'} (our rule: a year for files that change name when they change)` });
  }
  // Matches alt texts such as "AI-generated illustration." or "made by generative AI".
  const altSaysAi = /\bai[- ]generated\b|\bgenerat(?:ed|ive)\s+(?:with\s+)?ai\b/i.test(img.alt ?? '');
  const fileSaysAi = /trainedAlgorithmicMedia|compositeWithTrainedAlgorithmicMedia|compositeSynthetic/.test(info.digitalSourceType ?? '');
  if (altSaysAi && !fileSaysAi) signals.push({ check: '5.8', message: `${img.src}: the alt text declares an AI image, but the file has no IPTC digital source type for generative AI` });
  if (fileSaysAi && !altSaysAi) signals.push({ check: '5.8', message: `${img.src}: the file says ${info.digitalSourceType}, but the alt text does not declare it` });
}

const failed = [...scripts, ...styles, ...images].filter((a) => a.status !== 200);
if (failed.length) signals.push({ check: '3.5', message: `${failed.length} files the page asks for do not load: ${failed.slice(0, 5).map((a) => `${a.url} (${a.status || a.error})`).join(', ')}` });
const moved = [...scripts, ...styles, ...images].filter((a) => a.status === 200 && a.redirects > 0);
if (moved.length) signals.push({ check: '3.4', message: `${moved.length} files the page asks for go through a redirect, an extra round trip each: ${moved.slice(0, 3).map((a) => a.url).join(', ')}` });

const strip = ({ body, error, ...rest }) => (error ? { ...rest, error } : rest);
print({
  url: final.url,
  weight,
  scripts: scripts.map(strip),
  stylesheets: styles.map(strip),
  images,
  signals,
});
