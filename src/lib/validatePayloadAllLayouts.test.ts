import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailPayload, EmailTemplate } from "../types/email";
import { validatePayloadAgainstAllLayoutTemplates } from "./validatePayloadAllLayouts";

describe("validatePayloadAgainstAllLayoutTemplates", () => {
  it("为每个版式前缀 layout:id", () => {
    const payload: EmailPayload = { schemaVersion: "1.0.0", slots: {}, values: { orphan: "x" } };
    const tpl: EmailTemplate = {
      schemaVersion: "1.0.0",
      templateId: "t",
      templateVersion: 1,
      rootBlockId: "root",
      blocks: { root: { id: "root", type: "layout", children: [] } },
      bindings: {},
    };
    const issues = validatePayloadAgainstAllLayoutTemplates(payload, [
      { layoutVariantId: "card", template: tpl },
      { layoutVariantId: "centered", template: tpl },
    ]);
    assert.ok(issues.some((i) => i.path.startsWith("layout:card/")));
    assert.ok(issues.some((i) => i.path.startsWith("layout:centered/")));
  });
});
