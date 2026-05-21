import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validatePayloadSlotDefinition } from "./validate";

describe("collection-builtin-sort 契约校验", () => {
  it("builtin dataSource.sort 非法值应失败", () => {
    const issues = validatePayloadSlotDefinition("slots.items", {
      label: "列表",
      valueType: "collection",
      minItems: 1,
      maxItems: 3,
      itemFields: [{ key: "title", label: "标题", valueType: "string" }],
      dataSource: {
        type: "remote",
        provider: "builtin",
        catalog: "products",
        sort: "byMagic",
      },
    });
    assert.ok(issues.some((i) => i.path.includes("sort")));
  });
});
