import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailTemplate } from "../types/email";
import { MINIMAL_TEXT_PROPS } from "./testFixtures/emailTemplate";
import { REMOVED_REL_PARENT_ALIGN_KEY } from "../render-defaults-contract/forbiddenWrapperStyleKeys";
import { normalizeEmailRootBlock } from "./normalizeEmailRoot";
import { validateTemplate } from "./validate";

function buildTemplate(rootProps: Record<string, unknown>): EmailTemplate {
  return {
    schemaVersion: "4.0.0",
    templateId: "root-font-test",
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
        props: rootProps,
        bindings: {},
      },
      "text-1": {
        id: "text-1",
        type: "text",
        parentId: "root",
        children: [],
        wrapperStyle: {
          widthMode: "fill",
          heightMode: "hug",
          contentAlign: { horizontal: "center", vertical: "top" },
        },
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

describe("normalizeEmailRootBlock", () => {
  it("规范化后剥离 outerBackgroundColor（画布外侧灰底为项目固定色）", () => {
    const normalized = normalizeEmailRootBlock(
      buildTemplate({
        width: "600px",
        outerBackgroundColor: "#f5f5f5",
        backgroundColor: "#ffffff",
        padding: { mode: "unified", unified: "0" },
        border: { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" },
        gapMode: "fixed",
        gap: "0",
      })
    );
    const rootProps = normalized.blocks.root.props as Record<string, unknown>;
    assert.equal("outerBackgroundColor" in rootProps, false);
  });

  it("规范化后不写入画布根遗留字段", () => {
    const normalized = normalizeEmailRootBlock(
      buildTemplate({
        width: "600px",
        backgroundColor: "#ffffff",
        legacyRootKey: "removed",
        padding: { mode: "unified", unified: "0" },
        border: { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" },
        gapMode: "fixed",
        gap: "0",
      })
    );
    const rootProps = normalized.blocks.root.props as Record<string, unknown>;
    assert.equal("legacyRootKey" in rootProps, false);
    assert.equal(rootProps.width, "600px");
  });

  it("validateTemplate 拒绝 wrapperStyle 非法对齐字段", () => {
    const t = buildTemplate({
      width: "600px",
      backgroundColor: "#ffffff",
      padding: { mode: "unified", unified: "0" },
      border: { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" },
      gapMode: "fixed",
      gap: "0",
    });
    t.blocks["text-1"].wrapperStyle = {
      widthMode: "fill",
      heightMode: "hug",
      [REMOVED_REL_PARENT_ALIGN_KEY]: { horizontal: "center", vertical: "start" },
      contentAlign: { horizontal: "left", vertical: "top" },
    };
    const issues = validateTemplate(t);
    assert.ok(
      issues.some(
        (i) =>
          i.path === `blocks.text-1.wrapperStyle.${REMOVED_REL_PARENT_ALIGN_KEY}` &&
          i.reason.includes("不符合规范")
      )
    );
  });

  it("validateTemplate 拒绝 wrapperStyle.selfAlign", () => {
    const t = buildTemplate({
      width: "600px",
      backgroundColor: "#ffffff",
      padding: { mode: "unified", unified: "0" },
      border: { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" },
      gapMode: "fixed",
      gap: "0",
    });
    t.blocks.root.wrapperStyle = {
      widthMode: "fill",
      heightMode: "hug",
      selfAlign: { horizontal: "right" },
    };
    const issues = validateTemplate(t);
    assert.ok(
      issues.some(
        (i) =>
          i.path === "blocks.root.wrapperStyle.selfAlign" &&
          i.reason.includes("contentAlign")
      )
    );
  });

  it("separate padding 各边的 $themeRef 不被改写为 0", () => {
    const pageInlineRef = { $themeRef: "tokens.spacing.pageInline" };
    const normalized = normalizeEmailRootBlock(
      buildTemplate({
        width: "600px",
        backgroundColor: "#ffffff",
        padding: {
          mode: "separate",
          top: "0",
          right: pageInlineRef,
          bottom: "0",
          left: pageInlineRef,
        },
        border: { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" },
        gapMode: "fixed",
        gap: { $themeRef: "tokens.spacing.gap" },
      })
    );
    const rootProps = normalized.blocks.root.props as Record<string, unknown>;
    const padding = rootProps.padding as Record<string, unknown>;
    assert.deepEqual(padding.right, pageInlineRef);
    assert.deepEqual(padding.left, pageInlineRef);
    assert.deepEqual(rootProps.gap, { $themeRef: "tokens.spacing.gap" });
  });

  it("保留 JSON 中的非规范宽度（不由规范化静默改写），以便校验与 Inspector 黄条提示", () => {
    const normalized = normalizeEmailRootBlock(
      buildTemplate({
        width: "580px",
        backgroundColor: "#ffffff",
        padding: { mode: "unified", unified: "0" },
        border: { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" },
        gapMode: "fixed",
        gap: "0",
      })
    );
    const rootProps = normalized.blocks.root.props as Record<string, unknown>;
    assert.equal(rootProps.width, "580px");
  });

  it("画布根 width 偏离真源时 validateTemplate 命中 props.width", () => {
    const issues = validateTemplate(
      buildTemplate({
        width: "580px",
        backgroundColor: "#ffffff",
        padding: { mode: "unified", unified: "0" },
        border: { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" },
        gapMode: "fixed",
        gap: "0",
      })
    );
    assert.ok(issues.some((i) => i.path === "blocks.root.props.width"));
  });
});

describe("validateTemplate · 废弃根遗留字段与 fontMode", () => {
  it("画布根存在 outerBackgroundColor 时报错", () => {
    const issues = validateTemplate(
      buildTemplate({
        width: "600px",
        outerBackgroundColor: "#f5f5f5",
        backgroundColor: "#ffffff",
        padding: { mode: "unified", unified: "0" },
        border: { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" },
        gapMode: "fixed",
        gap: "0",
      })
    );
    assert.equal(
      issues.some((issue) => issue.path === "blocks.root.props.outerBackgroundColor"),
      true
    );
  });

  it("画布根存在非白名单 props 时报错", () => {
    const issues = validateTemplate(
      buildTemplate({
        width: "600px",
        backgroundColor: "#ffffff",
        legacyRootKey: "x",
        padding: { mode: "unified", unified: "0" },
        border: { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" },
        gapMode: "fixed",
        gap: "0",
      })
    );
    assert.ok(
      issues.some((issue) => issue.path === "blocks.root.props.legacyRootKey")
    );
  });

  it("text.fontMode 时报错", () => {
    const t = buildTemplate({
      width: "600px",
      backgroundColor: "#ffffff",
      padding: { mode: "unified", unified: "0" },
      border: { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" },
      gapMode: "fixed",
      gap: "0",
    });
    const text = t.blocks["text-1"];
    (text.props as Record<string, unknown>).fontMode = "inherit";
    const issues = validateTemplate(t);
    assert.equal(
      issues.some((issue) => issue.path === "blocks.text-1.props.fontMode"),
      true
    );
  });
});
