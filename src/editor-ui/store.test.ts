import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getEditorUiState,
  resetEditorUiState,
  selectBlockInEditorUi,
  setWorkbenchView,
} from "./store.ts";

describe("editor-ui store", () => {
  it("selectBlock 仅在重复选中且 resyncTree 时 bump sync nonce", () => {
    resetEditorUiState();
    selectBlockInEditorUi({ kind: "physical", blockId: "a" });
    assert.equal(getEditorUiState().blockTreeSyncNonce, 0);
    selectBlockInEditorUi({ kind: "physical", blockId: "a" });
    assert.equal(getEditorUiState().blockTreeSyncNonce, 0);
    selectBlockInEditorUi({ kind: "physical", blockId: "a" }, { resyncTree: true });
    assert.equal(getEditorUiState().blockTreeSyncNonce, 1);
    selectBlockInEditorUi({ kind: "physical", blockId: "b" });
    assert.equal(getEditorUiState().selectedBlockRef?.kind, "physical");
    assert.equal(
      getEditorUiState().selectedBlockRef?.kind === "physical"
        ? getEditorUiState().selectedBlockRef?.blockId
        : null,
      "b"
    );
  });

  it("setWorkbenchView 幂等", () => {
    resetEditorUiState();
    setWorkbenchView("payload");
    setWorkbenchView("payload");
    assert.equal(getEditorUiState().workbenchView, "payload");
  });
});
