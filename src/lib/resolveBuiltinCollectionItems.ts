import type { BuiltinCollectionCatalogId, CollectionDataSource } from "../payload-contract/collection-data-source";
import {
  DEFAULT_BUILTIN_COLLECTION_EXTRACT,
  normalizeBuiltinCollectionExtract,
  type BuiltinCollectionExtract,
} from "../payload-contract/collection-builtin-extract";
import {
  DEFAULT_BUILTIN_COLLECTION_SORT,
  type BuiltinCollectionSortId,
} from "../payload-contract/collection-builtin-sort";
import type { BindingCollectionField, EmailPayload, PayloadSlotDefinition } from "../types/email";
import {
  projectBuiltinCatalogItems,
  projectBuiltinCatalogSimilarTo,
} from "./builtinCollectionCatalog";
import {
  normalizeCollectionItems,
  padOrTrimCollectionValues,
  type ParseCollectionJsonResult,
  resolveCollectionFixedLength,
} from "./collectionDataSource";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toRowArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => (isRecord(item) ? item : {}));
}

function anchorRowFromPayload(
  payload: EmailPayload,
  fromSlotId: string
): Record<string, unknown> | null {
  const rows = toRowArray(payload.values[fromSlotId]);
  return rows[0] ?? null;
}

function fixedLengthForNestedField(field: Extract<BindingCollectionField, { valueType: "collection" }>) {
  return field.minItems !== undefined && field.minItems === field.maxItems
    ? field.minItems
    : undefined;
}

function mergeProjectedRowWithExplicitNestedCollections(
  projectedRow: Record<string, unknown>,
  currentRow: Record<string, unknown> | undefined,
  itemFields: BindingCollectionField[]
): Record<string, unknown> {
  if (!currentRow) return projectedRow;
  const next = { ...projectedRow };
  for (const field of itemFields) {
    if (field.valueType !== "collection") continue;
    if (!(field.key in currentRow)) continue;
    const currentValue = currentRow[field.key];
    if (!Array.isArray(currentValue)) {
      next[field.key] = [];
      continue;
    }
    const normalized = normalizeCollectionItems(currentValue, field.itemFields, {
      fixedLength: fixedLengthForNestedField(field),
      maxLength: field.maxItems,
    });
    next[field.key] = normalized.ok ? normalized.items : [];
  }
  return next;
}

function preserveExplicitNestedCollectionValues(
  projected: Record<string, unknown>[],
  payload: EmailPayload,
  slotId: string,
  itemFields: BindingCollectionField[]
): Record<string, unknown>[] {
  if (!itemFields.some((field) => field.valueType === "collection")) return projected;
  const currentRows = toRowArray(payload.values[slotId]);
  if (currentRows.length === 0) return projected;
  return projected.map((row, index) =>
    mergeProjectedRowWithExplicitNestedCollections(row, currentRows[index], itemFields)
  );
}

/** 按 builtin dataSource（catalog + sort + extract）解析列表行；嵌套子列表以 values 中显式数据为准 */
export function resolveBuiltinCollectionItems(opts: {
  catalog: BuiltinCollectionCatalogId;
  itemFields: BindingCollectionField[];
  fixedLength: number;
  sort?: BuiltinCollectionSortId;
  extract?: BuiltinCollectionExtract;
  payload: EmailPayload;
  slotId: string;
}): ParseCollectionJsonResult {
  const sort = opts.sort ?? DEFAULT_BUILTIN_COLLECTION_SORT;
  const extract = normalizeBuiltinCollectionExtract(opts.extract);
  const { catalog, itemFields, fixedLength, payload } = opts;

  if (!itemFields.length) {
    return { ok: false, error: "未声明 itemFields，无法解析列表" };
  }

  let projected: Record<string, unknown>[];

  if (extract.kind === "similarTo") {
    const anchor = anchorRowFromPayload(payload, extract.fromSlotId);
    if (!anchor || !Object.keys(anchor).some((k) => String(anchor[k] ?? "").trim())) {
      return {
        ok: false,
        error: `相似品衍生须先有锚点槽「${extract.fromSlotId}」的列表数据`,
      };
    }
    projected = projectBuiltinCatalogSimilarTo(
      catalog,
      itemFields,
      fixedLength,
      sort,
      anchor,
      extract.matchField ?? "href"
    );
  } else {
    projected = projectBuiltinCatalogItems(catalog, itemFields, fixedLength, sort);
  }

  const mergedProjected = preserveExplicitNestedCollectionValues(
    projected,
    payload,
    opts.slotId,
    itemFields
  );

  return {
    ok: true,
    items: padOrTrimCollectionValues(mergedProjected, fixedLength, itemFields),
  };
}

function isBuiltinResolvableSlot(def: PayloadSlotDefinition | undefined): boolean {
  if (!def || def.valueType !== "collection") return false;
  const ds = def.dataSource;
  return ds?.type === "remote" && ds.provider === "builtin";
}

function slotAnchorDependencyFromDef(def: PayloadSlotDefinition): string | undefined {
  const ds = def.dataSource;
  if (ds?.type !== "remote" || ds.provider !== "builtin") return undefined;
  if (ds.extract?.kind === "similarTo") return ds.extract.fromSlotId;
  return undefined;
}

/** 对 builtin 列表按拓扑顺序写入 values（用于预览/发信前） */
export function applyBuiltinCollectionResolves(payload: EmailPayload): EmailPayload {
  const slots = payload.slots ?? {};
  const allBuiltin = Object.entries(slots)
    .filter(([, def]) => isBuiltinResolvableSlot(def))
    .map(([id]) => id);
  if (allBuiltin.length === 0) return payload;

  const order = topologicalBuiltinSlotOrder(slots);
  const resolveOrder = order.length > 0 ? order : allBuiltin;

  const next: EmailPayload = {
    ...payload,
    values: { ...payload.values },
  };

  for (const slotId of resolveOrder) {
    const def = slots[slotId];
    if (!def || !isBuiltinResolvableSlot(def)) continue;
    const ds = def.dataSource!;
    if (ds.type !== "remote" || ds.provider !== "builtin") continue;

    const fixedLength = resolveCollectionFixedLength(def.minItems, def.maxItems);
    const itemFields = def.itemFields ?? [];
    const result = resolveBuiltinCollectionItems({
      catalog: ds.catalog,
      itemFields,
      fixedLength,
      sort: ds.sort,
      extract: ds.extract,
      payload: next,
      slotId,
    });
    if (result.ok) {
      next.values[slotId] = result.items;
    }
  }

  return next;
}

function topologicalBuiltinSlotOrder(
  slots: Record<string, PayloadSlotDefinition>
): string[] {
  const deps = new Map<string, string>();
  for (const [slotId, def] of Object.entries(slots)) {
    if (!isBuiltinResolvableSlot(def)) continue;
    const fromId = slotAnchorDependencyFromDef(def!);
    if (fromId) deps.set(slotId, fromId);
  }

  const allBuiltin = Object.entries(slots)
    .filter(([, def]) => isBuiltinResolvableSlot(def))
    .map(([id]) => id);

  const ordered: string[] = [];
  const visited = new Set<string>();

  function visit(id: string) {
    if (visited.has(id)) return;
    visited.add(id);
    const dep = deps.get(id);
    if (dep && slots[dep] && isBuiltinResolvableSlot(slots[dep])) {
      visit(dep);
    }
    if (allBuiltin.includes(id) && !ordered.includes(id)) {
      ordered.push(id);
    }
  }

  for (const id of allBuiltin) {
    visit(id);
  }

  return ordered;
}

/** 列出可作锚点引用的 collection 槽（排除自身） */
export function listCollectionSlotIdsForExtract(
  payload: EmailPayload,
  excludeSlotId: string
): string[] {
  const slots = payload.slots ?? {};
  return Object.entries(slots)
    .filter(
      ([id, def]) =>
        id !== excludeSlotId && def?.valueType === "collection" && def.itemFields?.length
    )
    .map(([id]) => id)
    .sort((a, b) => a.localeCompare(b));
}

export function resolveBuiltinExtractFromDataSource(
  dataSource: CollectionDataSource | undefined
): BuiltinCollectionExtract {
  if (dataSource?.type === "remote" && dataSource.provider === "builtin") {
    return normalizeBuiltinCollectionExtract(dataSource.extract);
  }
  return DEFAULT_BUILTIN_COLLECTION_EXTRACT;
}
