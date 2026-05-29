import type { BuiltinCollectionCatalogId } from "../payload-contract/collection-data-source";
import {
  DEFAULT_BUILTIN_COLLECTION_SORT,
  normalizeBuiltinCollectionSortId,
  type BuiltinCollectionSortId,
} from "../payload-contract/collection-builtin-sort";

export type { BuiltinCollectionCatalogId };
export type { BuiltinCollectionSortId };
import type { BindingCollectionField } from "../types/email";
import type { BuiltinProductMock, BuiltinProductSkuMock } from "./builtinProductMockTypes";
import { BUILTIN_PRODUCTS_MOCK_RAW } from "./builtinProductsMockData";
import { listCatalogSourceFieldKeysForPicker, readCatalogSourceValue } from "./collectionFieldMapping";

/** 主推等场景下一行内展开的 SKU 槽位数（与 mock 最多 5 个 SKU 对齐） */
export const BUILTIN_PRODUCT_SKU_SLOT_COUNT = 5;

export type { BuiltinProductMock, BuiltinProductSkuMock } from "./builtinProductMockTypes";
export { BUILTIN_PRODUCTS_MOCK_RAW, pexelsProductImage } from "./builtinProductsMockData";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isSkuRow(value: unknown): value is BuiltinProductSkuMock {
  return isRecord(value) && typeof value.imageSrc === "string";
}

/** 列表排序/投影用：取 SKU 最高售价 */
function maxSkuSalePrice(skus: BuiltinProductSkuMock[]): number {
  let max = 0;
  for (const s of skus) {
    const n = parsePriceLike(s.salePrice);
    if (n > max) max = n;
  }
  return max;
}

/** 列表卡片默认展示：销量最高的 SKU（价格/图/库存均在 SKU 级） */
export function pickFeaturedSku(skus: BuiltinProductSkuMock[]): BuiltinProductSkuMock {
  return [...skus].sort((a, b) => {
    if (b.totalSales !== a.totalSales) return b.totalSales - a.totalSales;
    return parsePriceLike(b.salePrice) - parsePriceLike(a.salePrice);
  })[0]!;
}

/** SPU + skus → 带扁平展示字段的 catalog 行（skus[] 保留结构化，不按序号摊平） */
export function flattenBuiltinProductRow(product: BuiltinProductMock): Record<string, unknown> {
  const featured = pickFeaturedSku(product.skus);
  const inventoryQuantity = product.skus.reduce((sum, s) => sum + s.inventoryQuantity, 0);
  const totalSales = product.skus.reduce((sum, s) => sum + s.totalSales, 0);
  const row: Record<string, unknown> = {
    id: product.id,
    handle: product.handle,
    name: product.title,
    title: product.title,
    vendor: product.vendor,
    productType: product.productType,
    badge: product.badge,
    href: product.href,
    skuCount: product.skus.length,
    skus: product.skus,
    imageSrc: featured.imageSrc,
    imageAlt: featured.imageAlt,
    salePrice: featured.salePrice,
    originalPrice: featured.originalPrice,
    inventoryQuantity,
    totalSales,
    conversionRate: totalSales * 0.01,
    maxSkuSalePrice: maxSkuSalePrice(product.skus),
  };
  return row;
}

/** 内置商品 mock（10 条 SPU，展开后的 catalog 行） */
export const BUILTIN_PRODUCTS_MOCK: Record<string, unknown>[] =
  BUILTIN_PRODUCTS_MOCK_RAW.map(flattenBuiltinProductRow);

/** 内置商品专辑 mock（10 条，对齐 PRD / Shoplazza Collection） */
export const BUILTIN_ALBUMS_MOCK: Record<string, unknown>[] = [
  {
    id: "coll-midnight-neon",
    coverSrc: "https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=400",
    coverAlt: "午夜霓虹封面",
    title: "午夜霓虹",
    description: "12 首电子氛围曲",
    href: "https://example.com/collections/midnight-neon",
    salesVolume: 1200,
  },
  {
    id: "coll-coastal-drive",
    coverSrc: "https://images.pexels.com/photos/1670921/pexels-photo-1670921.jpeg?auto=compress&cs=tinysrgb&w=400",
    coverAlt: "海岸公路封面",
    title: "海岸公路",
    description: "10 首独立流行",
    href: "https://example.com/collections/coastal-drive",
    salesVolume: 980,
  },
  {
    id: "coll-golden-hour",
    coverSrc: "https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=400",
    coverAlt: "金色时刻封面",
    title: "金色时刻",
    description: "8 首民谣",
    href: "https://example.com/collections/golden-hour",
    salesVolume: 760,
  },
  {
    id: "coll-city-echoes",
    coverSrc: "https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=400",
    coverAlt: "城市回声封面",
    title: "城市回声",
    description: "14 首嘻哈节奏",
    href: "https://example.com/collections/city-echoes",
    salesVolume: 1100,
  },
  {
    id: "coll-quiet-keys",
    coverSrc: "https://images.pexels.com/photos/1670921/pexels-photo-1670921.jpeg?auto=compress&cs=tinysrgb&w=400",
    coverAlt: "静夜钢琴封面",
    title: "静夜钢琴",
    description: "9 首钢琴独奏",
    href: "https://example.com/collections/quiet-keys",
    salesVolume: 540,
  },
  {
    id: "coll-summer-pulse",
    coverSrc: "https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=400",
    coverAlt: "夏日脉冲封面",
    title: "夏日脉冲",
    description: "11 首舞曲",
    href: "https://example.com/collections/summer-pulse",
    salesVolume: 890,
  },
  {
    id: "coll-forest-walk",
    coverSrc: "https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=400",
    coverAlt: "深林漫步封面",
    title: "深林漫步",
    description: "7 首环境音乐",
    href: "https://example.com/collections/forest-walk",
    salesVolume: 430,
  },
  {
    id: "coll-tape-memories",
    coverSrc: "https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=400",
    coverAlt: "复古磁带封面",
    title: "复古磁带",
    description: "13 首复古流行",
    href: "https://example.com/collections/tape-memories",
    salesVolume: 670,
  },
  {
    id: "coll-star-voyage",
    coverSrc: "https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=400",
    coverAlt: "星际航行封面",
    title: "星际航行",
    description: "10 首太空合成",
    href: "https://example.com/collections/star-voyage",
    salesVolume: 820,
  },
  {
    id: "coll-dawn-overture",
    coverSrc: "https://images.pexels.com/photos/1670921/pexels-photo-1670921.jpeg?auto=compress&cs=tinysrgb&w=400",
    coverAlt: "晨光序曲封面",
    title: "晨光序曲",
    description: "6 首古典跨界",
    href: "https://example.com/collections/dawn-overture",
    salesVolume: 390,
  },
];

const CATALOG_SOURCE: Record<BuiltinCollectionCatalogId, Record<string, unknown>[]> = {
  products: BUILTIN_PRODUCTS_MOCK,
  albums: BUILTIN_ALBUMS_MOCK,
};

/**
 * 槽 itemField.key → 内置 catalog 行上可接受的源字段（按优先级）。
 * 用于商品/专辑/权益等不同 itemFields 复用同一套 mock。
 */
const FIELD_ALIASES: Record<string, string[]> = {
  title: ["title", "name", "offer"],
  subtitle: ["subtitle", "description", "desc", "salePrice", "artist", "badge"],
  iconSrc: ["iconSrc", "imageSrc", "coverSrc"],
  name: ["name", "title"],
  imageSrc: ["imageSrc", "coverSrc", "iconSrc"],
  imageAlt: ["imageAlt", "coverAlt"],
  coverSrc: ["coverSrc", "imageSrc", "iconSrc"],
  coverAlt: ["coverAlt", "imageAlt"],
  salePrice: ["salePrice", "subtitle"],
  originalPrice: ["originalPrice"],
  offer: ["offer", "title"],
  desc: ["desc", "description", "subtitle"],
};

/** 从 catalog 行 skus[n] 读取 skuImage1 / skuTitle2 等展开槽（仅投影用，非第二套商品） */
function pickSkuIndexedCatalogValue(
  catalogItem: Record<string, unknown>,
  fieldKey: string
): unknown {
  const m =
    /^(skuImageAlt|skuImage|skuSalePrice|skuOriginalPrice|skuTitle|skuCode)(\d+)$/.exec(fieldKey);
  if (!m) return undefined;
  const idx = Number(m[2]) - 1;
  if (!Number.isFinite(idx) || idx < 0) return undefined;
  const skus = catalogItem.skus;
  if (!Array.isArray(skus)) return undefined;
  const sku = skus[idx];
  if (!isSkuRow(sku)) return undefined;
  const propByPrefix: Record<string, keyof BuiltinProductSkuMock> = {
    skuImage: "imageSrc",
    skuImageAlt: "imageAlt",
    skuSalePrice: "salePrice",
    skuOriginalPrice: "originalPrice",
    skuTitle: "title",
    skuCode: "sku",
  };
  const prop = propByPrefix[m[1]!];
  return prop ? sku[prop] : undefined;
}

function pickCatalogValue(
  catalogItem: Record<string, unknown>,
  fieldKey: string
): unknown {
  const fromSkuIndex = pickSkuIndexedCatalogValue(catalogItem, fieldKey);
  if (fromSkuIndex !== undefined && String(fromSkuIndex).trim() !== "") {
    return fromSkuIndex;
  }
  const fromSource = readCatalogSourceValue(catalogItem, fieldKey);
  if (fromSource !== undefined && fromSource !== null && String(fromSource).trim() !== "") {
    return fromSource;
  }
  if (catalogItem[fieldKey] !== undefined) return catalogItem[fieldKey];
  for (const alias of FIELD_ALIASES[fieldKey] ?? []) {
    if (catalogItem[alias] !== undefined) return catalogItem[alias];
  }
  return "";
}

function parsePriceLike(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return 0;
  const n = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function rowPriceForSort(row: Record<string, unknown>): number {
  if (typeof row.maxSkuSalePrice === "number" && row.maxSkuSalePrice > 0) {
    return row.maxSkuSalePrice;
  }
  if (Array.isArray(row.skus)) {
    let max = 0;
    for (const raw of row.skus) {
      if (!isSkuRow(raw)) continue;
      const n = parsePriceLike(raw.salePrice);
      if (n > max) max = n;
    }
    if (max > 0) return max;
  }
  for (const key of ["salePrice", "offer", "subtitle", "originalPrice"]) {
    const n = parsePriceLike(row[key]);
    if (n > 0) return n;
  }
  return 0;
}

function rowSalesVolumeForSort(row: Record<string, unknown>): number {
  const direct = row.salesVolume ?? row.totalSales;
  if (typeof direct === "number" && Number.isFinite(direct)) return direct;
  return 0;
}

function rowConversionForSort(row: Record<string, unknown>): number {
  const direct = row.conversionRate;
  if (typeof direct === "number" && Number.isFinite(direct)) return direct;
  return 0;
}

function rowNameForSort(row: Record<string, unknown>): string {
  for (const key of ["name", "title"]) {
    const v = row[key];
    if (typeof v === "string" && v.trim()) return v.trim().toLowerCase();
  }
  return "";
}

/** 对完整 catalog 排序（先排序再截断取前 N 条） */
export function sortBuiltinCatalogRows(
  catalog: BuiltinCollectionCatalogId,
  sort: BuiltinCollectionSortId = DEFAULT_BUILTIN_COLLECTION_SORT
): Record<string, unknown>[] {
  const normalizedSort = normalizeBuiltinCollectionSortId(sort);
  const rows = CATALOG_SOURCE[catalog].map((row) => ({ ...row }));
  if (normalizedSort === "catalogOrder") return rows;

  const sorted = [...rows];
  if (normalizedSort === "salesVolumeDesc") {
    sorted.sort((a, b) => rowSalesVolumeForSort(b) - rowSalesVolumeForSort(a));
    return sorted;
  }
  if (normalizedSort === "conversionDesc") {
    sorted.sort((a, b) => rowConversionForSort(b) - rowConversionForSort(a));
    return sorted;
  }
  if (normalizedSort === "priceDesc" || normalizedSort === "priceAsc") {
    sorted.sort((a, b) => {
      const diff = rowPriceForSort(a) - rowPriceForSort(b);
      return normalizedSort === "priceDesc" ? -diff : diff;
    });
    return sorted;
  }
  sorted.sort((a, b) => {
    const diff = rowNameForSort(a).localeCompare(rowNameForSort(b), "zh-CN");
    return normalizedSort === "nameDesc" ? -diff : diff;
  });
  return sorted;
}

/** 将内置 catalog 行投影到槽声明的 itemFields */
export function projectBuiltinCatalogItems(
  catalog: BuiltinCollectionCatalogId,
  itemFields: BindingCollectionField[],
  limit: number,
  sort: BuiltinCollectionSortId = DEFAULT_BUILTIN_COLLECTION_SORT
): Record<string, unknown>[] {
  const source = sortBuiltinCatalogRows(catalog, sort).slice(0, limit);
  return projectRowsToItemFields(source, itemFields);
}

/** 对任意 catalog 行数组排序并投影（商品 SKU 扁平行、专辑多选等） */
export function projectBuiltinCatalogItemsFromRows(
  rows: Record<string, unknown>[],
  itemFields: BindingCollectionField[],
  limit: number,
  sort: BuiltinCollectionSortId = DEFAULT_BUILTIN_COLLECTION_SORT,
  catalog: BuiltinCollectionCatalogId = "builtinProducts"
): Record<string, unknown>[] {
  const order = new Map(rows.map((r, i) => [String(r.id ?? i), i]));
  const catalogMatched = sortBuiltinCatalogRows(catalog, sort).filter((r) =>
    order.has(String(r.id ?? ""))
  );
  // SKU 扁平行 id 为 spu::sku，与 catalog 中 SPU 行 id 不一致时，保留勾选顺序而非丢行
  const sorted =
    catalogMatched.length > 0
      ? catalogMatched.concat(
          rows.filter(
            (r) =>
              !catalogMatched.some((c) => String(c.id ?? "") === String(r.id ?? ""))
          )
        )
      : [...rows].sort(
          (a, b) =>
            (order.get(String(a.id ?? "")) ?? 0) - (order.get(String(b.id ?? "")) ?? 0)
        );
  const unique: Record<string, unknown>[] = [];
  const seen = new Set<string>();
  for (const row of sorted) {
    const key = String(row.id ?? row.handle ?? row.title ?? unique.length);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(row);
  }
  return projectRowsToItemFields(unique.slice(0, limit), itemFields);
}

export function projectRowsToItemFields(
  rows: Record<string, unknown>[],
  itemFields: BindingCollectionField[]
): Record<string, unknown>[] {
  return rows.map((row) =>
    Object.fromEntries(
      itemFields.map((field) => {
        if (field.valueType === "collection") {
          const nestedRows = Array.isArray(row[field.key])
            ? (row[field.key] as Record<string, unknown>[])
            : [];
          return [
            field.key,
            projectRowsToItemFields(
              nestedRows,
              field.itemFields
            ).slice(
              0,
              field.maxItems ?? nestedRows.length
            ),
          ];
        }
        let value = pickCatalogValue(row, field.key);
        if (field.required && !String(value ?? "").trim()) {
          if (field.valueType === "url" || field.valueType === "image") {
            value = "https://example.com/products/placeholder";
          } else {
            value = "—";
          }
        }
        return [field.key, value];
      })
    )
  );
}

function normalizeMatchToken(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value).trim().toLowerCase();
}

function anchorTokens(
  anchorRow: Record<string, unknown>,
  matchField: "href" | "name"
): string[] {
  const tokens: string[] = [];
  const primary = normalizeMatchToken(anchorRow[matchField]);
  if (primary) tokens.push(primary);
  const name = normalizeMatchToken(anchorRow.name);
  const href = normalizeMatchToken(anchorRow.href);
  if (name && !tokens.includes(name)) tokens.push(name);
  if (href && !tokens.includes(href)) tokens.push(href);
  return tokens;
}

/**
 * 相似品排除：仅在 **SPU（商品）级** 比对锚点，不按 SKU 维度匹配。
 * mock 与后续真实推荐接口均应以商品 handle/href/name 为粒度，而非单个规格 SKU。
 */
function catalogRowMatchesAnchor(
  catalogRow: Record<string, unknown>,
  anchorRow: Record<string, unknown>,
  matchField: "href" | "name"
): boolean {
  const tokens = anchorTokens(anchorRow, matchField);
  if (tokens.length === 0) return false;
  const rowTokens = [
    normalizeMatchToken(catalogRow.href),
    normalizeMatchToken(catalogRow.name),
    normalizeMatchToken(catalogRow.title),
  ].filter(Boolean);
  return tokens.some((t) => rowTokens.includes(t));
}

/**
 * 在排序后的 catalog 中排除锚点 **SPU**，取前 limit 条作为「相似品」mock。
 * 锚点不在 catalog 中时，退化为取排序后的前 limit 条。每行投影为一条 SPU（非 SKU 列表）。
 */
export function projectBuiltinCatalogSimilarTo(
  catalog: BuiltinCollectionCatalogId,
  itemFields: BindingCollectionField[],
  limit: number,
  sort: BuiltinCollectionSortId,
  anchorRow: Record<string, unknown> | null,
  matchField: "href" | "name" = "href"
): Record<string, unknown>[] {
  const sorted = sortBuiltinCatalogRows(catalog, sort);
  if (!anchorRow || !Object.keys(anchorRow).length) {
    return projectRowsToItemFields(sorted.slice(0, limit), itemFields);
  }
  const filtered = sorted.filter((row) => !catalogRowMatchesAnchor(row, anchorRow, matchField));
  // 锚点命中 catalog 时务必用 filtered；仅当未排除任何行（锚点不在目录）才退回 sorted
  const pool = filtered.length < sorted.length ? filtered : sorted;
  return projectRowsToItemFields(pool.slice(0, limit), itemFields);
}

/** 搭配品：排除锚点 SPU 后取前 limit 条（SPU 级） */
export function projectBuiltinCatalogComplement(
  catalog: BuiltinCollectionCatalogId,
  itemFields: BindingCollectionField[],
  limit: number,
  sort: BuiltinCollectionSortId,
  anchorRow: Record<string, unknown> | null,
  matchField: "href" | "name" = "href"
): Record<string, unknown>[] {
  return projectBuiltinCatalogSimilarTo(
    catalog,
    itemFields,
    limit,
    sort,
    anchorRow,
    matchField
  );
}

function findCatalogRowForAnchor(
  catalog: BuiltinCollectionCatalogId,
  anchorRow: Record<string, unknown> | null,
  matchField: "href" | "name"
): Record<string, unknown> | null {
  const rows = sortBuiltinCatalogRows(catalog, "catalogOrder");
  if (!rows.length) return null;
  if (!anchorRow || !Object.keys(anchorRow).some((k) => String(anchorRow[k] ?? "").trim())) {
    return rows[0]!;
  }
  const matched = rows.find((row) => catalogRowMatchesAnchor(row, anchorRow, matchField));
  return matched ?? rows[0]!;
}

function sortSkuRows(
  skus: BuiltinProductSkuMock[],
  sort: BuiltinCollectionSortId
): BuiltinProductSkuMock[] {
  const list = [...skus];
  if (sort === "catalogOrder") return list;
  if (sort === "salesDesc" || sort === "salesAsc") {
    list.sort((a, b) => {
      const diff = (b.totalSales ?? 0) - (a.totalSales ?? 0);
      return sort === "salesDesc" ? diff : -diff;
    });
    return list;
  }
  list.sort((a, b) => {
    const diff = (a.title ?? "").localeCompare(b.title ?? "", "zh-CN");
    return sort === "nameDesc" ? -diff : diff;
  });
  return list;
}

function projectSkuRowsToItemFields(
  skus: BuiltinProductSkuMock[],
  itemFields: BindingCollectionField[],
  limit: number
): Record<string, unknown>[] {
  return skus.slice(0, limit).map((sku) => {
    const row = sku as unknown as Record<string, unknown>;
    return Object.fromEntries(
      itemFields.map((field) => {
        if (field.valueType === "collection") {
          const nestedRows = Array.isArray(row[field.key])
            ? (row[field.key] as Record<string, unknown>[])
            : [];
          return [
            field.key,
            projectRowsToItemFields(
              nestedRows,
              field.itemFields
            ).slice(
              0,
              field.maxItems ?? nestedRows.length
            ),
          ];
        }
        let value = row[field.key];
        if (value === undefined || value === null || !String(value).trim()) {
          value = pickCatalogValue(row, field.key);
        }
        if (field.required && !String(value ?? "").trim()) {
          if (field.valueType === "url" || field.valueType === "image") {
            value = "https://example.com/products/placeholder";
          } else {
            value = "—";
          }
        }
        return [field.key, value];
      })
    );
  });
}

/**
 * 从锚点 SPU 在目录中匹配商品，将其 skus[] 投影为列表行（用于 SKU 规格横条）。
 */
export function projectBuiltinCatalogProductSkus(
  catalog: BuiltinCollectionCatalogId,
  itemFields: BindingCollectionField[],
  limit: number,
  sort: BuiltinCollectionSortId,
  anchorRow: Record<string, unknown> | null,
  matchField: "href" | "name" = "href"
): Record<string, unknown>[] {
  if (catalog !== "products") {
    return projectRowsToItemFields([], itemFields);
  }
  const productRow = findCatalogRowForAnchor(catalog, anchorRow, matchField);
  const rawSkus = productRow?.skus;
  if (!Array.isArray(rawSkus)) {
    return projectRowsToItemFields([], itemFields);
  }
  const skus = rawSkus.filter(isSkuRow);
  return projectSkuRowsToItemFields(sortSkuRows(skus, sort), itemFields, limit);
}

export function getBuiltinCatalogItems(
  catalog: BuiltinCollectionCatalogId
): Record<string, unknown>[] {
  if (catalog === "products") {
    return structuredClone(BUILTIN_PRODUCTS_MOCK_RAW) as unknown as Record<string, unknown>[];
  }
  return structuredClone(CATALOG_SOURCE[catalog]);
}

/** 内置商品目录首条 SPU（扁平化），供字段关联展示源字段（SKU 仅一套结构字段） */
export function builtinProductsCatalogFieldSample(): {
  keys: string[];
  firstItem: Record<string, unknown>;
} | null {
  const first = BUILTIN_PRODUCTS_MOCK_RAW[0];
  if (!first) return null;
  const flat = flattenBuiltinProductRow(first);
  return { keys: listCatalogSourceFieldKeysForPicker(flat), firstItem: flat };
}

export function builtinCatalogLabel(catalog: BuiltinCollectionCatalogId): string {
  return catalog === "products" ? "商品列表" : "专辑列表";
}
