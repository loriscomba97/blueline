/**
 * A tiny web server for the test sites. Each site is a folder of files plus a config.json:
 *
 *   unknown        "404" answers a real 404 for unknown paths; "soft404" answers 200 (a soft 404)
 *   trailingSlash  "redirect" sends /x/ to /x with a 308; "duplicate" serves the same page at both
 *   caseInsensitive  true serves /Pricing as /pricing (a duplicate); false answers 404
 *   redirects      { "/old": [301, "/new"] }
 *   status         { "/gone": 404 }: a fixed status for a path
 *   headers        { "/assets/*": { "cache-control": "..." } }: extra headers, "*" matching any suffix
 *   generated      { "/assets/hero.png": { "format": "png", "width": 3000, "height": 2000, "bytes": 270000 } }
 *
 * In text files, {{origin}} becomes the site's own origin and {{other}} the origin of a second
 * server, which plays the part of a third party.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, relative, sep } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

function png(width, height, bytes) {
  const header = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(header, 0);
  header.writeUInt32BE(13, 8);
  header.write('IHDR', 12, 'latin1');
  header.writeUInt32BE(width, 16);
  header.writeUInt32BE(height, 20);
  return Buffer.concat([header, Buffer.alloc(Math.max(0, bytes - header.length))]);
}

function headersFor(config, path) {
  const out = {};
  for (const [pattern, values] of Object.entries(config.headers ?? {})) {
    const match = pattern.endsWith('*') ? path.startsWith(pattern.slice(0, -1)) : path === pattern;
    if (match) Object.assign(out, values);
  }
  return out;
}

/** True only when every segment of the path exists with exactly this case, even on a case-insensitive disk. */
function existsExactly(root, abs) {
  let current = root;
  for (const segment of relative(root, abs).split(sep)) {
    if (!existsSync(current) || !readdirSync(current).includes(segment)) return false;
    current = join(current, segment);
  }
  return statSync(current).isFile();
}

export function startSite(dir, { other = '' } = {}) {
  const config = JSON.parse(readFileSync(join(dir, 'config.json'), 'utf8'));
  let origin = '';
  const fill = (text) => text.replaceAll('{{origin}}', origin).replaceAll('{{other}}', other);

  const fileFor = (path) => {
    const clean = decodeURIComponent(path).replace(/^\/+/, '');
    const candidates = clean === '' ? ['index.html'] : clean.endsWith('/') ? [`${clean}index.html`, `${clean.slice(0, -1)}.html`] : [`${clean}.html`, clean];
    for (const c of candidates) {
      const abs = join(dir, c);
      if (!abs.startsWith(dir)) continue;
      if (existsExactly(dir, abs)) return abs;
    }
    return null;
  };

  const server = createServer((req, res) => {
    const url = new URL(req.url, origin);
    let path = url.pathname;
    const send = (status, body, type, extra = {}) => {
      res.writeHead(status, { 'content-type': type, ...headersFor(config, path), ...extra });
      res.end(req.method === 'HEAD' ? undefined : body);
    };

    if (config.redirects?.[path]) {
      const [status, target] = config.redirects[path];
      res.writeHead(status, { location: target });
      return res.end();
    }
    if (path.length > 1 && path.endsWith('/') && config.trailingSlash === 'redirect') {
      res.writeHead(308, { location: path.slice(0, -1) + url.search });
      return res.end();
    }
    if (config.caseInsensitive) path = path.toLowerCase();
    if (config.status?.[path]) {
      const page = fileFor('404');
      return send(config.status[path], page ? fill(readFileSync(page, 'utf8')) : 'Not found', TYPES['.html']);
    }
    const generated = config.generated?.[path];
    if (generated) return send(200, png(generated.width, generated.height, generated.bytes), TYPES['.png']);

    const file = fileFor(path);
    if (!file) {
      const page = fileFor('404');
      const status = config.unknown === 'soft404' ? 200 : 404;
      return send(status, page ? fill(readFileSync(page, 'utf8')) : 'Not found', TYPES['.html']);
    }
    const type = TYPES[extname(file)] ?? 'application/octet-stream';
    const raw = readFileSync(file);
    return send(200, type.startsWith('text/') || type.includes('xml') || type.includes('svg') ? fill(raw.toString('utf8')) : raw, type);
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      origin = `http://127.0.0.1:${server.address().port}`;
      resolve({ origin, close: () => new Promise((done) => server.close(done)) });
    });
  });
}
