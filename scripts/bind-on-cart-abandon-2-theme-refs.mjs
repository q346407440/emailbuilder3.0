#!/usr/bin/env node
/**
 * 为 data/emails/on-cart-abandon-2/template.json 写入与 tokenPresets 对齐的 $themeRef + bindings。
 * 覆盖：文本块标题/正文体系字体、按钮字体、模块壳 padding/gap、栅格 gap、正文字号/色分档、大标题与极小字、
 * 分类宫格叠字（26px 白字）→ `tokens.typography.h1`；**字色保持字面量 #ffffff**（叠在摄影底上，勿绑 `colors.surface`，深色预设下 surface 会变深导致不可读）。
 * 面板容器/主按钮圆角（`tokens.radius.panel` / `tokens.radius.cta`，四角 mode=corners 均绑同一 token）。
 * 不绑：布局方向、gapMode、紧凑行 8px 等结构或局部密度字段（保持字面量）。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const TEMPLATE = join(ROOT, "data", "emails", "on-cart-abandon-2", "template.json");

const R_PANEL = "tokens.radius.panel";
const R_CTA = "tokens.radius.cta";

const CORNER_KEYS = ["topLeft", "topRight", "bottomRight", "bottomLeft"];

/** @param {string} p */
function ref(p) {
  return { $themeRef: p };
}

/** @param {string} p */
function themeBinding(p) {
  return {
    slotId: p,
    mode: "theme",
    tokenPath: p,
    fieldKind: "style",
  };
}

/** @param {Record<string, unknown>} block */
function mergeBindings(block, partial) {
  block.bindings = { ...(block.bindings ?? {}), ...partial };
}

/** 移除此前 unified.radius 等旧路径，避免与 corners 四角绑定并存 */
function deleteBindingsPrefixed(block, prefix) {
  if (!block.bindings) return;
  const next = { ...block.bindings };
  for (const k of Object.keys(next)) {
    if (k === prefix || k.startsWith(`${prefix}.`)) delete next[k];
  }
  block.bindings = next;
}

/**
 * 将 `basePath` 所指圆角设为 mode=corners，四角共用同一 token，并登记 4 条 theme binding。
 * @param {Record<string, unknown>} block
 * @param {string} basePath 如 wrapperStyle.borderRadius、wrapperStyle.backgroundImage.borderRadius、props.buttonStyle.borderRadius
 * @param {string} tokenPath
 */
function setBorderRadiusCornersTheme(block, basePath, tokenPath) {
  deleteBindingsPrefixed(block, basePath);
  const parts = basePath.split(".");
  let parent = block;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    parent[key] ??= {};
    parent = parent[key];
  }
  const leaf = parts[parts.length - 1];
  parent[leaf] = {
    mode: "corners",
    topLeft: ref(tokenPath),
    topRight: ref(tokenPath),
    bottomRight: ref(tokenPath),
    bottomLeft: ref(tokenPath),
  };
  const partial = {};
  for (const ck of CORNER_KEYS) {
    partial[`${basePath}.${ck}`] = themeBinding(tokenPath);
  }
  mergeBindings(block, partial);
}

function setThemeRef(block, path, tokenPath) {
  const parts = path.split(".");
  let cursor = block;
  for (const part of parts.slice(0, -1)) {
    cursor[part] ??= {};
    cursor = cursor[part];
  }
  cursor[parts.at(-1)] = ref(tokenPath);
  mergeBindings(block, { [path]: themeBinding(tokenPath) });
}

function main() {
  const raw = readFileSync(TEMPLATE, "utf8");
  const t = JSON.parse(raw);

  const root = t.blocks["oca-root"];
  if (!root || root.type !== "emailRoot") throw new Error("缺少 oca-root");
  setThemeRef(root, "props.backgroundColor", "colors.surface");

  const surfaceBgIds = [
    "oca-mod-header",
    "oca-header-logo-row",
    "oca-mod-hero",
    "oca-hero-inner",
    "oca-mod-recent",
    "oca-rv-cell-1",
    "oca-rv-cell-2",
    "oca-rv-cell-3",
    "oca-rv-cell-4",
    "oca-rv-cell-5",
    "oca-rv-cell-6",
    "oca-mod-category",
    "oca-mod-footer",
    "oca-ft-logo-row",
    "oca-ft-icons",
  ];
  for (const id of surfaceBgIds) {
    const b = t.blocks[id];
    if (!b?.wrapperStyle) continue;
    setThemeRef(b, "wrapperStyle.backgroundColor", "colors.surface");
  }

  const headingTextIds = new Set([
    "oca-header-logo-text",
    "oca-header-h1",
    "oca-rv-title",
    "oca-cat-title",
    "oca-cat-txt-1",
    "oca-cat-txt-2",
    "oca-cat-txt-3",
    "oca-cat-txt-4",
    "oca-ft-logo",
  ]);

  const spacingLayoutIds = [
    "oca-mod-header",
    "oca-mod-hero",
    "oca-mod-recent",
    "oca-mod-category",
    "oca-mod-footer",
    "oca-hero-inner",
  ];
  for (const id of spacingLayoutIds) {
    const b = t.blocks[id];
    if (!b || b.type !== "layout") continue;
    const ws = b.wrapperStyle;
    if (ws?.padding?.mode === "separate") {
      ws.padding.top = ref("tokens.spacing.section");
      ws.padding.bottom = ref("tokens.spacing.section");
      ws.padding.left = ref("tokens.spacing.pageInline");
      ws.padding.right = ref("tokens.spacing.pageInline");
      mergeBindings(b, {
        "wrapperStyle.padding.top": themeBinding("tokens.spacing.section"),
        "wrapperStyle.padding.bottom": themeBinding("tokens.spacing.section"),
        "wrapperStyle.padding.left": themeBinding("tokens.spacing.pageInline"),
        "wrapperStyle.padding.right": themeBinding("tokens.spacing.pageInline"),
      });
    }
    const g = b.props?.gap;
    if (typeof g === "string" && g.trim() === "16px") {
      b.props.gap = ref("tokens.spacing.gap");
      mergeBindings(b, { "props.gap": themeBinding("tokens.spacing.gap") });
    }
  }

  for (const block of Object.values(t.blocks)) {
    if (block.type === "grid" && block.props && typeof block.props.gap === "string" && block.props.gap.trim() === "16px") {
      block.props.gap = ref("tokens.spacing.gap");
      mergeBindings(block, { "props.gap": themeBinding("tokens.spacing.gap") });
    }
  }

  for (const block of Object.values(t.blocks)) {
    if (block.type !== "text" || !block.props) continue;
    setThemeRef(
      block,
      "props.fontFamily",
      headingTextIds.has(block.id) ? "fonts.heading" : "fonts.body"
    );
    const fs = block.props.fontSize;
    const col = typeof block.props.color === "string" ? block.props.color.trim() : "";
    if (fs === "26px" && col === "#ffffff") {
      block.props.fontSize = ref("tokens.typography.h1");
      block.props.color = "#ffffff";
      mergeBindings(block, {
        "props.fontSize": themeBinding("tokens.typography.h1"),
      });
      if (block.bindings && "props.color" in block.bindings) {
        const next = { ...block.bindings };
        delete next["props.color"];
        block.bindings = next;
      }
    } else if (fs === "26px" && col === "#000000") {
      block.props.fontSize = ref("tokens.typography.display");
      block.props.color = ref("colors.primary");
      mergeBindings(block, {
        "props.fontSize": themeBinding("tokens.typography.display"),
        "props.color": themeBinding("colors.primary"),
      });
    } else if (fs === "15px" && col === "#000000") {
      block.props.fontSize = ref("tokens.typography.body");
      block.props.color = ref("colors.primary");
      mergeBindings(block, {
        "props.fontSize": themeBinding("tokens.typography.body"),
        "props.color": themeBinding("colors.primary"),
      });
    } else if (fs === "15px" && col === "#666666") {
      block.props.fontSize = ref("tokens.typography.body");
      block.props.color = ref("colors.secondary");
      mergeBindings(block, {
        "props.fontSize": themeBinding("tokens.typography.body"),
        "props.color": themeBinding("colors.secondary"),
      });
    } else if (fs === "11px" && col === "#000000") {
      block.props.fontSize = ref("tokens.typography.caption");
      block.props.color = ref("colors.primary");
      mergeBindings(block, {
        "props.fontSize": themeBinding("tokens.typography.caption"),
        "props.color": themeBinding("colors.primary"),
      });
    } else if (fs === "11px" && col === "#888888") {
      block.props.fontSize = ref("tokens.typography.caption");
      block.props.color = ref("colors.secondary");
      mergeBindings(block, {
        "props.fontSize": themeBinding("tokens.typography.caption"),
        "props.color": themeBinding("colors.secondary"),
      });
    }
  }

  for (const block of Object.values(t.blocks)) {
    if (block.type !== "button" || !block.props?.buttonStyle) continue;
    const bs = block.props.buttonStyle;
    bs.fontSize = ref("tokens.typography.body");
    bs.fontFamily = ref("fonts.body");
    bs.backgroundColor = ref("colors.surface");
    bs.textColor = ref("colors.primary");
    bs.border ??= {};
    bs.border.color = ref("colors.primary");
    setBorderRadiusCornersTheme(block, "props.buttonStyle.borderRadius", R_CTA);
    mergeBindings(block, {
      "props.buttonStyle.fontSize": themeBinding("tokens.typography.body"),
      "props.buttonStyle.fontFamily": themeBinding("fonts.body"),
      "props.buttonStyle.backgroundColor": themeBinding("colors.surface"),
      "props.buttonStyle.textColor": themeBinding("colors.primary"),
      "props.buttonStyle.border.color": themeBinding("colors.primary"),
    });
  }

  const panelRadiusLayoutIds = [
    "oca-header-logo-row",
    "oca-hero-inner",
    "oca-rv-cell-1",
    "oca-rv-cell-2",
    "oca-rv-cell-3",
    "oca-rv-cell-4",
    "oca-rv-cell-5",
    "oca-rv-cell-6",
    "oca-cat-tile-1",
    "oca-cat-tile-2",
    "oca-cat-tile-3",
    "oca-cat-tile-4",
    "oca-ft-logo-row",
    "oca-ft-icons",
  ];
  for (const id of panelRadiusLayoutIds) {
    const b = t.blocks[id];
    if (!b?.wrapperStyle) continue;
    setBorderRadiusCornersTheme(b, "wrapperStyle.borderRadius", R_PANEL);
  }

  for (const id of ["oca-cat-tile-1", "oca-cat-tile-2", "oca-cat-tile-3", "oca-cat-tile-4"]) {
    const b = t.blocks[id];
    if (!b?.wrapperStyle?.backgroundImage) continue;
    setBorderRadiusCornersTheme(b, "wrapperStyle.backgroundImage.borderRadius", R_PANEL);
  }

  writeFileSync(TEMPLATE, JSON.stringify(t, null, 2), "utf8");
  process.stdout.write(`Updated ${TEMPLATE}\n`);
}

main();
