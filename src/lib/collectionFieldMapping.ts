import type { BindingCollectionField, EmailPayload } from "../types/email";
import {
  isCollectionField,
  normalizeCollectionItemFields,
} from "../payload-contract/collection-item-fields";
import {
  BUILTIN_SKU_SCHEMA_FIELD_KEYS,
  type BuiltinSkuSchemaFieldKey,
} from "./builtinProductMockTypes";
import { collectionItemFieldValueTypeLabel } from "./repeatListItemField";
import {
  canBindTargetPathToSourceKey,
  collectionFieldMappingDepth,
  collectionFieldMappingPath,
  findLeafFieldByMappingPath,
  flattenItemFieldsForFieldMap,
  defaultExpandedCollectionGroupPaths,
  validateCollectionFieldMapDepth,
  type CollectionFieldMappingLeafEntry,
} from "./collectionFieldMappingTree";
import { extractArrayFromJsonRoot, type ParseCollectionJsonResult } from "./collectionDataSource";
import { emptyValueForField } from "./collectionDataSource";

export type CollectionFieldPickerOptionKind = "none" | "group" | "leaf";

export type CollectionFieldPickerOption = {
  key: string;
  /** 表格「名称」列 */
  label: string;
  /** 表格「类型」列（已本地化） */
  typeLabel: string;
  example: string;
  /** 源字段树：子列表父级分组（不可选，仅折叠） */
  kind?: CollectionFieldPickerOptionKind;
  depth?: number;
  /** kind=group 或子级 leaf 所属父 collection 的源 key（如 skus） */
  groupKey?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export type CollectionJsonSample = {
  keys: string[];
  firstItem: Record<string, unknown>;
};

/** 从 payload 列表槽首项构建字段关联样本（含子 collection 的 skus.xxx） */
export function collectionSampleFromPayloadValues(
  payload: EmailPayload | null,
  slotId: string,
  itemFields: BindingCollectionField[]
): CollectionJsonSample | null {
  const raw = payload?.values?.[slotId];
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const first = raw[0];
  if (!isRecord(first)) return null;
  const keys = listPickerKeysForSample({ keys: Object.keys(first), firstItem: first }, itemFields);
  return { keys, firstItem: first };
}

function rowHasMeaningfulValue(row: Record<string, unknown>): boolean {
  return Object.values(row).some((v) => {
    if (v === null || v === undefined) return false;
    if (typeof v === "string") return v.trim() !== "";
    return true;
  });
}

/** 列表项是否含可回显的非空数据 */
export function hasNonEmptyCollectionItems(items: Record<string, unknown>[]): boolean {
  return items.some((row) => rowHasMeaningfulValue(row));
}

/** 将当前列表项序列化为 JSON 文本（供自定义数据源回显） */
export function collectionItemsToJsonPaste(items: Record<string, unknown>[]): string {
  if (items.length === 0) return "";
  return JSON.stringify(items, null, 2);
}

/** 自定义 tab：无已存粘贴文本时，用当前列表值回显 JSON */
export function echoCustomJsonPaste(
  items: Record<string, unknown>[],
  existing?: string
): string {
  if (existing?.trim()) return existing;
  if (!hasNonEmptyCollectionItems(items)) return "";
  return collectionItemsToJsonPaste(items);
}

/** 从 JSON 样本解析数组第一项（供字段关联与首项示例） */
export function parseCollectionJsonSample(
  text: string,
  itemsPath?: string
): { ok: true; sample: CollectionJsonSample } | { ok: false; error: string } {
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
  const extracted = extractArrayFromJsonRoot(parsed, itemsPath);
  if (!extracted.ok) return extracted;
  const first = extracted.items.find((item) => isRecord(item));
  if (!first || !isRecord(first)) {
    return { ok: false, error: "数组至少须有一项对象" };
  }
  return {
    ok: true,
    sample: { keys: listCatalogSourceFieldKeysForPicker(first), firstItem: first },
  };
}

function inferScalarValueTypeFromJson(
  key: string,
  value: unknown
): BindingCollectionField["valueType"] {
  if (typeof value === "number" && Number.isFinite(value)) return "number";
  if (typeof value === "boolean") return "boolean";
  if (typeof value !== "string") return "string";
  const lowerKey = key.toLowerCase();
  const stringValue = value.trim();
  if (/^https?:\/\//i.test(stringValue) || lowerKey.includes("href") || lowerKey.includes("url")) {
    return "url";
  }
  return "string";
}

/** 从 JSON 数组首项对象推断列表行 itemFields（含嵌套 collection，如 SPU 下的 skus） */
export function inferCollectionItemFieldsFromFirstRow(
  row: Record<string, unknown>
): BindingCollectionField[] {
  const out: BindingCollectionField[] = [];
  for (const [key, value] of Object.entries(row)) {
    if (Array.isArray(value)) {
      const nestedRows = value.filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === "object" && !Array.isArray(item)
      );
      const childFields =
        nestedRows.length > 0
          ? inferCollectionItemFieldsFromFirstRow(nestedRows[0]!)
          : [];
      out.push({
        key,
        label: key,
        valueType: "collection",
        itemFields: childFields,
        minItems: 0,
        maxItems: Math.max(5, value.length),
      });
      continue;
    }
    if (value !== null && typeof value === "object") continue;
    out.push({
      key,
      label: key,
      valueType: inferScalarValueTypeFromJson(key, value),
    });
  }
  return normalizeCollectionItemFields(out);
}

/** 从 JSON 样本解析出数组第一项的字段 key 列表（供字段关联下拉） */
export function listSourceKeysFromCollectionJson(
  text: string,
  itemsPath?: string
): { ok: true; keys: string[] } | { ok: false; error: string } {
  const result = parseCollectionJsonSample(text, itemsPath);
  if (!result.ok) return result;
  return { ok: true, keys: result.sample.keys };
}

/** 从样本值推断数据源字段类型（用于字段关联表格，与列表项 valueType 文案一致） */
export function inferCollectionSourceFieldTypeLabel(value: unknown): string {
  if (value === undefined || value === null) return "—";
  if (Array.isArray(value)) return "列表";
  if (typeof value === "object") return "对象";
  if (typeof value === "number" || typeof value === "boolean") return "数值";
  const s = String(value).trim();
  if (!s) return "—";
  if (/^https?:\/\//i.test(s)) {
    if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(s) || s.includes("pexels.com/photos")) {
      return "图片";
    }
    return "链接";
  }
  return "文本";
}

export function formatSourceFieldExample(value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "string") {
    const t = value.trim();
    if (!t) return "—";
    return t.length > 120 ? `${t.slice(0, 117)}…` : t;
  }
  try {
    const s = JSON.stringify(value);
    return s.length > 120 ? `${s.slice(0, 117)}…` : s;
  } catch {
    return String(value);
  }
}

const SKU_SCHEMA_FIELD_LABELS: Record<BuiltinSkuSchemaFieldKey, string> = {
  imageSrc: "SKU 商品图",
  imageAlt: "SKU 图片替代文字",
  salePrice: "SKU 现价",
  originalPrice: "SKU 原价",
  title: "SKU 规格名",
  sku: "SKU 编码",
  inventoryQuantity: "SKU 库存",
  totalSales: "SKU 销量",
  href: "SKU 链接",
};

/** 历史 mock 按序号摊平的 SKU 字段（不再出现在字段关联列表） */
export function isIndexedSkuFlatSourceKey(key: string): boolean {
  return /^sku(Image|ImageAlt|SalePrice|OriginalPrice|Title|Code|Inventory|TotalSales)\d+$/.test(
    key
  );
}

function firstSkuRecord(row: Record<string, unknown>): Record<string, unknown> | null {
  const skus = row.skus;
  if (!Array.isArray(skus)) return null;
  const found = skus.find(
    (item) => item && typeof item === "object" && !Array.isArray(item)
  ) as Record<string, unknown> | undefined;
  return found ?? null;
}

/**
 * 从 catalog / 外部 JSON 行读取源字段值。
 * 支持 `skus.imageSrc` 等（各 SKU 同构，预览取首条 SKU 示例）。
 */
export function readCatalogSourceValue(
  row: Record<string, unknown>,
  sourceKey: string
): unknown {
  const trimmed = sourceKey.trim();
  if (!trimmed) return undefined;

  const skuPath = /^skus\.([a-zA-Z][a-zA-Z0-9_]*)$/.exec(trimmed);
  if (skuPath) {
    const field = skuPath[1] as BuiltinSkuSchemaFieldKey;
    const sku = firstSkuRecord(row);
    if (sku && field in sku) return sku[field];
    return undefined;
  }

  if (trimmed === "skus") return row.skus;

  const legacyImage = /^skuImage(\d+)$/.exec(trimmed);
  if (legacyImage) {
    const idx = Number(legacyImage[1]) - 1;
    const skus = row.skus;
    if (Array.isArray(skus) && skus[idx] && typeof skus[idx] === "object") {
      return (skus[idx] as Record<string, unknown>).imageSrc;
    }
  }

  return row[trimmed];
}

/**
 * 字段关联右侧可选源字段：SPU 扁平字段 + 一套 SKU 结构（`skus.xxx`），不按 SKU 序号展开。
 */
export function listCatalogSourceFieldKeysForPicker(
  firstItem: Record<string, unknown>
): string[] {
  const keys = Object.keys(firstItem).filter(
    (k) => k !== "skus" && k !== "maxSkuSalePrice" && !isIndexedSkuFlatSourceKey(k)
  );
  if (firstSkuRecord(firstItem)) {
    for (const field of BUILTIN_SKU_SCHEMA_FIELD_KEYS) {
      const dotted = `skus.${field}`;
      if (!keys.includes(dotted)) keys.push(dotted);
    }
  }
  return keys;
}

/** 内置商品 catalog 源字段在字段关联表的展示名（无 itemFields 声明时） */
export function collectionSourceFieldDisplayLabel(key: string): string | undefined {
  if (key === "skuCount") return "SKU 数量";
  if (key === "skus") return "SKU 列表";
  const skuPath = /^skus\.([a-zA-Z][a-zA-Z0-9_]*)$/.exec(key);
  if (skuPath) {
    const field = skuPath[1] as BuiltinSkuSchemaFieldKey;
    return SKU_SCHEMA_FIELD_LABELS[field] ?? `SKU ${field}`;
  }
  return undefined;
}

function sourceCollectionGroupLabel(
  parentKey: string,
  itemFields: BindingCollectionField[]
): string {
  const declared = itemFields.find((f) => f.key === parentKey && f.valueType === "collection");
  if (declared?.label?.trim()) return declared.label.trim();
  return collectionSourceFieldDisplayLabel(parentKey) ?? parentKey;
}

function formatSourceCollectionGroupExample(
  row: Record<string, unknown>,
  parentKey: string
): string {
  const raw = row[parentKey];
  if (!Array.isArray(raw)) return "—";
  const count = raw.filter((item) => isRecord(item)).length;
  return count === 0 ? "0 项" : `${count} 项`;
}

function buildLeafPickerOption(
  key: string,
  sample: CollectionJsonSample,
  itemFields: BindingCollectionField[]
): Omit<CollectionFieldPickerOption, "kind" | "depth" | "groupKey"> {
  const raw = readCatalogSourceValue(sample.firstItem, key) ?? sample.firstItem[key];
  const catalogLabel = collectionSourceFieldDisplayLabel(key);
  const leaf = findLeafFieldByMappingPath(itemFields, key);
  const label = leaf?.field.label?.trim() || catalogLabel || key;
  const typeLabel = leaf
    ? collectionItemFieldValueTypeLabel(leaf.field.valueType)
    : inferCollectionSourceFieldTypeLabel(raw);
  return {
    key,
    label,
    typeLabel,
    example: formatSourceFieldExample(raw),
  };
}

export function listPickerKeysForSample(
  sample: CollectionJsonSample,
  itemFields: BindingCollectionField[]
): string[] {
  const keys = listCatalogSourceFieldKeysForPicker(sample.firstItem);
  const expanded = defaultExpandedCollectionGroupPaths(itemFields);
  for (const entry of flattenItemFieldsForFieldMap(itemFields, expanded)) {
    if (entry.kind === "leaf" && !keys.includes(entry.path)) {
      keys.push(entry.path);
    }
  }
  return keys;
}

function leafPickerRowFromItemFieldEntry(
  entry: CollectionFieldMappingLeafEntry,
  sample: CollectionJsonSample | null,
  itemFields: BindingCollectionField[]
): CollectionFieldPickerOption {
  if (sample) {
    return {
      ...buildLeafPickerOption(entry.path, sample, itemFields),
      kind: "leaf",
      depth: entry.depth,
      groupKey: entry.parentCollectionPath,
    };
  }
  return {
    key: entry.path,
    label: entry.field.label?.trim() || entry.path,
    typeLabel: collectionItemFieldValueTypeLabel(entry.field.valueType),
    example: "—",
    kind: "leaf",
    depth: entry.depth,
    groupKey: entry.parentCollectionPath,
  };
}

/** 将样本里未在 itemFields 声明的源字段补进表（如内置 catalog 扩展键） */
function appendUndeclaredSampleKeysToPickerRows(
  rows: CollectionFieldPickerOption[],
  sample: CollectionJsonSample,
  itemFields: BindingCollectionField[]
): void {
  const existingLeafKeys = new Set(
    rows.filter((r) => r.kind === "leaf" && r.key).map((r) => r.key)
  );
  const existingGroupKeys = new Set(
    rows.filter((r) => r.kind === "group" && r.groupKey).map((r) => r.groupKey as string)
  );
  const keys = listPickerKeysForSample(sample, itemFields);
  const emittedParents = new Set<string>();

  for (const key of keys) {
    if (existingLeafKeys.has(key)) continue;
    const dot = key.indexOf(".");
    if (dot <= 0) {
      rows.push({
        ...buildLeafPickerOption(key, sample, itemFields),
        kind: "leaf",
        depth: 0,
      });
      existingLeafKeys.add(key);
      continue;
    }
    const parent = key.slice(0, dot);
    if (!existingGroupKeys.has(parent) && !emittedParents.has(parent)) {
      emittedParents.add(parent);
      existingGroupKeys.add(parent);
      rows.push({
        key: "",
        label: sourceCollectionGroupLabel(parent, itemFields),
        typeLabel: "列表",
        example: formatSourceCollectionGroupExample(sample.firstItem, parent),
        kind: "group",
        depth: 0,
        groupKey: parent,
      });
    }
    rows.push({
      ...buildLeafPickerOption(key, sample, itemFields),
      kind: "leaf",
      depth: 1,
      groupKey: parent,
    });
    existingLeafKeys.add(key);
  }
}

/**
 * 字段关联右侧源字段表：以 itemFields 为结构真源（含子 collection 缩进树）；
 * 有样本时补首项示例，并合并未声明的样本键。
 */
export function buildCollectionFieldPickerRows(
  sample: CollectionJsonSample | null,
  itemFields: BindingCollectionField[]
): CollectionFieldPickerOption[] {
  const rows: CollectionFieldPickerOption[] = [
    { key: "", label: "不映射", typeLabel: "—", example: "—", kind: "none", depth: 0 },
  ];

  const expanded = defaultExpandedCollectionGroupPaths(itemFields);
  for (const entry of flattenItemFieldsForFieldMap(itemFields, expanded)) {
    if (entry.kind === "group") {
      rows.push({
        key: "",
        label: sourceCollectionGroupLabel(entry.path, itemFields),
        typeLabel: "列表",
        example: sample
          ? formatSourceCollectionGroupExample(sample.firstItem, entry.path)
          : "—",
        kind: "group",
        depth: 0,
        groupKey: entry.path,
      });
      continue;
    }
    rows.push(leafPickerRowFromItemFieldEntry(entry, sample, itemFields));
  }

  if (sample) {
    appendUndeclaredSampleKeysToPickerRows(rows, sample, itemFields);
  }

  return rows;
}

/** 列表 repeat 步骤 2：仅补首层未声明的标量样本键（不含子列表数组与 skus.xxx） */
function appendUndeclaredTopLevelScalarSampleKeysToPickerRows(
  rows: CollectionFieldPickerOption[],
  sample: CollectionJsonSample,
  scalarItemFields: BindingCollectionField[]
): void {
  const existingLeafKeys = new Set(
    rows.filter((r) => r.kind === "leaf" && r.key).map((r) => r.key)
  );
  const declaredKeys = new Set(scalarItemFields.map((f) => f.key));

  for (const key of Object.keys(sample.firstItem)) {
    if (
      key === "skus" ||
      key === "maxSkuSalePrice" ||
      isIndexedSkuFlatSourceKey(key) ||
      key.includes(".") ||
      declaredKeys.has(key) ||
      existingLeafKeys.has(key)
    ) {
      continue;
    }
    const raw = sample.firstItem[key];
    if (Array.isArray(raw)) continue;
    rows.push({
      ...buildLeafPickerOption(key, sample, scalarItemFields),
      kind: "leaf",
      depth: 0,
    });
    existingLeafKeys.add(key);
  }
}

/**
 * 列表 repeat 步骤 2 字段映射：仅当前层标量列（契约 repeat.bindWizard.fieldMapping.scalarsOnly）。
 * 子 collection 由子级循环容器在步骤 1 单独绑定，不在父级映射表出现。
 */
export function buildRepeatListScalarFieldPickerRows(
  sample: CollectionJsonSample | null,
  scalarItemFields: BindingCollectionField[]
): CollectionFieldPickerOption[] {
  const rows: CollectionFieldPickerOption[] = [
    { key: "", label: "不映射", typeLabel: "—", example: "—", kind: "none", depth: 0 },
  ];

  for (const field of scalarItemFields) {
    if (isCollectionField(field)) continue;
    rows.push(
      sample
        ? {
            ...buildLeafPickerOption(field.key, sample, scalarItemFields),
            kind: "leaf",
            depth: 0,
          }
        : {
            key: field.key,
            label: field.label?.trim() || field.key,
            typeLabel: collectionItemFieldValueTypeLabel(field.valueType),
            example: "—",
            kind: "leaf",
            depth: 0,
          }
    );
  }

  if (sample) {
    appendUndeclaredTopLevelScalarSampleKeysToPickerRows(rows, sample, scalarItemFields);
  }

  return rows;
}

/**
 * 字段关联 / 列表重复映射：扁平可选行（不含分组父级），供无层级场景或测试。
 */
export function buildCollectionFieldPickerOptions(
  sample: CollectionJsonSample,
  itemFields: BindingCollectionField[]
): CollectionFieldPickerOption[] {
  return buildCollectionFieldPickerRows(sample, itemFields).filter(
    (row) => row.kind === "none" || row.kind === "leaf" || row.kind === undefined
  );
}

function matchSourceKeyForLeafPath(
  path: string,
  leafKey: string,
  sourceKeys: string[]
): string | undefined {
  const targetDepth = collectionFieldMappingDepth(path);
  const sameDepthKeys = sourceKeys.filter(
    (k) => collectionFieldMappingDepth(k) === targetDepth
  );
  const keySet = new Set(sameDepthKeys);
  if (keySet.has(path)) return path;
  if (keySet.has(leafKey)) return leafKey;
  const lower = leafKey.toLowerCase();
  return sameDepthKeys.find((k) => k.toLowerCase() === lower);
}

export { validateCollectionFieldMapDepth, canBindTargetPathToSourceKey, collectionFieldMappingDepth };

/** 根据 itemFields 与样本 key 生成默认同名映射（含子列表路径如 skus.imageSrc） */
export function buildDefaultCollectionFieldMap(
  itemFields: BindingCollectionField[],
  sourceKeys: string[]
): Record<string, string> {
  const map: Record<string, string> = {};
  const expanded = defaultExpandedCollectionGroupPaths(itemFields);
  for (const entry of flattenItemFieldsForFieldMap(itemFields, expanded)) {
    if (entry.kind !== "leaf") continue;
    const matched = matchSourceKeyForLeafPath(entry.path, entry.field.key, sourceKeys);
    if (matched) map[entry.path] = matched;
  }
  return map;
}

function coerceFieldValue(value: unknown, valueType: BindingCollectionField["valueType"]): string {
  if (valueType === "collection") return "";
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function readNestedChildSourceValue(
  parentRaw: Record<string, unknown>,
  skuRaw: Record<string, unknown>,
  parentKey: string,
  childKey: string,
  sourceKey: string
): unknown {
  const trimmed = sourceKey.trim();
  if (!trimmed) return skuRaw[childKey];
  if (trimmed.startsWith(`${parentKey}.`)) {
    const sub = trimmed.slice(parentKey.length + 1);
    return skuRaw[sub] ?? skuRaw[childKey];
  }
  return readCatalogSourceValue(parentRaw, trimmed) ?? skuRaw[childKey];
}

function buildNestedCollectionFromFieldMap(
  parentRaw: Record<string, unknown>,
  parentField: Extract<BindingCollectionField, { valueType: "collection" }>,
  fieldMap: Record<string, string>
): { ok: true; value: unknown[] } | { ok: false; error: string } {
  const childFields = parentField.itemFields ?? [];
  const rawArr = parentRaw[parentField.key];
  const sourceRows = Array.isArray(rawArr)
    ? rawArr.filter((item): item is Record<string, unknown> => isRecord(item))
    : [];
  const maxItems =
    typeof parentField.maxItems === "number" ? parentField.maxItems : sourceRows.length;
  const minItems = typeof parentField.minItems === "number" ? parentField.minItems : 0;
  const capped = sourceRows.slice(0, maxItems);
  const items: Record<string, unknown>[] = [];

  for (const skuRaw of capped) {
    const childRow: Record<string, unknown> = {};
    for (const child of childFields) {
      if (child.valueType === "collection") continue;
      const path = collectionFieldMappingPath(parentField.key, child.key);
      const sourceKey = fieldMap[path]?.trim() || path;
      const coerced = coerceFieldValue(
        readNestedChildSourceValue(parentRaw, skuRaw, parentField.key, child.key, sourceKey),
        child.valueType
      );
      if (child.required && !coerced) {
        return {
          ok: false,
          error: `子列表「${parentField.label}」缺少必填字段「${child.label}」`,
        };
      }
      childRow[child.key] = coerced;
    }
    items.push(childRow);
  }

  while (items.length < minItems) {
    items.push(
      Object.fromEntries(
        childFields
          .filter((c) => c.valueType !== "collection")
          .map((c) => [c.key, emptyValueForField(c)])
      )
    );
  }
  return { ok: true, value: items.slice(0, maxItems) };
}

function mapTopLevelField(
  raw: Record<string, unknown>,
  field: BindingCollectionField,
  fieldMap: Record<string, string>
): { ok: true; value: unknown } | { ok: false; error: string } {
  if (isCollectionField(field)) {
    return buildNestedCollectionFromFieldMap(raw, field, fieldMap);
  }
  const sourceKey = fieldMap[field.key]?.trim() || field.key;
  const coerced = coerceFieldValue(readCatalogSourceValue(raw, sourceKey), field.valueType);
  if (field.required && !coerced) {
    return { ok: false, error: `缺少必填字段「${field.label}」（${field.key}）` };
  }
  return { ok: true, value: coerced };
}

/** 按字段关联表将原始数组项写入 itemFields 形态 */
export function normalizeCollectionItemsWithFieldMap(
  rawItems: unknown[],
  itemFields: BindingCollectionField[],
  fieldMap: Record<string, string>,
  opts: { fixedLength?: number; maxLength?: number } = {}
): ParseCollectionJsonResult {
  if (!itemFields.length) {
    return { ok: false, error: "未声明 itemFields，无法解析列表" };
  }
  const depthCheck = validateCollectionFieldMapDepth(itemFields, fieldMap);
  if (!depthCheck.ok) return depthCheck;
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
    if (!isRecord(raw)) {
      return { ok: false, error: `第 ${i + 1} 项须为对象` };
    }
    const row: Record<string, unknown> = {};
    for (const field of itemFields) {
      const mapped = mapTopLevelField(raw, field, fieldMap);
      if (!mapped.ok) {
        return { ok: false, error: `第 ${i + 1} 项${mapped.error}` };
      }
      row[field.key] = mapped.value;
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

export function parseCollectionJsonTextWithFieldMap(
  text: string,
  itemFields: BindingCollectionField[],
  fieldMap: Record<string, string>,
  opts: { fixedLength?: number; maxLength?: number; itemsPath?: string } = {}
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
  return normalizeCollectionItemsWithFieldMap(extracted.items, itemFields, fieldMap, opts);
}
