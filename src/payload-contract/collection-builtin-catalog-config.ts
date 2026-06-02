/** 内置商品 / 专辑列表场景配置（payload.slots[].dataSource 内，仅 provider=builtin） */

export const BUILTIN_PRODUCT_ROW_GRANULARITIES = ["spu", "sku"] as const;
export type BuiltinProductRowGranularity = (typeof BUILTIN_PRODUCT_ROW_GRANULARITIES)[number];

export const BUILTIN_PRODUCT_RANGE_MODES = [
  "freeSelect",
  "allProducts",
  "byCollection",
] as const;
export type BuiltinProductRangeMode = (typeof BUILTIN_PRODUCT_RANGE_MODES)[number];

/** 选择商品弹窗：full=含 SKU 规格 Tab；spuOnly=仅 SPU（相似品/搭配品树形列表） */
export const BUILTIN_PRODUCT_SELECTION_SCOPES = ["full", "spuOnly"] as const;
export type BuiltinProductSelectionScope = (typeof BUILTIN_PRODUCT_SELECTION_SCOPES)[number];

/** SKU 树勾选键：`${spuId}::${skuId}` */
export type BuiltinSkuSelectionKey = string;

export type BuiltinProductListConfig = {
  /**
   * 列表行粒度（持久化兼容字段，归一化后固定为 spu）。
   * SKU 展示由 template 嵌套 repeat 控制，变量层不再配置 sku 扁平行。
   */
  rowGranularity?: BuiltinProductRowGranularity;
  /** 候选商品池来源 */
  rangeMode: BuiltinProductRangeMode;
  /** 已选商品 id（Shoplazza 风格 mock 的 product.id） */
  selectedSpuIds?: string[];
  /** 按 SKU Tab 勾选的规格键；列表行仍为 SPU，嵌套 skus 列仅展示已选规格 */
  skuSelection?: BuiltinSkuSelectionKey[];
  /** 按商品专辑取商品：已选专辑 id */
  selectedCollectionIds?: string[];
  /** 选择商品弹窗范围；默认 full。spuOnly 时禁止 SKU Tab 与 skuSelection */
  productSelectionScope?: BuiltinProductSelectionScope;
};

export type BuiltinAlbumListConfig = {
  /** 多选专辑 id */
  selectedAlbumIds?: string[];
};

export const DEFAULT_BUILTIN_PRODUCT_LIST_CONFIG: BuiltinProductListConfig = {
  rowGranularity: "spu",
  rangeMode: "freeSelect",
  selectedSpuIds: [],
};

export const DEFAULT_BUILTIN_ALBUM_LIST_CONFIG: BuiltinAlbumListConfig = {
  selectedAlbumIds: [],
};

export function isBuiltinProductRowGranularity(
  value: string
): value is BuiltinProductRowGranularity {
  return (BUILTIN_PRODUCT_ROW_GRANULARITIES as readonly string[]).includes(value);
}

export function isBuiltinProductRangeMode(value: string): value is BuiltinProductRangeMode {
  return (BUILTIN_PRODUCT_RANGE_MODES as readonly string[]).includes(value);
}

export function isBuiltinProductSelectionScope(
  value: string
): value is BuiltinProductSelectionScope {
  return (BUILTIN_PRODUCT_SELECTION_SCOPES as readonly string[]).includes(value);
}

export function isSpuOnlyBuiltinProductSelection(
  config: BuiltinProductListConfig | undefined
): boolean {
  return normalizeBuiltinProductListConfig(config).productSelectionScope === "spuOnly";
}

function selectedSpuIdsFromRaw(raw: BuiltinProductListConfig): string[] {
  const fromSpu = Array.isArray(raw.selectedSpuIds)
    ? raw.selectedSpuIds.filter((id) => typeof id === "string" && id.trim())
    : [];
  const spuIds = new Set(fromSpu);
  for (const key of raw.skuSelection ?? []) {
    if (typeof key !== "string") continue;
    const idx = key.indexOf("::");
    if (idx <= 0) continue;
    spuIds.add(key.slice(0, idx));
  }
  return [...spuIds];
}

function skuSelectionFromRaw(raw: BuiltinProductListConfig): BuiltinSkuSelectionKey[] {
  return Array.isArray(raw.skuSelection)
    ? raw.skuSelection.filter((k) => typeof k === "string" && k.includes("::"))
    : [];
}

export function normalizeBuiltinProductListConfig(
  raw: BuiltinProductListConfig | undefined
): BuiltinProductListConfig {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_BUILTIN_PRODUCT_LIST_CONFIG, selectedSpuIds: [] };
  }
  const rangeMode = isBuiltinProductRangeMode(raw.rangeMode)
    ? raw.rangeMode
    : "freeSelect";
  const productSelectionScope =
    raw.productSelectionScope === "spuOnly" ? "spuOnly" : "full";
  const skuSelection =
    productSelectionScope === "spuOnly" ? [] : skuSelectionFromRaw(raw);
  return {
    rowGranularity: "spu",
    rangeMode,
    productSelectionScope,
    selectedSpuIds: selectedSpuIdsFromRaw({ ...raw, skuSelection }),
    skuSelection,
    selectedCollectionIds: (() => {
      const ids = Array.isArray(raw.selectedCollectionIds)
        ? raw.selectedCollectionIds.filter((id) => typeof id === "string" && id.trim())
        : [];
      return ids.length > 1 ? [ids[0]!] : ids;
    })(),
  };
}

export function normalizeBuiltinAlbumListConfig(
  raw: BuiltinAlbumListConfig | undefined
): BuiltinAlbumListConfig {
  if (!raw || typeof raw !== "object") {
    return { selectedAlbumIds: [] };
  }
  return {
    selectedAlbumIds: Array.isArray(raw.selectedAlbumIds)
      ? raw.selectedAlbumIds.filter((id) => typeof id === "string" && id.trim())
      : [],
  };
}

export function builtinProductRowGranularityLabel(
  value: BuiltinProductRowGranularity
): string {
  return value === "sku" ? "按 SKU（规格）" : "按 SPU（商品）";
}

export function builtinProductRangeModeLabel(value: BuiltinProductRangeMode): string {
  switch (value) {
    case "freeSelect":
      return "自由选择";
    case "allProducts":
      return "全部商品";
    case "byCollection":
      return "按商品专辑取商品";
    default:
      return value;
  }
}

export function formatBuiltinSkuSelectionKey(spuId: string, skuId: string): string {
  return `${spuId}::${skuId}`;
}

export function parseBuiltinSkuSelectionKey(
  key: string
): { spuId: string; skuId: string } | null {
  const idx = key.indexOf("::");
  if (idx <= 0 || idx >= key.length - 2) return null;
  return { spuId: key.slice(0, idx), skuId: key.slice(idx + 2) };
}
