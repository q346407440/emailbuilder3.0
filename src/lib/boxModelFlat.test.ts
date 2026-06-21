import assert from "node:assert/strict";
import { test } from "node:test";
import {
  borderNoneFlat,
  borderRadiusUniform,
  borderRadiusZeroFlat,
  isFlatBorderRadiusValue,
  isFlatBorderValue,
  isFlatSpacingValue,
  spacingUniform,
} from "./boxModelFlat";
import { borderRadiusToCss, borderToCss, paddingToCss } from "./wrapperStyleToCss";
import { astToTemplate } from "../restore-ast-contract/astToTemplate";
import type { RestoreAstDocument } from "../restore-ast-contract/types";

test("平铺 padding 校验与 CSS", () => {
  const padding = spacingUniform("8px");
  assert.equal(isFlatSpacingValue(padding), true);
  assert.equal(paddingToCss(padding), "8px 8px 8px 8px");
});

test("平铺 border 校验与 CSS", () => {
  const border = { ...borderNoneFlat(), top: "1px", right: "1px", bottom: "1px", left: "1px" };
  assert.equal(isFlatBorderValue(border), true);
  assert.deepEqual(borderToCss(border), {
    borderTop: "1px solid rgba(0,0,0,0)",
    borderRight: "1px solid rgba(0,0,0,0)",
    borderBottom: "1px solid rgba(0,0,0,0)",
    borderLeft: "1px solid rgba(0,0,0,0)",
  });
});

test("平铺圆角 CSS 四角同值可简写", () => {
  const radius = borderRadiusUniform("8px");
  assert.equal(isFlatBorderRadiusValue(radius), true);
  assert.deepEqual(borderRadiusToCss(radius), { borderRadius: "8px" });
  assert.deepEqual(borderRadiusToCss(borderRadiusZeroFlat()), { borderRadius: "0" });
});

test("astToTemplate 产出四边平铺 padding / border / borderRadius", () => {
  const doc: RestoreAstDocument = {
    theme: {
      colors: { primary: "#111", accent: "#222", secondary: "#333", surface: "#fff" },
      spacing: { section: "24px", gap: "12px", pageInline: "20px" },
      typography: { display: "30px", h1: "20px", body: "14px", caption: "11px" },
      radius: { panel: "8px", cta: "999px" },
    },
    tree: {
      t: "email",
      children: [
        {
          t: "stack",
          title: "模块",
          box: { pad: "section", radius: "panel", tone: "surface" },
          children: [{ t: "text", content: "hi", role: "body" }],
        },
      ],
    },
  };

  const { template } = astToTemplate(doc, {
    emailId: "e",
    templateId: "e",
    locale: "en-US",
    idPrefix: "t",
  });

  const stack = Object.values(template.blocks).find((b) => b.type === "layout");
  assert.ok(stack?.wrapperStyle);
  assert.equal(isFlatSpacingValue(stack.wrapperStyle.padding), true);
  assert.equal(isFlatBorderValue(stack.wrapperStyle.border), true);
  assert.equal(isFlatBorderRadiusValue(stack.wrapperStyle.borderRadius), true);
  assert.equal("mode" in (stack.wrapperStyle.padding ?? {}), false);
});
