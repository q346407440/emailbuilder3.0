import type { EmailTemplate } from "../types/email";
import { normalizeButtonContentAlign } from "./buttonContentAlign";
import { ensureLayoutContentAlignPersisted, normalizeLayoutContentAlign } from "./layoutContentAlign";
import { ensureWrapperContentAlignPersisted } from "./wrapperContentAlign";
import { stripForbiddenRenderDefaultsFromBlock } from "../render-defaults-contract/validate";

/**
 * 模板加载时补齐 grid 等结构默认值，并剥离禁止持久化的 wrapperStyle 字段。
 */
export function normalizeTemplateBlockDefaults(template: EmailTemplate): boolean {
  let changed = false;
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
    if (stripForbiddenRenderDefaultsFromBlock(block)) changed = true;
    if (normalizeButtonContentAlign(block)) changed = true;
    if (normalizeLayoutContentAlign(block)) changed = true;
    if (ensureLayoutContentAlignPersisted(block)) changed = true;
    if (ensureWrapperContentAlignPersisted(block)) changed = true;
  }

  return changed;
}
