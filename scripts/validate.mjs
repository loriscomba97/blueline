#!/usr/bin/env node
/**
 * Checks every skill in skills/ against the Agent Skills specification (agentskills.io) and our own
 * limits, so a skill that would not load, or would load badly, never ships:
 *   - SKILL.md starts with YAML frontmatter holding only the fields the specification defines;
 *   - name: 1 to 64 lowercase letters, digits and single hyphens, equal to the folder name;
 *   - description: 1 to 1024 characters; compatibility: at most 500;
 *   - SKILL.md: at most 500 lines;
 *   - every relative link resolves inside the skill, at most one folder deep from SKILL.md.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const skillsDir = join(root, 'skills');
const ALLOWED = new Set(['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools']);
const problems = [];

/** The small YAML subset our SKILL.md files use: "key: value" lines and one nested "metadata:" map. */
function frontmatter(text, where) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) {
    problems.push(`${where}: no frontmatter`);
    return null;
  }
  const data = {};
  let nested = null;
  for (const line of m[1].split('\n')) {
    if (!line.trim()) continue;
    const top = line.match(/^([a-z][a-z-]*):\s*(.*)$/);
    if (top) {
      const [, key, value] = top;
      if (value === '') {
        data[key] = {};
        nested = data[key];
      } else {
        data[key] = unquote(value);
        nested = null;
      }
      continue;
    }
    const inner = line.match(/^\s+([A-Za-z0-9_.-]+):\s*(.*)$/);
    if (inner && nested) nested[inner[1]] = unquote(inner[2]);
    else problems.push(`${where}: cannot read frontmatter line "${line}"`);
  }
  return data;
}

function unquote(value) {
  const v = value.trim();
  return (v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")) ? v.slice(1, -1) : v;
}

/** Markdown links outside code blocks and inline code, other than web, mail and in-page links. */
function relativeLinks(text) {
  const prose = text.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
  return [...prose.matchAll(/\]\(([^)\s]+)\)/g)].map((m) => m[1]).filter((href) => !/^(https?:|mailto:|#)/i.test(href));
}

const skills = existsSync(skillsDir) ? readdirSync(skillsDir, { withFileTypes: true }).filter((d) => d.isDirectory()) : [];
if (!skills.length) problems.push('skills/: no skills found');

for (const dir of skills) {
  const base = join(skillsDir, dir.name);
  const skillFile = join(base, 'SKILL.md');
  const where = `skills/${dir.name}/SKILL.md`;
  if (!existsSync(skillFile)) {
    problems.push(`${where}: missing`);
    continue;
  }
  const text = readFileSync(skillFile, 'utf8');
  const data = frontmatter(text, where);
  if (data) {
    for (const key of Object.keys(data)) if (!ALLOWED.has(key)) problems.push(`${where}: unknown frontmatter field "${key}"`);
    const name = data.name ?? '';
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) || name.length > 64) problems.push(`${where}: invalid name "${name}"`);
    if (name !== dir.name) problems.push(`${where}: name "${name}" does not match the folder "${dir.name}"`);
    const description = typeof data.description === 'string' ? data.description : '';
    if (!description || description.length > 1024) problems.push(`${where}: description must be 1 to 1024 characters (it is ${description.length})`);
    if (typeof data.compatibility === 'string' && data.compatibility.length > 500) problems.push(`${where}: compatibility is over 500 characters`);
    if ('metadata' in data && (typeof data.metadata !== 'object' || Object.values(data.metadata).some((v) => typeof v !== 'string'))) {
      problems.push(`${where}: metadata must map strings to strings`);
    }
  }
  const lines = text.split('\n').length;
  if (lines > 500) problems.push(`${where}: ${lines} lines (limit 500)`);

  for (const href of relativeLinks(text)) {
    const path = normalize(href.split('#')[0]);
    if (path.startsWith('..') || path.split('/').length > 2) problems.push(`${where}: link "${href}" leaves the skill or is more than one folder deep`);
    else if (!existsSync(join(base, path))) problems.push(`${where}: link "${href}" does not resolve`);
  }
  const refs = join(base, 'references');
  if (existsSync(refs)) {
    for (const file of readdirSync(refs).filter((f) => f.endsWith('.md'))) {
      for (const href of relativeLinks(readFileSync(join(refs, file), 'utf8'))) {
        const path = normalize(href.split('#')[0]);
        if (path.includes('/') || !existsSync(join(refs, path))) problems.push(`skills/${dir.name}/references/${file}: link "${href}" does not resolve inside references/`);
      }
    }
  }
}

if (problems.length) {
  console.error(`validate: ${problems.length} problem(s).`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(`validate: ${skills.length} skill(s) follow the Agent Skills format.`);
