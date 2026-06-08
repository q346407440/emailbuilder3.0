import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mergeSections } from "./mergeSections";
import { mapPipelineResultToEasyEmail } from "./mapPipelineResultToEasyEmail";
import { validatePipelineOutput } from "./validatePipelineOutput";
import { normalizeStyleTokens } from "./normalizeStyleTokens";
import { blockingValidationIssues, validateTemplate } from "../validate";
import { AI_PIPELINE_B1_FALLBACK_TOKENS } from "./b1StyleTierPresets";
import type { StyleTokensResult } from "./types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(__dirname, "__fixtures__/minimal-one-section.json");

describe("normalizeStyleTokens", () => {
  it("非法 spacing 回落到最近 enum", () => {
    const input: StyleTokensResult = {
      schemaVersion: "1",
      tokens: {
        ...AI_PIPELINE_B1_FALLBACK_TOKENS,
        spacing: { section: "99px", gap: "12px", pageInline: "20px" },
      },
      canvas: {
        width: "600px",
        emailBackground: "#F3F4F6",
        contentSurface: "#FFFFFF",
      },
    };
    const out = normalizeStyleTokens(input);
    assert.equal(out.spacing.section, "24px");
  });
});

describe("mapPipelineResultToEasyEmail fixture", () => {
  it("minimal-one-section 通过 validateTemplate", () => {
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
    const output = mapPipelineResultToEasyEmail(draft);
    validatePipelineOutput(output);
    const issues = blockingValidationIssues(validateTemplate(output.template));
    assert.equal(issues.length, 0, issues.map((i) => i.reason).join("; "));
    assert.ok(output.template.blocks[output.template.rootBlockId!]);
    const shell = output.template.blocks["fixture-ai-layout-ai-test-s1-sec"];
    assert.ok(shell, "应有区段壳 block");
    assert.deepEqual(shell?.wrapperStyle?.padding, {
      mode: "separate",
      top: "0",
      right: "20px",
      bottom: "16px",
      left: "20px",
    });
    assert.deepEqual(Object.keys(output.tokenPresets.presets.default.tokens.colors), [
      "primary",
      "secondary",
      "surface",
    ]);
    const button = Object.values(output.template.blocks).find((b) => b.type === "button");
    assert.equal(button?.props.buttonStyle?.borderRadius?.radius, "8px");
    const buttonBlock = Object.values(output.template.blocks).find((b) => b.type === "button");
    assert.equal(buttonBlock?.wrapperStyle?.widthMode, "hug");
    assert.equal(output.template.blockMeta?.["fixture-ai-layout-ai-test-s1-sec"]?.name, "Hero");
    const textMeta = Object.entries(output.template.blockMeta ?? {}).find(
      ([id, meta]) => meta.blockType === "content.text" && id.includes("-s1-")
    );
    assert.equal(textMeta?.[1].name, "标题");
    const buttonMeta = Object.entries(output.template.blockMeta ?? {}).find(
      ([, meta]) => meta.blockType === "action.button"
    );
    assert.equal(buttonMeta?.[1].name, "按钮");
  });

  it("父级 hug layout 下子级 fill 在 E 映射后回落 hug 并通过校验", () => {
    const raw = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
    const styleTokens = normalizeStyleTokens(raw.styleTokens);
    const draft = mergeSections({
      grounding: raw.grounding,
      styleTokens,
      canvas: raw.styleTokens.canvas,
      textExtract: raw.textExtract,
      assetManifest: raw.assetManifest,
      iconQueries: [],
      sections: [
        {
          compactSchemaVersion: "1",
          sectionId: "s1",
          root: {
            kind: "layout.container",
            wrapper: { widthMode: "fill", heightMode: "hug" },
            props: { direction: "vertical", gapMode: "fixed", gap: "12px" },
            children: [
              {
                kind: "layout.container",
                wrapper: { widthMode: "hug", heightMode: "hug" },
                props: { direction: "vertical" },
                children: [
                  {
                    kind: "content.text",
                    props: { textId: "s1-t0" },
                    wrapper: { widthMode: "fill" },
                  },
                ],
              },
            ],
          },
        },
      ],
      emailKey: "mcp-20260527",
      layoutVariantId: "ai-2",
    });
    const output = mapPipelineResultToEasyEmail(draft);
    validatePipelineOutput(output);
    const textBlock = output.template.blocks["mcp-20260527-ai-2-s1-b2"];
    assert.equal(textBlock?.wrapperStyle?.widthMode, "hug");
  });

  it("Stage C 只写 contentAlign.horizontal 时 E 映射仍通过校验", () => {
    const raw = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
    const styleTokens = normalizeStyleTokens(raw.styleTokens);
    const draft = mergeSections({
      grounding: raw.grounding,
      styleTokens,
      canvas: raw.styleTokens.canvas,
      textExtract: raw.textExtract,
      assetManifest: raw.assetManifest,
      iconQueries: [],
      sections: [
        {
          compactSchemaVersion: "1",
          sectionId: "s1",
          root: {
            kind: "layout.container",
            wrapper: {
              contentAlign: { horizontal: "center" },
              widthMode: "fill",
              heightMode: "hug",
            },
            props: { direction: "vertical", gapMode: "fixed", gap: "12px" },
            children: [
              {
                kind: "content.text",
                props: { textId: "s1-t0" },
                wrapper: { contentAlign: { horizontal: "center" }, widthMode: "fill" },
              },
            ],
          },
        },
      ],
      emailKey: "mcp-20260527",
      layoutVariantId: "ai-2",
    });
    const output = mapPipelineResultToEasyEmail(draft);
    validatePipelineOutput(output);
    const rootBlock = output.template.blocks["mcp-20260527-ai-2-s1-b0"];
    assert.equal(rootBlock?.wrapperStyle?.contentAlign?.vertical, "top");
  });

  it("content.text 无 textId 时 bold/italic 仍为布尔", () => {
    const raw = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
    const styleTokens = normalizeStyleTokens(raw.styleTokens);
    const draft = mergeSections({
      grounding: raw.grounding,
      styleTokens,
      canvas: raw.styleTokens.canvas,
      textExtract: raw.textExtract,
      assetManifest: raw.assetManifest,
      iconQueries: [],
      sections: [
        {
          compactSchemaVersion: "1",
          sectionId: "s1",
          root: {
            kind: "content.text",
            styleKeys: { bold: true },
            props: { textId: "s1-t0" },
          },
        },
      ],
      emailKey: "test-email",
      layoutVariantId: "ai-test",
    });
    const output = mapPipelineResultToEasyEmail(draft);
    const textBlock = Object.values(output.template.blocks).find((b) => b.type === "text");
    assert.ok(textBlock);
    assert.equal(typeof textBlock!.props.bold, "boolean");
    assert.equal(typeof textBlock!.props.italic, "boolean");
    const issues = blockingValidationIssues(validateTemplate(output.template));
    assert.equal(issues.length, 0, issues.map((i) => i.message).join("; "));
  });

  it("fullWidth 区段壳左右 0、竖直与全区 section 一致", () => {
    const raw = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
    const styleTokens = normalizeStyleTokens(raw.styleTokens);
    const draft = mergeSections({
      grounding: {
        ...raw.grounding,
        sections: [
          {
            ...raw.grounding.sections[0],
            layoutHints: { fullWidth: true, gapBelow: "24px" },
          },
        ],
      },
      styleTokens,
      canvas: raw.styleTokens.canvas,
      textExtract: raw.textExtract,
      assetManifest: raw.assetManifest,
      iconQueries: [],
      sections: raw.sections,
      emailKey: raw.emailKey,
      layoutVariantId: raw.layoutVariantId,
    });
    const output = mapPipelineResultToEasyEmail(draft);
    const shell = output.template.blocks["fixture-ai-layout-ai-test-s1-sec"];
    assert.deepEqual(shell?.wrapperStyle?.padding, {
      mode: "separate",
      top: "0",
      right: "0",
      bottom: "16px",
      left: "0",
    });
    const hero = output.template.blocks["fixture-ai-layout-ai-test-s1-b0"];
    assert.equal(hero?.wrapperStyle?.padding?.mode, "unified");
    assert.equal(hero?.wrapperStyle?.padding?.unified, "32px");
    assert.equal(hero?.wrapperStyle?.backgroundImage?.borderRadius?.radius, "0");
  });

  it("card 图与有色 layout 写入 panel 圆角", () => {
    const raw = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
    const styleTokens = normalizeStyleTokens(raw.styleTokens);
    const draft = mergeSections({
      grounding: {
        schemaVersion: "1",
        order: ["s1"],
        sections: [
          {
            sectionId: "s1",
            name: "商品",
            order: 0,
            hasImage: true,
            imageSlots: [
              {
                slotId: "s1-img-0",
                imageQuery: "product bag",
                role: "card",
              },
            ],
          },
        ],
      },
      styleTokens,
      canvas: raw.styleTokens.canvas,
      textExtract: raw.textExtract,
      assetManifest: raw.assetManifest,
      iconQueries: [],
      sections: [
        {
          compactSchemaVersion: "1",
          sectionId: "s1",
          root: {
            kind: "layout.container",
            wrapper: { backgroundColor: "#FFF0F3", widthMode: "fill" },
            props: { direction: "vertical", gap: "12px" },
            children: [
              {
                kind: "content.image",
                wrapper: { backgroundImageRef: "s1-img-0", widthMode: "fill", heightMode: "fixed", height: "140px" },
              },
            ],
          },
        },
      ],
      emailKey: "radius-test",
      layoutVariantId: "ai-r",
    });
    const output = mapPipelineResultToEasyEmail(draft);
    validatePipelineOutput(output);
    const layout = output.template.blocks["radius-test-ai-r-s1-b0"];
    const image = output.template.blocks["radius-test-ai-r-s1-b1"];
    assert.equal(layout?.wrapperStyle?.borderRadius?.radius, "12px");
    assert.equal(image?.wrapperStyle?.backgroundImage?.borderRadius?.radius, "12px");
    assert.equal(image?.wrapperStyle?.borderRadius?.radius, "12px");
  });

  it("action.button 误写 wrapper.backgroundColor 时 E 剥离 wrapper 背景", () => {
    const raw = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
    const styleTokens = normalizeStyleTokens(raw.styleTokens);
    const draft = mergeSections({
      grounding: {
        ...raw.grounding,
        sections: [
          {
            sectionId: "s6",
            name: "结账按钮",
            order: 0,
            layoutHints: { fullWidth: false, align: "center" },
          },
        ],
        order: ["s6"],
      },
      styleTokens,
      canvas: raw.styleTokens.canvas,
      textExtract: {
        schemaVersion: "1",
        regions: [
          {
            regionId: "s6",
            paragraphs: [
              {
                textId: "s6-t0",
                role: "button",
                textBody: { paragraphs: [{ runs: [{ text: "CHECKOUT NOW" }] }] },
              },
            ],
          },
        ],
      },
      assetManifest: raw.assetManifest,
      iconQueries: [],
      sections: [
        {
          compactSchemaVersion: "1",
          sectionId: "s6",
          root: {
            kind: "layout.container",
            props: { direction: "vertical" },
            children: [
              {
                kind: "action.button",
                props: { textId: "s6-t0" },
                wrapper: { widthMode: "fill", backgroundColor: "#000000" },
                styleKeys: {
                  "buttonStyle.backgroundColor": "#000000",
                  "buttonStyle.textColor": "#FFFFFF",
                  bold: true,
                },
              },
            ],
          },
        },
      ],
      emailKey: "btn-wrap",
      layoutVariantId: "ai-btn",
    });
    const output = mapPipelineResultToEasyEmail(draft);
    validatePipelineOutput(output);
    const button = output.template.blocks["btn-wrap-ai-btn-s6-b1"];
    assert.equal(button?.props.buttonStyle?.backgroundColor, "#000000");
    assert.equal(button?.props.buttonStyle?.textColor, "#FFFFFF");
    assert.equal(button?.wrapperStyle?.backgroundColor, undefined);
    assert.equal(button?.wrapperStyle?.widthMode, "fill");
  });
});
