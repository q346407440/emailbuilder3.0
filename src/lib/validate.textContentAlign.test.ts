import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailTemplate } from "../types/email";
import { MINIMAL_TEXT_PROPS } from "./testFixtures/emailTemplate";
import { validateTemplate } from "./validate";

function buildTemplate(contentAlign: unknown): EmailTemplate {
  const wrapperStyle: Record<string, unknown> = {
    widthMode: "fill",
    heightMode: "hug",
  };
  if (contentAlign !== "__missing__") {
    wrapperStyle.contentAlign = contentAlign;
  }

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
        children: ["text-1"],
        wrapperStyle: {
          widthMode: "fill",
          heightMode: "hug",
        },
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
      "text-1": {
        id: "text-1",
        type: "text",
        parentId: "root",
        children: [],
        wrapperStyle: wrapperStyle as EmailTemplate["blocks"][string]["wrapperStyle"],
        props: {
          ...MINIMAL_TEXT_PROPS,
          textBody: {
            paragraphs: [{ runs: [{ text: "Hello" }] }],
          },
        },
        bindings: {},
      },
    },
  };
}

function hasIssue(issues: Array<{ path: string; reason: string }>, path: string): boolean {
  return issues.some((issue) => issue.path === path);
}

describe("validateTemplate · text contentAlign", () => {
  it("缺失 contentAlign 时命中必填校验", () => {
    const issues = validateTemplate(buildTemplate("__missing__"));
    assert.equal(hasIssue(issues, "blocks.text-1.wrapperStyle.contentAlign"), true);
  });

  it("contentAlign.horizontal 为空时命中必填校验", () => {
    const issues = validateTemplate(buildTemplate({ vertical: "top" }));
    assert.equal(hasIssue(issues, "blocks.text-1.wrapperStyle.contentAlign.horizontal"), true);
  });

  it("contentAlign.horizontal 非法值时命中枚举校验", () => {
    const issues = validateTemplate(buildTemplate({ horizontal: "justify", vertical: "top" }));
    assert.equal(hasIssue(issues, "blocks.text-1.wrapperStyle.contentAlign.horizontal"), true);
  });

  it("contentAlign.horizontal 合法时通过该项校验", () => {
    const issues = validateTemplate(buildTemplate({ horizontal: "center", vertical: "top" }));
    assert.equal(hasIssue(issues, "blocks.text-1.wrapperStyle.contentAlign"), false);
    assert.equal(hasIssue(issues, "blocks.text-1.wrapperStyle.contentAlign.horizontal"), false);
  });
});
