import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailPayload, EmailTemplate } from "../types/email";
import { collectPersistValidationIssues } from "./persistValidation";
import { validateTemplate } from "./validate";

const emptyPayload: EmailPayload = { schemaVersion: "1.0.0", slots: {}, values: {} };

function layoutWithEmptyBackgroundSrc(): EmailTemplate {
  return {
    schemaVersion: "4.0.0",
    templateId: "test-template",
    templateVersion: 1,
    rootBlockId: "root",
    blocks: {
      root: {
        id: "root",
        type: "emailRoot",
        parentId: null,
        children: ["layout-1"],
        wrapperStyle: { widthMode: "fill", heightMode: "hug" },
        props: {
          width: "600px",
          backgroundColor: "#ffffff",
          padding: { top: "0", right: "0", bottom: "0", left: "0" },
          border: { style: "solid", color: "rgba(0,0,0,0)", top: "0", right: "0", bottom: "0", left: "0" },
          gapMode: "fixed",
          gap: "0",
        },
        bindings: {},
      },
      "layout-1": {
        id: "layout-1",
        type: "layout",
        parentId: "root",
        children: [],
        wrapperStyle: {
          widthMode: "fill",
          heightMode: "hug",
          backgroundImage: {
            src: "",
            fit: "cover",
            position: "center",
          },
        },
        props: {
          direction: "vertical",
          gapMode: "fixed",
          gap: "0",
        },
        bindings: {},
      },
    },
  };
}

describe("collectPersistValidationIssues", () => {
  it("payloadOnly：跳过 validateTemplate（如 layout 背景图 src 为空）", () => {
    const template = layoutWithEmptyBackgroundSrc();
    const templateIssues = validateTemplate(template);
    assert.ok(
      templateIssues.some((i) => i.path === "blocks.layout-1.wrapperStyle.backgroundImage.src")
    );

    const issues = collectPersistValidationIssues(template, emptyPayload, { payloadOnly: true });
    assert.equal(
      issues.some((i) => i.path === "blocks.layout-1.wrapperStyle.backgroundImage.src"),
      false
    );
  });

  it("完整落盘：仍包含 validateTemplate 项", () => {
    const template = layoutWithEmptyBackgroundSrc();
    const issues = collectPersistValidationIssues(template, emptyPayload);
    assert.ok(
      issues.some((i) => i.path === "blocks.layout-1.wrapperStyle.backgroundImage.src")
    );
  });
});
