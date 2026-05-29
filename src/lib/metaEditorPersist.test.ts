import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizePersistedEmailMeta } from "../meta-contract/normalize";
import { buildMetaEditorPersistPatch } from "./metaEditorPersist";

describe("normalizePersistedEmailMeta", () => {
  it("移除 status、supersededBy、campaignTag 等已下线字段", () => {
    const out = normalizePersistedEmailMeta({
      displayName: "x",
      status: "draft",
      supersededBy: "other",
      owner: "alice",
      designSource: { type: "figma", url: "u" },
      delivery: {
        subject: "s",
        campaignTag: "engagement_q2",
        senderName: "n",
        senderEmail: "a@b.c",
      },
    });
    assert.equal(out.displayName, "x");
    assert.equal("status" in out, false);
    assert.equal("supersededBy" in out, false);
    assert.deepEqual(out.delivery, { subject: "s" });
  });
});

describe("buildMetaEditorPersistPatch", () => {
  it("仅包含编辑器维护字段", () => {
    const patch = buildMetaEditorPersistPatch({
      displayName: "名",
      description: "",
      subject: "主题",
      preheader: "",
    });
    assert.equal(patch.displayName, "名");
    assert.deepEqual(patch.delivery, {
      subject: "主题",
      preheader: "",
    });
    assert.equal("status" in patch, false);
    assert.equal("campaignTag" in (patch.delivery ?? {}), false);
  });
});
