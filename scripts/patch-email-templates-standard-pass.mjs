#!/usr/bin/env node
/**
 * 按 project-plan「标准 pass」批量修补各邮件 template.json：
 * - 文本 props.color / 按钮 props.buttonStyle.textColor 为 #FFFFFF|#ffffff → $themeRef colors.surface + bindings
 * - 横向纯 icon 子块且 widthMode fill → hug + contentAlign 水平居中
 * - block id 或 blockMeta.name 含 Logo 的单子 layout：fill + contentAlign 左 → 水平居中（避免 hug 字标/图贴左）
 * - 字标/叠字：contentAlign 双轴 center + 原 vertical top + (hug|fill)+hug → contentAlign.vertical center
 *
 * 用法：node scripts/patch-email-templates-standard-pass.mjs
 * 跳过：align-playground（演练场依赖固定字面量）
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(process.cwd(), "data/emails");
const SKIP_DIRS = new Set(["align-playground"]);

const SURFACE_BINDING = {
  slotId: "colors.surface",
  mode: "theme",
  tokenPath: "colors.surface",
  fieldKind: "style",
};

function isWhiteColor(v) {
  if (typeof v !== "string") return false;
  const s = v.trim().toUpperCase();
  return s === "#FFFFFF" || s === "#FFF";
}

function patchBlock(blockId, block, blocks, blockMeta) {
  let changed = false;
  const metaName = blockMeta?.[blockId]?.name ?? "";

  if (block.type === "text" && block.props && isWhiteColor(block.props.color)) {
    block.props.color = { $themeRef: "colors.surface" };
    block.bindings = block.bindings ?? {};
    block.bindings["props.color"] = { ...SURFACE_BINDING };
    changed = true;
  }

  if (block.type === "icon" && block.props && isWhiteColor(block.props.color)) {
    block.props.color = { $themeRef: "colors.surface" };
    block.bindings = block.bindings ?? {};
    block.bindings["props.color"] = { ...SURFACE_BINDING };
    changed = true;
  }

  if (
    block.type === "action.button" &&
    block.props?.buttonStyle &&
    isWhiteColor(block.props.buttonStyle.textColor)
  ) {
    block.props.buttonStyle.textColor = { $themeRef: "colors.surface" };
    block.bindings = block.bindings ?? {};
    block.bindings["props.buttonStyle.textColor"] = { ...SURFACE_BINDING };
    changed = true;
  }

  if (
    block.type === "layout" &&
    block.props?.direction === "horizontal" &&
    Array.isArray(block.children) &&
    block.children.length >= 2
  ) {
    const types = block.children.map((cid) => blocks[cid]?.type);
    if (
      types.every((t) => t === "icon") &&
      block.wrapperStyle?.widthMode === "fill"
    ) {
      block.wrapperStyle.widthMode = "hug";
      if (!block.wrapperStyle.heightMode) block.wrapperStyle.heightMode = "hug";
      block.wrapperStyle.contentAlign = block.wrapperStyle.contentAlign ?? {};
      block.wrapperStyle.contentAlign.horizontal = "center";
      if (block.wrapperStyle.contentAlign.vertical == null) {
        block.wrapperStyle.contentAlign.vertical = "top";
      }
      changed = true;
    }
  }

  const logoish =
    /logo/i.test(blockId) || metaName.includes("Logo") || metaName.includes("logo");
  if (
    logoish &&
    block.type === "layout" &&
    block.wrapperStyle?.widthMode === "fill" &&
    block.wrapperStyle.contentAlign?.horizontal === "left" &&
    Array.isArray(block.children) &&
    block.children.length === 1
  ) {
    const ch = blocks[block.children[0]];
    if (ch && ["image", "text", "icon"].includes(ch.type)) {
      block.wrapperStyle.contentAlign.horizontal = "center";
      changed = true;
    }
  }

  if (block.type === "text" && block.wrapperStyle?.contentAlign) {
    const ca = block.wrapperStyle.contentAlign;
    if (
      ca.horizontal === "center" &&
      ca.vertical === "top" &&
      block.wrapperStyle.heightMode === "hug" &&
      (block.wrapperStyle.widthMode === "hug" || block.wrapperStyle.widthMode === "fill")
    ) {
      block.wrapperStyle.contentAlign.vertical = "center";
      changed = true;
    }
  }

  return changed;
}

function patchFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const j = JSON.parse(raw);
  const { blocks, blockMeta } = j;
  if (!blocks) return false;
  let changed = false;
  for (const id of Object.keys(blocks)) {
    if (patchBlock(id, blocks[id], blocks, blockMeta)) changed = true;
  }
  if (changed) {
    fs.writeFileSync(filePath, `${JSON.stringify(j, null, 2)}\n`, "utf8");
  }
  return changed;
}

let total = 0;
for (const dir of fs.readdirSync(ROOT, { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  if (SKIP_DIRS.has(dir.name)) continue;
  const fp = path.join(ROOT, dir.name, "template.json");
  if (!fs.existsSync(fp)) continue;
  if (patchFile(fp)) {
    console.log("已更新:", fp);
    total++;
  }
}
console.log(total ? `共写入 ${total} 个 template.json` : "无文件需要修改（或均已符合）");
