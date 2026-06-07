#!/usr/bin/env node
// audit-leaks — two checks:
//   1. Backward dependency: nothing under packages/ may import from instances/.
//   2. Boot-time seed regression (P006B): nothing under apps/ or packages/
//      may reintroduce `ensureSeededMockData` as an exported function or call.
//      Doctrine comments mentioning it by name in inline doctrine notes are
//      explicitly allowed.
//
// This script is intentionally dependency-free (no parser, no globbing libs)
// so it runs in any monorepo state, including a freshly cloned tree.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packagesDir = path.join(repoRoot, 'packages');
const appsDir = path.join(repoRoot, 'apps');

const SOURCE_EXTS = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs']);
const IGNORE_DIRS = new Set(['node_modules', 'dist', '.next', '.turbo', 'build']);

// Patterns that signal a backward dependency from packages/ into instances/.
// Strings inside import { ... } from '...' OR require('...').
const LEAK_PATTERNS = [
  /from\s+['"]@active-instance\/[^'"]*['"]/,
  /from\s+['"][^'"]*\/instances\/[^'"]*['"]/,
  /require\(\s*['"]@active-instance\/[^'"]*['"]\s*\)/,
  /require\(\s*['"][^'"]*\/instances\/[^'"]*['"]\s*\)/,
];

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, acc);
    else if (SOURCE_EXTS.has(path.extname(entry.name))) acc.push(p);
  }
  return acc;
}

if (!fs.existsSync(packagesDir)) {
  console.error(`audit-leaks: ${packagesDir} not found`);
  process.exit(2);
}

const files = walk(packagesDir);
const offenders = [];

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const re of LEAK_PATTERNS) {
      if (re.test(line)) {
        offenders.push({
          file: path.relative(repoRoot, file),
          line: i + 1,
          text: line.trim(),
          pattern: re.source,
        });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// P006B — regression guard: ensureSeededMockData must not return.
//
// Allowed exceptions:
//   - the audit script itself (this file)
//   - inline doctrine comments referencing the removed function by name (we
//     detect this by requiring the leading non-whitespace to be a comment
//     prefix `//` or `*`)
// ---------------------------------------------------------------------------
const SEED_REGRESSION_RE = /ensureSeededMockData/;
const seedScanRoots = [packagesDir, appsDir].filter((d) => fs.existsSync(d));
const seedScanFiles = seedScanRoots.flatMap((d) => walk(d));
const seedOffenders = [];
for (const file of seedScanFiles) {
  if (path.resolve(file) === path.resolve(fileURLToPath(import.meta.url))) continue;
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!SEED_REGRESSION_RE.test(line)) continue;
    // Allow comment-only references — these are doctrine notes, not code.
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
    seedOffenders.push({
      file: path.relative(repoRoot, file),
      line: i + 1,
      text: trimmed,
    });
  }
}

if (offenders.length === 0 && seedOffenders.length === 0) {
  console.log('[LEAK CHECK: PASSED]');
  console.log(`scanned ${files.length} source file(s) under packages/`);
  console.log(
    `scanned ${seedScanFiles.length} source file(s) for ensureSeededMockData regression (P006B)`,
  );
  process.exit(0);
}

if (offenders.length > 0) {
  console.error('[LEAK CHECK: FAILED — backward instance imports]');
  console.error(`${offenders.length} backward-import(s) from packages/ into instances/:`);
  for (const o of offenders) {
    console.error(`  ${o.file}:${o.line}  ${o.text}`);
    console.error(`    matched: /${o.pattern}/`);
  }
}
if (seedOffenders.length > 0) {
  console.error('[LEAK CHECK: FAILED — ensureSeededMockData regression (P006B)]');
  console.error(
    `${seedOffenders.length} non-comment reference(s) to the removed function:`,
  );
  for (const o of seedOffenders) {
    console.error(`  ${o.file}:${o.line}  ${o.text}`);
  }
}
process.exit(1);
