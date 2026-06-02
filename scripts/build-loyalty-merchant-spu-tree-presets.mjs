#!/usr/bin/env node
/**
 * 生成 loyalty-merchant-admin 相似品/搭配品 SPU 树形列表场景预设 JSON（builtin + 选择商品）。
 * 运行：npx tsx scripts/build-loyalty-merchant-spu-tree-presets.mjs
 */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  MERCHANT_COMPLEMENT_SPU_TREE_ITEM_FIELDS,
  MERCHANT_SIMILAR_SPU_TREE_ITEM_FIELDS,
  MERCHANT_SPU_TREE_PARENT_COUNT,
} from "../src/lib/loyaltyMerchantSpuTreePresetSeed.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "data", "scene-collection-presets", "loyalty-merchant-admin");

const base = {
  schemaVersion: "1.0.0",
  dataSourceKind: "builtin",
  builtinCatalog: "products",
  fixedLength: MERCHANT_SPU_TREE_PARENT_COUNT,
  minItems: MERCHANT_SPU_TREE_PARENT_COUNT,
  maxItems: MERCHANT_SPU_TREE_PARENT_COUNT,
  productConfig: {
    rowGranularity: "spu",
    rangeMode: "allProducts",
    productSelectionScope: "spuOnly",
  },
  seedValues: [],
};

writeFileSync(
  join(OUT_DIR, "similar-spu-list.json"),
  `${JSON.stringify(
    {
      ...base,
      presetId: "loyalty-merchant-similar-spu-list",
      slotId: "loyaltyMerchantSimilarSpuList",
      label: "相似品列表",
      description:
        "双层 SPU 树：通过「选择商品」确定主 SPU，每条下由 mock 生成相似 SPU 子列表（5→4→3→2→1 循环）",
      itemFields: MERCHANT_SIMILAR_SPU_TREE_ITEM_FIELDS,
    },
    null,
    2
  )}\n`,
  "utf8"
);

writeFileSync(
  join(OUT_DIR, "complement-spu-list.json"),
  `${JSON.stringify(
    {
      ...base,
      presetId: "loyalty-merchant-complement-spu-list",
      slotId: "loyaltyMerchantComplementSpuList",
      label: "搭配品列表",
      description:
        "双层 SPU 树：通过「选择商品」确定主 SPU，每条下由 mock 生成搭配 SPU 子列表（5→4→3→2→1 循环）",
      itemFields: MERCHANT_COMPLEMENT_SPU_TREE_ITEM_FIELDS,
    },
    null,
    2
  )}\n`,
  "utf8"
);

console.log("已写入 similar-spu-list.json、complement-spu-list.json（builtin + 空 seedValues）");
