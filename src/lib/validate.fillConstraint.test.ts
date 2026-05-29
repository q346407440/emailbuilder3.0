import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailTemplate, WrapperHeightMode, WrapperWidthMode } from "../types/email";
import { validateTemplate } from "./validate";

function buildTemplateForFillConstraint(opts: {
  parentDirection: "horizontal" | "vertical";
  parentWidthMode: WrapperWidthMode;
  parentHeightMode: WrapperHeightMode;
  childWidthMode: WrapperWidthMode;
  childHeightMode: WrapperHeightMode;
}): EmailTemplate {
  return {
    schemaVersion: "3.0.0",
    templateId: "test-template",
    templateVersion: 1,
    rootBlockId: "root",
    blocks: {
      root: {
        id: "root",
        type: "emailRoot",
        parentId: null,
        children: ["parent"],
        wrapperStyle: {
          widthMode: "fill",
          heightMode: "hug",
        },
        props: {
          width: "600px",
          backgroundColor: "#ffffff",
          padding: { mode: "unified", unified: "0" },
          border: { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" },
          gapMode: "fixed",
          gap: "0",
        },
        bindings: {},
      },
      parent: {
        id: "parent",
        type: "layout",
        parentId: "root",
        children: ["child"],
        wrapperStyle: {
          widthMode: opts.parentWidthMode,
          heightMode: opts.parentHeightMode,
          contentAlign: { horizontal: "left", vertical: "top" },
        },
        props: {
          direction: opts.parentDirection,
          gap: "0",
        },
        bindings: {},
      },
      child: {
        id: "child",
        type: "layout",
        parentId: "parent",
        children: [],
        wrapperStyle: {
          widthMode: opts.childWidthMode,
          heightMode: opts.childHeightMode,
          contentAlign: { horizontal: "left", vertical: "top" },
        },
        props: {
          direction: "vertical",
          gap: "0",
        },
        bindings: {},
      },
    },
  };
}

function hasIssue(issues: Array<{ path: string; reason: string }>, path: string): boolean {
  return issues.some((issue) => issue.path === path);
}

describe("validateTemplate · 宽度轴 fill 约束", () => {
  it("父横向 + 父宽 hug + 子宽 fill => 命中校验", () => {
    const template = buildTemplateForFillConstraint({
      parentDirection: "horizontal",
      parentWidthMode: "hug",
      parentHeightMode: "fill",
      childWidthMode: "fill",
      childHeightMode: "hug",
    });
    const issues = validateTemplate(template);
    assert.equal(hasIssue(issues, "blocks.child.wrapperStyle.widthMode"), true);
  });

  it("父纵向 + 父宽 hug + 子宽 fill => 命中宽度轴校验", () => {
    const template = buildTemplateForFillConstraint({
      parentDirection: "vertical",
      parentWidthMode: "hug",
      parentHeightMode: "fill",
      childWidthMode: "fill",
      childHeightMode: "hug",
    });
    const issues = validateTemplate(template);
    assert.equal(hasIssue(issues, "blocks.child.wrapperStyle.widthMode"), true);
  });

  it("父横向 + 父宽 fill + 子宽 fill => 不命中宽度轴校验", () => {
    const template = buildTemplateForFillConstraint({
      parentDirection: "horizontal",
      parentWidthMode: "fill",
      parentHeightMode: "fill",
      childWidthMode: "fill",
      childHeightMode: "hug",
    });
    const issues = validateTemplate(template);
    assert.equal(hasIssue(issues, "blocks.child.wrapperStyle.widthMode"), false);
  });
});

describe("validateTemplate · 高度轴 fill 约束", () => {
  it("父纵向 + 父高 hug + 子高 fill => 命中校验", () => {
    const template = buildTemplateForFillConstraint({
      parentDirection: "vertical",
      parentWidthMode: "fill",
      parentHeightMode: "hug",
      childWidthMode: "hug",
      childHeightMode: "fill",
    });
    const issues = validateTemplate(template);
    assert.equal(hasIssue(issues, "blocks.child.wrapperStyle.heightMode"), true);
  });

  it("父横向 + 父高 hug + 子高 fill => 不命中高度轴校验", () => {
    const template = buildTemplateForFillConstraint({
      parentDirection: "horizontal",
      parentWidthMode: "fill",
      parentHeightMode: "hug",
      childWidthMode: "hug",
      childHeightMode: "fill",
    });
    const issues = validateTemplate(template);
    assert.equal(hasIssue(issues, "blocks.child.wrapperStyle.heightMode"), false);
  });

  it("父纵向 + 父高 fixed + 子高 fill => 不命中高度轴校验", () => {
    const template = buildTemplateForFillConstraint({
      parentDirection: "vertical",
      parentWidthMode: "fill",
      parentHeightMode: "fixed",
      childWidthMode: "hug",
      childHeightMode: "fill",
    });
    const issues = validateTemplate(template);
    assert.equal(hasIssue(issues, "blocks.child.wrapperStyle.heightMode"), false);
  });
});
