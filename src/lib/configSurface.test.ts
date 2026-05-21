import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailPayload, EmailTemplate } from "../types/email";
import type { ConfigSchema } from "../types/configSchema";
import type { TokenPresets } from "../types/tokenPreset";
import { applyConfigValue } from "./applyConfigValue";
import { resolveTokenScaleSelection } from "./resolveTokenPreset";
import { validateConfigSchema, validateTokenPresets } from "./validateConfigSchema";

const template: EmailTemplate = {
  schemaVersion: "3.0.0",
  templateId: "demo",
  templateVersion: 1,
  rootBlockId: "root",
  blocks: {
    root: {
      id: "root",
      type: "emailRoot",
      parentId: null,
      children: ["title"],
      props: { width: "600px" },
    },
    title: {
      id: "title",
      type: "text",
      parentId: "root",
      children: [],
      props: {
        content: "标题",
        fontSize: "24px",
        bold: true,
        italic: false,
        decoration: "none",
      },
      wrapperStyle: {},
    },
  },
};

const tokenPresets: TokenPresets = {
  schemaVersion: "1.0.0",
  activePresetId: "default",
  presets: {
    default: {
      label: "默认",
      tokens: {
        colors: { primary: "#111", secondary: "#666", surface: "#fff" },
        fonts: { heading: "Arial", body: "Arial" },
        spacing: { section: "24px", gap: "16px", pageInline: "24px" },
        typography: { display: "36px", h1: "28px", body: "20px", caption: "12px" },
        radius: { panel: "8px", cta: "9999px" },
      },
    },
  },
};

describe("配置母版基础能力", () => {
  it("按语义档位解析 token 值", () => {
    assert.equal(
      resolveTokenScaleSelection(tokenPresets, "typography", { mode: "scale", scale: "display" }),
      "36px"
    );
    assert.equal(
      resolveTokenScaleSelection(tokenPresets, "typography", { mode: "custom", value: "42px" }),
      "42px"
    );
  });

  it("将 tokenScale 写入作用域选择并反写目标字段", () => {
    const payload: EmailPayload = { schemaVersion: "1.0.0", slots: {}, values: {} };
    const schema: ConfigSchema = {
      schemaVersion: "1.0.0",
      scopes: [
        {
          scopeId: "block:title",
          kind: "block",
          label: "标题",
          fields: [
            {
              key: "titleSize",
              label: "标题尺寸",
              control: "tokenScale",
              tokenFamily: "typography",
              target: { kind: "blockPath", blockId: "title", path: "props.fontSize" },
            },
          ],
        },
      ],
    };
    const issues = validateConfigSchema(schema, template);
    assert.deepEqual(issues, []);
    const next = applyConfigValue(
      { template, payload, tokenPresets },
      schema.scopes[0]!,
      schema.scopes[0]!.fields[0]!,
      { mode: "scale", scale: "display" }
    );
    assert.equal(next.template.blocks.title?.props.fontSize, "36px");
    assert.deepEqual(next.tokenPresets?.scopeSelections?.["block:title"]?.titleSize, {
      mode: "scale",
      scale: "display",
    });
  });

  it("校验 tokenPresets 的基础结构", () => {
    assert.deepEqual(validateTokenPresets(tokenPresets), []);
  });

  it("拒绝非标准 token family / scale", () => {
    const issues = validateTokenPresets({
      schemaVersion: "1.0.0",
      activePresetId: "default",
      presets: {
        default: {
          label: "坏例",
          tokens: {
            colors: { brand: "#000" },
          },
        },
      },
    });
    assert.ok(issues.some((i) => i.reason.includes("非标准")));
    assert.ok(issues.some((i) => i.reason.includes("缺少标准")));
  });
});
