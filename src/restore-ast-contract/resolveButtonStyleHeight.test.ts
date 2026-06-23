import assert from "node:assert/strict";
import { test } from "node:test";
import { RESTORE_AST_BUTTON_RELAXED_HEIGHT_PX } from "./buttonHeight";
import { astToTemplate } from "./astToTemplate";
import { resolveButtonStyleHeight } from "./resolveValue";
import type { RestoreAstDocument } from "./types";

test("resolveButtonStyleHeight 缺省 → hug", () => {
  assert.deepEqual(resolveButtonStyleHeight(undefined), { heightMode: "hug" });
});

test("resolveButtonStyleHeight hug → hug", () => {
  assert.deepEqual(resolveButtonStyleHeight("hug"), { heightMode: "hug" });
});

test("resolveButtonStyleHeight relaxed → fixed + 固定 px", () => {
  assert.deepEqual(resolveButtonStyleHeight("relaxed"), {
    heightMode: "fixed",
    heightPx: `${RESTORE_AST_BUTTON_RELAXED_HEIGHT_PX}px`,
  });
});

test("resolveButtonStyleHeight 非法值 → hug", () => {
  assert.deepEqual(resolveButtonStyleHeight("fill"), { heightMode: "hug" });
  assert.deepEqual(resolveButtonStyleHeight({ px: 52 }), { heightMode: "hug" });
  assert.deepEqual(resolveButtonStyleHeight("tall"), { heightMode: "hug" });
});

test("astToTemplate 组装 button height relaxed → fixed px", () => {
  const doc: RestoreAstDocument = {
    theme: { colors: { primary: "#111111", surface: "#ffffff", secondary: "#cccccc" } },
    tree: {
      t: "email",
      children: [
        { t: "button", label: "Shop Now", width: "fill", height: "relaxed" },
      ],
    },
  };
  const { template } = astToTemplate(doc, {
    emailId: "e",
    templateId: "e",
    locale: "en-US",
    idPrefix: "t",
  });
  const button = Object.values(template.blocks).find((b) => b.type === "button");
  const buttonStyle = (button?.props as { buttonStyle?: Record<string, unknown> }).buttonStyle;
  assert.equal(buttonStyle?.widthMode, "fill");
  assert.equal(buttonStyle?.heightMode, "fixed");
  assert.equal(buttonStyle?.height, `${RESTORE_AST_BUTTON_RELAXED_HEIGHT_PX}px`);
});

test("astToTemplate 组装 button 未写 height → hug", () => {
  const doc: RestoreAstDocument = {
    theme: { colors: { primary: "#111111", surface: "#ffffff", secondary: "#cccccc" } },
    tree: {
      t: "email",
      children: [{ t: "button", label: "Shop Now", width: "fill" }],
    },
  };
  const { template } = astToTemplate(doc, {
    emailId: "e",
    templateId: "e",
    locale: "en-US",
    idPrefix: "t",
  });
  const button = Object.values(template.blocks).find((b) => b.type === "button");
  const buttonStyle = (button?.props as { buttonStyle?: Record<string, unknown> }).buttonStyle;
  assert.equal(buttonStyle?.widthMode, "fill");
  assert.equal(buttonStyle?.heightMode, "hug");
  assert.equal(buttonStyle?.height, undefined);
});
