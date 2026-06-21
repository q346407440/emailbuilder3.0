#!/usr/bin/env node
/**
 * 为全量 tokenPresets.json 补齐标准键 colors.accent。
 * - data/emails 下各 tokenPresets.json → #1A1A1A（品牌强调色默认）
 * - data/token-presets/*.json → #FFFFFF（公共预设统一白色）
 *
 * 用法：node scripts/migrate-add-colors-accent.mjs [--write]
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const EMAILS_DIR = join(ROOT, "data", "emails");
const PUBLIC_PRESETS_DIR = join(ROOT, "data", "token-presets");

const EMAIL_ACCENT = "#1A1A1A";
const PUBLIC_ACCENT = "#FFFFFF";

const write = process.argv.includes("--write");

function listTokenPresetFiles(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p, { throwIfNoEntry: false });
    if (!st) continue;
    if (st.isDirectory()) {
      listTokenPresetFiles(p, acc);
      continue;
    }
    if (name === "tokenPresets.json") acc.push(p);
  }
  return acc;
}

function listPublicPresetFiles() {
  return readdirSync(PUBLIC_PRESETS_DIR)
    .filter((name) => name.endsWith(".json"))
    .map((name) => join(PUBLIC_PRESETS_DIR, name));
}

function migrateFile(filePath, accent) {
  const raw = JSON.parse(readFileSync(filePath, "utf8"));
  if (!raw?.presets || typeof raw.presets !== "object") return false;

  let touched = false;
  for (const preset of Object.values(raw.presets)) {
    if (!preset?.tokens?.colors || typeof preset.tokens.colors !== "object") continue;
    const colors = preset.tokens.colors;
    if (colors.accent === accent) continue;
    colors.accent = accent;
    touched = true;
  }

  if (!touched) return false;

  if (write) {
    writeFileSync(filePath, `${JSON.stringify(raw, null, 2)}\n`, "utf8");
    console.log(`[write] ${filePath}`);
  } else {
    console.log(`[dry-run] ${filePath} → accent=${accent}`);
  }
  return true;
}

let changed = 0;
for (const file of listTokenPresetFiles(EMAILS_DIR)) {
  if (migrateFile(file, EMAIL_ACCENT)) changed += 1;
}
for (const file of listPublicPresetFiles()) {
  if (migrateFile(file, PUBLIC_ACCENT)) changed += 1;
}

console.log(`${write ? "已写入" : "待写入"} ${changed} 个 tokenPresets 文件`);
