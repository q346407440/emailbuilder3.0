import type { EmailTemplate } from "../types/email";
import { normalizeTemplateContentAlignEffectiveness } from "./contentAlignConfigurability";
import { normalizeButtonContentAlign } from "./buttonContentAlign";
import { ensureLayoutContentAlignPersisted } from "./layoutContentAlign";
import { ensureWrapperContentAlignPersisted } from "./wrapperContentAlign";
import { coercePaddingOnContainerIfChanged } from "./spacingValue";
/**
 * 模板加载时补齐结构默认值与 contentAlign 有效性（禁止字段由 validate 报错，不在此静默删除）。
 */
export function normalizeTemplateBlockDefaults(template: EmailTemplate): boolean {
  let changed = false;

  const { template: aligned, changes: alignChanges } =
    normalizeTemplateContentAlignEffectiveness(template);
  if (alignChanges.length > 0) {
    template.blocks = aligned.blocks;
    changed = true;
  }

  const blocks = template.blocks;

  for (const block of Object.values(blocks)) {
    if (!block || typeof block !== "object") continue;
    if (block.type === "grid") {
      const ws = block.wrapperStyle as Record<string, unknown> | undefined;
      if (!ws || typeof ws !== "object" || Array.isArray(ws)) {
        block.wrapperStyle = { padding: { mode: "unified", unified: "0" } };
        changed = true;
      } else if (ws.padding === undefined || ws.padding === null) {
        ws.padding = { mode: "unified", unified: "0" };
        changed = true;
      }
    }
    if (block.props && typeof block.props === "object" && !Array.isArray(block.props)) {
      if (coercePaddingOnContainerIfChanged(block.props as Record<string, unknown>)) {
        changed = true;
      }
    }
    if (block.wrapperStyle && typeof block.wrapperStyle === "object") {
      if (coercePaddingOnContainerIfChanged(block.wrapperStyle as Record<string, unknown>)) {
        changed = true;
      }
    }
    if (block.type === "button") {
      const props = block.props as Record<string, unknown>;
      const buttonStyle =
        props.buttonStyle && typeof props.buttonStyle === "object" && !Array.isArray(props.buttonStyle)
          ? (props.buttonStyle as Record<string, unknown>)
          : undefined;
      if (buttonStyle && buttonStyle.widthMode === undefined) {
        buttonStyle.widthMode = "hug";
        changed = true;
      }
    }
    if (block.type === "divider") {
      const props = block.props as Record<string, unknown>;
      if (props.lineWidthMode === undefined) {
        props.lineWidthMode = "fill";
        changed = true;
      }
    }
    if (block.type === "progress") {
      const props = block.props as Record<string, unknown>;
      if (props.barWidthMode === undefined) {
        props.barWidthMode = "fill";
        changed = true;
      }
    }
    if (normalizeButtonContentAlign(block)) changed = true;
    if (ensureLayoutContentAlignPersisted(block)) changed = true;
    if (ensureWrapperContentAlignPersisted(block)) changed = true;
  }

  return changed;
}
