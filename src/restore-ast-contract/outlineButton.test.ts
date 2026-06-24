import assert from "node:assert/strict";
import { test } from "node:test";
import { astToTemplate } from "./astToTemplate";
import type { RestoreAstDocument } from "./types";

const baseTheme = {
  colors: {
    primary: "#F0E68C",
    accent: "#4CD964",
    secondary: "#1A4D4D",
    surface: "#FFFFFF",
  },
  spacing: { section: "32px", gap: "16px", pageInline: "24px" },
  typography: { display: "40px", h1: "32px", body: "16px", caption: "12px" },
  radius: { panel: "8px", cta: "24px" },
};

test("outline button：border → surface 底 + 描边 + fill 宽", () => {
  const doc: RestoreAstDocument = {
    theme: baseTheme,
    tree: {
      t: "email",
      children: [
        {
          t: "stack",
          title: "链接区",
          align: "center",
          box: { pad: "section" },
          children: [
            {
              t: "button",
              label: "Cards",
              border: "hairline",
              borderTone: "secondary",
              width: "fill",
            },
          ],
        },
      ],
    },
  };
  const { template } = astToTemplate(doc, {
    emailId: "test",
    templateId: "test",
    locale: "en-US",
    idPrefix: "test-ob",
  });
  const btnId = Object.keys(template.blocks).find((id) => template.blocks[id]?.type === "button");
  assert.ok(btnId);
  const btn = template.blocks[btnId!]!;
  const style = btn.props?.buttonStyle as Record<string, unknown>;
  assert.deepEqual(style.backgroundColor, { $themeRef: "colors.surface" });
  assert.equal((style.border as { top?: string })?.top, "1px");
  assert.equal(style.widthMode, "fill");
});

test("实心 button：省略 border → primary 底", () => {
  const doc: RestoreAstDocument = {
    theme: baseTheme,
    tree: {
      t: "email",
      children: [
        {
          t: "stack",
          title: "促销",
          align: "center",
          box: { pad: "section" },
          children: [{ t: "button", label: "Back to cart" }],
        },
      ],
    },
  };
  const { template } = astToTemplate(doc, {
    emailId: "test",
    templateId: "test",
    locale: "en-US",
    idPrefix: "test-sb",
  });
  const btnId = Object.keys(template.blocks).find((id) => template.blocks[id]?.type === "button");
  const style = template.blocks[btnId!]!.props?.buttonStyle as Record<string, unknown>;
  assert.deepEqual(style.backgroundColor, { $themeRef: "colors.primary" });
  assert.equal((style.border as { top?: string })?.top, "0");
});
