import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailPayload } from "../types/email";
import {
  getDirtyPayloadSlotDraftIds,
  isPayloadSlotDraftDirty,
  seedCollectionSlotDraft,
} from "./payloadSlotDraft";

describe("payloadSlotDraft", () => {
  it("仅会话缓存（与已提交值一致）不算脏", () => {
    const payload: EmailPayload = {
      schemaVersion: "1.0.0",
      slots: {
        benefits: {
          label: "权益",
          valueType: "collection" as const,
          minItems: 2,
          maxItems: 2,
          dataSource: { type: "custom" as const },
        },
      },
      values: { benefits: [{ title: "a" }, { title: "b" }] },
    };
    const itemFields = [{ key: "title", label: "标题", valueType: "string" as const }];
    const draft = seedCollectionSlotDraft(payload, "benefits", itemFields);

    assert.equal(isPayloadSlotDraftDirty(payload, "benefits", draft), false);
    assert.deepEqual(getDirtyPayloadSlotDraftIds(payload, { benefits: draft }), []);
    assert.ok(draft.collectionSources?.custom?.jsonPaste?.includes('"title": "a"'));
    assert.equal(draft.collectionFieldMap?.title, "title");
    assert.equal(draft.collectionSources?.builtin?.catalog, "products");
  });

  it("已废弃 http 数据源在 seed 时归一为 custom", () => {
    const payload: EmailPayload = {
      schemaVersion: "1.0.0",
      slots: {
        benefits: {
          label: "权益",
          valueType: "collection" as const,
          minItems: 1,
          maxItems: 1,
          dataSource: {
            type: "remote" as const,
            provider: "http" as const,
            url: "https://api.example.com/items",
            sampleResponseJson: '[{"title":"from-api"}]',
          } as unknown as EmailPayload["slots"][string]["dataSource"],
        },
      },
      values: { benefits: [{ title: "a" }] },
    };
    const itemFields = [{ key: "title", label: "标题", valueType: "string" as const }];
    const draft = seedCollectionSlotDraft(payload, "benefits", itemFields);

    assert.equal(draft.activeCollectionSource, "custom");
    assert.equal(draft.slotDefPatch?.dataSource?.type, "custom");
    assert.ok(draft.collectionSources?.custom?.jsonPaste?.includes('"title": "a"'));
  });

  it("修改赋值后算脏", () => {
    const payload: EmailPayload = {
      schemaVersion: "1.0.0",
      slots: { name: { label: "名称", valueType: "string" as const } },
      values: { name: "旧值" },
    };
    const draft = { value: "新值" };
    assert.equal(isPayloadSlotDraftDirty(payload, "name", draft), true);
  });
});
