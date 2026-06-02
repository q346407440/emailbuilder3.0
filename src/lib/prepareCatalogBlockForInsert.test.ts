import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isThemeRef } from "../types/themeRef";
import type { TokenPresets } from "../types/tokenPreset";
import type { EmailTemplate } from "../types/email";
import { BLOCK_CATALOG_ENTRIES } from "./blockDefaults";
import { prepareCatalogBlockForInsert } from "./prepareCatalogBlockForInsert";
import { validateTemplateBindings } from "./validate";

function hasThemeRefDeep(value: unknown): boolean {
  if (isThemeRef(value)) return true;
  if (Array.isArray(value)) return value.some(hasThemeRefDeep);
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some(hasThemeRefDeep);
  }
  return false;
}

const sampleTokenPresets: TokenPresets = {
  schemaVersion: "1.0.0",
  activePresetId: "default",
  presets: {
    default: {
      label: "测试",
      tokens: {
        colors: { primary: "#222222", secondary: "#888888", surface: "#fafafa" },
        spacing: { section: "20px", gap: "10px", pageInline: "24px" },
        typography: { body: "16px", display: "32px", h1: "24px", caption: "11px" },
        radius: { panel: "4px", cta: "8px" },
      },
    },
  },
  scopeSelections: {},
};

describe("prepareCatalogBlockForInsert", () => {
  for (const entry of BLOCK_CATALOG_ENTRIES) {
    it(`${entry.name}：物化后无 $themeRef 且 bindings 为空`, () => {
      const raw = entry.buildSampleBlock("__insert_test__", "parent");
      const prepared = prepareCatalogBlockForInsert(raw, sampleTokenPresets);
      assert.equal(hasThemeRefDeep(prepared), false);
      assert.deepEqual(prepared.bindings, {});
    });
  }

  it("按钮样式字段使用当前 tokenPresets 字面量", () => {
    const buttonEntry = BLOCK_CATALOG_ENTRIES.find((e) => e.runtimeType === "button");
    assert.ok(buttonEntry);
    const raw = buttonEntry!.buildSampleBlock("btn", "parent");
    const prepared = prepareCatalogBlockForInsert(raw, sampleTokenPresets);
    const style = (prepared.props as { buttonStyle?: Record<string, unknown> }).buttonStyle;
    assert.equal(style?.backgroundColor, "#fafafa");
    assert.equal(style?.textColor, "#222222");
  });

  it("插入块经 validateTemplateBindings 无 theme 登记违例", () => {
    const buttonEntry = BLOCK_CATALOG_ENTRIES.find((e) => e.runtimeType === "button");
    assert.ok(buttonEntry);
    const prepared = prepareCatalogBlockForInsert(
      buttonEntry!.buildSampleBlock("btn", "root"),
      sampleTokenPresets
    );
    const template: EmailTemplate = {
      schemaVersion: "4.0.0" as const,
      templateId: "t",
      templateVersion: 1,
      rootBlockId: "root",
      blockMeta: { root: { blockType: "layout.container", name: "根" }, btn: { blockType: "action.button", name: "按钮" } },
      blocks: {
        root: {
          id: "root",
          type: "emailRoot",
          parentId: null,
          children: ["btn"],
          wrapperStyle: { widthMode: "fill", heightMode: "hug" },
          props: {
            width: "600px",
            backgroundColor: "#fff",
            padding: { mode: "unified", unified: "0" },
            border: { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" },
            gapMode: "fixed",
            gap: "0",
          },
          bindings: {},
        },
        btn: prepared as EmailTemplate["blocks"][string],
      },
    };
    const themeIssues = validateTemplateBindings(template).filter((i) =>
      /未登记 mode:"theme"/.test(i.reason)
    );
    assert.equal(themeIssues.length, 0);
  });
});
