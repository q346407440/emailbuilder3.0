import type { BuiltinProductMock, BuiltinProductSkuMock } from "./builtinProductMockTypes";

/** 已 curl GET 200 验证的 Pexels 图（w=400） */
export function pexelsProductImage(photoId: number): string {
  return `https://images.pexels.com/photos/${photoId}/pexels-photo-${photoId}.jpeg?auto=compress&cs=tinysrgb&w=400`;
}

function sku(
  productHandle: string,
  index: number,
  opts: Omit<BuiltinProductSkuMock, "id" | "href"> & { href?: string }
): BuiltinProductSkuMock {
  const n = index + 1;
  return {
    id: `gid://shopify/ProductVariant/${productHandle}-${n}`,
    href: opts.href ?? `https://example.com/products/${productHandle}?variant=${n}`,
    ...opts,
  };
}

function product(
  handle: string,
  title: string,
  badge: string,
  skus: BuiltinProductSkuMock[]
): BuiltinProductMock {
  return {
    id: `gid://shopify/Product/${handle}`,
    handle,
    title,
    vendor: "Easy-Email Mock",
    productType: "General",
    badge,
    href: `https://example.com/products/${handle}`,
    skus,
  };
}

/**
 * 12 条 SPU（含相似品/搭配品演示）；SKU 数量依次为 5、4、3、2、1（循环两轮）。
 * 列表投影取「销量最高 SKU」作为主推图/价；排序按 SKU 最高售价。
 */
export const BUILTIN_PRODUCTS_MOCK_RAW: BuiltinProductMock[] = [
  product("aura-earbuds", "Aura 无线耳机", "热卖", [
    sku("aura-earbuds", 0, {
      title: "曜石黑",
      sku: "AURA-BLK",
      imageSrc: pexelsProductImage(90946),
      salePrice: "$79.00",
      originalPrice: "$99.00",
      inventoryQuantity: 86,
      totalSales: 1240,
    }),
    sku("aura-earbuds", 1, {
      title: "云雾白",
      sku: "AURA-WHT",
      imageSrc: pexelsProductImage(1181671),
      salePrice: "$79.00",
      originalPrice: "$99.00",
      inventoryQuantity: 52,
      totalSales: 980,
    }),
    sku("aura-earbuds", 2, {
      title: "薄荷绿",
      sku: "AURA-MNT",
      imageSrc: pexelsProductImage(1181676),
      salePrice: "$84.00",
      originalPrice: "$99.00",
      inventoryQuantity: 31,
      totalSales: 410,
    }),
    sku("aura-earbuds", 3, {
      title: "礼盒装 · 黑",
      sku: "AURA-GFT-BLK",
      imageSrc: pexelsProductImage(1181686),
      salePrice: "$89.00",
      originalPrice: "$109.00",
      inventoryQuantity: 18,
      totalSales: 220,
    }),
    sku("aura-earbuds", 4, {
      title: "礼盒装 · 白",
      sku: "AURA-GFT-WHT",
      imageSrc: pexelsProductImage(1181690),
      salePrice: "$89.00",
      originalPrice: "$109.00",
      inventoryQuantity: 12,
      totalSales: 165,
    }),
  ]),
  product("pulse-watch", "Pulse 智能手表", "新品", [
    sku("pulse-watch", 0, {
      title: "42mm 星空灰",
      sku: "PULSE-42-GRY",
      imageSrc: pexelsProductImage(2983468),
      salePrice: "$149.00",
      originalPrice: "$199.00",
      inventoryQuantity: 64,
      totalSales: 720,
    }),
    sku("pulse-watch", 1, {
      title: "42mm 玫瑰金",
      sku: "PULSE-42-RGD",
      imageSrc: pexelsProductImage(1181717),
      salePrice: "$159.00",
      originalPrice: "$209.00",
      inventoryQuantity: 40,
      totalSales: 510,
    }),
    sku("pulse-watch", 2, {
      title: "46mm 深空黑",
      sku: "PULSE-46-BLK",
      imageSrc: pexelsProductImage(1181722),
      salePrice: "$169.00",
      originalPrice: "$219.00",
      inventoryQuantity: 28,
      totalSales: 380,
    }),
    sku("pulse-watch", 3, {
      title: "46mm 海军蓝",
      sku: "PULSE-46-NVY",
      imageSrc: pexelsProductImage(1181244),
      salePrice: "$169.00",
      originalPrice: "$219.00",
      inventoryQuantity: 22,
      totalSales: 290,
    }),
  ]),
  product("grip-stand", "Grip 手机支架", "", [
    sku("grip-stand", 0, {
      title: "铝合金 · 银",
      sku: "GRIP-ALU-SLV",
      imageSrc: pexelsProductImage(267350),
      salePrice: "$19.00",
      originalPrice: "$29.00",
      inventoryQuantity: 200,
      totalSales: 2100,
    }),
    sku("grip-stand", 1, {
      title: "铝合金 · 黑",
      sku: "GRIP-ALU-BLK",
      imageSrc: pexelsProductImage(1181263),
      salePrice: "$19.00",
      originalPrice: "$29.00",
      inventoryQuantity: 175,
      totalSales: 1880,
    }),
    sku("grip-stand", 2, {
      title: "磁吸款 · 灰",
      sku: "GRIP-MAG-GRY",
      imageSrc: pexelsProductImage(1181291),
      salePrice: "$24.00",
      originalPrice: "$34.00",
      inventoryQuantity: 90,
      totalSales: 640,
    }),
  ]),
  product("snap-camera", "Snap 便携相机", "限时", [
    sku("snap-camera", 0, {
      title: "标准套装",
      sku: "SNAP-STD",
      imageSrc: pexelsProductImage(996329),
      salePrice: "$259.00",
      originalPrice: "$299.00",
      inventoryQuantity: 34,
      totalSales: 190,
    }),
    sku("snap-camera", 1, {
      title: "旅行套装（含收纳包）",
      sku: "SNAP-TRV",
      imageSrc: pexelsProductImage(112460),
      salePrice: "$289.00",
      originalPrice: "$329.00",
      inventoryQuantity: 16,
      totalSales: 95,
    }),
  ]),
  product("glow-skincare", "Glow 护肤套装", "", [
    sku("glow-skincare", 0, {
      title: "标准装",
      sku: "GLOW-STD",
      imageSrc: pexelsProductImage(3945683),
      salePrice: "$45.00",
      originalPrice: "$60.00",
      inventoryQuantity: 120,
      totalSales: 860,
    }),
  ]),
  product("stride-shoes", "Stride 运动鞋", "热卖", [
    sku("stride-shoes", 0, {
      title: "US 8 · 黑白",
      sku: "STR-08-BW",
      imageSrc: pexelsProductImage(1927259),
      salePrice: "$89.00",
      originalPrice: "$120.00",
      inventoryQuantity: 45,
      totalSales: 520,
    }),
    sku("stride-shoes", 1, {
      title: "US 9 · 黑白",
      sku: "STR-09-BW",
      imageSrc: pexelsProductImage(2566573),
      salePrice: "$89.00",
      originalPrice: "$120.00",
      inventoryQuantity: 38,
      totalSales: 480,
    }),
    sku("stride-shoes", 2, {
      title: "US 9 · 全黑",
      sku: "STR-09-BLK",
      imageSrc: pexelsProductImage(2783873),
      salePrice: "$92.00",
      originalPrice: "$120.00",
      inventoryQuantity: 22,
      totalSales: 310,
    }),
    sku("stride-shoes", 3, {
      title: "US 10 · 灰橙",
      sku: "STR-10-ORG",
      imageSrc: pexelsProductImage(4046316),
      salePrice: "$89.00",
      originalPrice: "$120.00",
      inventoryQuantity: 19,
      totalSales: 275,
    }),
    sku("stride-shoes", 4, {
      title: "US 11 · 灰橙",
      sku: "STR-11-ORG",
      imageSrc: pexelsProductImage(1005638),
      salePrice: "$89.00",
      originalPrice: "$120.00",
      inventoryQuantity: 11,
      totalSales: 140,
    }),
  ]),
  product("story-set", "Story 精选套装", "", [
    sku("story-set", 0, {
      title: "卷一 · 平装",
      sku: "STORY-V1-PB",
      imageSrc: pexelsProductImage(7856674),
      salePrice: "$32.00",
      originalPrice: "$42.00",
      inventoryQuantity: 88,
      totalSales: 430,
    }),
    sku("story-set", 1, {
      title: "卷二 · 平装",
      sku: "STORY-V2-PB",
      imageSrc: pexelsProductImage(1027130),
      salePrice: "$32.00",
      originalPrice: "$42.00",
      inventoryQuantity: 76,
      totalSales: 390,
    }),
    sku("story-set", 2, {
      title: "双卷礼盒",
      sku: "STORY-BOX",
      imageSrc: pexelsProductImage(1181304),
      salePrice: "$58.00",
      originalPrice: "$72.00",
      inventoryQuantity: 24,
      totalSales: 155,
    }),
    sku("story-set", 3, {
      title: "卷一 · 精装",
      sku: "STORY-V1-HC",
      imageSrc: pexelsProductImage(1181317),
      salePrice: "$48.00",
      originalPrice: "$58.00",
      inventoryQuantity: 15,
      totalSales: 98,
    }),
  ]),
  product("brew-coffee", "Brew 咖啡机", "新品", [
    sku("brew-coffee", 0, {
      title: "哑光白",
      sku: "BREW-WHT",
      imageSrc: pexelsProductImage(4041392),
      salePrice: "$129.00",
      originalPrice: "$159.00",
      inventoryQuantity: 42,
      totalSales: 340,
    }),
    sku("brew-coffee", 1, {
      title: "磨砂黑",
      sku: "BREW-BLK",
      imageSrc: pexelsProductImage(1181340),
      salePrice: "$129.00",
      originalPrice: "$159.00",
      inventoryQuantity: 36,
      totalSales: 310,
    }),
    sku("brew-coffee", 2, {
      title: "专业版 · 黑色",
      sku: "BREW-PRO-BLK",
      imageSrc: pexelsProductImage(1181354),
      salePrice: "$159.00",
      originalPrice: "$189.00",
      inventoryQuantity: 14,
      totalSales: 120,
    }),
  ]),
  product("nova-laptop", "Nova 轻薄本", "", [
    sku("nova-laptop", 0, {
      title: "16GB / 512GB",
      sku: "NOVA-16-512",
      imageSrc: pexelsProductImage(1181376),
      salePrice: "$899.00",
      originalPrice: "$999.00",
      inventoryQuantity: 18,
      totalSales: 210,
    }),
    sku("nova-laptop", 1, {
      title: "32GB / 1TB",
      sku: "NOVA-32-1T",
      imageSrc: pexelsProductImage(1181396),
      salePrice: "$1,099.00",
      originalPrice: "$1,199.00",
      inventoryQuantity: 8,
      totalSales: 85,
    }),
  ]),
  product("zen-diffuser", "Zen 香薰机", "", [
    sku("zen-diffuser", 0, {
      title: "标准版",
      sku: "ZEN-STD",
      imageSrc: pexelsProductImage(298863),
      salePrice: "$39.00",
      originalPrice: "$49.00",
      inventoryQuantity: 95,
      totalSales: 670,
    }),
  ]),
  product("mock-similar-product", "相似品", "演示", [
    sku("mock-similar-product", 0, {
      title: "标准款",
      sku: "MOCK-SIM",
      imageSrc: pexelsProductImage(1181410),
      salePrice: "$49.00",
      originalPrice: "$59.00",
      inventoryQuantity: 50,
      totalSales: 800,
    }),
  ]),
  product("mock-complement-product", "搭配品", "演示", [
    sku("mock-complement-product", 0, {
      title: "标准款",
      sku: "MOCK-CMP",
      imageSrc: pexelsProductImage(1181421),
      salePrice: "$29.00",
      originalPrice: "$39.00",
      inventoryQuantity: 60,
      totalSales: 750,
    }),
  ]),
];
