import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isThemeRef } from "../../types/themeRef";
import { mergeSections } from "./mergeSections";
import { mapPipelineResultToEasyEmail } from "./mapPipelineResultToEasyEmail";
import { bindThemeRefsAfterAiLowering } from "./bindThemeRefsAfterAiLowering";
import { validatePipelineOutput } from "./validatePipelineOutput";
import { normalizeStyleTokens } from "./normalizeStyleTokens";
import { readTemplateFieldOnly } from "../themeBindingEdit";
import { blockingValidationIssues, validateTemplate } from "../validate";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(__dirname, "__fixtures__/minimal-one-section.json");

describe("bindThemeRefsAfterAiLowering", () => {
  it("minimal fixture 升格部分字段且 validate:all 门禁仍通过", () => {
    const raw = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
    const styleTokens = normalizeStyleTokens(raw.styleTokens);
    const draft = mergeSections({
      grounding: raw.grounding,
      styleTokens,
      canvas: raw.styleTokens.canvas,
      textExtract: raw.textExtract,
      assetManifest: raw.assetManifest,
      iconQueries: [],
      sections: raw.sections,
      emailKey: raw.emailKey,
      layoutVariantId: raw.layoutVariantId,
    });
    const mapped = mapPipelineResultToEasyEmail(draft);
    const { template, boundPaths } = bindThemeRefsAfterAiLowering({
      template: mapped.template,
      tokenPresets: mapped.tokenPresets,
      draft,
      enabled: true,
    });
    assert.ok(boundPaths > 0);

    const heading = Object.values(template.blocks).find((b) => b.type === "text");
    assert.ok(heading);
    assert.equal(readTemplateFieldOnly(heading!, "props.fontSize"), "32px");
    assert.equal(readTemplateFieldOnly(heading!, "props.color"), "#FFFFFF");

    const shell = template.blocks["fixture-ai-layout-ai-test-s1-sec"];
    assert.equal(isThemeRef(shell?.wrapperStyle?.padding?.right), true);
    assert.equal(
      (shell?.wrapperStyle?.padding?.right as { $themeRef: string }).$themeRef,
      "tokens.spacing.pageInline"
    );

    validatePipelineOutput({ template, tokenPresets: mapped.tokenPresets });
    const issues = blockingValidationIssues(validateTemplate(template));
    assert.equal(issues.length, 0, issues.map((i) => i.reason).join("; "));
  });

  it("裸档名 h1 与 body 同值时不靠值匹配绑字号（无 role 时不绑）", () => {
    const tokenPresets = mapPipelineResultToEasyEmail({
      grounding: { schemaVersion: "1", order: [], sections: [] },
      styleTokens: normalizeStyleTokens({
        schemaVersion: "1",
        tokens: {
          colors: { primary: "#111", secondary: "#666", surface: "#fff" },
          spacing: { section: "16px", gap: "8px", pageInline: "16px" },
          typography: { display: "32px", h1: "16px", body: "16px", caption: "12px" },
          radius: { panel: "0", cta: "0" },
        },
        canvas: { width: "600px", emailBackground: "#eee", contentSurface: "#fff" },
      }),
      canvas: { width: "600px", emailBackground: "#eee", contentSurface: "#fff" },
      textExtract: { schemaVersion: "1", regions: [] },
      assetManifest: { images: {}, icons: {} },
      sections: [],
      emailKey: "e",
      layoutVariantId: "v",
    }).tokenPresets;

    const blockId = "b1";
    const template = {
      schemaVersion: "4.0.0" as const,
      emailId: "e",
      templateId: "t",
      templateVersion: 1,
      locale: "zh-CN",
      rootBlockId: blockId,
      blocks: {
        [blockId]: {
          id: blockId,
          type: "text" as const,
          parentId: null,
          children: [],
          props: {
            textBody: { paragraphs: [{ runs: [{ text: "x" }] }] },
            fontSize: "16px",
            color: "#111",
            bold: false,
            italic: false,
            decoration: "none",
          },
          wrapperStyle: {},
          bindings: {},
        },
      },
    };

    const { template: out } = bindThemeRefsAfterAiLowering({
      template,
      tokenPresets,
      enabled: true,
    });
    assert.equal(isThemeRef(readTemplateFieldOnly(out.blocks[blockId]!, "props.fontSize")), false);
  });

  it("黄底 primary 时黑色 Logo 文案不升格为 colors.primary", () => {
    const tokenPresets = {
      schemaVersion: "1.0.0" as const,
      activePresetId: "default",
      presets: {
        default: {
          label: "t",
          tokens: {
            colors: { primary: "#E3D026", secondary: "#6B7280", surface: "#FFFFFF" },
            spacing: { section: "20px", gap: "16px", pageInline: "24px" },
            typography: { display: "28px", h1: "24px", body: "16px", caption: "12px" },
            radius: { panel: "8px", cta: "24px" },
          },
        },
      },
      scopeSelections: {},
    };
    const blockId = "logo";
    const template = {
      schemaVersion: "4.0.0" as const,
      emailId: "e",
      templateId: "t",
      templateVersion: 1,
      locale: "zh-CN",
      rootBlockId: blockId,
      blocks: {
        [blockId]: {
          id: blockId,
          type: "text" as const,
          parentId: null,
          children: [],
          props: {
            textBody: { paragraphs: [{ runs: [{ text: "AVENTON" }] }] },
            fontSize: "24px",
            color: "#1A1A1A",
            bold: true,
            italic: false,
            decoration: "none",
          },
          wrapperStyle: {},
          bindings: {},
        },
      },
    };
    const { template: out } = bindThemeRefsAfterAiLowering({
      template,
      tokenPresets,
      enabled: true,
    });
    assert.equal(isThemeRef(readTemplateFieldOnly(out.blocks[blockId]!, "props.color")), false);
  });

  it("黄底 CTA 黑字仅当字面量匹配 token 时才升格 themeRef", () => {
    const tokenPresets = {
      schemaVersion: "1.0.0" as const,
      activePresetId: "default",
      presets: {
        default: {
          label: "t",
          tokens: {
            colors: { primary: "#E3D026", secondary: "#6B7280", surface: "#FFFFFF" },
            spacing: { section: "20px", gap: "16px", pageInline: "24px" },
            typography: { display: "28px", h1: "24px", body: "16px", caption: "12px" },
            radius: { panel: "8px", cta: "24px" },
          },
        },
      },
      scopeSelections: {},
    };
    const blockId = "cta";
    const template = {
      schemaVersion: "4.0.0" as const,
      emailId: "e",
      templateId: "t",
      templateVersion: 1,
      locale: "zh-CN",
      rootBlockId: blockId,
      blocks: {
        [blockId]: {
          id: blockId,
          type: "button" as const,
          parentId: null,
          children: [],
          props: {
            text: "SHOP NOW",
            link: "",
            buttonStyle: {
              widthMode: "hug",
              backgroundColor: "#E3D026",
              textColor: "#1A1A1A",
              fontSize: "16px",
              border: { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" },
              borderRadius: { mode: "unified", radius: "24px" },
              bold: true,
              italic: false,
            },
          },
          wrapperStyle: {},
          bindings: {},
        },
      },
    };
    const { template: out } = bindThemeRefsAfterAiLowering({
      template,
      tokenPresets,
      enabled: true,
    });
    assert.equal(
      isThemeRef(readTemplateFieldOnly(out.blocks[blockId]!, "props.buttonStyle.textColor")),
      false
    );
    assert.equal(readTemplateFieldOnly(out.blocks[blockId]!, "props.buttonStyle.textColor"), "#1A1A1A");
  });

  it("Agent 已绑定的字色在补充升格后保持不变", () => {
    const tokenPresets = {
      schemaVersion: "1.0.0" as const,
      activePresetId: "default",
      presets: {
        default: {
          label: "t",
          tokens: {
            colors: { primary: "#E0D12C", secondary: "#4B5563", surface: "#FF0000" },
            spacing: { section: "20px", gap: "16px", pageInline: "24px" },
            typography: { display: "28px", h1: "24px", body: "16px", caption: "12px" },
            radius: { panel: "8px", cta: "24px" },
          },
        },
      },
      scopeSelections: {},
    };
    const blockId = "t1";
    const template = {
      schemaVersion: "4.0.0" as const,
      emailId: "e",
      templateId: "t",
      templateVersion: 1,
      locale: "zh-CN",
      rootBlockId: blockId,
      blocks: {
        [blockId]: {
          id: blockId,
          type: "text" as const,
          parentId: null,
          children: [],
          props: {
            textBody: { paragraphs: [{ runs: [{ text: "x" }] }] },
            fontSize: "16px",
            color: { $themeRef: "colors.secondary" },
            bold: false,
            italic: false,
            decoration: "none",
          },
          wrapperStyle: {},
          bindings: {
            "props.color": {
              slotId: "colors.secondary",
              mode: "theme" as const,
              tokenPath: "colors.secondary",
            },
          },
        },
      },
    };
    const { template: out } = bindThemeRefsAfterAiLowering({
      template,
      tokenPresets,
      enabled: true,
    });
    assert.equal(
      (readTemplateFieldOnly(out.blocks[blockId]!, "props.color") as { $themeRef: string }).$themeRef,
      "colors.secondary"
    );
  });
});
