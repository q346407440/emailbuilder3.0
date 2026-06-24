import { reconcileTemplateWrapperStyles } from "../lib/wrapperLayoutReconcile";
import type { EmailTemplate } from "../types/email";
import type { TokenPresets } from "../types/tokenPreset";
import { collapseRootSiblingPaddingSeams } from "./collapseRootSiblingPaddingSeams";
import { resolveEmailCanvasLiteral } from "./resolveEmailCanvas";
import { createBuildCtx, type AssetRequest } from "./buildCtx";
import { buildNode } from "./buildNode";
import { draftTreeToEmailTemplate } from "./draftToGraph";
import { themeToTokenPresets } from "./emitTokenPresets";
import type { RestoreAstDocument } from "./types";

export type AstToTemplateOptions = {
  emailId: string;
  templateId: string;
  locale: string;
  idPrefix: string;
  tokenPresetLabel?: string;
};

export type AstToTemplateResult = {
  template: EmailTemplate;
  tokenPresets: TokenPresets;
  assets: AssetRequest[];
  blockIdToAstPath: Map<string, string>;
};

/**
 * RestoreAstDocument → EditorBlockGraph + tokenPresets（第 1 步组装器入口）。
 * Pass 1 build → Pass 2 fill/hug 协调 → Pass 3 emit tokenPresets。
 */
export function astToTemplate(
  doc: RestoreAstDocument,
  opts: AstToTemplateOptions
): AstToTemplateResult {
  const ctx = createBuildCtx(opts.idPrefix, doc.theme);
  const draftRoot = buildNode(doc.tree, ctx, "tree");

  let template = draftTreeToEmailTemplate(draftRoot, {
    emailId: opts.emailId,
    templateId: opts.templateId,
    locale: opts.locale,
  });

  const reconciled = reconcileTemplateWrapperStyles(template);
  template = collapseRootSiblingPaddingSeams(reconciled.template, doc.theme, {
    canvasDefaultLiteral: resolveEmailCanvasLiteral(doc.tree, doc.theme),
  });

  const tokenPresets = themeToTokenPresets(doc.theme, opts.tokenPresetLabel);

  return {
    template,
    tokenPresets,
    assets: ctx.assets,
    blockIdToAstPath: ctx.blockIdToAstPath,
  };
}
