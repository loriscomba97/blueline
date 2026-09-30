# Law 9. Media is prepared once and cached forever

**The law.** Every image and video is prepared once:

- encoded for the size it is shown at, doubled for sharp screens;
- in a modern format;
- with its dimensions declared.

It lives at a permanent URL that browsers may cache for a year, and changing it means a new file name. Nothing on the page points at a URL that expires.

## Why it matters

- **Images are most of the weight of a typical marketing page.** An image encoded once at the right size saves every visitor the difference, on every visit.
- **Declared dimensions reserve space**, so the layout does not jump when the file arrives.
- **Modern formats such as WebP and AVIF** are much smaller than JPEG and PNG at the same quality, and Google Images supports both.
- **Long caching makes repeat visits instant**, but only works when a changed file gets a new URL. Otherwise visitors keep the old file for a year.
- **Signed file URLs expire.** Many CMSs and storage services hand out links that stop working after minutes or hours. A page that bakes one into its HTML shows a broken image to everyone who visits after the link expires.

## Checks

### 9.1 Images are sized for where they are shown

**Where:** live URL · **Default severity:** fix soon

For each image, compare its intrinsic width with the width it is displayed at on a desktop layout. Report images more than twice as wide as their largest display size.

Also report:
- content images over about 250 KB;
- logos and icons over about 30 KB;
- decorative backgrounds shipped as photos where a CSS gradient would do.

When the same image is shown much smaller on phones, one desktop-sized file can cost a phone two to four times the data it needs. Report large images that have no `srcset` and `sizes`.

In a browser console:

```js
[...document.images].map((i) => [i.currentSrc, i.naturalWidth, i.clientWidth]).filter(([, n, c]) => n > 2.5 * c && c > 0);
```

### 9.2 Photos use a modern format

**Where:** live URL · **Default severity:** fix soon

Report:

- photographs served as PNG;
- large JPEGs that have no WebP or AVIF version.

Keep PNG or SVG for flat graphics, screenshots with text, and images that need sharp transparency.

### 9.3 Every image and video declares its size

**Where:** live URL · **Default severity:** fix soon

Every `<img>`, `<video>` and `<iframe>` has `width` and `height` attributes, or a CSS `aspect-ratio` on its container.

```bash
grep -oiE '<img[^>]*>' page.html | grep -viE 'width=' | head
```

Report each element without declared dimensions.

### 9.4 Images load in the right order

**Where:** live URL · **Default severity:** fix soon

- Images outside the first screen carry `loading="lazy"` and `decoding="async"`.
- Images likely to be visible on load are not lazy. The main one carries `fetchpriority="high"` ([law 8](08-page-first.md)).

Report lazy-loaded hero images, and long pages that load every image eagerly.

### 9.5 Alt text describes what is visible

**Where:** live URL, content · **Default severity:** fix soon

- **Content images** are `<img>` elements. Google does not index images set as CSS backgrounds.
- **Their alt text** describes what is in the image, in a plain sentence. About 80 to 125 characters is a good length. Never start with "Image of" or "Photo of", and never describe what is not visible.
- **Decorative images**, and avatars next to the person's name, have `alt=""`.
- **AI-generated images** are declared ([law 5](05-checkable-claims.md)).

Report missing alt attributes, file names used as alt text, keyword lists, and identical alt text on different images.

### 9.6 Static media is cached for a year

**Where:** live URL · **Default severity:** fix soon

```bash
curl -sI https://www.example.com/assets/hero-home.webp | grep -i cache-control
```

Versioned or renamed-on-change files should answer `Cache-Control: public, max-age=31536000`. `immutable` is a useful extra that some browsers ignore. Report short or missing cache lifetimes on images, fonts, scripts and styles.

Report files that are overwritten in place under the same name: they need a new name, or a content hash in the name, to be cached safely.

### 9.7 No image points at an expiring link

**Where:** live URL, content · **Default severity:** blocker

Search the HTML and the CMS content for image URLs that carry a signature or an expiry. Look for query parameters such as:

- `X-Amz-Expires`, `X-Amz-Signature`;
- `Expires=`, `Signature=`;
- `se=` with `sig=`.

Also look for the temporary file hosts of your CMS.

```bash
grep -oiE '(src|href)="[^"]*(x-amz-(expires|signature)|[?&](expires|signature|sig)=)[^"]*"' page.html
```

Report every hit. The fix is a permanent URL: re-host the file on your domain or a public bucket, or serve it through a route that fetches a fresh signed URL on each request.

### 9.8 Video costs nothing until it plays

**Where:** live URL · **Default severity:** fix soon

Every `<video>` element has all of these:

- `preload="none"` (or `metadata`);
- a `poster` image;
- a declared aspect ratio.

Autoplay is muted, plays only while the video is on screen, and is off when the visitor prefers reduced motion.

Embeds from video platforms load lazily, or through a click-to-play preview. Report:

- videos that download on page load;
- clips that are heavy for their length (a few MB per minute at 1080p is plenty for a muted loop);
- players embedded above the fold with no preview image.

### 9.9 Sharing images work

**Where:** live URL · **Default severity:** polish

`og:image` has these properties:

- it is an absolute URL that answers `200`;
- it is about 1200 × 630 pixels;
- it is specific to the page where the page has its own image.

The Twitter or X card tags agree with it. Report missing, broken or undersized sharing images.

Google also looks at `og:image`, and at the schema.org `primaryImageOfPage`, when it picks a thumbnail for Search and Discover. It advises against logos and images full of text there.

### 9.10 Source files stay out of the deploy

**Where:** code · **Default severity:** polish

Report large originals (PSD, full-size PNG or JPEG masters, raw video) inside the public folder that no page references. Keep them in a separate folder, or out of the repository.

## Fixes

- **Encode once, at twice the display size.** Use WebP (around quality 80 for photos) or AVIF, with the size in the markup. Add a smaller version through `srcset` when phones show the image much smaller.
- **Name files by role and version**, for example `hero-pricing-v2.webp`. Change the name to change the file, and cache everything under the assets path for a year.
- **Keep growing media in a public bucket or on a CDN** (blog covers, customer photos, video), referenced by permanent URLs.
- **Use the framework's image component where the host optimizes images**, or plain `<img>` with pre-encoded files where it does not. Pick one, and do not mix them.

```html
<img
  src="/assets/hero-pricing-v2.webp"
  width="1200" height="800"
  alt="Two plan cards side by side, monthly and yearly, with the yearly card highlighted."
  fetchpriority="high" decoding="async">

<img
  src="/assets/shot-reports-1.webp"
  width="960" height="640"
  alt="A weekly report table with three rows flagged in red."
  loading="lazy" decoding="async">
```

## Exceptions

- **Images that must change at the same URL**, such as a live chart, get a short cache time and a note explaining why.
- **Tiny inline SVG icons** need no `width` and `height` when their size is fixed in CSS.

## Sources

Checked on 30 September 2026.

- web.dev: [Learn Images](https://web.dev/learn/images)
- web.dev: [Serve responsive images](https://web.dev/articles/serve-responsive-images)
- web.dev: [Browser-level image lazy loading](https://web.dev/articles/browser-level-image-lazy-loading)
- web.dev: [Optimize Cumulative Layout Shift](https://web.dev/articles/optimize-cls)
- web.dev: [Prevent unnecessary network requests with the HTTP Cache](https://web.dev/articles/http-cache)
- Google Search Central: [Google Images SEO best practices](https://developers.google.com/search/docs/appearance/google-images)
