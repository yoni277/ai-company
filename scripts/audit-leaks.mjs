#!/usr/bin/env node
// audit-leaks — the single doctrine gate. Four checks, one consolidated run:
//   1. Backward dependency: nothing under packages/ may import from instances/.
//   2. Boot-time seed regression (P006B): nothing under apps/ or packages/
//      may reintroduce `ensureSeededMockData` as an exported function or call.
//      Doctrine comments mentioning it by name in inline notes are allowed.
//   3. Forbidden imports: no generic package may import a business-specific
//      connector (except that connector's own implementation); no package
//      outside packages/connectors/ may import a denied vendor SDK.
//   4. Prompt-boundary lexicon: generic code (packages/ + apps/) must not name
//      instance business vocabulary in executable lines.
//
// This script is intentionally dependency-free (no parser, no globbing libs)
// so it runs in any monorepo state, including a freshly cloned tree.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packagesDir = path.join(repoRoot, 'packages');
const appsDir = path.join(repoRoot, 'apps');
const selfPath = path.resolve(fileURLToPath(import.meta.url));

const SOURCE_EXTS = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs']);
const IGNORE_DIRS = new Set(['node_modules', 'dist', '.next', '.turbo', 'build']);

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

/** Repo-relative POSIX path (stable across platforms for prefix tests). */
const relPosix = (file) => path.relative(repoRoot, file).split(path.sep).join('/');

const packageFiles = walk(packagesDir);
const appFiles = fs.existsSync(appsDir) ? walk(appsDir) : [];

// ===========================================================================
// Check 1 — backward dependency from packages/ into instances/.
// Strings inside import { ... } from '...' OR require('...').
// ===========================================================================
const LEAK_PATTERNS = [
  /from\s+['"]@active-instance\/[^'"]*['"]/,
  /from\s+['"][^'"]*\/instances\/[^'"]*['"]/,
  /require\(\s*['"]@active-instance\/[^'"]*['"]\s*\)/,
  /require\(\s*['"][^'"]*\/instances\/[^'"]*['"]\s*\)/,
];

const check1 = [];
for (const file of packageFiles) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    for (const re of LEAK_PATTERNS) {
      if (re.test(lines[i])) {
        check1.push({ file: relPosix(file), line: i + 1, text: lines[i].trim(), why: `/${re.source}/` });
      }
    }
  }
}

// ===========================================================================
// Check 2 — P006B regression: ensureSeededMockData must not return.
// Allowed: this script; inline doctrine comments (leading // or *).
// ===========================================================================
const SEED_REGRESSION_RE = /ensureSeededMockData/;
const seedScanFiles = [...packageFiles, ...appFiles];
const check2 = [];
for (const file of seedScanFiles) {
  if (path.resolve(file) === selfPath) continue;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (!SEED_REGRESSION_RE.test(lines[i])) continue;
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
    check2.push({ file: relPosix(file), line: i + 1, text: trimmed });
  }
}

// ===========================================================================
// Check 3 — forbidden imports.
//   - BUSINESS_CONNECTOR_DENYLIST: no packages/ file may import a denied
//     business connector, except that connector's own implementation dir.
//   - VENDOR_DENYLIST: no packages/ file OUTSIDE packages/connectors/ may
//     import a denied vendor SDK (bare, scoped @vendor/*, or vendor/* forms).
// ===========================================================================
const BUSINESS_CONNECTOR_DENYLIST = [
  '@ai-company/connector-foodtruck-business',
  // Add future business-specific connectors here.
];
// Each denied connector exempts its own implementation directory.
const CONNECTOR_OWN_DIR = {
  '@ai-company/connector-foodtruck-business': 'packages/connectors/foodtruck-business/',
};
const VENDOR_DENYLIST = ['stripe', 'hubspot'];

/** Extract every module specifier referenced on a line. */
function extractModules(line) {
  const mods = [];
  const patterns = [
    /\bfrom\s+['"]([^'"]+)['"]/g, // import ... from 'x'
    /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g, // require('x')
    /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g, // dynamic import('x')
    /\bimport\s+['"]([^'"]+)['"]/g, // bare side-effect import 'x'
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(line)) !== null) mods.push(m[1]);
  }
  return mods;
}

const importsDenied = (mod, denied) => mod === denied || mod.startsWith(denied + '/');
const importsVendor = (mod, v) =>
  mod === v || mod.startsWith(v + '/') || mod.startsWith('@' + v + '/');

const check3 = [];
for (const file of packageFiles) {
  if (path.resolve(file) === selfPath) continue;
  const rel = relPosix(file);
  const outsideConnectors = rel.startsWith('packages/') && !rel.startsWith('packages/connectors/');
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const mods = extractModules(lines[i]);
    if (mods.length === 0) continue;
    for (const mod of mods) {
      // business-connector denylist (exempt the connector's own impl dir)
      for (const denied of BUSINESS_CONNECTOR_DENYLIST) {
        if (importsDenied(mod, denied) && !rel.startsWith(CONNECTOR_OWN_DIR[denied])) {
          check3.push({ file: rel, line: i + 1, text: lines[i].trim(), why: `business connector "${mod}"` });
        }
      }
      // vendor denylist (only packages/ outside packages/connectors/)
      if (outsideConnectors) {
        for (const v of VENDOR_DENYLIST) {
          if (importsVendor(mod, v)) {
            check3.push({ file: rel, line: i + 1, text: lines[i].trim(), why: `vendor SDK "${mod}"` });
          }
        }
      }
    }
  }
}

// ===========================================================================
// Check 4 — prompt-boundary lexicon over packages/ + apps/.
// Exempt: packages/connectors/**, test files (*.test.ts(x), /tests/),
// comment-only lines. Generic words (owner, vendor, customer, revenue) are
// NOT banned — the patterns below are word-bounded / separator-required.
// ===========================================================================
const LEXICON = [
  /\bfoodtruck\b/i,
  /\bfood[- ]?trucks?\b/i,
  /\btrucks?\b/i,
  /\blabs?\b/i,
  /owner[- ]acquisition/i, // separator required → does NOT match ownerAcquisitionSummary
  /\bGMV\b/i,
  /lab-os/i, // folded-in Test E term
  /inventory-engine/i, // folded-in Test E term
  /whatsapp-engine/i, // folded-in Test E term
];

const isTestFile = (rel) => /\.test\.(ts|tsx)$/.test(rel) || rel.includes('/tests/');
const isCommentOnly = (trimmed) =>
  trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*');

// The lexicon scan matches the canonical Test E scope: TypeScript/TSX source
// only. Build manifests and config (.js/.mjs/.cjs — e.g. next.config.mjs's
// transpilePackages list) structurally enumerate workspace package names and
// are out of the prompt-boundary lexicon's scope.
const isLexiconScoped = (rel) => /\.(ts|tsx)$/.test(rel);

const check4 = [];
for (const file of [...packageFiles, ...appFiles]) {
  if (path.resolve(file) === selfPath) continue;
  const rel = relPosix(file);
  if (!isLexiconScoped(rel)) continue; // .ts/.tsx only (Test E scope)
  if (rel.startsWith('packages/connectors/')) continue; // connector layer exempt
  if (isTestFile(rel)) continue; // test fixtures exempt
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed === '' || isCommentOnly(trimmed)) continue;
    for (const re of LEXICON) {
      if (re.test(lines[i])) {
        check4.push({ file: rel, line: i + 1, text: trimmed, why: `/${re.source}/` });
        break; // one offense per line is enough
      }
    }
  }
}

// ===========================================================================
// Consolidated report.
// ===========================================================================
function report(label, offenders, extra) {
  if (offenders.length === 0) {
    console.log(`Check ${label}: PASS${extra ? ` (${extra})` : ''}`);
    return true;
  }
  console.error(`Check ${label}: FAILED — ${offenders.length} offender(s):`);
  for (const o of offenders) {
    console.error(`  ${o.file}:${o.line}  ${o.text}`);
    if (o.why) console.error(`    → ${o.why}`);
  }
  return false;
}

console.log('=== audit-leaks: doctrine gate (4 checks) ===');
const ok1 = report('1 (backward instance imports)', check1, `scanned ${packageFiles.length} packages/ file(s)`);
const ok2 = report('2 (ensureSeededMockData regression, P006B)', check2, `scanned ${seedScanFiles.length} file(s)`);
const ok3 = report('3 (forbidden imports: business connectors + vendor SDKs)', check3, `scanned ${packageFiles.length} packages/ file(s)`);
const lexiconFileCount = [...packageFiles, ...appFiles].filter((f) => isLexiconScoped(relPosix(f))).length;
const ok4 = report('4 (prompt-boundary lexicon, .ts/.tsx)', check4, `scanned ${lexiconFileCount} packages/+apps/ file(s)`);

if (ok1 && ok2 && ok3 && ok4) {
  console.log('[LEAK CHECK: PASSED]');
  process.exit(0);
}
console.error('[LEAK CHECK: FAILED]');
process.exit(1);
