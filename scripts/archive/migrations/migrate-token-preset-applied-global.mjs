#!/usr/bin/env node
/**
 * 一次性迁移：邮件目录内 tokenPresets.json 写入「公共预设关联」字段 appliedGlobalPresetId，
 * 并与标准公共预设数值对齐（便于侧栏单选与下次进入恢复高亮）。
 *
 * 当前仓库约定：若 active 预设的 tokens 与某一公共预设完全一致，则写入对应 appliedGlobalPresetId；
 * 否则不写（仍为「本邮件」语义）。
 *
 * 用法：
 *   node scripts/migrate-token-preset-applied-global.mjs           # dry-run
 *   node scripts/migrate-token-preset-applied-global.mjs --write # 写回文件
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeTokenPresetTokens } from "../../lib/token-preset-standard-order.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../..");
const EMAILS_DIR = join(REPO_ROOT, "data", "emails");
const GLOBAL_DIR = join(REPO_ROOT, "data", "token-presets");

const WRITE = process.argv.includes("--write");

function sortKeysDeep(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  const o = value;
  return Object.keys(o)
    .sort()
    .reduce((acc, k) => {
      acc[k] = sortKeysDeep(o[k]);
      return acc;
    }, {});
}

function stableTokensJson(tokens) {
  return JSON.stringify(sortKeysDeep(tokens ?? {}));
}

function loadGlobalPresets() {
  /** @type {Map<string, any>} */
  const map = new Map();
  if (!existsSync(GLOBAL_DIR)) return map;
  for (const name of readdirSync(GLOBAL_DIR)) {
    if (!name.endsWith(".json") || name.startsWith("_")) continue;
    const id = basename(name, ".json");
    const raw = JSON.parse(readFileSync(join(GLOBAL_DIR, name), "utf8"));
    map.set(id, raw);
  }
  return map;
}

function pickActiveTokens(tp) {
  const pid = tp.activePresetId;
  const preset = tp.presets?.[pid] ?? Object.values(tp.presets ?? {})[0];
  return preset?.tokens ?? null;
}

function findMatchingGlobalId(tokens, globals) {
  const needle = stableTokensJson(tokens);
  for (const [gid, gtp] of globals) {
    const gt = pickActiveTokens(gtp);
    if (gt && stableTokensJson(gt) === needle) return gid;
  }
  return null;
}

function migrateOne(emailKey, globals) {
  const tpPath = join(EMAILS_DIR, emailKey, "tokenPresets.json");
  if (!existsSync(tpPath)) {
    console.log(`  · ${emailKey}: 无 tokenPresets.json，跳过`);
    return false;
  }
  const tp = JSON.parse(readFileSync(tpPath, "utf8"));
  const activeId = tp.activePresetId;
  const preset = tp.presets?.[activeId];
  if (!preset) {
    console.log(`  · ${emailKey}: activePresetId 无效，跳过`);
    return false;
  }

  let changed = false;
  const log = (msg) => console.log(`  · ${emailKey}: ${msg}`);

  const tokens = preset.tokens;
  const matched = findMatchingGlobalId(tokens, globals);
  if (matched) {
    if (tp.appliedGlobalPresetId !== matched) {
      tp.appliedGlobalPresetId = matched;
      changed = true;
      log(`已设置 appliedGlobalPresetId = ${matched}（tokens 与公共预设一致）`);
    }
  } else if (tp.appliedGlobalPresetId !== undefined) {
    delete tp.appliedGlobalPresetId;
    changed = true;
    log("已移除 appliedGlobalPresetId（tokens 与任一公共预设不一致）");
  } else {
    log("未匹配公共预设，保持本邮件语义");
  }

  const normalizedTokens = normalizeTokenPresetTokens(preset.tokens ?? {});
  if (JSON.stringify(preset.tokens) !== JSON.stringify(normalizedTokens)) {
    preset.tokens = normalizedTokens;
    changed = true;
    log("已规范 tokens 的 family/scale 键序（与公共预设标准顺序一致）");
  }

  if (changed && WRITE) {
    writeFileSync(tpPath, `${JSON.stringify(tp, null, 2)}\n`, "utf8");
  } else if (changed && !WRITE) {
    log("[dry-run] 将写回上述变更（加 --write 生效）");
  }
  return changed;
}

function main() {
  const globals = loadGlobalPresets();
  console.log(`公共预设目录: ${GLOBAL_DIR}（共 ${globals.size} 个）`);
  const entries = existsSync(EMAILS_DIR) ? readdirSync(EMAILS_DIR, { withFileTypes: true }) : [];
  const emailKeys = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  if (!emailKeys.length) {
    console.log("data/emails 下无邮件目录");
    return;
  }
  let any = false;
  for (const key of emailKeys.sort()) {
    if (migrateOne(key, globals)) any = true;
  }
  if (!WRITE && any) {
    console.log("\n以上为 dry-run；确认后执行：node scripts/migrate-token-preset-applied-global.mjs --write");
  }
}

main();
