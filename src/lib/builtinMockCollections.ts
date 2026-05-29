/** 内置 mock：商品专辑 → 所含 SPU id（对接 PRD「按商品专辑取商品」） */

export type BuiltinMockCollection = {
  id: string;
  title: string;
  productIds: string[];
};

/** id 与 BUILTIN_ALBUMS_MOCK 中 coll-* 对齐 */
export const BUILTIN_MOCK_COLLECTIONS: BuiltinMockCollection[] = [
  {
    id: "coll-midnight-neon",
    title: "午夜霓虹",
    productIds: [
      "gid://shopify/Product/aura-earbuds",
      "gid://shopify/Product/pulse-watch",
      "gid://shopify/Product/snap-camera",
    ],
  },
  {
    id: "coll-coastal-drive",
    title: "海岸公路",
    productIds: [
      "gid://shopify/Product/nova-laptop",
      "gid://shopify/Product/pulse-watch",
      "gid://shopify/Product/aura-earbuds",
    ],
  },
  {
    id: "coll-golden-hour",
    title: "金色时刻",
    productIds: [
      "gid://shopify/Product/brew-coffee",
      "gid://shopify/Product/snap-camera",
      "gid://shopify/Product/zen-diffuser",
    ],
  },
  {
    id: "coll-city-echoes",
    title: "城市回声",
    productIds: [
      "gid://shopify/Product/nova-laptop",
      "gid://shopify/Product/aura-earbuds",
    ],
  },
  {
    id: "coll-summer-pulse",
    title: "夏日脉冲",
    productIds: [
      "gid://shopify/Product/pulse-watch",
      "gid://shopify/Product/snap-camera",
      "gid://shopify/Product/brew-coffee",
    ],
  },
];

export function listBuiltinMockCollections(): BuiltinMockCollection[] {
  return BUILTIN_MOCK_COLLECTIONS;
}
