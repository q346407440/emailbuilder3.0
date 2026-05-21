import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailTemplate } from "../types/email";
import { normalizeEmailRootBlock } from "./normalizeEmailRoot";
import { validateTemplate } from "./validate";

function buildTemplate(rootProps: Record<string, unknown>): EmailTemplate {
  return {
    schemaVersion: "3.0.0",
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
          placement: { horizontal: "center" },
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
          placement: { horizontal: "center" },
          contentAlign: { horizontal: "center", vertical: "top" },
        },
        props: {
          content: "<p>Hello</p>",
          textBody: {
            version: 1,
            paragraphs: [{ runs: [{ text: "Hello" }] }],
          },
          fontFamily: "Arial, sans-serif",
          fontSize: "14px",
          color: "#222222",
          bold: false,
          italic: false,
          decoration: "none",
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

  it("规范化后不写入画布根字体字段", () => {
    const normalized = normalizeEmailRootBlock(
      buildTemplate({
        width: "600px",
        backgroundColor: "#ffffff",
        fontFamily: "Arial, sans-serif",
        headingFontFamily: "Georgia, serif",
        bodyFontFamily: "Arial, sans-serif",
        padding: { mode: "unified", unified: "0" },
        border: { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" },
        gapMode: "fixed",
        gap: "0",
      })
    );
    const rootProps = normalized.blocks.root.props as Record<string, unknown>;
    assert.equal("fontFamily" in rootProps, false);
    assert.equal("headingFontFamily" in rootProps, false);
    assert.equal("bodyFontFamily" in rootProps, false);
    assert.equal(rootProps.width, "600px");
  });

  it("规范化后剥离画布根 placement（无表格父级）", () => {
    const normalized = normalizeEmailRootBlock(
      buildTemplate({
        width: "600px",
        backgroundColor: "#ffffff",
        padding: { mode: "unified", unified: "0" },
        border: { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" },
        gapMode: "fixed",
        gap: "0",
      })
    );
    assert.equal(normalized.blocks.root.wrapperStyle?.placement, undefined);
    assert.equal(
      validateTemplate(normalized).some(
        (i) => i.path.startsWith("blocks.root.") && i.path.includes("placement")
      ),
      false
    );
  });

  it("规范化后删除画布根 selfAlign（不再迁入 placement）", () => {
    const withLegacy = buildTemplate({
      width: "600px",
      backgroundColor: "#ffffff",
      padding: { mode: "unified", unified: "0" },
      border: { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" },
      gapMode: "fixed",
      gap: "0",
    });
    withLegacy.blocks.root.wrapperStyle = {
      widthMode: "fill",
      heightMode: "hug",
      selfAlign: { horizontal: "right" },
    };
    const normalized = normalizeEmailRootBlock(withLegacy);
    const ws = normalized.blocks.root.wrapperStyle;
    assert.equal(ws?.selfAlign, undefined);
    assert.equal(ws?.placement, undefined);
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

describe("validateTemplate · 废弃根字体与 fontMode", () => {
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

  it("画布根存在字体字段时报错", () => {
    const issues = validateTemplate(
      buildTemplate({
        width: "600px",
        backgroundColor: "#ffffff",
        bodyFontFamily: "Arial, sans-serif",
        padding: { mode: "unified", unified: "0" },
        border: { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" },
        gapMode: "fixed",
        gap: "0",
      })
    );
    assert.equal(
      issues.some((issue) => issue.path === "blocks.root.props.bodyFontFamily"),
      true
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
