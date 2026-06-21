import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildRepeatPreviewModel } from "../repeat-runtime";
import { prewarmEditorInspectorLookups } from "./editorIdlePrewarm";
import { resolveInspectorPanelTarget } from "./inspectorPanelTarget";
import type { EmailPayload, EmailTemplate } from "../types/email";

describe("prewarmEditorInspectorLookups", () => {
  it("预热常见区块路径解析不抛错", () => {
    const template = {
      schemaVersion: "4.0.0",
      rootBlockId: "root",
      blocks: {
        root: { id: "root", type: "emailRoot", parentId: null, children: ["t1"] },
        t1: { id: "t1", type: "text", parentId: "root", children: [] },
      },
      blockMeta: {},
      bindings: {},
    } as EmailTemplate;
    const payload = { schemaVersion: "1.0.0", slots: {}, values: {} } as EmailPayload;
    const previewModel = buildRepeatPreviewModel(template, payload);

    assert.doesNotThrow(() => prewarmEditorInspectorLookups(template, previewModel));
    assert.equal(resolveInspectorPanelTarget(template, null).kind, "email-root");
  });
});
