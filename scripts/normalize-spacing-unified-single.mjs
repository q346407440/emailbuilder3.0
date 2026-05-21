#!/usr/bin/env node
/**
 * 审计 / 修复 SpacingValue：unified 禁止 CSS 多值简写（须单边长度；四边不同用 separate）。
 * 真源校验：src/lib/validate.ts · validateSpacingValue
 *
 * 用法：
 *   node scripts/normalize-spacing-unified-single.mjs           # 仅检查 data/emails 下 template.json
 *   node scripts/normalize-spacing-unified-single.mjs --write   # 写回修复
 *   node scripts/normalize-spacing-unified-single.mjs --all-json  # 额外扫描 data/** tests/** 内全部 JSON
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listEmailTemplatePaths } from "./lib/list-email-template-paths.mjs";
import {
  collectSpacingViolations,
  deepNormalizeSpacingValues,
} from "./lib/spacing-value-normalize.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, "..");
const EMAILS = path.join(REPO, "data", "emails");
const write = process.argv.includes("--write");
const scanAllJson = process.argv.includes("--all-json");

/** @param {string} dir @returns {string[]} */
function listJsonFilesRecursive(dir) {
  /** @type {string[]} */
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...listJsonFilesRecursive(p));
    else if (ent.name.endsWith(".json")) out.push(p);
  }
  return out;
}

/** @returns {string[]} */
function targetTemplatePaths() {
  const paths = new Set(listEmailTemplatePaths(EMAILS));
  if (scanAllJson) {
    for (const root of ["data", "tests"]) {
      for (const p of listJsonFilesRecursive(path.join(REPO, root))) {
        if (p.includes("template.json") || p.endsWith(".expected.json")) {
          paths.add(p);
        }
      }
    }
  }
  return [...paths].sort();
}

/** @type {Array<{ file: string, hits: ReturnType<typeof collectSpacingViolations> }>} */
const reports = [];

for (const file of targetTemplatePaths()) {
  const raw = fs.readFileSync(file, "utf8");
  const json = JSON.parse(raw);
  const hits = collectSpacingViolations(json);
  if (hits.length === 0) continue;

  reports.push({ file, hits });

  if (write) {
    const { value, fixes } = deepNormalizeSpacingValues(json);
    fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
    process.stdout.write(`[fix] ${path.relative(REPO, file)} (${fixes.length} 处)\n`);
    for (const f of fixes) {
      process.stdout.write(`      ${f.path}\n`);
    }
  }
}

if (reports.length === 0) {
  process.stdout.write(
    `[ok] 已检查 ${targetTemplatePaths().length} 个模板 JSON，未发现 unified 多值简写违规\n`
  );
  process.exit(0);
}

process.stdout.write(`\n=== SpacingValue unified 多值简写违规（共 ${reports.length} 个文件）===\n`);
for (const { file, hits } of reports) {
  process.stdout.write(`\n${path.relative(REPO, file)}\n`);
  for (const h of hits) {
    process.stdout.write(`  ${h.path}: ${JSON.stringify(h.unified)}\n`);
  }
}

if (!write) {
  process.stderr.write(
    "\n请运行：node scripts/normalize-spacing-unified-single.mjs --write\n"
  );
  process.exit(1);
}

process.stdout.write(`\n[done] 已修复 ${reports.length} 个文件\n`);
