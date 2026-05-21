#!/usr/bin/env node
/**
 * 栅格单元格尺寸字段迁移：
 * - rowHeightMode / rowHeight -> cellHeightMode / cellHeight
 * - 补齐 cellWidthMode，避免外层 wrapperStyle.width/height 被误当作单元格尺寸
 *
 * 用法：node scripts/migrate-grid-cell-size-props.mjs --write
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..");
const ROOTS = [join(REPO, "data", "emails"), join(REPO, "data", "masters")];
const WRITE = process.argv.includes("--write");

let touched = 0;

function migrateGridBlock(block) {
  if (block.type !== "grid") return false;
  const props = { ...(block.props ?? {}) };
  let changed = false;

  if (typeof props.cellWidthMode !== "string") {
    props.cellWidthMode = "auto";
    changed = true;
  }

  if ("rowHeightMode" in props) {
    if (typeof props.cellHeightMode !== "string") props.cellHeightMode = props.rowHeightMode;
    delete props.rowHeightMode;
    changed = true;
  }

  if ("rowHeight" in props) {
    if (typeof props.cellHeight !== "string") props.cellHeight = props.rowHeight;
    delete props.rowHeight;
    changed = true;
  }

  if (typeof props.cellHeightMode !== "string") {
    props.cellHeightMode = "content-max";
    changed = true;
  }

  block.props = props;
  if (changed) touched += 1;
  return changed;
}

function migrateBlocksMap(blocks) {
  if (!blocks || typeof blocks !== "object") return;
  for (const block of Object.values(blocks)) {
    migrateGridBlock(block);
  }
}

function migrateBindings(blocks) {
  if (!blocks || typeof blocks !== "object") return;
  for (const block of Object.values(blocks)) {
    if (!block || typeof block !== "object" || !block.bindings) continue;
    for (const key of Object.keys(block.bindings)) {
      let nextKey = key
        .replaceAll("props.rowHeightMode", "props.cellHeightMode")
        .replaceAll("props.rowHeight", "props.cellHeight");
      if (nextKey !== key) {
        block.bindings[nextKey] = block.bindings[key];
        delete block.bindings[key];
      }
    }
  }
}

function migrateConfigSchema(data) {
  for (const scope of data.configSchema?.scopes ?? []) {
    for (const field of scope.fields ?? []) {
      if (field?.target?.path && typeof field.target.path === "string") {
        field.target.path = field.target.path
          .replaceAll("props.rowHeightMode", "props.cellHeightMode")
          .replaceAll("props.rowHeight", "props.cellHeight");
      }
      if (field?.key && typeof field.key === "string") {
        field.key = field.key
          .replaceAll("props_rowHeightMode", "props_cellHeightMode")
          .replaceAll("props_rowHeight", "props_cellHeight");
      }
    }
  }
}

function migrateFile(filePath, label) {
  if (!existsSync(filePath)) return;
  const raw = readFileSync(filePath, "utf8");
  const data = JSON.parse(raw);
  const before = JSON.stringify(data);
  if (data.blocks) {
    migrateBlocksMap(data.blocks);
    migrateBindings(data.blocks);
  }
  migrateConfigSchema(data);
  const after = JSON.stringify(data);
  if (before === after) {
    console.log(`[skip] ${label}`);
    return;
  }
  console.log(`[touch] ${label}`);
  if (WRITE) writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function migrateJsonTree(dir, labelPrefix) {
  if (!existsSync(dir)) return;
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

for (const root of ROOTS) {
  migrateJsonTree(root, root.replace(`${REPO}/data/`, ""));
}

console.log(
  WRITE
    ? `完成：已更新 ${touched} 个 grid 块`
    : `dry-run：将更新 ${touched} 个 grid 块（加 --write 写入）`
);
