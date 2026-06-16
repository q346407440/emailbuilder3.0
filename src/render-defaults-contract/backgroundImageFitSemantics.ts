import type { EmailBlock, EmailTemplate, WrapperBackgroundImage } from "../types/email";

export const WRAPPER_BACKGROUND_IMAGE_POSITION_BIND_PATH = "wrapperStyle.backgroundImage.position";

/** 与 rules.ts `semantic.backgroundImagePositionCoverOnly` 一致 */
export const BACKGROUND_IMAGE_POSITION_FORBIDDEN_WHEN_CONTAIN_REASON =
  "完整显示（contain）时不配置 backgroundImage.position；画面位置仅在裁切铺满（cover）下生效";

/** 未写 fit 时与渲染层一致，视为 cover */
export function effectiveBackgroundImageFit(fit: unknown): "cover" | "contain" {
  return fit === "contain" ? "contain" : "cover";
}

/** 仅 cover 裁切铺满时允许持久化/展示画面位置配置 */
export function backgroundImageFitUsesPosition(fit: unknown): boolean {
  return effectiveBackgroundImageFit(fit) === "cover";
}

function readBackgroundImage(block: EmailBlock): WrapperBackgroundImage | null {
  const bg = block.wrapperStyle?.backgroundImage;
  if (!bg || typeof bg !== "object" || Array.isArray(bg)) return null;
  return bg as WrapperBackgroundImage;
}

export function validateForbiddenBackgroundImagePositionWhenContain(
  template: EmailTemplate
): Array<{ path: string; reason: string }> {
  const issues: Array<{ path: string; reason: string }> = [];
  for (const [id, block] of Object.entries(template.blocks)) {
    if (!block || typeof block !== "object") continue;
    const bg = readBackgroundImage(block);
    if (!bg) continue;
    if (!backgroundImageFitUsesPosition(bg.fit) && bg.position !== undefined) {
      issues.push({
        path: `blocks.${id}.wrapperStyle.backgroundImage.position`,
        reason: BACKGROUND_IMAGE_POSITION_FORBIDDEN_WHEN_CONTAIN_REASON,
      });
    }
    if (
      !backgroundImageFitUsesPosition(bg.fit) &&
      block.bindings?.[WRAPPER_BACKGROUND_IMAGE_POSITION_BIND_PATH]
    ) {
      issues.push({
        path: `blocks.${id}.bindings.${WRAPPER_BACKGROUND_IMAGE_POSITION_BIND_PATH}`,
        reason: BACKGROUND_IMAGE_POSITION_FORBIDDEN_WHEN_CONTAIN_REASON,
      });
    }
  }
  return issues;
}

export function stripBackgroundImagePositionWhenContainFromBlock(block: EmailBlock): boolean {
  const bg = readBackgroundImage(block);
  if (!bg || backgroundImageFitUsesPosition(bg.fit)) return false;

  let changed = false;
  if (bg.position !== undefined) {
    const next = { ...(bg as Record<string, unknown>) };
    delete next.position;
    block.wrapperStyle = { ...block.wrapperStyle, backgroundImage: next as WrapperBackgroundImage };
    changed = true;
  }
  if (block.bindings?.[WRAPPER_BACKGROUND_IMAGE_POSITION_BIND_PATH]) {
    const nextBindings = { ...block.bindings };
    delete nextBindings[WRAPPER_BACKGROUND_IMAGE_POSITION_BIND_PATH];
    block.bindings = nextBindings;
    changed = true;
  }
  return changed;
}

export function stripBackgroundImagePositionWhenContainFromTemplate(template: EmailTemplate): boolean {
  let changed = false;
  for (const block of Object.values(template.blocks)) {
    if (!block || typeof block !== "object") continue;
    if (stripBackgroundImagePositionWhenContainFromBlock(block)) changed = true;
  }
  return changed;
}
