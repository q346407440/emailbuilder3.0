# loyalty-merchant-admin 内置列表变量

| 文件 | 名称 | 类型 | 说明 |
|------|------|------|------|
| `product-list.json` | 商品列表 | `builtin` + `products` | 商品范围 / 粒度 / 排序 / 抽取 |
| `album-list.json` | 专辑列表 | `builtin` + `albums` | 专辑多选 / 排序 |
| `similar-spu-list.json` | 相似品列表 | `builtin` + `products` | 与商品列表相同「选择商品」；子列 `similarSpus` 由 mock 按主 SPU 生成 |
| `complement-spu-list.json` | 搭配品列表 | `builtin` + `products` | 同上，子列 `complementSpus` |

子列表 mock 逻辑：`src/lib/loyaltyMerchantSpuTreePresetSeed.ts`。重新生成预设 JSON：`npx tsx scripts/build-loyalty-merchant-spu-tree-presets.mjs`。

通过「创建列表变量 → 场景变量 → loyalty 商家端后台」创建；变量面板不再提供「自定义 / 内置」与「内置目录」切换。
