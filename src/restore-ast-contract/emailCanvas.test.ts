import assert from "node:assert/strict";
import { test } from "node:test";
import { astToTemplate } from "./astToTemplate";
import type { RestoreAstDocument } from "./types";

const baseTheme = {
  colors: {
    primary: "#000000",
    accent: "#8B5CF6",
    secondary: "#6B7280",
    surface: "#FFFFFF",
  },
  spacing: { section: "24px", gap: "16px", pageInline: "20px" },
  typography: { display: "28px", h1: "22px", body: "14px", caption: "12px" },
  radius: { panel: "12px", cta: "24px" },
};

test("email.canvas hex → emailRoot 字面量黑底，surface 不进 tokenPresets 扩展", () => {
  const doc: RestoreAstDocument = {
    theme: baseTheme,
    tree: {
      t: "email",
      canvas: { hex: "#000000" },
      children: [],
    },
  };
  const { template, tokenPresets } = astToTemplate(doc, {
    emailId: "test",
    templateId: "test",
    locale: "en-US",
    idPrefix: "test-1",
  });
  const root = template.blocks[template.rootBlockId]!;
  assert.equal(root.props?.backgroundColor, "#000000");
  assert.equal(root.bindings?.["props.backgroundColor"], undefined);
  assert.equal(tokenPresets.presets.default.tokens.colors?.surface, "#FFFFFF");
  assert.equal(Object.keys(tokenPresets.presets.default.tokens.colors ?? {}).length, 4);
});

test("省略 email.canvas → emailRoot 默认白画布字面量", () => {
  const doc: RestoreAstDocument = {
    theme: baseTheme,
    tree: { t: "email", children: [] },
  };
  const { template } = astToTemplate(doc, {
    emailId: "test",
    templateId: "test",
    locale: "en-US",
    idPrefix: "test-2",
  });
  const root = template.blocks[template.rootBlockId]!;
  assert.equal(root.props?.backgroundColor, "#FFFFFF");
  assert.equal(root.bindings?.["props.backgroundColor"], undefined);
});

test("email.canvas 档位 → 绑 theme 对应色，仍不新增 tokenPresets 键", () => {
  const doc: RestoreAstDocument = {
    theme: baseTheme,
    tree: {
      t: "email",
      canvas: "primary",
      children: [],
    },
  };
  const { template, tokenPresets } = astToTemplate(doc, {
    emailId: "test",
    templateId: "test",
    locale: "en-US",
    idPrefix: "test-3",
  });
  const root = template.blocks[template.rootBlockId]!;
  assert.deepEqual(root.props?.backgroundColor, { $themeRef: "colors.primary" });
  assert.equal(tokenPresets.presets.default.tokens.colors?.primary, "#000000");
});
