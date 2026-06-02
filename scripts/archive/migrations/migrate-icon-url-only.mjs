#!/usr/bin/env node
/**
 * 图标块 JSON 收敛为 URL 真源：
 * - 保留 src / color / size / link
 * - 移除 iconSrcMode / libraryAssetId / uploadedAssetId（来源由前端 UI 推导，不落盘）
 * - 缺 color 时补 colors.primary 主题绑定
 *
 * 用法：node scripts/migrate-icon-url-only.mjs --write
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readTemplateDisk, writeTemplateDisk } from "../../lib/template-disk-io.mjs";
import { listEmailTemplatePaths } from "../../lib/list-email-template-paths.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "../../..");
const EMAILS = join(REPO, "data", "emails");
const MASTERS = join(REPO, "data", "masters");
const WRITE = process.argv.includes("--write");

const STRIP_KEYS = ["customSrc", "iconSrcMode", "libraryAssetId", "uploadedAssetId"];
const DEFAULT_COLOR_REF = { $themeRef: "colors.primary" };
const DEFAULT_COLOR_BINDING = {
  slotId: "colors.primary",
  mode: "theme",
  tokenPath: "colors.primary",
  fieldKind: "style",
};

function hasColorValue(color) {
  if (typeof color === "string") return color.trim() !== "";
  if (color && typeof color === "object" && !Array.isArray(color)) {
    if (typeof color.$themeRef === "string" && color.$themeRef.trim()) return true;
    if (typeof color.$varRef === "string" && color.$varRef.trim()) return true;
  }
  return false;
}

let touched = 0;

function migrateIconBlock(block) {
  if (block.type !== "icon") return false;
  const props = { ...(block.props ?? {}) };
  let changed = false;
  for (const key of STRIP_KEYS) {
    if (key in props) {
      if (key === "customSrc" && typeof props.src !== "string") {
        props.src = props.customSrc;
      }
      delete props[key];
      changed = true;
    }
  }
  if (typeof props.src !== "string") {
    props.src = "";
    changed = true;
  }
  if (!hasColorValue(props.color)) {
    props.color = { ...DEFAULT_COLOR_REF };
    changed = true;
  }
  if (typeof props.size !== "string" || !props.size.trim()) {
    props.size = "20px";
    changed = true;
  }
  block.props = props;

  const bindings = { ...(block.bindings ?? {}) };
  const needsColorBinding =
    props.color &&
    typeof props.color === "object" &&
    !Array.isArray(props.color) &&
    typeof props.color.$themeRef === "string" &&
    props.color.$themeRef === "colors.primary";
  if (needsColorBinding && !bindings["props.color"]) {
    bindings["props.color"] = { ...DEFAULT_COLOR_BINDING };
    changed = true;
  }
  if (changed) block.bindings = bindings;
  if (changed) touched += 1;
  return changed;
}

function migrateBlocksMap(blocks) {
  if (!blocks || typeof blocks !== "object") return;
  for (const block of Object.values(blocks)) {
    migrateIconBlock(block);
    if (!block || typeof block !== "object" || !block.bindings) continue;
    for (const key of Object.keys(block.bindings)) {
      const nextKey = key.replaceAll("props.customSrc", "props.src");
      if (nextKey !== key) {
        block.bindings[nextKey] = block.bindings[key];
        delete block.bindings[key];
      }
    }
  }
}

function migrateFile(filePath, label) {
  if (!existsSync(filePath)) return;
  const { graph, ctx } = readTemplateDisk(filePath);
  const before = JSON.stringify(graph);
  if (graph.blocks) migrateBlocksMap(graph.blocks);
  const after = JSON.stringify(graph);
  if (before === after) {
    console.log(`[skip] ${label}`);
    return;
  }
  console.log(`[touch] ${label}`);
  if (WRITE) writeTemplateDisk(filePath, graph, ctx);
}

for (const tpl of listEmailTemplatePaths(EMAILS)) {
  migrateFile(tpl, tpl.slice(EMAILS.length + 1));
}

function migrateJsonTree(dir, labelPrefix) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    const label = `${labelPrefix}/${entry.name}`;
    if (entry.isDirectory()) {
      migrateJsonTree(path, label);
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      migrateFile(path, label);
    }
  }
}

if (existsSync(MASTERS)) {
  migrateJsonTree(MASTERS, "masters");
}

console.log(
  WRITE
    ? `完成：已更新 ${touched} 个 icon 块`
    : `dry-run：将更新 ${touched} 个 icon 块（加 --write 写入）`
);
