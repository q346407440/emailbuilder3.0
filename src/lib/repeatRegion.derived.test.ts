import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { collectionItemCount } from "./repeatRegion";
import { resolveCollectionForContext, applyBuiltinCollectionResolves } from "./resolveBuiltinCollectionItems";
import { isTargetDerivedCollection } from "./derivedCollectionResolve";
import type { EmailPayload, RepeatRegionBinding } from "../types/email";

describe("派生列表 Step 2 + Step 3", () => {
  const itemFields = [
    { key: "name", label: "名", valueType: "string" as const, required: true },
    { key: "href", label: "链", valueType: "url" as const, required: true },
  ];

  function samplePayload(): EmailPayload {
    return {
      schemaVersion: "1.0.0",
      slots: {
        listA: {
          label: "A",
          valueType: "collection",
          itemFields,
          minItems: 2,
          maxItems: 2,
          dataSource: {
            type: "remote",
            provider: "builtin",
            catalog: "products",
            sort: "catalogOrder",
          },
        },
        listB: {
          label: "B",
          valueType: "collection",
          itemFields,
          minItems: 2,
          maxItems: 2,
          dataSource: {
            type: "remote",
            provider: "builtin",
            catalog: "products",
            sort: { strategy: "similarTo", targetSlotId: "listA" },
          },
        },
      },
      values: {
        listA: [
          {
            name: "Aura 无线耳机",
            href: "https://example.com/products/aura-earbuds",
          },
          {
            name: "Pulse 智能手表",
            href: "https://example.com/products/pulse-watch",
          },
        ],
        listB: [],
      },
    };
  }

  it("isTargetDerivedCollection 识别 B→A", () => {
    const payload = samplePayload();
    assert.equal(isTargetDerivedCollection("listB", "listA", payload), true);
    assert.equal(isTargetDerivedCollection("listB", "listB", payload), false);
  });

  it("resolveCollectionForContext 随 anchorRow 变化", () => {
    const payload = samplePayload();
    const listA = payload.values.listA as Record<string, unknown>[];
    const a0 = listA[0]!;
    const a1 = listA[1]!;
    const r0 = resolveCollectionForContext("listB", payload, { anchorRow: a0 });
    const r1 = resolveCollectionForContext("listB", payload, { anchorRow: a1 });
    assert.equal(r0.ok, true);
    assert.equal(r1.ok, true);
    if (!r0.ok || !r1.ok) return;
    assert.equal(r0.items[0]?.name, "相似品");
    assert.equal(r1.items[0]?.name, "相似品");
    assert.notDeepEqual(
      r0.items.map((row) => row.href),
      r1.items.map((row) => row.href)
    );
  });

  it("collectionItemCount 在 repeat 上下文下 per-row 重算", () => {
    const payload = applyBuiltinCollectionResolves(samplePayload());
    const repeatB: RepeatRegionBinding = {
      mode: "collection",
      slotId: "listB",
      prototypeChildIds: ["inner"],
      fallbackChildIds: ["inner"],
      itemFields,
      minItems: 1,
      maxItems: 2,
    };
    const listA = payload.values.listA as Record<string, unknown>[];
    const ctx0 = [
      {
        slotId: "listA",
        itemIndex: 0,
        item: listA[0]!,
        itemPath: "0",
      },
    ];
    assert.ok(collectionItemCount(payload, repeatB, ctx0) >= 1);
    assert.ok(collectionItemCount(payload, repeatB, []) >= 1);
  });
});
