#!/usr/bin/env node
/**
 * Builds the installable skills in skills/ from their sources, so the copies can never drift:
 *   src/skills/<skill>.md  -> skills/<skill>/SKILL.md      shared blocks included where marked
 *   laws/*.md              -> skills/<skill>/references/   the laws each skill needs, ai-crawlers.md
 *   shared/report.md       -> skills/<skill>/references/   the report format
 *   tools/*.mjs            -> skills/<skill>/scripts/      the helper scripts each skill needs
 *
 * A skill must work when it is installed on its own, so every file it needs is copied into it.
 * Links from a law to a law the skill does not carry point at the page on GitHub instead.
 * In a SKILL.md source, a line "<!-- include: shared/<file>.md -->" is replaced by that file.
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
const CRAWL_LAWS = LAWS.slice(0, 3);
const CRAWL_TOOLS = ['lib.mjs', 'page.mjs', 'variants.mjs', 'robots.mjs', 'sitemap.mjs', 'not-found.mjs', 'links.mjs'];

/** What each skill carries. The skill's folder name is its name; its SKILL.md source is src/skills/<name>.md. */
export const SKILLS = {
  blueline: { laws: LAWS, references: ['ai-crawlers.md'], tools: [...CRAWL_TOOLS, 'assets.mjs'] },
  'blueline-crawl': { laws: CRAWL_LAWS, references: ['ai-crawlers.md'], tools: CRAWL_TOOLS },
  'blueline-claims': { laws: ['04-one-source.md', '05-checkable-claims.md'], references: [], tools: ['lib.mjs', 'page.mjs', 'assets.mjs'] },
  'blueline-content': { laws: ['05-checkable-claims.md', '06-one-question.md', '07-no-orphans.md'], references: [], tools: ['lib.mjs', 'page.mjs', 'links.mjs'] },
  'blueline-speed': { laws: ['08-page-first.md', '09-media-once.md'], references: [], tools: ['lib.mjs', 'page.mjs', 'assets.mjs'] },
  'blueline-launch': { laws: ['10-gates.md', ...CRAWL_LAWS], references: ['ai-crawlers.md'], tools: CRAWL_TOOLS },
};
const SHARED_REFERENCES = ['report.md'];

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

function skillFile(name) {
  const source = `src/skills/${name}.md`;
  const text = read(source).replace(/^<!-- include: (shared\/[a-z-]+\.md) -->$/gm, (_, file) => read(file).trim());
  const unresolved = text.match(/<!-- include:[^>]*-->/);
  if (unresolved) throw new Error(`${source}: cannot resolve ${unresolved[0]}`);
  const end = text.indexOf('\n---\n', 4);
  if (!text.startsWith('---\n') || end === -1) throw new Error(`${source}: no frontmatter`);
  const note = `\n<!-- Generated from ${source} and shared/ by scripts/build.mjs. Edit the sources, not this copy. -->\n`;
  return text.slice(0, end + 5) + note + text.slice(end + 5);
}

/** Every generated file of every skill: path relative to the repository -> content. */
export function expectedFiles() {
  const files = new Map();
  for (const [name, spec] of Object.entries(SKILLS)) {
    const base = `skills/${name}`;
    const included = new Set([...spec.laws, ...spec.references]);
    files.set(`${base}/SKILL.md`, skillFile(name));
    for (const file of [...spec.laws, ...spec.references]) {
      files.set(`${base}/references/${file}`, markdownCopy(`laws/${file}`, read(`laws/${file}`), included));
    }
    for (const file of SHARED_REFERENCES) files.set(`${base}/references/${file}`, markdownCopy(`shared/${file}`, read(`shared/${file}`), included));
    for (const file of spec.tools) files.set(`${base}/scripts/${file}`, scriptCopy(`tools/${file}`, read(`tools/${file}`)));
  }
  return files;
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
  for (const path of listFiles('skills')) if (!expected.has(path)) problems.push(`unexpected: ${path}`);
  if (problems.length) {
    console.error(`build --check: ${problems.length} problem(s). Run "npm run build" and commit the result.`);
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log(`build --check: ${expected.size} generated files in ${Object.keys(SKILLS).length} skills are up to date.`);
} else {
  rmSync(join(root, 'skills'), { recursive: true, force: true });
  for (const [path, content] of expected) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  console.log(`build: wrote ${expected.size} files for ${Object.keys(SKILLS).length} skills.`);
}
