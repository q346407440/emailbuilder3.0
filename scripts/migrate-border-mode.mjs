#!/usr/bin/env node
/**
 * 一次性迁移：把所有 `border` 字段从扁平形态 `{ width, style, color }`
 * 升级为两级模式 `{ mode: "unified", width, style, color }`，并把字符串
 * 形态（`"1px solid #ccc"`）解析后转为 unified。
 *
 * 同时把所有 `borderRadius: "<string>"` 升级为 `{ mode: "unified", radius: "<string>" }`，
 * 把空字符串视为 `"0"`。
 *
 * 覆盖路径：递归扫描每个 block 的 `wrapperStyle`（含 `backgroundImage`）与 `props`，
 * 命中字段名即转换。不修改其它字段。
 *
 * 用法：node scripts/migrate-border-mode.mjs --write   # 直写
 *       node scripts/migrate-border-mode.mjs           # dry-run
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..");
const EMAILS = join(REPO, "data", "emails");
const WRITE = process.argv.includes("--write");

function parseBorderString(s) {
  // "1px solid #ccc" / "0 solid rgba(0,0,0,0)" 等
  const trimmed = s.trim();
  if (!trimmed) return null;
  const styleMatch = trimmed.match(/\b(solid|dashed|dotted)\b/);
  const style = styleMatch ? styleMatch[1] : "solid";
  const parts = trimmed.replace(/\b(solid|dashed|dotted)\b/, "").trim().split(/\s+/);
  const widthLike = parts.find((p) => /^\d/.test(p)) ?? "0";
  const colorLike = parts.find((p) => !/^\d/.test(p)) ?? "rgba(0,0,0,0)";
  return { mode: "unified", width: widthLike, style, color: colorLike };
}

function migrateBorder(value) {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return parseBorderString(value);
  if (typeof value !== "object" || Array.isArray(value)) return undefined;
  if (value.mode === "unified" || value.mode === "custom") return value; // 已就位
  // 旧扁平形态
  const width = typeof value.width === "string" && value.width.trim() ? value.width.trim() : "0";
  const style =
    value.style === "dashed" || value.style === "dotted" || value.style === "solid"
      ? value.style
      : "solid";
  const color =
    typeof value.color === "string" && value.color.trim() ? value.color.trim() : "rgba(0,0,0,0)";
  return { mode: "unified", width, style, color };
}

function migrateBorderRadius(value) {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") {
    const v = value.trim() || "0";
    return { mode: "unified", radius: v };
  }
  if (typeof value !== "object" || Array.isArray(value)) return undefined;
  if (value.mode === "unified" || value.mode === "corners") return value;
  return undefined;
}

let touched = 0;

/** 就地把对象内的 `border` / `borderRadius` 字段转换为新形态，递归子对象。 */
function walk(node) {
  if (!node || typeof node !== "object" || Array.isArray(node)) return;
  for (const key of Object.keys(node)) {
    const val = node[key];
    if (key === "border") {
      const next = migrateBorder(val);
      if (next !== undefined && JSON.stringify(next) !== JSON.stringify(val)) {
        node[key] = next;
        touched += 1;
      }
    } else if (key === "borderRadius") {
      const next = migrateBorderRadius(val);
      if (next !== undefined && JSON.stringify(next) !== JSON.stringify(val)) {
        node[key] = next;
        touched += 1;
      }
    } else if (val && typeof val === "object") {
      walk(val);
    }
  }
}

/** 给 layout/grid/image 缺失的 wrapperStyle.borderRadius 补默认；
 *  layout/image 的 backgroundImage.borderRadius、button 的 buttonStyle.borderRadius 同理。 */
function backfillRadii(json) {
  const blocks = json.blocks ?? {};
  for (const [, block] of Object.entries(blocks)) {
    if (!block || typeof block !== "object") continue;
    if (block.type === "layout" || block.type === "grid" || block.type === "image") {
      block.wrapperStyle = block.wrapperStyle ?? {};
      if (block.wrapperStyle.borderRadius === undefined) {
        block.wrapperStyle.borderRadius = { mode: "unified", radius: "0" };
        touched += 1;
      }
      const bg = block.wrapperStyle.backgroundImage;
      if (bg && typeof bg === "object" && bg.borderRadius === undefined) {
        bg.borderRadius = { mode: "unified", radius: "0" };
        touched += 1;
      }
    }
    if (block.type === "button") {
      block.props = block.props ?? {};
      const bs = block.props.buttonStyle;
      if (bs && typeof bs === "object" && bs.borderRadius === undefined) {
        bs.borderRadius = { mode: "unified", radius: "0" };
        touched += 1;
      }
    }
  }
}

function main() {
  const dirs = readdirSync(EMAILS).filter((n) => existsSync(join(EMAILS, n, "template.json")));
  console.log(`扫描 ${dirs.length} 份模板（${WRITE ? "直写" : "dry-run"}）：`);
  for (const dir of dirs) {
    const tp = join(EMAILS, dir, "template.json");
    const json = JSON.parse(readFileSync(tp, "utf8"));
    const before = touched;
    walk(json);
    backfillRadii(json);
    const delta = touched - before;
    console.log(`  · ${dir}: ${delta} 处修改`);
    if (WRITE && delta > 0) writeFileSync(tp, JSON.stringify(json, null, 2) + "\n", "utf8");
  }
  console.log(`完成：累计 ${touched} 处修改${WRITE ? "（已写入）" : "（dry-run）"}`);
}

main();
