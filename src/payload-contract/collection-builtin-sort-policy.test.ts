import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validatePayloadShape } from "./validate";

describe("collection-builtin-sort-policy 契约校验", () => {
  it("similarTo 排序策略已禁止持久化", () => {
    const issues = validatePayloadShape({
      schemaVersion: "1.0.0",
      slots: {
        main: {
          label: "主",
          valueType: "collection",
          itemFields: [{ key: "name", label: "名", valueType: "string" }],
          dataSource: { type: "custom" },
        },
        derived: {
          label: "衍生",
          valueType: "collection",
          itemFields: [{ key: "name", label: "名", valueType: "string" }],
          dataSource: {
            type: "remote",
            provider: "builtin",
            catalog: "products",
            sort: { strategy: "similarTo", targetSlotId: "main" },
          },
        },
      },
      values: {},
    });
    assert.ok(
      issues.some((i) => i.path.includes("sort.strategy") && i.reason.includes("相似品/搭配品排序已移除"))
    );
  });

  it("complement 排序策略已禁止持久化", () => {
    const issues = validatePayloadShape({
      schemaVersion: "1.0.0",
      slots: {
        main: {
          label: "主",
          valueType: "collection",
          itemFields: [{ key: "name", label: "名", valueType: "string" }],
          dataSource: {
            type: "remote",
            provider: "builtin",
            catalog: "products",
            sort: "catalogOrder",
          },
        },
        derived: {
          label: "衍生",
          valueType: "collection",
          itemFields: [{ key: "name", label: "名", valueType: "string" }],
          dataSource: {
            type: "remote",
            provider: "builtin",
            catalog: "products",
            sort: { strategy: "complement", targetSlotId: "main" },
          },
        },
      },
      values: {},
    });
    assert.ok(
      issues.some((i) => i.path.includes("sort.strategy") && i.reason.includes("相似品/搭配品排序已移除"))
    );
  });

  it("dataSource.extract 禁止持久化", () => {
    const issues = validatePayloadShape({
      schemaVersion: "1.0.0",
      slots: {
        pickedProducts: {
          label: "精选",
          valueType: "collection",
          itemFields: [{ key: "name", label: "名", valueType: "string" }],
          dataSource: {
            type: "remote",
            provider: "builtin",
            catalog: "products",
            extract: { kind: "similarTo", fromSlotId: "main", matchField: "href" },
          },
        },
      },
      values: {},
    });
    assert.ok(issues.some((i) => i.path.endsWith(".extract") && i.reason.includes("禁止持久化")));
  });
});
