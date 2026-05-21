#!/usr/bin/env npx tsx
/**
 * 为全部 template 中的 button 补齐 contentAlign.horizontal，
 * 并将 fill 宽按钮上误写在 placement 的胶囊对齐意图迁移到 contentAlign。
 *
 * 用法：npx tsx scripts/migrate-button-content-align.ts [--write]
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import type { EmailTemplate } from "../src/types/email";
import { normalizeButtonContentAlign } from "../src/lib/buttonContentAlign";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const EMAILS_DIR = join(REPO_ROOT, "data", "emails");
const write = process.argv.includes("--write");

function listTemplatePaths(): string[] {
  return readdirSync(EMAILS_DIR)
    .map((name) => join(EMAILS_DIR, name, "template.json"))
    .filter((p) => statSync(p, { throwIfNoEntry: false })?.isFile());
}

let changedFiles = 0;
for (const tplPath of listTemplatePaths()) {
  const template = JSON.parse(readFileSync(tplPath, "utf8")) as EmailTemplate;
  let changed = false;
  for (const block of Object.values(template.blocks)) {
    if (normalizeButtonContentAlign(block)) changed = true;
  }
  if (!changed) {
    console.log(`[skip] ${tplPath}`);
    continue;
  }
  changedFiles += 1;
  console.log(`[${write ? "write" : "dry"}] ${tplPath}`);
  if (write) {
    writeFileSync(tplPath, `${JSON.stringify(template, null, 2)}\n`, "utf8");
  }
}

if (!write && changedFiles > 0) {
  console.log(`\n共 ${changedFiles} 个文件待写入，请加 --write`);
  process.exit(1);
}

console.log(write ? `已更新 ${changedFiles} 个 template.json` : "无变更");
