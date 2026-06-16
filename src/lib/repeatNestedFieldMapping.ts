import type { RepeatRuntimeContext } from "../repeat-binding-contract";
import type {
  BindingCollectionField,
  EmailPayload,
  EmailTemplate,
  RepeatFieldMapping,
  RepeatRegionBinding,
} from "../types/email";
import {
  findCollectionFieldByPath,
} from "../payload-contract/collection-item-fields";
import type { CollectionJsonSample } from "./collectionFieldMapping";
import { getAtPath } from "./paths";
import { isRepeatHostBlock } from "./repeatRegion";
import { parentScalarItemFieldsFromItemFields } from "./repeatNestedBindingUi";

export const REPEAT_PARENT_FIELD_PREFIX = "parent.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stripCollectionIndex(slotPath: string): string {
  const parts = slotPath.split(".");
  if (/^\d+$/.test(parts[0] ?? "")) {
    return parts.slice(1).join(".");
  }
  return slotPath;
}

export function isRepeatParentFieldSourcePath(sourcePath: string): boolean {
  return sourcePath.startsWith(REPEAT_PARENT_FIELD_PREFIX);
}

export function stripRepeatParentFieldPrefix(sourcePath: string): string {
  return isRepeatParentFieldSourcePath(sourcePath)
    ? sourcePath.slice(REPEAT_PARENT_FIELD_PREFIX.length)
    : sourcePath;
}

/** 自 block 向上查找最近一层带 collection repeat 的宿主配置 */
export function findEnclosingRepeatHostBinding(
  template: EmailTemplate,
  blockId: string
): RepeatRegionBinding | null {
  let currentId: string | null = template.blocks[blockId]?.parentId ?? null;
  while (currentId) {
    const host = template.blocks[currentId];
    if (host?.repeat?.mode === "collection" && isRepeatHostBlock(host)) {
      return host.repeat;
    }
    currentId = host?.parentId ?? null;
  }
  return null;
}

/**
 * 列表绑定向导用的「外层 repeat」：提供父项子列表（itemPath）候选。
 * 当选中块已处于某 repeat 行模板内（mapped-field / row-template）时，跳过该 repeat 宿主本身，
 * 继续向外找（例如 sku 行内文本块 → 商品卡片 repeat，而非 sku 行 repeat）。
 */
export function findEnclosingParentRepeatBinding(
  template: EmailTemplate,
  blockId: string,
  opts?: { skipRepeatHostId?: string | null }
): RepeatRegionBinding | null {
  const skipHostId = opts?.skipRepeatHostId?.trim() || null;
  let pid: string | null = template.blocks[blockId]?.parentId ?? null;
  while (pid) {
    const host = template.blocks[pid];
    if (host?.repeat?.mode === "collection" && isRepeatHostBlock(host)) {
      if (skipHostId && pid === skipHostId) {
        pid = host.parentId ?? null;
        continue;
      }
      return host.repeat;
    }
    pid = host?.parentId ?? null;
  }
  return null;
}

/** 嵌套 repeat 字段映射可选标量列：仅当前绑定的子列表 itemFields（不含父项标量） */
export function listRepeatFieldMappingScalarFields(
  repeat: RepeatRegionBinding,
  _enclosingParentRepeat: RepeatRegionBinding | null = null
): BindingCollectionField[] {
  void _enclosingParentRepeat;
  return parentScalarItemFieldsFromItemFields(repeat.itemFields ?? []);
}

export function resolveRepeatFieldMappingSourceMeta(
  repeat: RepeatRegionBinding,
  enclosingParentRepeat: RepeatRegionBinding | null,
  sourcePath: string
): BindingCollectionField | undefined {
  if (isRepeatParentFieldSourcePath(sourcePath)) {
    if (!repeat.itemPath?.trim() || !enclosingParentRepeat) return undefined;
    return findCollectionFieldByPath(
      enclosingParentRepeat.itemFields,
      stripRepeatParentFieldPrefix(sourcePath)
    );
  }
  return findCollectionFieldByPath(repeat.itemFields, sourcePath);
}

export function resolveParentRowItemPathForNestedRepeat(
  repeat: RepeatRegionBinding,
  nestedItemPath: string
): string | undefined {
  const itemPath = repeat.itemPath?.trim();
  if (!itemPath) return undefined;
  const marker = `.${itemPath}.`;
  const markerIndex = nestedItemPath.indexOf(marker);
  if (markerIndex < 0) return undefined;
  return nestedItemPath.slice(0, markerIndex);
}

export function resolveParentRowItemForNestedRepeat(
  repeat: RepeatRegionBinding,
  contextStack: RepeatRuntimeContext[],
  nestedItemPath: string
): Record<string, unknown> | undefined {
  const parentItemPath = resolveParentRowItemPathForNestedRepeat(repeat, nestedItemPath);
  if (!parentItemPath) return undefined;
  return [...contextStack]
    .reverse()
    .find((ctx) => ctx.slotId === repeat.slotId && ctx.itemPath === parentItemPath)?.item;
}

export function buildRepeatFieldMappingCollectionSlotPath(
  mapping: RepeatFieldMapping,
  nestedItemPath: string,
  parentItemPath: string | undefined
): string {
  if (isRepeatParentFieldSourcePath(mapping.sourcePath)) {
    const parentKey = stripRepeatParentFieldPrefix(mapping.sourcePath);
    return parentItemPath ? `${parentItemPath}.${parentKey}` : parentKey;
  }
  const fieldPath = stripCollectionIndex(mapping.sourcePath);
  const itemOffset = Math.max(0, Math.floor(mapping.itemOffset ?? 0));
  const itemPath =
    itemOffset > 0
      ? nestedItemPath.replace(/\d+$/, (raw) => String(Number(raw) + itemOffset))
      : nestedItemPath;
  return fieldPath ? `${itemPath}.${fieldPath}` : itemPath;
}

export function resolveRepeatFieldMappingValue(
  mapping: RepeatFieldMapping,
  nestedItem: Record<string, unknown>,
  parentItem: Record<string, unknown> | undefined,
  groupItems?: Record<string, unknown>[]
): unknown {
  if (isRepeatParentFieldSourcePath(mapping.sourcePath)) {
    const key = stripRepeatParentFieldPrefix(mapping.sourcePath);
    return parentItem ? getAtPath(parentItem, key) : undefined;
  }
  const itemOffset = Math.max(0, Math.floor(mapping.itemOffset ?? 0));
  const sourceItem = itemOffset > 0 ? groupItems?.[itemOffset] : nestedItem;
  if (!sourceItem) return undefined;
  return getAtPath(sourceItem, stripCollectionIndex(mapping.sourcePath));
}

export function resolveAnchoredParentItemWithFallback(
  repeat: RepeatRegionBinding,
  payload: EmailPayload | null,
  contexts: RepeatRuntimeContext[],
  fallbackParentIndex = 0
): Record<string, unknown> | undefined {
  const anchorCtx = [...contexts].reverse().find((ctx) => ctx.slotId === repeat.slotId);
  if (anchorCtx?.item) return anchorCtx.item;
  if (!repeat.itemPath?.trim() || !payload) return undefined;
  const raw = payload.values?.[repeat.slotId];
  if (!Array.isArray(raw)) return undefined;
  const row = raw[fallbackParentIndex];
  return isRecord(row) ? row : undefined;
}

/** Inspector 数据预览：嵌套 itemPath 时仅展示子列表行数据 */
export function enrichNestedRepeatPreviewRowsForInspector(
  repeat: RepeatRegionBinding,
  payload: EmailPayload | null,
  contexts: RepeatRuntimeContext[],
  _enclosingParentRepeat: RepeatRegionBinding | null = null
): Record<string, unknown>[] {
  void _enclosingParentRepeat;
  return resolveNestedRepeatPreviewItems(repeat, payload, contexts);
}

/** Inspector / 预览：嵌套 itemPath 列表项（无运行时上下文时回退到首行父项） */
export function resolveNestedRepeatPreviewItems(
  repeat: RepeatRegionBinding,
  payload: EmailPayload | null,
  contexts: RepeatRuntimeContext[] = [],
  fallbackParentIndex = 0
): Record<string, unknown>[] {
  if (!repeat.itemPath?.trim()) return [];
  const parentItem = resolveAnchoredParentItemWithFallback(
    repeat,
    payload,
    contexts,
    fallbackParentIndex
  );
  const raw = parentItem ? getAtPath(parentItem, repeat.itemPath) : undefined;
  if (!Array.isArray(raw)) return [];
  const items = raw.filter(isRecord);
  return typeof repeat.maxItems === "number" ? items.slice(0, repeat.maxItems) : items;
}

/** 嵌套 repeat 绑定向导：子列表首项样本（不含父项标量） */
export function collectionSampleFromNestedRepeatPayload(
  payload: EmailPayload | null,
  repeat: RepeatRegionBinding,
  scalarFields: BindingCollectionField[],
  contexts: RepeatRuntimeContext[] = [],
  _enclosingParentRepeat: RepeatRegionBinding | null = null
): CollectionJsonSample | null {
  void scalarFields;
  void _enclosingParentRepeat;
  const nestedItems = resolveNestedRepeatPreviewItems(repeat, payload, contexts);
  const firstNested = nestedItems[0];
  if (!firstNested) return null;
  return { keys: Object.keys(firstNested), firstItem: { ...firstNested } };
}
