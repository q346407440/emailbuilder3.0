import type { CollectionDataSource } from "../payload-contract/collection-data-source";
import { defaultCollectionDataSource } from "../payload-contract/collection-data-source";
import {
  DEFAULT_BUILTIN_COLLECTION_EXTRACT,
  type BuiltinCollectionExtract,
} from "../payload-contract/collection-builtin-extract";
import {
  DEFAULT_BUILTIN_COLLECTION_SORT,
  type BuiltinCollectionSortId,
} from "../payload-contract/collection-builtin-sort";
import type { BindingCollectionField, EmailPayload, PayloadSlotDefinition } from "../types/email";
import type { CollectionDisplayRule } from "../payload-contract/types";
import {
  projectBuiltinCatalogItems,
  type BuiltinCollectionCatalogId,
} from "./builtinCollectionCatalog";
import { resolveBuiltinCollectionItems } from "./resolveBuiltinCollectionItems";

export const COLLECTION_FIXED_LENGTH_MIN = 1;
export const COLLECTION_FIXED_LENGTH_MAX = 10;

export type ParseCollectionJsonResult =
  | { ok: true; items: Record<string, unknown>[] }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isItemRecord(value: unknown): value is Record<string, unknown> {
  return isRecord(value);
}

/** 从 JSON 根或 itemsPath 取出数组 */
export function extractArrayFromJsonRoot(
  parsed: unknown,
  itemsPath?: string
): { ok: true; items: unknown[] } | { ok: false; error: string } {
  if (itemsPath?.trim()) {
    const parts = itemsPath.trim().split(".").filter(Boolean);
    let cur: unknown = parsed;
    for (const part of parts) {
      if (!isRecord(cur) || !(part in cur)) {
        return { ok: false, error: `路径「${itemsPath}」在 JSON 中不存在` };
      }
      cur = cur[part];
    }
    if (!Array.isArray(cur)) {
      return { ok: false, error: `路径「${itemsPath}」对应的值不是数组` };
    }
    return { ok: true, items: cur };
  }
  if (Array.isArray(parsed)) {
    return { ok: true, items: parsed };
  }
  if (isRecord(parsed)) {
    for (const key of ["items", "data", "list", "results", "records"]) {
      const candidate = parsed[key];
      if (Array.isArray(candidate)) {
        return { ok: true, items: candidate };
      }
    }
  }
  return { ok: false, error: "JSON 根节点须为数组，或包含 items/data/list 等数组字段" };
}

export function emptyValueForField(field: BindingCollectionField): unknown {
  if (field.valueType === "collection") return [];
  return "";
}

function coerceFieldValue(value: unknown, field: BindingCollectionField): unknown {
  if (field.valueType === "collection") {
    const nested = Array.isArray(value) ? value : [];
    const result = normalizeCollectionItems(nested, field.itemFields, {
      fixedLength:
        field.minItems !== undefined && field.minItems === field.maxItems
          ? field.minItems
          : undefined,
      maxLength: field.maxItems,
    });
    return result.ok ? result.items : [];
  }
  if (value === undefined || value === null) return "";
  const str = String(value).trim();
  if (!str) return "";
  if (field.valueType === "url" || field.valueType === "image") {
    if (!/^https?:\/\//i.test(str) && !str.startsWith("mailto:") && !str.startsWith("tel:")) {
      return str;
    }
  }
  return str;
}

/** 将原始数组项映射到 itemFields，并校验必填 */
export function normalizeCollectionItems(
  rawItems: unknown[],
  itemFields: BindingCollectionField[],
  opts: { fixedLength?: number; maxLength?: number }
): ParseCollectionJsonResult {
  if (!itemFields.length) {
    return { ok: false, error: "未声明 itemFields，无法解析列表" };
  }
  const targetLen =
    opts.fixedLength !== undefined
      ? opts.fixedLength
      : opts.maxLength !== undefined
        ? Math.min(rawItems.length, opts.maxLength)
        : rawItems.length;
  const slice = rawItems.slice(0, targetLen);

  const items: Record<string, unknown>[] = [];
  for (let i = 0; i < slice.length; i++) {
    const raw = slice[i];
    if (!isItemRecord(raw)) {
      return { ok: false, error: `第 ${i + 1} 项须为对象` };
    }
    const row: Record<string, unknown> = {};
    for (const field of itemFields) {
      const coerced = coerceFieldValue(raw[field.key], field);
      const isEmpty =
        field.valueType === "collection"
          ? !Array.isArray(coerced) || coerced.length === 0
          : !coerced;
      if (field.required && isEmpty) {
        return { ok: false, error: `第 ${i + 1} 项缺少必填字段「${field.label}」（${field.key}）` };
      }
      row[field.key] = coerced;
    }
    items.push(row);
  }

  if (opts.fixedLength !== undefined && items.length < opts.fixedLength) {
    while (items.length < opts.fixedLength) {
      items.push(Object.fromEntries(itemFields.map((f) => [f.key, emptyValueForField(f)])));
    }
  }

  return { ok: true, items };
}

export function parseCollectionJsonText(
  text: string,
  itemFields: BindingCollectionField[],
  opts: { fixedLength?: number; maxLength?: number; itemsPath?: string }
): ParseCollectionJsonResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, error: "JSON 不能为空" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, error: "JSON 解析失败，请检查格式" };
  }
  const extracted = extractArrayFromJsonRoot(parsed, opts.itemsPath);
  if (!extracted.ok) return extracted;
  return normalizeCollectionItems(extracted.items, itemFields, opts);
}

export function resolveCollectionFixedLength(
  minItems?: number,
  maxItems?: number
): number {
  if (
    minItems !== undefined &&
    maxItems !== undefined &&
    minItems === maxItems
  ) {
    return minItems;
  }
  return maxItems ?? minItems ?? 1;
}

export function clampFixedLength(n: number): number {
  return Math.min(
    COLLECTION_FIXED_LENGTH_MAX,
    Math.max(COLLECTION_FIXED_LENGTH_MIN, Math.floor(n))
  );
}

export function normalizePayloadCollectionDataSource(
  dataSource: CollectionDataSource | undefined
): CollectionDataSource {
  if (!dataSource) return defaultCollectionDataSource();
  return dataSource;
}

/** 按 dataSource 生成预览用列表（写入 values 前） */
export function resolveCollectionPreviewItems(
  dataSource: CollectionDataSource | undefined,
  itemFields: BindingCollectionField[],
  fixedLength: number,
  payload?: EmailPayload,
  slotId?: string
): ParseCollectionJsonResult {
  const ds = normalizePayloadCollectionDataSource(dataSource);
  if (ds.type === "custom") {
    return { ok: false, error: "自定义数据源请直接编辑表单或粘贴 JSON" };
  }
  if (ds.type === "remote" && ds.provider === "builtin") {
    if (!payload || !slotId) {
      return {
        ok: true,
        items: builtinPreviewItemsForSlot(
          ds.catalog,
          itemFields,
          fixedLength,
          ds.sort ?? DEFAULT_BUILTIN_COLLECTION_SORT
        ),
      };
    }
    return resolveBuiltinCollectionItems({
      catalog: ds.catalog,
      itemFields,
      fixedLength,
      sort: ds.sort,
      extract: ds.extract,
      productConfig: ds.productConfig,
      albumConfig: ds.albumConfig,
      payload,
      slotId,
    });
  }
  return { ok: false, error: "未知 collection 数据源" };
}

/** 内置 catalog → 槽 itemFields，并按固定长度补齐 */
export function builtinPreviewItemsForSlot(
  catalog: BuiltinCollectionCatalogId,
  itemFields: BindingCollectionField[],
  fixedLength: number,
  sort: BuiltinCollectionSortId = DEFAULT_BUILTIN_COLLECTION_SORT,
  ctx?: {
    payload: EmailPayload;
    slotId: string;
    extract?: BuiltinCollectionExtract;
  }
): Record<string, unknown>[] {
  if (ctx?.payload && ctx.slotId) {
    const ds = ctx.payload.slots[ctx.slotId]?.dataSource;
    const result = resolveBuiltinCollectionItems({
      catalog,
      itemFields,
      fixedLength,
      sort,
      extract: ctx.extract ?? DEFAULT_BUILTIN_COLLECTION_EXTRACT,
      productConfig:
        ds?.type === "remote" && ds.provider === "builtin" ? ds.productConfig : undefined,
      albumConfig:
        ds?.type === "remote" && ds.provider === "builtin" ? ds.albumConfig : undefined,
      payload: ctx.payload,
      slotId: ctx.slotId,
    });
    if (result.ok) return result.items;
  }
  const projected = projectBuiltinCatalogItems(catalog, itemFields, fixedLength, sort);
  return padOrTrimCollectionValues(projected, fixedLength, itemFields);
}

export function resolveBuiltinSortFromDataSource(
  dataSource: CollectionDataSource | undefined
): BuiltinCollectionSortId {
  if (dataSource?.type === "remote" && dataSource.provider === "builtin") {
    return dataSource.sort ?? DEFAULT_BUILTIN_COLLECTION_SORT;
  }
  return DEFAULT_BUILTIN_COLLECTION_SORT;
}

export function padOrTrimCollectionValues(
  items: Record<string, unknown>[],
  fixedLength: number,
  itemFields: BindingCollectionField[]
): Record<string, unknown>[] {
  const next = items.slice(0, fixedLength).map((row) => ({ ...row }));
  while (next.length < fixedLength) {
    next.push(Object.fromEntries(itemFields.map((f) => [f.key, emptyValueForField(f)])));
  }
  return next;
}

export function updatePayloadCollectionSlotMeta(
  slotDef: {
    minItems?: number;
    maxItems?: number;
    dataSource?: CollectionDataSource;
    displayRule?: CollectionDisplayRule;
  },
  patch: {
    fixedLength?: number;
    dataSource?: CollectionDataSource;
    displayRule?: CollectionDisplayRule;
  }
): typeof slotDef {
  const next = { ...slotDef };
  const hasDisplayRulePatch = Object.prototype.hasOwnProperty.call(patch, "displayRule");
  if (patch.fixedLength !== undefined) {
    const len = clampFixedLength(patch.fixedLength);
    next.minItems = len;
    next.maxItems = len;
  }
  if (patch.dataSource !== undefined) {
    next.dataSource = patch.dataSource;
  }
  if (hasDisplayRulePatch) {
    next.displayRule = patch.displayRule;
  }
  return next;
}

export function patchPayloadCollectionSlot(
  payload: EmailPayload,
  slotId: string,
  patch: {
    fixedLength?: number;
    dataSource?: CollectionDataSource;
    itemFields?: BindingCollectionField[];
    displayRule?: CollectionDisplayRule;
    values?: Record<string, unknown>[];
  }
): EmailPayload {
  const entry = payload.slots[slotId];
  if (!entry || entry.valueType !== "collection") return payload;

  const next: EmailPayload = {
    ...payload,
    slots: { ...payload.slots },
    values: { ...payload.values },
  };

  const hasDisplayRulePatch = Object.prototype.hasOwnProperty.call(patch, "displayRule");
  let slotDef: PayloadSlotDefinition = { ...entry };
  if (patch.itemFields !== undefined) {
    slotDef = { ...slotDef, itemFields: patch.itemFields };
  }
  if (patch.fixedLength !== undefined || patch.dataSource !== undefined || hasDisplayRulePatch) {
    slotDef = updatePayloadCollectionSlotMeta(slotDef, {
      fixedLength: patch.fixedLength,
      dataSource: patch.dataSource,
      displayRule: patch.displayRule,
    }) as PayloadSlotDefinition;
  }

  next.slots[slotId] = slotDef;

  if (patch.values !== undefined) {
    next.values[slotId] = patch.values;
  } else if (patch.fixedLength !== undefined) {
    const fields = slotDef.itemFields ?? [];
    const raw = Array.isArray(next.values[slotId]) ? (next.values[slotId] as Record<string, unknown>[]) : [];
    const len = resolveCollectionFixedLength(slotDef.minItems, slotDef.maxItems);
    next.values[slotId] = padOrTrimCollectionValues(raw, len, fields);
  }

  return next;
}
