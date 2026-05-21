import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emailDataSyncEditorSnapshot, shouldShowEmailDataSyncToast } from "./emailDataSyncToast";

describe("emailDataSyncToast", () => {
  it("无差异不提示", () => {
    const snap = emailDataSyncEditorSnapshot({
      template: null,
      payload: null,
      tokenPresets: null,
    });
    assert.equal(
      shouldShowEmailDataSyncToast({ reason: "filesystem", beforeSnapshot: snap, afterSnapshot: snap }),
      false
    );
  });

  it("api_write 有差异也不提示", () => {
    assert.equal(
      shouldShowEmailDataSyncToast({
        reason: "api_write",
        beforeSnapshot: "a",
        afterSnapshot: "b",
      }),
      false
    );
  });

  it("filesystem 有差异时提示", () => {
    assert.equal(
      shouldShowEmailDataSyncToast({
        reason: "filesystem",
        beforeSnapshot: "a",
        afterSnapshot: "b",
      }),
      true
    );
  });
});
