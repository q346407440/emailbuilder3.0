/**
 * 外层容器布局协调层：结构性编辑后按固定顺序归一化 wrapperStyle。
 *
 * 顺序：① 尺寸 fill 回落 → ② contentAlign 回落
 * 规则真源：wrapperFillConstraint / contentAlignConfigurability。
 */
import type { EmailBlock, EmailTemplate, WrapperStyle } from "../types/email";
import {
  normalizeBlockWrapperContentAlign,
  type ContentAlignEffectivenessChange,
} from "./contentAlignConfigurability";
import {
  normalizeBlockWrapperDimensionModes,
  type WrapperDimensionModeChange,
} from "./wrapperFillConstraint";

export type WrapperReconcileReasonCode =
  | "fill_blocked_by_parent_hug"
  | "content_align_axis_not_configurable";

export type WrapperReconcileChange = {
  blockId: string;
  field: string;
  from: unknown;
  to: unknown;
  reasonCode: WrapperReconcileReasonCode;
};

function mapDimensionChanges(changes: WrapperDimensionModeChange[]): WrapperReconcileChange[] {
  return changes.map((c) => ({
    blockId: c.blockId,
    field: c.axis === "width" ? "wrapperStyle.widthMode" : "wrapperStyle.heightMode",
    from: c.from,
    to: c.to,
    reasonCode: "fill_blocked_by_parent_hug" as const,
  }));
}

function mapContentAlignChanges(changes: ContentAlignEffectivenessChange[]): WrapperReconcileChange[] {
  return changes.map((c) => ({
    blockId: c.blockId,
    field:
      c.axis === "horizontal"
        ? "wrapperStyle.contentAlign.horizontal"
        : "wrapperStyle.contentAlign.vertical",
    from: c.from,
    to: c.to,
    reasonCode: "content_align_axis_not_configurable" as const,
  }));
}

function collectSubtreeBlockIds(template: EmailTemplate, rootBlockId: string): string[] {
  const out: string[] = [];
  const queue = [rootBlockId];
  const seen = new Set<string>();
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const block = template.blocks[id];
    if (!block) continue;
    out.push(id);
    for (const childId of block.children ?? []) {
      queue.push(childId);
    }
  }
  return out;
}

function collectBlocksInTreeOrder(template: EmailTemplate): string[] {
  const out: string[] = [];
  const walk = (id: string) => {
    const block = template.blocks[id];
    if (!block) return;
    if (block.type !== "emailRoot") {
      out.push(id);
    }
    for (const childId of block.children ?? []) {
      walk(childId);
    }
  };
  walk(template.rootBlockId);
  return out;
}

/** 单块 wrapperStyle 协调（① fill → ② contentAlign）。 */
export function reconcileBlockWrapperStyle(
  template: EmailTemplate,
  blockId: string,
  workingBlock?: EmailBlock
): {
  wrapperStyle: WrapperStyle | undefined;
  changed: boolean;
  changes: WrapperReconcileChange[];
} {
  const block = workingBlock ?? template.blocks[blockId];
  if (!block || block.type === "emailRoot") {
    return { wrapperStyle: block?.wrapperStyle, changed: false, changes: [] };
  }

  const allChanges: WrapperReconcileChange[] = [];
  let ws = block.wrapperStyle;
  let touched = false;

  const fillResult = normalizeBlockWrapperDimensionModes(template, blockId, { ...block, wrapperStyle: ws });
  if (fillResult.changed) {
    ws = fillResult.wrapperStyle;
    touched = true;
    allChanges.push(...mapDimensionChanges(fillResult.changes));
  }

  const blockForAlign: EmailBlock = { ...block, wrapperStyle: ws };
  const alignResult = normalizeBlockWrapperContentAlign(template, blockId, blockForAlign);
  if (alignResult.changed) {
    ws = alignResult.wrapperStyle;
    touched = true;
    allChanges.push(...mapContentAlignChanges(alignResult.changes));
  }

  return { wrapperStyle: ws, changed: touched, changes: allChanges };
}

/** 结构性布局编辑后：协调以 `rootBlockId` 为根的子树（含根节点）。原地修改 `template.blocks`。 */
export function reconcileLayoutStructuralSubtreeInPlace(
  template: EmailTemplate,
  rootBlockId: string
): WrapperReconcileChange[] {
  const allChanges: WrapperReconcileChange[] = [];
  for (const blockId of collectSubtreeBlockIds(template, rootBlockId)) {
    const block = template.blocks[blockId];
    if (!block || block.type === "emailRoot") continue;
    const result = reconcileBlockWrapperStyle(template, blockId, block);
    if (result.changed) {
      block.wrapperStyle = result.wrapperStyle;
      allChanges.push(...result.changes);
    }
  }
  return allChanges;
}

/** 全模板协调（迁移 / 批量校验修复）。按树序处理。 */
export function reconcileTemplateWrapperStyles(template: EmailTemplate): {
  template: EmailTemplate;
  changes: WrapperReconcileChange[];
} {
  const next = structuredClone(template) as EmailTemplate;
  const allChanges: WrapperReconcileChange[] = [];
  for (const blockId of collectBlocksInTreeOrder(next)) {
    const block = next.blocks[blockId];
    if (!block) continue;
    const result = reconcileBlockWrapperStyle(next, blockId, block);
    if (result.changed) {
      block.wrapperStyle = result.wrapperStyle;
      allChanges.push(...result.changes);
    }
  }
  return { template: next, changes: allChanges };
}

/** 返回发生过协调的 blockId 列表（用于迁移脚本日志）。 */
export function blockIdsFromReconcileChanges(changes: WrapperReconcileChange[]): string[] {
  return [...new Set(changes.map((c) => c.blockId))];
}
