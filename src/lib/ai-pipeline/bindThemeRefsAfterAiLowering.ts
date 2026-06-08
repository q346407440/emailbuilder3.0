import type { EmailBlock, EmailTemplate } from "../../types/email";
import type { TokenPresets } from "../../types/tokenPreset";
import { isThemeRef } from "../../types/themeRef";
import { themeRefPathForStorage } from "../../token-preset-contract/theme-ref-paths";
import type { TokenPresetFamily } from "../../token-preset-contract/types";
import { applyThemeTokenBinding, readTemplateFieldOnly } from "../themeBindingEdit";
import { readTokenPresetStorageValue } from "../resolveTokenPreset";
import type { MapPipelineInput } from "./types";

export type BindThemeRefsAfterAiLoweringInput = {
  template: EmailTemplate;
  tokenPresets: TokenPresets;
  /** 保留供管线传入；颜色/字色跟随意仅由 C styleKeys *Bind 在 lowering 写入。 */
  draft?: MapPipelineInput;
  /** 显式关闭；默认见 `isAiPipelineThemeBindEnabled`。 */
  enabled?: boolean;
};

export type BindThemeRefsAfterAiLoweringResult = {
  template: EmailTemplate;
  boundPaths: number;
};

/** 默认开启；设 `AI_PIPELINE_BIND_THEME_REFS=0` 可关闭（可拔插）。 */
export function isAiPipelineThemeBindEnabled(): boolean {
  return process.env.AI_PIPELINE_BIND_THEME_REFS !== "0";
}

function normalizeLiteral(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const t = value.trim();
  return t || undefined;
}

function literalMatchesToken(
  literal: string,
  tokenPresets: TokenPresets,
  tokenPath: string
): boolean {
  const preset = readTokenPresetStorageValue(tokenPresets, tokenPath);
  return preset != null && preset.trim() === literal.trim();
}

function tryBindScalar(
  template: EmailTemplate,
  tokenPresets: TokenPresets,
  blockId: string,
  bindPath: string,
  tokenPath: string
): { template: EmailTemplate; bound: boolean } {
  const block = template.blocks[blockId];
  if (!block) return { template, bound: false };
  const raw = readTemplateFieldOnly(block, bindPath);
  if (isThemeRef(raw)) return { template, bound: false };
  const literal = normalizeLiteral(raw);
  if (!literal || !literalMatchesToken(literal, tokenPresets, tokenPath)) {
    return { template, bound: false };
  }
  return {
    template: applyThemeTokenBinding(template, blockId, bindPath, tokenPath),
    bound: true,
  };
}

function bindPaddingSides(
  template: EmailTemplate,
  tokenPresets: TokenPresets,
  blockId: string
): { template: EmailTemplate; bound: number } {
  const block = template.blocks[blockId];
  if (!block) return { template, bound: 0 };
  const pad = block.wrapperStyle?.padding;
  if (!pad || typeof pad !== "object") return { template, bound: 0 };
  let next = template;
  let bound = 0;
  const mode = (pad as { mode?: string }).mode;
  if (mode === "separate") {
    for (const side of ["top", "bottom"] as const) {
      const r = tryBindScalar(
        next,
        tokenPresets,
        blockId,
        `wrapperStyle.padding.${side}`,
        themeRefPathForStorage("spacing", "section")
      );
      next = r.template;
      if (r.bound) bound += 1;
    }
    for (const side of ["left", "right"] as const) {
      const r = tryBindScalar(
        next,
        tokenPresets,
        blockId,
        `wrapperStyle.padding.${side}`,
        themeRefPathForStorage("spacing", "pageInline")
      );
      next = r.template;
      if (r.bound) bound += 1;
    }
  }
  return { template: next, bound };
}

function bindBorderRadiusRadius(
  template: EmailTemplate,
  tokenPresets: TokenPresets,
  blockId: string,
  bindPathPrefix: string,
  family: TokenPresetFamily,
  scale: string
): { template: EmailTemplate; bound: boolean } {
  const tokenPath = themeRefPathForStorage(family, scale);
  return tryBindScalar(template, tokenPresets, blockId, `${bindPathPrefix}.radius`, tokenPath);
}

function bindBlock(
  template: EmailTemplate,
  tokenPresets: TokenPresets,
  blockId: string,
  block: EmailBlock
): { template: EmailTemplate; bound: number } {
  let next = template;
  let bound = 0;

  const bind = (bindPath: string, tokenPath: string) => {
    const r = tryBindScalar(next, tokenPresets, blockId, bindPath, tokenPath);
    next = r.template;
    if (r.bound) bound += 1;
  };

  if (block.type === "layout" || block.type === "grid") {
    bind("props.gap", themeRefPathForStorage("spacing", "gap"));
    const pad = bindPaddingSides(next, tokenPresets, blockId);
    next = pad.template;
    bound += pad.bound;
    const panelBr = bindBorderRadiusRadius(
      next,
      tokenPresets,
      blockId,
      "wrapperStyle.borderRadius",
      "radius",
      "panel"
    );
    next = panelBr.template;
    if (panelBr.bound) bound += 1;
  }

  if (block.type === "image") {
    bind("props.gap", themeRefPathForStorage("spacing", "gap"));
    const panelPath = themeRefPathForStorage("radius", "panel");
    const bgRadiusPath = "wrapperStyle.backgroundImage.borderRadius.radius";
    const wrapRadiusPath = "wrapperStyle.borderRadius.radius";
    const bgLiteral = normalizeLiteral(readTemplateFieldOnly(block, bgRadiusPath));
    const wrapLiteral = normalizeLiteral(readTemplateFieldOnly(block, wrapRadiusPath));
    if (
      bgLiteral &&
      bgLiteral === wrapLiteral &&
      literalMatchesToken(bgLiteral, tokenPresets, panelPath)
    ) {
      let r = applyThemeTokenBinding(next, blockId, bgRadiusPath, panelPath);
      if (r !== next) bound += 1;
      next = r;
      r = applyThemeTokenBinding(next, blockId, wrapRadiusPath, panelPath);
      if (r !== next) bound += 1;
      next = r;
    } else {
      const br = bindBorderRadiusRadius(
        next,
        tokenPresets,
        blockId,
        "wrapperStyle.backgroundImage.borderRadius",
        "radius",
        "panel"
      );
      next = br.template;
      if (br.bound) bound += 1;
    }
  }

  if (block.type === "button") {
    bind("props.buttonStyle.fontSize", themeRefPathForStorage("typography", "body"));
    const br = bindBorderRadiusRadius(
      next,
      tokenPresets,
      blockId,
      "props.buttonStyle.borderRadius",
      "radius",
      "cta"
    );
    next = br.template;
    if (br.bound) bound += 1;
  }

  if (block.type === "emailRoot") {
    bind("props.backgroundColor", themeRefPathForStorage("colors", "surface"));
  }

  return { template: next, bound };
}

/**
 * E 阶段补充升格：间距/圆角等与 B1 字面量一致时绑 themeRef。
 * 颜色/字色跟随意仅由 C styleKeys 的 *Bind（lowering 阶段）写入，此处不再猜绑。
 */
export function bindThemeRefsAfterAiLowering(
  input: BindThemeRefsAfterAiLoweringInput
): BindThemeRefsAfterAiLoweringResult {
  if (input.enabled === false || !isAiPipelineThemeBindEnabled()) {
    return { template: input.template, boundPaths: 0 };
  }

  let template = input.template;
  let boundPaths = 0;
  for (const [blockId, block] of Object.entries(template.blocks)) {
    const r = bindBlock(template, input.tokenPresets, blockId, block);
    template = r.template;
    boundPaths += r.bound;
  }
  return { template, boundPaths };
}
