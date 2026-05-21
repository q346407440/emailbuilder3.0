#!/usr/bin/env node
/**
 * 一次性迁移：从所有 `type: "text"` 的 `props` 中删除已废弃字段 `textKind`。
 *
 * 用法：node scripts/migrate-remove-text-kind.mjs --write
 *       node scripts/migrate-remove-text-kind.mjs           # dry-run
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..");
const EMAILS = join(REPO, "data", "emails");
const WRITE = process.argv.includes("--write");

let filesTouched = 0;
let blocksStripped = 0;

function stripTemplate(data) {
  const blocks = data?.blocks;
  if (!blocks || typeof blocks !== "object") return false;
  let touched = false;
  for (const b of Object.values(blocks)) {
    if (!b || typeof b !== "object" || b.type !== "text") continue;
    const p = b.props;
    if (p && typeof p === "object" && !Array.isArray(p) && "textKind" in p) {
      delete p.textKind;
      blocksStripped += 1;
      touched = true;
    }
  }
  if (touched) filesTouched += 1;
  return touched;
}

function processJsonFile(path) {
  const raw = readFileSync(path, "utf8");
  const data = JSON.parse(raw);
  if (!stripTemplate(data)) return;
  if (WRITE) {
    writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  }
}

for (const name of readdirSync(EMAILS)) {
  const dir = join(EMAILS, name);
  if (!statSync(dir).isDirectory()) continue;
  const tpl = join(dir, "template.json");
  try {
    statSync(tpl);
  } catch {
    continue;
  }
  processJsonFile(tpl);
}

console.log(
  WRITE
    ? `已写入：处理 ${filesTouched} 个 template.json，共移除 ${blocksStripped} 处 props.textKind。`
    : `[dry-run] 将处理 ${filesTouched} 个 template.json，共 ${blocksStripped} 处 props.textKind（加 --write 落盘）。`
);
