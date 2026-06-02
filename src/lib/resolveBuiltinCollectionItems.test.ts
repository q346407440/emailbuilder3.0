import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyBuiltinCollectionResolves } from "./resolveBuiltinCollectionItems";

describe("applyBuiltinCollectionResolves", () => {
  it("先解析锚点槽再解析 similarTo 衍生槽", () => {
    const itemFields = [
      { key: "name", label: "名", valueType: "string" as const, required: true },
      { key: "href", label: "链", valueType: "url" as const, required: true },
    ];
    const payload = {
      schemaVersion: "1.0.0" as const,
      slots: {
        pickedSpotlightProduct: {
          label: "主推",
          valueType: "collection" as const,
          itemFields,
          minItems: 1,
          maxItems: 1,
          dataSource: {
            type: "remote" as const,
            provider: "builtin" as const,
            catalog: "products" as const,
            sort: "catalogOrder" as const,
          },
        },
        pickedProducts: {
          label: "精选",
          valueType: "collection" as const,
          itemFields,
          minItems: 2,
          maxItems: 2,
          dataSource: {
            type: "remote" as const,
            provider: "builtin" as const,
            catalog: "products" as const,
            sort: {
              strategy: "similarTo" as const,
              targetSlotId: "pickedSpotlightProduct",
            },
          },
        },
      },
      values: {},
    };
    const next = applyBuiltinCollectionResolves(payload);
    const spotlight = next.values.pickedSpotlightProduct as { href: string }[];
    const picked = next.values.pickedProducts as { href: string }[];
    assert.equal(spotlight[0]?.href, "https://example.com/products/aura-earbuds");
    assert.equal(picked.length, 2);
    assert.ok(picked.every((r) => r.href !== spotlight[0]?.href));
  });

  it("builtin 主列表预览保留 payload 中已显式写入的嵌套子列表值", () => {
    const payload = {
      schemaVersion: "1.0.0" as const,
      slots: {
        pickedSpotlightProduct: {
          label: "主推",
          valueType: "collection" as const,
          itemFields: [
            { key: "href", label: "链", valueType: "url" as const, required: true },
            { key: "name", label: "名", valueType: "string" as const, required: true },
            {
              key: "skus",
              label: "SKU 列表",
              valueType: "collection" as const,
              itemFields: [
                { key: "title", label: "规格", valueType: "string" as const, required: true },
                { key: "href", label: "规格链", valueType: "url" as const, required: true },
              ],
              minItems: 0,
              maxItems: 5,
            },
          ],
          minItems: 2,
          maxItems: 2,
          dataSource: {
            type: "remote" as const,
            provider: "builtin" as const,
            catalog: "products" as const,
            sort: "catalogOrder" as const,
          },
        },
      },
      values: {
        pickedSpotlightProduct: [
          {
            href: "https://example.com/products/aura-earbuds",
            name: "Aura 无线耳机",
            skus: [
              {
                title: "自定义黑色",
                href: "https://example.com/products/aura-earbuds?variant=custom-black",
              },
            ],
          },
          {
            href: "https://example.com/products/pulse-watch",
            name: "Pulse 智能手表",
            skus: [],
          },
        ],
      },
    };

    const next = applyBuiltinCollectionResolves(payload);
    const rows = next.values.pickedSpotlightProduct as Array<{
      href: string;
      skus: Array<{ title: string; href: string }>;
    }>;

    assert.equal(rows.length, 2);
    assert.deepEqual(rows[0]?.skus, [
      {
        title: "自定义黑色",
        href: "https://example.com/products/aura-earbuds?variant=custom-black",
      },
    ]);
    assert.deepEqual(rows[1]?.skus, []);
  });
});
