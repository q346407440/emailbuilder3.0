/** 内置商品 / 专辑列表场景配置（payload.slots[].dataSource 内，仅 provider=builtin） */

export const BUILTIN_PRODUCT_ROW_GRANULARITIES = ["spu", "sku"] as const;
export type BuiltinProductRowGranularity = (typeof BUILTIN_PRODUCT_ROW_GRANULARITIES)[number];

export const BUILTIN_PRODUCT_RANGE_MODES = [
  "freeSelect",
  "allProducts",
  "byCollection",
] as const;
export type BuiltinProductRangeMode = (typeof BUILTIN_PRODUCT_RANGE_MODES)[number];

/** SKU 树勾选键：`${spuId}::${skuId}` */
export type BuiltinSkuSelectionKey = string;

export type BuiltinProductListConfig = {
  /** 列表行粒度：按商品（SPU）或按规格（SKU 扁平行） */
  rowGranularity: BuiltinProductRowGranularity;
  /** 候选商品池来源 */
  rangeMode: BuiltinProductRangeMode;
  /**
   * 按 SPU 粒度：已选商品 id（Shoplazza 风格 mock 的 product.id）。
   * 按 SKU 粒度且 freeSelect：由 skuSelection 推导，可与 selectedSpuIds 冗余存储。
   */
  selectedSpuIds?: string[];
  /** 按 SKU 粒度：勾选的规格键列表 */
  skuSelection?: BuiltinSkuSelectionKey[];
  /** 按商品专辑取商品：已选专辑 id */
  selectedCollectionIds?: string[];
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

export function normalizeBuiltinProductListConfig(
  raw: BuiltinProductListConfig | undefined
): BuiltinProductListConfig {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_BUILTIN_PRODUCT_LIST_CONFIG, selectedSpuIds: [] };
  }
  const rowGranularity = isBuiltinProductRowGranularity(raw.rowGranularity)
    ? raw.rowGranularity
    : "spu";
  const rangeMode = isBuiltinProductRangeMode(raw.rangeMode)
    ? raw.rangeMode
    : "freeSelect";
  return {
    rowGranularity,
    rangeMode,
    selectedSpuIds: Array.isArray(raw.selectedSpuIds)
      ? raw.selectedSpuIds.filter((id) => typeof id === "string" && id.trim())
      : [],
    skuSelection: Array.isArray(raw.skuSelection)
      ? raw.skuSelection.filter((k) => typeof k === "string" && k.includes("::"))
      : [],
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
