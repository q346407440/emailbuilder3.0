import type { EmailPayload, EmailTemplate } from "../types/email";
import { blockIsVisible } from "../visibility-contract";

export type ApplyVisibilityRulesOptions = {
  /**
   * 为 true 时：凡配置了 visibility 的块一律视为「条件不满足、不显示」，整棵子树裁剪，
   * 不读取 payload（用于画布验收「所有带显隐的模块都隐藏」的版式）。
   */
  simulateAllHidden?: boolean;
};

/** 是否存在至少一个配置了条件显隐的区块（不含根）。 */
export function templateHasVisibilityRules(template: EmailTemplate | null): boolean {
  if (!template?.blocks) return false;
  return Object.values(template.blocks).some((b) => Boolean(b.visibility));
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function deleteSubtree(template: EmailTemplate, blockId: string): void {
  const block = template.blocks[blockId];
  if (!block) return;
  for (const childId of block.children ?? []) {
    deleteSubtree(template, childId);
  }
  delete template.blocks[blockId];
  if (template.blockMeta) delete template.blockMeta[blockId];
}

/**
 * 可见性裁剪优先于 repeat 展开与字段 merge：不可见子树不再参与后续运行时处理。
 */
export function applyVisibilityRules(
  template: EmailTemplate,
  payload: EmailPayload | null,
  options?: ApplyVisibilityRulesOptions
): EmailTemplate {
  const out = clone(template);
  const simulateAllHidden = options?.simulateAllHidden === true;

  const pruneChildren = (blockId: string): boolean => {
    const block = out.blocks[blockId];
    if (!block) return false;

    if (blockId !== out.rootBlockId) {
      if (simulateAllHidden && block.visibility) {
        deleteSubtree(out, blockId);
        return false;
      }
      if (!blockIsVisible(block.visibility, payload)) {
        deleteSubtree(out, blockId);
        return false;
      }
    }

    const visibleChildren: string[] = [];
    for (const childId of block.children ?? []) {
      if (pruneChildren(childId)) visibleChildren.push(childId);
    }
    block.children = visibleChildren;
    return true;
  };

  pruneChildren(out.rootBlockId);
  return out;
}
