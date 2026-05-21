import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validatePayloadShape } from "./validate";

describe("collection-builtin-extract 契约校验", () => {
  it("similarTo 须引用已存在的 collection 槽", () => {
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
            extract: { kind: "similarTo", fromSlotId: "missing" },
          },
        },
      },
      values: {},
    });
    assert.ok(
      issues.some((i) => i.path.includes("fromSlotId") && i.reason.includes("不存在"))
    );
  });

  it("similarTo 不能依赖自身", () => {
    const issues = validatePayloadShape({
      schemaVersion: "1.0.0",
      slots: {
        loop: {
          label: "环",
          valueType: "collection",
          itemFields: [{ key: "name", label: "名", valueType: "string" }],
          dataSource: {
            type: "remote",
            provider: "builtin",
            catalog: "products",
            extract: { kind: "similarTo", fromSlotId: "loop" },
          },
        },
      },
      values: {},
    });
    assert.ok(issues.some((i) => i.reason.includes("不能依赖自身")));
  });
});
