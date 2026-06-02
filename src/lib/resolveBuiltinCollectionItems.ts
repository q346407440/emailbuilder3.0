import type { BuiltinCollectionCatalogId } from "../payload-contract/collection-data-source";
import {
  DEFAULT_BUILTIN_COLLECTION_SORT,
  type BuiltinCollectionSortId,
} from "../payload-contract/collection-builtin-sort";
import {
  readSortPolicyFromBuiltinDataSource,
  sortPolicyTargetSlotId,
  type NormalizedBuiltinSortPolicy,
} from "../payload-contract/collection-builtin-sort-policy";
import {
  normalizeBuiltinAlbumListConfig,
  normalizeBuiltinProductListConfig,
} from "../payload-contract/collection-builtin-catalog-config";
import type { BindingCollectionField, EmailPayload, PayloadSlotDefinition } from "../types/email";
import { resolveBuiltinAlbumListItems } from "./builtinAlbumListResolve";
import {
  projectBuiltinCatalogComplement,
  projectBuiltinCatalogItems,
  projectBuiltinCatalogSimilarTo,
} from "./builtinCollectionCatalog";
import { resolveBuiltinProductListItems } from "./builtinProductListResolve";
import {
  normalizeCollectionItems,
  padOrTrimCollectionValues,
  type ParseCollectionJsonResult,
  resolveCollectionFixedLength,
} from "./collectionDataSource";
import { isMerchantSpuTreeRelatedNestedKey } from "./loyaltyMerchantSpuTreePresetSeed";

export type CollectionResolveContext = {
  /** repeat 展开或显式传入的锚点 SPU 行；缺省时派生策略用 target 槽首项 */
  anchorRow?: Record<string, unknown> | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toRowArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => (isRecord(item) ? item : {}));
}

function anchorRowFromPayloadValues(
  payload: EmailPayload,
  slotId: string,
  itemIndex = 0
): Record<string, unknown> | null {
  const rows = toRowArray(payload.values[slotId]);
  return rows[itemIndex] ?? null;
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
    if (isMerchantSpuTreeRelatedNestedKey(field.key)) continue;
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

function resolveAnchorForPolicy(
  payload: EmailPayload,
  sortPolicy: NormalizedBuiltinSortPolicy,
  context?: CollectionResolveContext
): Record<string, unknown> | null {
  if (sortPolicy.kind !== "derived") return null;
  if (context && "anchorRow" in context) {
    return context.anchorRow ?? null;
  }
  return anchorRowFromPayloadValues(payload, sortPolicy.targetSlotId, 0);
}

/** 按 builtin dataSource + sortPolicy + 锚点行解析列表（预览/发信/repeat 共用） */
export function resolveBuiltinCollectionItemsForAnchor(opts: {
  catalog: BuiltinCollectionCatalogId;
  itemFields: BindingCollectionField[];
  fixedLength: number;
  sortPolicy: NormalizedBuiltinSortPolicy;
  productConfig?: ReturnType<typeof normalizeBuiltinProductListConfig>;
  albumConfig?: ReturnType<typeof normalizeBuiltinAlbumListConfig>;
  payload: EmailPayload;
  slotId: string;
  anchorRow?: Record<string, unknown> | null;
}): ParseCollectionJsonResult {
  const { catalog, itemFields, fixedLength, payload, slotId, sortPolicy } = opts;

  if (!itemFields.length) {
    return { ok: false, error: "未声明 itemFields，无法解析列表" };
  }

  const regularSort: BuiltinCollectionSortId =
    sortPolicy.kind === "regular"
      ? sortPolicy.sort
      : DEFAULT_BUILTIN_COLLECTION_SORT;

  let projected: Record<string, unknown>[];

  if (sortPolicy.kind === "derived") {
    const anchorRow =
      opts.anchorRow !== undefined
        ? opts.anchorRow
        : resolveAnchorForPolicy(payload, sortPolicy);
    if (
      !anchorRow ||
      !Object.keys(anchorRow).some((k) => String(anchorRow[k] ?? "").trim())
    ) {
      return {
        ok: false,
        error: `相似品/搭配品须先有目标槽「${sortPolicy.targetSlotId}」的列表数据作为锚点`,
      };
    }
    const projectFn =
      sortPolicy.strategy === "complement"
        ? projectBuiltinCatalogComplement
        : projectBuiltinCatalogSimilarTo;
    if (catalog === "products" && opts.productConfig) {
      projected = resolveBuiltinProductListItems({
        config: opts.productConfig,
        itemFields,
        limit: fixedLength,
        sortPolicy,
        payload,
        anchorRow,
      });
    } else {
      projected = projectFn(
        catalog,
        itemFields,
        fixedLength,
        regularSort,
        anchorRow,
        "href"
      );
    }
  } else if (catalog === "products" && opts.productConfig) {
    projected = resolveBuiltinProductListItems({
      config: opts.productConfig,
      itemFields,
      limit: fixedLength,
      sortPolicy,
      payload,
    });
  } else if (catalog === "albums" && opts.albumConfig) {
    projected = resolveBuiltinAlbumListItems({
      config: opts.albumConfig,
      itemFields,
      limit: fixedLength,
      sort: regularSort,
    });
  } else {
    projected = projectBuiltinCatalogItems(catalog, itemFields, fixedLength, regularSort);
  }

  const mergedProjected = preserveExplicitNestedCollectionValues(
    projected,
    payload,
    slotId,
    itemFields
  );

  return {
    ok: true,
    items: padOrTrimCollectionValues(mergedProjected, fixedLength, itemFields),
  };
}

/** 带 repeat/发信上下文的统一解析入口 */
export function resolveCollectionForContext(
  slotId: string,
  payload: EmailPayload,
  context?: CollectionResolveContext
): ParseCollectionJsonResult {
  const def = payload.slots?.[slotId];
  if (!def || def.valueType !== "collection") {
    return { ok: false, error: `槽「${slotId}」不是 collection` };
  }
  const ds = def.dataSource;
  if (ds?.type !== "remote" || ds.provider !== "builtin") {
    return { ok: false, error: `槽「${slotId}」不是内置列表数据源` };
  }
  const sortPolicy = readSortPolicyFromBuiltinDataSource(ds);
  const fixedLength = resolveCollectionFixedLength(def.minItems, def.maxItems);
  const itemFields = def.itemFields ?? [];
  const anchorRow =
    sortPolicy.kind === "derived"
      ? context && "anchorRow" in context
        ? context.anchorRow ?? null
        : resolveAnchorForPolicy(payload, sortPolicy, context)
      : undefined;

  return resolveBuiltinCollectionItemsForAnchor({
    catalog: ds.catalog,
    itemFields,
    fixedLength,
    sortPolicy,
    productConfig:
      ds.productConfig !== undefined
        ? normalizeBuiltinProductListConfig(ds.productConfig)
        : undefined,
    albumConfig:
      ds.albumConfig !== undefined ? normalizeBuiltinAlbumListConfig(ds.albumConfig) : undefined,
    payload,
    slotId,
    anchorRow,
  });
}

function isBuiltinResolvableSlot(def: PayloadSlotDefinition | undefined): boolean {
  if (!def || def.valueType !== "collection") return false;
  const ds = def.dataSource;
  return ds?.type === "remote" && ds.provider === "builtin";
}

function slotTargetDependencyFromDef(def: PayloadSlotDefinition): string | undefined {
  const ds = def.dataSource;
  if (ds?.type !== "remote" || ds.provider !== "builtin") return undefined;
  const policy = readSortPolicyFromBuiltinDataSource(ds);
  return sortPolicyTargetSlotId(policy);
}

/** 对 builtin 列表按拓扑顺序写入 values（整槽预览；锚 = target 首项） */
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
    const sortPolicy = readSortPolicyFromBuiltinDataSource(ds);
    const result = resolveBuiltinCollectionItemsForAnchor({
      catalog: ds.catalog,
      itemFields,
      fixedLength,
      sortPolicy,
      productConfig:
        ds.productConfig !== undefined
          ? normalizeBuiltinProductListConfig(ds.productConfig)
          : undefined,
      albumConfig:
        ds.albumConfig !== undefined
          ? normalizeBuiltinAlbumListConfig(ds.albumConfig)
          : undefined,
      payload: next,
      slotId,
      anchorRow:
        sortPolicy.kind === "derived"
          ? anchorRowFromPayloadValues(next, sortPolicy.targetSlotId, 0)
          : undefined,
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
    const fromId = slotTargetDependencyFromDef(def!);
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

/** 列出可作派生排序目标的内置商品列表槽（排除自身） */
export function listDerivedSortTargetSlotIds(
  payload: EmailPayload,
  excludeSlotId: string
): string[] {
  const slots = payload.slots ?? {};
  return Object.entries(slots)
    .filter(([id, def]) => {
      if (id === excludeSlotId || def?.valueType !== "collection" || !def.itemFields?.length) {
        return false;
      }
      const ds = def.dataSource;
      return ds?.type === "remote" && ds.provider === "builtin" && ds.catalog === "products";
    })
    .map(([id]) => id)
    .sort((a, b) => a.localeCompare(b));
}

export function readSortPolicyFromPayloadSlot(
  payload: EmailPayload,
  slotId: string
): NormalizedBuiltinSortPolicy | null {
  const ds = payload.slots?.[slotId]?.dataSource;
  if (ds?.type !== "remote" || ds.provider !== "builtin") return null;
  return readSortPolicyFromBuiltinDataSource(ds);
}
