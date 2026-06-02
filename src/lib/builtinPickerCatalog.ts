import type { BuiltinProductListConfig } from "../payload-contract/collection-builtin-catalog-config";
import {
  isSpuOnlyBuiltinProductSelection,
  normalizeBuiltinProductListConfig,
} from "../payload-contract/collection-builtin-catalog-config";
import { BUILTIN_ALBUMS_MOCK } from "./builtinCollectionCatalog";
import { BUILTIN_MOCK_COLLECTIONS } from "./builtinMockCollections";
import type { BuiltinProductMock } from "./builtinProductMockTypes";

export type BuiltinProductPickerTab = "spu" | "sku" | "collection" | "allProducts";

export function productPickerTabFromConfig(
  config: BuiltinProductListConfig
): BuiltinProductPickerTab {
  const c = normalizeBuiltinProductListConfig(config);
  if (c.rangeMode === "allProducts") return "allProducts";
  if (c.rangeMode === "byCollection") return "collection";
  if (!isSpuOnlyBuiltinProductSelection(c) && (c.skuSelection?.length ?? 0) > 0) return "sku";
  return "spu";
}

export function builtinProductPickerTabsForConfig(
  config: BuiltinProductListConfig
): ReadonlyArray<{ id: BuiltinProductPickerTab; label: string }> {
  const all: ReadonlyArray<{ id: BuiltinProductPickerTab; label: string }> = [
    { id: "spu", label: "指定商品" },
    { id: "sku", label: "按 SKU" },
    { id: "collection", label: "按专辑" },
    { id: "allProducts", label: "全部商品" },
  ];
  if (isSpuOnlyBuiltinProductSelection(config)) {
    return all.filter((t) => t.id !== "sku");
  }
  return all;
}

export function spuInventoryTotal(product: BuiltinProductMock): number {
  return product.skus.reduce((sum, s) => sum + (s.inventoryQuantity ?? 0), 0);
}

export function spuPriceRange(product: BuiltinProductMock): string {
  const prices = product.skus
    .map((s) => parseFloat(String(s.salePrice).replace(/[^0-9.]/g, "")))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (prices.length === 0) return "—";
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === max) return min.toFixed(2);
  return `${min.toFixed(2)} ~ ${max.toFixed(2)}`;
}

export function collectionProductCount(collectionId: string): number {
  const coll = BUILTIN_MOCK_COLLECTIONS.find((c) => c.id === collectionId);
  return coll?.productIds.length ?? 0;
}

export function filterProductsBySearch(
  products: BuiltinProductMock[],
  query: string
): BuiltinProductMock[] {
  const q = query.trim().toLowerCase();
  if (!q) return products;
  return products.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.handle.toLowerCase().includes(q) ||
      p.skus.some((s) => s.title.toLowerCase().includes(q) || s.sku.toLowerCase().includes(q))
  );
}

export function filterCollectionsBySearch(
  query: string
): typeof BUILTIN_MOCK_COLLECTIONS {
  const q = query.trim().toLowerCase();
  if (!q) return BUILTIN_MOCK_COLLECTIONS;
  return BUILTIN_MOCK_COLLECTIONS.filter((c) => c.title.toLowerCase().includes(q));
}

export function summarizeBuiltinProductListConfig(
  config: BuiltinProductListConfig
): string {
  const c = normalizeBuiltinProductListConfig(config);
  if (c.rangeMode === "allProducts") {
    return "全部商品";
  }
  if (c.rangeMode === "byCollection") {
    const id = c.selectedCollectionIds?.[0];
    const title = BUILTIN_MOCK_COLLECTIONS.find((x) => x.id === id)?.title ?? "未选专辑";
    return `专辑「${title}」内商品`;
  }
  if (!isSpuOnlyBuiltinProductSelection(c)) {
    const skuCount = c.skuSelection?.length ?? 0;
    if (skuCount > 0) {
      return `已选 ${skuCount} 个规格（${c.selectedSpuIds?.length ?? 0} 件商品）`;
    }
  }
  const n = c.selectedSpuIds?.length ?? 0;
  return n > 0 ? `已选 ${n} 件商品` : "未选择商品";
}

export function summarizeBuiltinAlbumListSelection(selectedAlbumIds: string[]): string {
  if (selectedAlbumIds.length === 0) return "未选择专辑";
  if (selectedAlbumIds.length === 1) {
    const id = selectedAlbumIds[0]!;
    const title = String(BUILTIN_ALBUMS_MOCK.find((r) => r.id === id)?.title ?? id);
    return `已选专辑「${title}」`;
  }
  return `已选 ${selectedAlbumIds.length} 个专辑`;
}

export function filterAlbumRowsBySearch(
  rows: Record<string, unknown>[],
  query: string
): Record<string, unknown>[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((r) => String(r.title ?? "").toLowerCase().includes(q));
}
