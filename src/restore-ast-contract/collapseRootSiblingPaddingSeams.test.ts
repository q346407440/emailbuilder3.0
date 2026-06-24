import assert from "node:assert/strict";
import { test } from "node:test";
import type { EmailTemplate } from "../types/email";
import { spacingUniform } from "../lib/boxModelFlat";
import { collapseRootSiblingPaddingSeams } from "./collapseRootSiblingPaddingSeams";

const theme = {
  colors: {
    primary: "#000",
    accent: "#00f",
    secondary: "#666",
    surface: "#fff",
  },
  spacing: { section: "24px", gap: "12px", pageInline: "16px" },
  typography: { display: "32px", h1: "18px", body: "14px", caption: "11px" },
  radius: { panel: "8px", cta: "999px" },
};

function shellBlock(
  id: string,
  parentId: string,
  bg: string | undefined,
  pad: string | { $themeRef: string }
): EmailTemplate["blocks"][string] {
  const padding = spacingUniform(pad);
  return {
    id,
    type: "layout",
    parentId,
    children: [],
    props: { direction: "vertical", gapMode: "fixed", gap: "12px" },
    wrapperStyle: {
      ...(bg !== undefined ? { backgroundColor: bg } : {}),
      padding,
    },
    bindings:
      typeof pad === "object"
        ? {
            "wrapperStyle.padding.top": {
              slotId: "spacing.section",
              mode: "theme",
              tokenPath: "tokens.spacing.section",
              fieldKind: "style",
            },
            "wrapperStyle.padding.right": {
              slotId: "spacing.section",
              mode: "theme",
              tokenPath: "tokens.spacing.section",
              fieldKind: "style",
            },
            "wrapperStyle.padding.bottom": {
              slotId: "spacing.section",
              mode: "theme",
              tokenPath: "tokens.spacing.section",
              fieldKind: "style",
            },
            "wrapperStyle.padding.left": {
              slotId: "spacing.section",
              mode: "theme",
              tokenPath: "tokens.spacing.section",
              fieldKind: "style",
            },
          }
        : undefined,
  };
}

function minimalTemplate(children: EmailTemplate["blocks"][string][]): EmailTemplate {
  const rootId = "root";
  const blocks: EmailTemplate["blocks"] = {
    [rootId]: {
      id: rootId,
      type: "emailRoot",
      parentId: null,
      children: children.map((c) => c.id),
      props: { width: "600px", gap: "0", gapMode: "fixed" },
    },
  };
  for (const child of children) {
    blocks[child.id] = { ...child, parentId: rootId };
    blocks[rootId]!.blockMeta = undefined;
  }
  const blockMeta: NonNullable<EmailTemplate["blockMeta"]> = {
    [rootId]: { blockType: "layout.container", name: "根" },
  };
  for (const child of children) {
    blockMeta[child.id] = { blockType: "layout.container", name: child.id };
  }
  return {
    schemaVersion: "4.0.0",
    emailId: "e",
    templateId: "e",
    templateVersion: 1,
    locale: "en-US",
    rootBlockId: rootId,
    blockMeta,
    blocks,
  };
}

test("相邻同色同 padding → bottom/top 折半（四边平铺）", () => {
  const tpl = minimalTemplate([
    shellBlock("a", "root", "#F0F0F0", { $themeRef: "tokens.spacing.section" }),
    shellBlock("b", "root", "#F0F0F0", { $themeRef: "tokens.spacing.section" }),
  ]);
  tpl.blocks.a!.wrapperStyle!.backgroundColor = "#F0F0F0";
  tpl.blocks.b!.wrapperStyle!.backgroundColor = "#F0F0F0";

  const out = collapseRootSiblingPaddingSeams(tpl, theme);
  assert.equal(out.blocks.a!.wrapperStyle!.padding!.bottom, "12px");
  assert.equal(out.blocks.b!.wrapperStyle!.padding!.top, "12px");
  assert.deepEqual(out.blocks.a!.wrapperStyle!.padding!.top, {
    $themeRef: "tokens.spacing.section",
  });
  assert.equal("mode" in (out.blocks.a!.wrapperStyle!.padding ?? {}), false);
});

test("底色不同 → 不折叠", () => {
  const tpl = minimalTemplate([
    shellBlock("a", "root", "#F0F0F0", "24px"),
    shellBlock("b", "root", "#FFFFFF", "24px"),
  ]);
  const out = collapseRootSiblingPaddingSeams(tpl, theme);
  assert.equal(out.blocks.a!.wrapperStyle!.padding!.top, "24px");
  assert.equal(out.blocks.b!.wrapperStyle!.padding!.top, "24px");
});

test("未写底色、相邻同 padding → 视为画布默认色同色并折半", () => {
  const tpl = minimalTemplate([
    shellBlock("a", "root", undefined, { $themeRef: "tokens.spacing.section" }),
    shellBlock("b", "root", undefined, { $themeRef: "tokens.spacing.section" }),
  ]);
  const out = collapseRootSiblingPaddingSeams(tpl, theme);
  assert.equal(out.blocks.a!.wrapperStyle!.padding!.bottom, "12px");
  assert.equal(out.blocks.b!.wrapperStyle!.padding!.top, "12px");
});

test("padding 不同 → 不折叠", () => {
  const tpl = minimalTemplate([
    shellBlock("a", "root", "#ccc", "24px"),
    shellBlock("b", "root", "#ccc", "12px"),
  ]);
  const out = collapseRootSiblingPaddingSeams(tpl, theme);
  assert.equal(out.blocks.a!.wrapperStyle!.padding!.bottom, "24px");
  assert.equal(out.blocks.b!.wrapperStyle!.padding!.top, "12px");
});
