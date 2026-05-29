/**
 * 按 project-plan 对话 450 优化 member-vip-update/template.json（一次性迁移脚本）。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const templatePath = path.join(root, "data/emails/member-vip-update/layouts/default/template.json");
const template = JSON.parse(readFileSync(templatePath, "utf8"));

const themeBinding = (tokenPath) => ({
  slotId: tokenPath,
  mode: "theme",
  tokenPath,
  fieldKind: "style",
});

const themeRef = (tokenPath) => ({ $themeRef: tokenPath });

function ensureBinding(block, fieldPath, tokenPath) {
  block.bindings ??= {};
  block.bindings[fieldPath] = themeBinding(tokenPath);
}

/** 深色底上的流式正文 */
const DARK_SURFACE_TEXT_IDS = new Set([
  "mv-intro-hi",
  "mv-intro-body-1",
  "mv-account-para-1",
  "mv-account-para-2",
]);

/** 奶油卡上的列表/标题字 */
const CREAM_CARD_TITLE_IDS = new Set([
  "mv-vip-badge",
  "mv-vip-level-title",
  "mv-benefit-cell-1-title",
  "mv-benefit-cell-2-title",
  "mv-benefit-cell-3-title",
  "mv-benefit-cell-4-title",
  "mv-benefit-cell-5-title",
  "mv-activate-cell-1-title",
  "mv-activate-cell-2-title",
  "mv-activate-intro",
]);

const ICON_WRAP_SUFFIX = "-icon-wrap";
const HORIZONTAL_GAP_LAYOUT_IDS = new Set([
  "mv-vip-level-row",
  "mv-benefit-cell-1",
  "mv-benefit-cell-2",
  "mv-benefit-cell-3",
  "mv-benefit-cell-4",
  "mv-benefit-cell-5",
  "mv-activate-cell-1",
  "mv-activate-cell-2",
]);

let stats = {
  darkTextColor: 0,
  creamTitleColor: 0,
  iconWrapBg: 0,
  layoutGap: 0,
  layoutFixes: 0,
  progressText: 0,
};

for (const [id, block] of Object.entries(template.blocks)) {
  if (DARK_SURFACE_TEXT_IDS.has(id)) {
    block.props.color = themeRef("colors.secondary");
    ensureBinding(block, "props.color", "colors.secondary");
    stats.darkTextColor += 1;
  }

  if (CREAM_CARD_TITLE_IDS.has(id)) {
    block.props.color = themeRef("colors.primary");
    ensureBinding(block, "props.color", "colors.primary");
    stats.creamTitleColor += 1;
  }

  if (id === "mv-progress-text") {
    block.props.color = themeRef("colors.secondary");
    ensureBinding(block, "props.color", "colors.secondary");
    stats.progressText += 1;
  }

  if (id.endsWith(ICON_WRAP_SUFFIX) || id === "mv-vip-diamond-wrap") {
    if (block.wrapperStyle?.backgroundColor === "#1F1F1F") {
      block.wrapperStyle.backgroundColor = themeRef("colors.surface");
      ensureBinding(block, "wrapperStyle.backgroundColor", "colors.surface");
      stats.iconWrapBg += 1;
    }
    if (block.wrapperStyle?.contentAlign) {
      block.wrapperStyle.contentAlign = { horizontal: "center", vertical: "center" };
      stats.layoutFixes += 1;
    }
  }

  if (HORIZONTAL_GAP_LAYOUT_IDS.has(id) && block.props?.gap === "10px") {
    block.props.gap = themeRef("tokens.spacing.gap");
    ensureBinding(block, "props.gap", "tokens.spacing.gap");
    stats.layoutGap += 1;
  }

  if (id === "mv-logo-img" && block.wrapperStyle?.contentAlign) {
    block.wrapperStyle.contentAlign = { horizontal: "center", vertical: "center" };
    stats.layoutFixes += 1;
  }

  if (id === "mv-vip-badge" || id === "mv-vip-level-title") {
    if (block.wrapperStyle?.widthMode === "fill") {
      block.wrapperStyle.widthMode = "hug";
      stats.layoutFixes += 1;
    }
  }

  if (id === "mv-vip-level-row" && block.wrapperStyle?.contentAlign) {
    block.wrapperStyle.contentAlign.horizontal = "left";
    block.wrapperStyle.contentAlign.vertical = "center";
    stats.layoutFixes += 1;
  }

  // 主视觉叠字：双行贴底左对齐（目视：标题+副标题在头图下半部）
  if (id === "mv-mod-hero" && block.wrapperStyle) {
    block.wrapperStyle.contentAlign = { horizontal: "left", vertical: "bottom" };
    stats.layoutFixes += 1;
  }
  if (id === "mv-hero-title" || id === "mv-hero-sub") {
    if (block.wrapperStyle) {
      block.wrapperStyle.contentAlign = { horizontal: "left", vertical: "bottom" };
      block.wrapperStyle.widthMode = "fill";
      stats.layoutFixes += 1;
    }
  }
}

writeFileSync(templatePath, `${JSON.stringify(template, null, 2)}\n`, "utf8");
console.log("member-vip-update 优化完成:", stats);
