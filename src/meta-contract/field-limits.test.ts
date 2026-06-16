import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  META_DELIVERY_PREHEADER_MAX_LENGTH,
  META_DELIVERY_SUBJECT_MAX_LENGTH,
  META_DESCRIPTION_MAX_LENGTH,
  META_DISPLAY_NAME_MAX_LENGTH,
} from "./field-limits";
import { validateEmailMeta } from "./validate";

const baseMeta = {
  schemaVersion: "1.0.0",
  publishStatus: "draft",
  displayName: "示例模板",
} as const;

describe("validateEmailMeta field limits", () => {
  it("displayName 超过上限时报错", () => {
    const issues = validateEmailMeta({
      ...baseMeta,
      displayName: "x".repeat(META_DISPLAY_NAME_MAX_LENGTH + 1),
    });
    assert.ok(issues.some((issue) => issue.path === "displayName"));
  });

  it("description 超过上限时报错", () => {
    const issues = validateEmailMeta({
      ...baseMeta,
      description: "x".repeat(META_DESCRIPTION_MAX_LENGTH + 1),
    });
    assert.ok(issues.some((issue) => issue.path === "description"));
  });

  it("delivery.subject / preheader 超过上限时报错", () => {
    const issues = validateEmailMeta({
      ...baseMeta,
      delivery: {
        subject: "x".repeat(META_DELIVERY_SUBJECT_MAX_LENGTH + 1),
        preheader: "y".repeat(META_DELIVERY_PREHEADER_MAX_LENGTH + 1),
      },
    });
    assert.ok(issues.some((issue) => issue.path === "delivery.subject"));
    assert.ok(issues.some((issue) => issue.path === "delivery.preheader"));
  });

  it("合法长度通过校验", () => {
    const issues = validateEmailMeta({
      ...baseMeta,
      description: "x".repeat(META_DESCRIPTION_MAX_LENGTH),
      delivery: {
        subject: "x".repeat(META_DELIVERY_SUBJECT_MAX_LENGTH),
        preheader: "y".repeat(META_DELIVERY_PREHEADER_MAX_LENGTH),
      },
    });
    assert.equal(issues.length, 0);
  });
});
