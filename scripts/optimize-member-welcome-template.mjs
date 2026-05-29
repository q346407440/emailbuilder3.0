/**
 * 按 project-plan 对话 450 优化 member-welcome/template.json（对齐 + token 绑定）。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const templatePath = path.join(root, "data/emails/member-welcome/layouts/card/template.json");
const template = JSON.parse(readFileSync(templatePath, "utf8"));

const themeBinding = (tokenPath) => ({
  slotId: tokenPath,
  mode: "theme",
  tokenPath,
  fieldKind: "style",
});

const themeRef = (tokenPath) => ({ $themeRef: tokenPath });

const BENEFIT_TEXT_COL = /^mw-benefit-text-col-[1-5]$/;
const BENEFIT_ROW_3_5 = /^mw-benefit-row-[3-5]$/;

const stats = {
  textAlign: 0,
  benefitCol: 0,
  benefitRow: 0,
  heroPadding: 0,
};

for (const [id, block] of Object.entries(template.blocks)) {
  if (id === "mw-greeting-text" || id === "mw-benefits-title") {
    if (block.wrapperStyle?.contentAlign) {
      block.wrapperStyle.contentAlign.horizontal = "left";
      block.wrapperStyle.contentAlign.vertical = "top";
      stats.textAlign += 1;
    }
  }

  if (BENEFIT_TEXT_COL.test(id) && block.wrapperStyle) {
    block.wrapperStyle.widthMode = "fill";
    block.wrapperStyle.heightMode = "fill";
    block.wrapperStyle.contentAlign = { horizontal: "left", vertical: "center" };
    stats.benefitCol += 1;
  }

  if (BENEFIT_ROW_3_5.test(id) && block.wrapperStyle?.contentAlign) {
    block.wrapperStyle.contentAlign.horizontal = "left";
    block.wrapperStyle.contentAlign.vertical = "center";
    stats.benefitRow += 1;
  }

  if (id === "mw-hero-sub" && block.wrapperStyle?.padding) {
    block.wrapperStyle.padding.left = themeRef("tokens.spacing.pageInline");
    block.wrapperStyle.padding.right = themeRef("tokens.spacing.pageInline");
    block.bindings ??= {};
    block.bindings["wrapperStyle.padding.left"] = themeBinding("tokens.spacing.pageInline");
    block.bindings["wrapperStyle.padding.right"] = themeBinding("tokens.spacing.pageInline");
    stats.heroPadding += 1;
  }
}

writeFileSync(templatePath, `${JSON.stringify(template, null, 2)}\n`, "utf8");
console.log("member-welcome 优化完成:", stats);
