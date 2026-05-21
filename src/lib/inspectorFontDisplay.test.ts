import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailBlock, EmailPayload, EmailTemplate } from "../types/email";
import type { TokenPresets } from "../types/tokenPreset";
import { readInspectorDisplayFontFamily } from "./inspectorBindingDisplay";
import { readTokenPresetStorageValue, resolveDesignTokens } from "./resolveTokenPreset";
import { previewThemeTokenValue, previewThemeTokenValueForField } from "./themeTokenCandidates";
import { detachThemeFieldBranch } from "./themeBindingEdit";
import { mergeTemplatePayload } from "./merge";
import { resolveThemeInTemplate } from "./resolveThemeInTemplate";

const memberWelcomeFonts: TokenPresets = {
  schemaVersion: "1.0.0",
  activePresetId: "default",
  presets: {
    default: {
      label: "test",
      tokens: {
        fonts: { heading: "Georgia", body: "'Segoe UI'" },
        typography: { body: "15px" },
      },
    },
  },
};

function textBlockWithThemeFont(): { template: EmailTemplate; block: EmailBlock; payload: EmailPayload } {
  const block: EmailBlock = {
    id: "t1",
    type: "text",
    parentId: "root",
    children: [],
    wrapperStyle: {
      widthMode: "fill",
      heightMode: "hug",
      contentAlign: { horizontal: "left", vertical: "top" },
    },
    props: {
      textBody: { version: 1, paragraphs: [{ runs: [{ text: "x" }] }] },
      fontFamily: { $themeRef: "fonts.body" },
      fontSize: { $themeRef: "tokens.typography.body" },
      color: "#111827",
      bold: false,
      italic: false,
      decoration: "none",
    },
    bindings: {
      "props.fontFamily": {
        slotId: "fonts.body",
        mode: "theme",
        tokenPath: "fonts.body",
        fieldKind: "style",
      },
    },
  };
  const template: EmailTemplate = {
    schemaVersion: "3.0.0",
    templateId: "font-display-test",
    templateVersion: 1,
    rootBlockId: "root",
    blocks: {
      root: {
        id: "root",
        type: "emailRoot",
        parentId: null,
        children: ["t1"],
        wrapperStyle: { widthMode: "fill", heightMode: "hug" },
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
      t1: block,
    },
  };
  return { template, block, payload: { schemaVersion: "1.0.0", variables: {} } };
}

describe("readTokenPresetStorageValue", () => {
  it("读取 fonts.body 落盘值（无 sans-serif 后缀）", () => {
    assert.equal(readTokenPresetStorageValue(memberWelcomeFonts, "fonts.body"), "'Segoe UI'");
  });

  it("读取 tokens.typography.body 落盘值", () => {
    assert.equal(readTokenPresetStorageValue(memberWelcomeFonts, "tokens.typography.body"), "15px");
  });
});

describe("readInspectorDisplayFontFamily", () => {
  it("主题跟随时回显 tokenPresets 落盘字体，非 ExpandedTheme 展开栈", () => {
    const { template, block, payload } = textBlockWithThemeFont();
    const expanded = resolveDesignTokens(memberWelcomeFonts);
    assert.equal(expanded.fonts.body, "'Segoe UI', sans-serif");
    const display = readInspectorDisplayFontFamily(
      block,
      payload,
      block,
      "props.fontFamily",
      template,
      memberWelcomeFonts
    );
    assert.equal(display, "'Segoe UI'");
    assert.notEqual(display, expanded.fonts.body);
  });
});

describe("detachThemeFieldBranch · fontFamily", () => {
  it("解除样式令牌时烘焙单一主字体，不写 CSS 字体栈", () => {
    const { template, block, payload } = textBlockWithThemeFont();
    const expanded = resolveDesignTokens(memberWelcomeFonts);
    const mergedBase = mergeTemplatePayload(template, payload);
    const { template: merged } = resolveThemeInTemplate(mergedBase, expanded);
    assert.equal(merged!.blocks.t1.props.fontFamily, "'Segoe UI', sans-serif");

    const next = detachThemeFieldBranch(template, merged!, "t1", "props.fontFamily");
    assert.equal(next.blocks.t1.props.fontFamily, "'Segoe UI'");
    assert.equal(next.blocks.t1.bindings?.["props.fontFamily"], undefined);
  });
});

describe("readInspectorDisplayFontFamily · 已解除主题的字面量", () => {
  it("模板里若仍是旧版字体栈，回显收敛为单一主字体", () => {
    const { template, block, payload } = textBlockWithThemeFont();
    const detached: EmailBlock = {
      ...block,
      props: { ...block.props, fontFamily: "'Segoe UI', sans-serif" },
      bindings: {},
    };
    const detachedTpl: EmailTemplate = {
      ...template,
      blocks: { ...template.blocks, t1: detached },
      meta: {
        easyEmailBindingUi: {
          themeRestoreJson: {
            "t1|props.fontFamily": JSON.stringify({ $themeRef: "fonts.body" }),
          },
        },
      },
    };
    const display = readInspectorDisplayFontFamily(
      detached,
      payload,
      detached,
      "props.fontFamily",
      detachedTpl,
      memberWelcomeFonts
    );
    assert.equal(display, "'Segoe UI'");
  });
});

describe("previewThemeTokenValueForField", () => {
  it("字体字段预览用落盘值", () => {
    const expanded = resolveDesignTokens(memberWelcomeFonts);
    assert.equal(
      previewThemeTokenValueForField(
        "props.fontFamily",
        "fonts.body",
        expanded,
        memberWelcomeFonts
      ),
      "'Segoe UI'"
    );
    assert.equal(previewThemeTokenValue(expanded, "fonts.body"), "'Segoe UI', sans-serif");
  });
});
