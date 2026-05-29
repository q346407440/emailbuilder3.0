import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizePersistedEmailMeta } from "./normalize";
import { validateEmailMeta } from "./validate";

describe("normalizePersistedEmailMeta", () => {
  it("剥离根级 status、supersededBy、owner、designSource 与 delivery.campaignTag", () => {
    const out = normalizePersistedEmailMeta({
      displayName: "x",
      status: "draft",
      supersededBy: "other",
      owner: "alice",
      designSource: { type: "figma", url: "u" },
      delivery: {
        subject: "s",
        preheader: "p",
        campaignTag: "tag",
        senderName: "n",
        senderEmail: "a@b.c",
      },
    });
    assert.equal(out.displayName, "x");
    assert.equal("status" in out, false);
    assert.equal("supersededBy" in out, false);
    assert.equal("owner" in out, false);
    assert.equal("designSource" in out, false);
    assert.deepEqual(out.delivery, { subject: "s", preheader: "p" });
  });
});

describe("validateEmailMeta", () => {
  it("对已下线字段报错", () => {
    const issues = validateEmailMeta({ displayName: "x", status: "draft" });
    assert.ok(issues.some((i) => i.path === "status"));
  });

  it("合法 meta 无错误", () => {
    assert.deepEqual(
      validateEmailMeta({
        displayName: "名",
        delivery: { subject: "主题" },
      }),
      []
    );
  });
});
