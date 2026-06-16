import type { EmailBlock, EmailTemplate } from "../../types/email";
import { readTemplateFieldOnly } from "../themeBindingEdit";
import { isThemeRef } from "../../types/themeRef";

export type SectionStructureMetrics = {
  sectionKey: string;
  texts: string[];
  buttons: string[];
  gridColumns: number[];
};

export type LayoutStructureMetrics = {
  sections: SectionStructureMetrics[];
  totalButtons: number;
  /** 是否存在 Logo 类文本绑了 colors.primary */
  logoTextUsesPrimary: boolean;
  /** 是否存在黄底 CTA 却用 surface 白字 */
  ctaWhiteOnLightPrimary: boolean;
};

function plainTextFromBlock(block: EmailBlock): string {
  const tb = block.props?.textBody;
  if (!tb || typeof tb !== "object") return "";
  const paragraphs = (tb as { paragraphs?: unknown }).paragraphs;
  if (!Array.isArray(paragraphs)) return "";
  return paragraphs
    .map((para) => {
      if (!para || typeof para !== "object") return "";
      const runs = (para as { runs?: unknown }).runs;
      if (!Array.isArray(runs)) return "";
      return runs.map((r) => String((r as { text?: unknown }).text ?? "")).join("");
    })
    .join("\n");
}

function walkSectionBlocks(
  blocks: Record<string, EmailBlock>,
  rootId: string,
  acc: {
    texts: string[];
    buttons: string[];
    gridColumns: number[];
  }
): void {
  const block = blocks[rootId];
  if (!block) return;
  if (block.type === "text") {
    const t = plainTextFromBlock(block);
    if (t) acc.texts.push(t);
  }
  if (block.type === "button") {
    acc.buttons.push(String(block.props?.text ?? ""));
  }
  if (block.type === "grid") {
    const cols = block.props?.columns;
    if (typeof cols === "number" && cols > 0) acc.gridColumns.push(cols);
  }
  for (const childId of block.children ?? []) {
    walkSectionBlocks(blocks, childId, acc);
  }
}

/** 从落盘 template 提取可对比的结构指标（用于 golden / pipeline 回归）。 */
export function extractLayoutStructureMetrics(template: EmailTemplate): LayoutStructureMetrics {
  const root = template.blocks[template.rootBlockId];
  const sections: SectionStructureMetrics[] = [];
  let totalButtons = 0;
  let logoTextUsesPrimary = false;
  let ctaWhiteOnLightPrimary = false;

  for (const sectionId of root?.children ?? []) {
    const shell = template.blocks[sectionId];
    if (!shell || shell.type !== "layout") continue;
    const acc = { texts: [] as string[], buttons: [] as string[], gridColumns: [] as number[] };
    for (const childId of shell.children ?? []) {
      walkSectionBlocks(template.blocks, childId, acc);
    }
    const sectionKey = template.blockMeta?.[sectionId]?.name ?? sectionId;
    sections.push({ sectionKey, ...acc });
    totalButtons += acc.buttons.length;

  }

  for (const block of Object.values(template.blocks)) {
    if (block.type === "text" && /^AVENTON$/i.test(plainTextFromBlock(block).trim())) {
      const color = readTemplateFieldOnly(block, "props.color");
      if (isThemeRef(color) && (color as { $themeRef: string }).$themeRef === "colors.primary") {
        logoTextUsesPrimary = true;
      }
    }
    if (block.type !== "button") continue;
    const bg = block.props?.buttonStyle?.backgroundColor;
    const tc = block.props?.buttonStyle?.textColor;
    const bgHex =
      typeof bg === "string"
        ? bg
        : isThemeRef(bg) && (bg as { $themeRef: string }).$themeRef === "colors.primary"
          ? "#E3D026"
          : "";
    if (
      bgHex.toUpperCase() === "#E3D026" &&
      (tc === "#FFFFFF" ||
        (isThemeRef(tc) && (tc as { $themeRef: string }).$themeRef === "colors.surface"))
    ) {
      ctaWhiteOnLightPrimary = true;
    }
  }

  return {
    sections,
    totalButtons,
    logoTextUsesPrimary,
    ctaWhiteOnLightPrimary,
  };
}

/** 与 manual-15 黄金样例对比的结构断言（pipeline 回归用）。 */
export type GoldenStructureExpectation = {
  minTrustGridColumns: number;
  maxTotalButtons: number;
  productHeadlineInProductSection: boolean;
  forbidLogoPrimary: boolean;
  forbidCtaWhiteOnYellow: boolean;
};

export const TEMPLATE_15_MANUAL_GOLDEN: GoldenStructureExpectation = {
  minTrustGridColumns: 4,
  maxTotalButtons: 2,
  productHeadlineInProductSection: true,
  forbidLogoPrimary: true,
  forbidCtaWhiteOnYellow: true,
};

export function evaluateGoldenStructure(
  metrics: LayoutStructureMetrics,
  expect: GoldenStructureExpectation
): string[] {
  const issues: string[] = [];
  const product = metrics.sections.find((s) => /商品|product/i.test(s.sectionKey));
  const hero = metrics.sections.find((s) => /首屏|hero|提示/i.test(s.sectionKey));
  const trust = metrics.sections.find((s) => /保障|服务|trust/i.test(s.sectionKey));

  if (expect.productHeadlineInProductSection) {
    const inProduct = product?.texts.some((t) => /TAKE ANOTHER LOOK/i.test(t));
    const inHero = hero?.texts.some((t) => /TAKE ANOTHER LOOK/i.test(t));
    if (!inProduct) issues.push("商品区缺少 TAKE ANOTHER LOOK 小标题");
    if (inHero) issues.push("TAKE ANOTHER LOOK 不应出现在首屏区");
  }

  if (trust) {
    const maxGrid = Math.max(0, ...trust.gridColumns);
    if (maxGrid < expect.minTrustGridColumns) {
      issues.push(`服务保障区栅格最大列数 ${maxGrid} < ${expect.minTrustGridColumns}`);
    }
  }

  if (metrics.totalButtons > expect.maxTotalButtons) {
    issues.push(`按钮数 ${metrics.totalButtons} > ${expect.maxTotalButtons}`);
  }
  if (expect.forbidLogoPrimary && metrics.logoTextUsesPrimary) {
    issues.push("Logo 文案绑定了 colors.primary");
  }
  if (expect.forbidCtaWhiteOnYellow && metrics.ctaWhiteOnLightPrimary) {
    issues.push("黄底 CTA 使用了白色文字");
  }
  return issues;
}
