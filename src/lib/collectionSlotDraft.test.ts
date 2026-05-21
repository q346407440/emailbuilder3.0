import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  draftToCollectionSnapshot,
  patchCollectionDraftSnapshot,
  switchCollectionDataSourceDraft,
} from "./collectionSlotDraft";
import { seedCollectionSlotDraft } from "./payloadSlotDraft";

const basePayload = {
  schemaVersion: "1.0.0" as const,
  slots: {},
  values: {},
};

describe("collectionSlotDraft", () => {
  it("切换数据源不抛错且更新 activeCollectionSource", () => {
    const payload = {
      ...basePayload,
      slots: {
        benefits: {
          valueType: "collection" as const,
          label: "权益",
          minItems: 3,
          maxItems: 3,
          dataSource: { type: "custom" as const },
        },
      },
      values: { benefits: [{ title: "a" }, { title: "b" }, { title: "c" }] },
    };
    const itemFields = [{ key: "title", label: "标题", valueType: "string" as const }];
    const draft = seedCollectionSlotDraft(payload, "benefits", itemFields);
    const snapshot = draftToCollectionSnapshot(draft, itemFields, payload.values.benefits);

    const builtin = switchCollectionDataSourceDraft(
      draft,
      snapshot,
      "builtin",
      itemFields,
      payload,
      "benefits"
    );
    assert.equal(builtin.activeCollectionSource, "builtin");
    assert.equal(builtin.slotDefPatch?.dataSource?.type, "remote");

    const back = switchCollectionDataSourceDraft(
      builtin,
      draftToCollectionSnapshot(builtin, itemFields, payload.values.benefits),
      "custom",
      itemFields,
      payload,
      "benefits"
    );
    assert.equal(back.activeCollectionSource, "custom");
    assert.deepEqual(
      (back.value as { title: string }[]).map((r) => r.title),
      ["a", "b", "c"]
    );
  });

  it("切换数据源时各自缓存 fieldMap", () => {
    const payload = {
      ...basePayload,
      slots: {
        benefits: {
          valueType: "collection" as const,
          label: "权益",
          minItems: 1,
          maxItems: 1,
          dataSource: { type: "custom" as const },
        },
      },
      values: { benefits: [{ title: "a" }] },
    };
    const itemFields = [{ key: "title", label: "标题", valueType: "string" as const }];
    let draft = seedCollectionSlotDraft(payload, "benefits", itemFields);
    draft = { ...draft, collectionFieldMap: { title: "title" } };
    const snapshot = draftToCollectionSnapshot(draft, itemFields, payload.values.benefits);

    const builtin = switchCollectionDataSourceDraft(
      draft,
      snapshot,
      "builtin",
      itemFields,
      payload,
      "benefits"
    );
    const builtinSnapshot = draftToCollectionSnapshot(builtin, itemFields, payload.values.benefits);
    const builtinWithMap = patchCollectionDraftSnapshot(
      { ...builtin, collectionFieldMap: { title: "name" } },
      builtinSnapshot
    );

    const back = switchCollectionDataSourceDraft(
      builtinWithMap,
      draftToCollectionSnapshot(builtinWithMap, itemFields, payload.values.benefits),
      "custom",
      itemFields,
      payload,
      "benefits"
    );
    assert.deepEqual(back.collectionFieldMap, { title: "title" });
    assert.deepEqual(back.collectionSources?.builtin?.fieldMap, { title: "name" });
  });
});
