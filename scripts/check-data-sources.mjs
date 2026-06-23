#!/usr/bin/env node
/**
 * Single-source guard for the Beijing air-quality dataset.
 *
 * Prevents the historical bug where `beijing-air-quality.csv` existed in three
 * places (data/overview, project_chart, project_time_pipeline) and silently
 * drifted, so different pages showed inconsistent numbers.
 *
 * Checks:
 *   1. The canonical published file exists: data/beijing-air-quality.csv
 *   2. No other `beijing-air-quality.csv` exists outside the pipeline folder
 *      (project_time_pipeline/* are intermediate artifacts, not consumed by pages).
 *   3. Every page reference to `beijing-air-quality.csv` resolves to the
 *      canonical path (no same-folder or data/overview/ references).
 *
 * Exits non-zero on any violation. Usage: node scripts/check-data-sources.mjs
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const CANONICAL = "data/beijing-air-quality.csv";
const PIPELINE_DIR = "data/project_time_pipeline";
const SKIP_DIRS = new Set([".git", "node_modules", "vendor", "assets"]);

const errors = [];
const toPosix = (p) => p.split(sep).join("/");

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    const rel = toPosix(relative(repoRoot, abs));
    if (SKIP_DIRS.has(entry)) continue;
    if (statSync(abs).isDirectory()) walk(abs, files);
    else files.push(rel);
  }
  return files;
}

const allFiles = walk(repoRoot);

// Check 1: canonical exists.
if (!existsSync(join(repoRoot, CANONICAL))) {
  errors.push(`Missing canonical dataset: ${CANONICAL}`);
}

// Check 2: no stray copies of beijing-air-quality.csv outside the pipeline dir.
const strayCopies = allFiles.filter(
  (f) =>
    /(^|\/)beijing-air-quality\.csv$/.test(f) &&
    f !== CANONICAL &&
    !f.startsWith(`${PIPELINE_DIR}/`)
);
for (const f of strayCopies) {
  errors.push(`Stray dataset copy (page data must be single-source): ${f}`);
}

// Check 3: page references must all point at the canonical path.
const codeFiles = allFiles.filter((f) => /\.(html|js|mjs)$/.test(f) && f !== toPosix(relative(repoRoot, fileURLToPath(import.meta.url))));
const refRe = /["'`]([^"'`]*beijing-air-quality\.csv)["'`]/g;
for (const f of codeFiles) {
  const text = readFileSync(join(repoRoot, f), "utf8");
  for (const m of text.matchAll(refRe)) {
    const ref = m[1];
    // Normalize a reference that appears in a file at `f` to a repo-relative path.
    const fromDir = f.includes("/") ? f.slice(0, f.lastIndexOf("/")) : "";
    const resolved = toPosix(
      relative(repoRoot, join(repoRoot, fromDir, ref))
    );
    if (resolved !== CANONICAL) {
      errors.push(`${f}: reference "${ref}" resolves to "${resolved}", expected "${CANONICAL}"`);
    }
  }
}

if (errors.length) {
  console.error("❌ data single-source check FAILED:");
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log("✅ data single-source check passed: all pages use " + CANONICAL);
