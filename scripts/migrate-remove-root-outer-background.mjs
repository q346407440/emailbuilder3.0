#!/usr/bin/env node
/**
 * 移除 emailRoot.props.outerBackgroundColor（及对应 bindings）：
 * 画布外侧灰底改为项目级 EMAIL_CANVAS_WORKSPACE_BACKGROUND，不随模板持久化。
 *
 * 用法：node scripts/migrate-remove-root-outer-background.mjs --write
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const OUTER_BG_PATH = "props.outerBackgroundColor";

const SCAN_ROOTS = [
  join(REPO, "data"),
  join(REPO, "tests/fixtures"),
];

function walkJsonFiles(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walkJsonFiles(p));
    else if (name.endsWith(".json") && !name.startsWith("_")) out.push(p);
  }
  return out;
}

function migrateDocument(data) {
  const blocks = data.blocks;
  if (!blocks || typeof blocks !== "object") return false;
  let changed = false;

  for (const block of Object.values(blocks)) {
    if (!block || typeof block !== "object" || block.type !== "emailRoot") continue;
    if (block.props && "outerBackgroundColor" in block.props) {
      delete block.props.outerBackgroundColor;
      changed = true;
    }
    if (block.bindings && OUTER_BG_PATH in block.bindings) {
      delete block.bindings[OUTER_BG_PATH];
      changed = true;
    }
  }

  return changed;
}

let touched = 0;
for (const root of SCAN_ROOTS) {
  for (const file of walkJsonFiles(root)) {
    const raw = readFileSync(file, "utf8");
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      continue;
    }
    if (!migrateDocument(data)) continue;
    touched += 1;
    if (WRITE) {
      writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    } else {
      console.log(`[dry-run] ${file}`);
    }
  }
}

console.log(
  WRITE
    ? `已写入 ${touched} 个 JSON 文件（移除 outerBackgroundColor）`
    : `dry-run：将更新 ${touched} 个 JSON 文件；加 --write 执行`
);
