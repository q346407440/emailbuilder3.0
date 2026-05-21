import type { EmailBlock, EmailTemplate } from "../types/email";
import type { RenderDefaultsContractIssue } from "./types";

function issue(path: string, reason: string): RenderDefaultsContractIssue {
  return { path, reason };
}

/** 校验 template 是否违反「禁止持久化」规则（wrapperStyle 子集；其余禁止项仍在 validate.ts） */
export function validateRenderDefaultsForbiddenFields(
  template: EmailTemplate
): RenderDefaultsContractIssue[] {
  const issues: RenderDefaultsContractIssue[] = [];
  for (const [id, block] of Object.entries(template.blocks)) {
    if (!block || typeof block !== "object") continue;
    const ws = block.wrapperStyle;
    if (!ws || typeof ws !== "object" || Array.isArray(ws)) continue;
    const base = `blocks.${id}.wrapperStyle`;

    if (ws.selfAlign !== undefined) {
      issues.push(
        issue(`${base}.selfAlign`, "禁止使用 wrapperStyle.selfAlign，请改用 wrapperStyle.placement")
      );
    }
    if (ws.backgroundContentAlign !== undefined) {
      issues.push(
        issue(
          `${base}.backgroundContentAlign`,
          "禁止写入 backgroundContentAlign；项目固定为 left/top，底图叠放位置请用子级 wrapperStyle.placement"
        )
      );
    }
    if (ws.overflow !== undefined) {
      issues.push(
        issue(`${base}.overflow`, "禁止写入 wrapperStyle.overflow，由渲染层按项目默认处理")
      );
    }
    if (ws.overlayInset !== undefined) {
      issues.push(
        issue(
          `${base}.overlayInset`,
          "overlayInset 已废弃：底图块请使用 wrapperStyle.padding（渲染层在存在 backgroundImage 时将其作用于叠放子内容，不缩小底图）"
        )
      );
    }
  }
  return issues;
}

export function stripForbiddenRenderDefaultsFromBlock(block: EmailBlock): boolean {
  if (!block.wrapperStyle || typeof block.wrapperStyle !== "object" || Array.isArray(block.wrapperStyle)) {
    return false;
  }
  const ws = block.wrapperStyle as Record<string, unknown>;
  let changed = false;

  for (const key of ["selfAlign", "backgroundContentAlign", "overflow", "overlayInset"] as const) {
    if (key in ws) {
      delete ws[key];
      changed = true;
    }
  }

  return changed;
}

export function stripForbiddenRenderDefaultsFromTemplate(template: EmailTemplate): boolean {
  let changed = false;
  for (const block of Object.values(template.blocks)) {
    if (!block || typeof block !== "object") continue;
    if (stripForbiddenRenderDefaultsFromBlock(block)) changed = true;
  }
  return changed;
}
