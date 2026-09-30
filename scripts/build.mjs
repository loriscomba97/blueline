#!/usr/bin/env node
/**
 * Builds the installable skills in skills/ from their sources, so the copies can never drift:
 *   laws/*.md     -> skills/<skill>/references/   the laws each skill needs, and ai-crawlers.md
 *   shared/*.md   -> skills/<skill>/references/   report.md
 *   tools/*.mjs   -> skills/<skill>/scripts/      the helper scripts
 * skills/<skill>/SKILL.md is written by hand and never generated.
 *
 * A skill must work when it is copied on its own, so every file it needs is copied into it. Links
 * from a law to a law the skill does not include point at the page on GitHub instead.
 *
 * Usage: node scripts/build.mjs           write the generated files
 *        node scripts/build.mjs --check   fail when a generated file is missing, stale or unexpected
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_URL = 'https://github.com/loriscomba97/blueline/blob/main';

const LAWS = [
  '01-first-html.md',
  '02-one-url.md',
  '03-no-dead-urls.md',
  '04-one-source.md',
  '05-checkable-claims.md',
  '06-one-question.md',
  '07-no-orphans.md',
  '08-page-first.md',
  '09-media-once.md',
  '10-gates.md',
];
const TOOLS = ['lib.mjs', 'page.mjs', 'variants.mjs', 'robots.mjs', 'sitemap.mjs', 'not-found.mjs'];

/** What each skill carries. The skill's folder name is its name. */
export const SKILLS = {
  blueline: { laws: LAWS, references: ['ai-crawlers.md'], shared: ['report.md'], tools: TOOLS },
};

const read = (path) => readFileSync(join(root, path), 'utf8');

function markdownCopy(source, text, included) {
  const note = `<!-- Generated from ${source} by scripts/build.mjs. Edit the source, not this copy. -->\n\n`;
  const linked = text.replace(/\]\(((?:\d\d-[a-z-]+|ai-crawlers)\.md)(#[^)]*)?\)/g, (whole, file, hash = '') =>
    included.has(file) ? whole : `](${REPO_URL}/laws/${file}${hash})`,
  );
  return note + linked;
}

function scriptCopy(source, text) {
  const note = `// Generated from ${source} by scripts/build.mjs. Edit the source, not this copy.\n`;
  return text.startsWith('#!') ? text.replace(/^(#![^\n]*\n)/, `$1${note}`) : note + text;
}

/** Every generated file of every skill: path relative to the repository -> content. */
export function expectedFiles() {
  const files = new Map();
  for (const [name, spec] of Object.entries(SKILLS)) {
    const base = `skills/${name}`;
    const included = new Set([...spec.laws, ...spec.references]);
    for (const file of [...spec.laws, ...spec.references]) {
      files.set(`${base}/references/${file}`, markdownCopy(`laws/${file}`, read(`laws/${file}`), included));
    }
    for (const file of spec.shared) files.set(`${base}/references/${file}`, markdownCopy(`shared/${file}`, read(`shared/${file}`), included));
    for (const file of spec.tools) files.set(`${base}/scripts/${file}`, scriptCopy(`tools/${file}`, read(`tools/${file}`)));
  }
  return files;
}

function generatedDirs() {
  return Object.keys(SKILLS).flatMap((name) => [`skills/${name}/references`, `skills/${name}/scripts`]);
}

function listFiles(dir) {
  const abs = join(root, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs, { recursive: true, withFileTypes: true })
    .filter((d) => d.isFile() && d.name !== '.DS_Store')
    .map((d) => relative(root, join(d.parentPath ?? d.path, d.name)));
}

const expected = expectedFiles();

if (process.argv.includes('--check')) {
  const problems = [];
  for (const [path, content] of expected) {
    const abs = join(root, path);
    if (!existsSync(abs)) problems.push(`missing: ${path}`);
    else if (readFileSync(abs, 'utf8') !== content) problems.push(`stale: ${path}`);
  }
  for (const dir of generatedDirs()) for (const path of listFiles(dir)) if (!expected.has(path)) problems.push(`unexpected: ${path}`);
  for (const name of Object.keys(SKILLS)) if (!existsSync(join(root, `skills/${name}/SKILL.md`))) problems.push(`missing: skills/${name}/SKILL.md`);
  if (problems.length) {
    console.error(`build --check: ${problems.length} problem(s). Run "npm run build" and commit the result.`);
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log(`build --check: ${expected.size} generated files are up to date.`);
} else {
  for (const dir of generatedDirs()) rmSync(join(root, dir), { recursive: true, force: true });
  for (const [path, content] of expected) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  console.log(`build: wrote ${expected.size} files for ${Object.keys(SKILLS).length} skill(s).`);
}
