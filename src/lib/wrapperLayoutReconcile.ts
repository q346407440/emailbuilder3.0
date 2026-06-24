/**
 * 外层容器布局协调层：结构性编辑后按固定顺序归一化 wrapperStyle。
 *
 * 顺序：① 子级 fill 回落 → ② 容器 hug 回落 → ③ contentAlign 回落
 * 规则真源：wrapperFillConstraint / wrapperHugConstraint / contentAlignConfigurability。
 */
import type { EmailBlock, EmailTemplate, WrapperStyle } from "../types/email";
import {
  normalizeBlockWrapperContentAlign,
  type ContentAlignEffectivenessChange,
} from "./contentAlignConfigurability";
import {
  normalizeBlockWrapperDimensionModes,
  normalizeButtonBodyDimensionModes,
  type ButtonBodyDimensionModeChange,
  type WrapperDimensionModeChange,
} from "./wrapperFillConstraint";
import {
  normalizeContainerHugDimensionModes,
  type ContainerHugDimensionModeChange,
} from "./wrapperHugConstraint";

export type WrapperReconcileReasonCode =
  | "fill_blocked_by_parent_hug"
  | "hug_blocked_by_missing_child_anchor"
  | "button_body_fill_blocked_by_wrapper_hug"
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

function mapContainerHugChanges(changes: ContainerHugDimensionModeChange[]): WrapperReconcileChange[] {
  return changes.map((c) => ({
    blockId: c.blockId,
    field: c.axis === "width" ? "wrapperStyle.widthMode" : "wrapperStyle.heightMode",
    from: c.from,
    to: c.to,
    reasonCode: "hug_blocked_by_missing_child_anchor" as const,
  }));
}

function mapButtonBodyChanges(changes: ButtonBodyDimensionModeChange[]): WrapperReconcileChange[] {
  return changes.map((c) => ({
    blockId: c.blockId,
    field:
      c.axis === "width"
        ? "props.buttonStyle.widthMode"
        : "props.buttonStyle.heightMode",
    from: c.from,
    to: c.to,
    reasonCode: "button_body_fill_blocked_by_wrapper_hug" as const,
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
  const walk = (id: string) => {
    const block = template.blocks[id];
    if (!block) return;
    for (const childId of block.children ?? []) {
      walk(childId);
    }
    out.push(id);
  };
  walk(rootBlockId);
  return out;
}

function collectBlocksInTreeOrder(template: EmailTemplate): string[] {
  const out: string[] = [];
  const walk = (id: string) => {
    const block = template.blocks[id];
    if (!block) return;
    for (const childId of block.children ?? []) {
      walk(childId);
    }
    if (block.type !== "emailRoot") {
      out.push(id);
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
  props: EmailBlock["props"] | undefined;
  changed: boolean;
  changes: WrapperReconcileChange[];
} {
  const block = workingBlock ?? template.blocks[blockId];
  if (!block || block.type === "emailRoot") {
    return { wrapperStyle: block?.wrapperStyle, props: block?.props, changed: false, changes: [] };
  }

  const allChanges: WrapperReconcileChange[] = [];
  let ws = block.wrapperStyle;
  let props = block.props;
  let touched = false;

  const fillResult = normalizeBlockWrapperDimensionModes(template, blockId, { ...block, wrapperStyle: ws });
  if (fillResult.changed) {
    ws = fillResult.wrapperStyle;
    touched = true;
    allChanges.push(...mapDimensionChanges(fillResult.changes));
  }

  const hugResult = normalizeContainerHugDimensionModes(template, blockId, {
    ...block,
    wrapperStyle: ws,
  });
  if (hugResult.changed) {
    ws = hugResult.wrapperStyle;
    touched = true;
    allChanges.push(...mapContainerHugChanges(hugResult.changes));
  }

  if (block.type === "button") {
    const bodyResult = normalizeButtonBodyDimensionModes(template, blockId, {
      ...block,
      wrapperStyle: ws,
      props,
    });
    if (bodyResult.changed) {
      props = bodyResult.props;
      touched = true;
      allChanges.push(...mapButtonBodyChanges(bodyResult.changes));
    }
  }

  const blockForAlign: EmailBlock = { ...block, wrapperStyle: ws, props };
  const alignResult = normalizeBlockWrapperContentAlign(template, blockId, blockForAlign);
  if (alignResult.changed) {
    ws = alignResult.wrapperStyle;
    touched = true;
    allChanges.push(...mapContentAlignChanges(alignResult.changes));
  }

  return { wrapperStyle: ws, props, changed: touched, changes: allChanges };
}

/** 结构性布局编辑后：协调以 `rootBlockId` 为根的子树（含根节点）。原地修改 `template.blocks`。 */
function collectAncestorBlockIds(template: EmailTemplate, blockId: string): string[] {
  const out: string[] = [];
  let parentId = template.blocks[blockId]?.parentId;
  while (parentId) {
    out.push(parentId);
    parentId = template.blocks[parentId]?.parentId;
  }
  return out;
}

function reconcileBlockIdsInPlace(
  template: EmailTemplate,
  blockIds: string[]
): WrapperReconcileChange[] {
  const allChanges: WrapperReconcileChange[] = [];
  const seen = new Set<string>();
  for (const blockId of blockIds) {
    if (seen.has(blockId)) continue;
    seen.add(blockId);
    const block = template.blocks[blockId];
    if (!block || block.type === "emailRoot") continue;
    const result = reconcileBlockWrapperStyle(template, blockId, block);
    if (result.changed) {
      block.wrapperStyle = result.wrapperStyle;
      if (result.props !== undefined) {
        block.props = result.props;
      }
      allChanges.push(...result.changes);
    }
  }
  return allChanges;
}

export function reconcileLayoutStructuralSubtreeInPlace(
  template: EmailTemplate,
  rootBlockId: string
): WrapperReconcileChange[] {
  const blockIds = [
    ...collectSubtreeBlockIds(template, rootBlockId),
    ...collectAncestorBlockIds(template, rootBlockId),
  ];
  const allChanges: WrapperReconcileChange[] = [];
  for (let pass = 0; pass < 16; pass += 1) {
    const passChanges = reconcileBlockIdsInPlace(template, blockIds);
    if (passChanges.length === 0) break;
    allChanges.push(...passChanges);
  }
  return allChanges;
}

/** 全模板协调（迁移 / 批量校验修复）。按后序树序迭代至固定点。 */
export function reconcileTemplateWrapperStyles(template: EmailTemplate): {
  template: EmailTemplate;
  changes: WrapperReconcileChange[];
} {
  const next = structuredClone(template) as EmailTemplate;
  const allChanges: WrapperReconcileChange[] = [];
  const blockIds = collectBlocksInTreeOrder(next);
  for (let pass = 0; pass < 16; pass += 1) {
    const passChanges = reconcileBlockIdsInPlace(next, blockIds);
    if (passChanges.length === 0) break;
    allChanges.push(...passChanges);
  }
  return { template: next, changes: allChanges };
}

/** 返回发生过协调的 blockId 列表（用于迁移脚本日志）。 */
export function blockIdsFromReconcileChanges(changes: WrapperReconcileChange[]): string[] {
  return [...new Set(changes.map((c) => c.blockId))];
}
