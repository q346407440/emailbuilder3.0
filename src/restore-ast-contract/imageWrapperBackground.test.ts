import assert from "node:assert/strict";
import { test } from "node:test";
import { astToTemplate } from "./astToTemplate";
import { IMAGE_WRAPPER_BACKGROUND_COLOR } from "./resolveValue";
import type { RestoreAstDocument } from "./types";

const theme: RestoreAstDocument["theme"] = {
  colors: { primary: "#111", accent: "#222", secondary: "#888", surface: "#fff" },
  spacing: { section: "16px", gap: "8px", pageInline: "12px" },
  typography: { display: "32px", h1: "22px", body: "14px", caption: "12px" },
  radius: { panel: "8px", cta: "24px" },
};

const astOpts = {
  emailId: "test",
  templateId: "test",
  locale: "en-US",
  idPrefix: "t",
};

test("image 组装：wrapperStyle.backgroundColor 固定透明，忽略 box.tone", () => {
  const doc: RestoreAstDocument = {
    theme,
    tree: {
      t: "email",
      children: [
        {
          t: "stack",
          title: "模块",
          box: { pad: "section" },
          children: [
            {
              t: "image",
              query: "hero photo",
              height: { px: 200 },
              box: { tone: "primary", pad: "gap", radius: "panel" },
            },
          ],
        },
      ],
    },
  };

  const { template } = astToTemplate(doc, astOpts);
  const image = Object.values(template.blocks).find((b) => b.type === "image");
  assert.ok(image);
  assert.equal(image!.wrapperStyle?.backgroundColor, IMAGE_WRAPPER_BACKGROUND_COLOR);
  assert.equal(image!.bindings?.["wrapperStyle.backgroundColor"], undefined);
  assert.ok(image!.wrapperStyle?.padding);
  assert.ok(image!.wrapperStyle?.borderRadius);
});
