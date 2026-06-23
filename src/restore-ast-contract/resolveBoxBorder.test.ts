import assert from "node:assert/strict";
import { test } from "node:test";
import { applyBoxWrapper, resolveBoxBorder } from "./resolveValue";
import { astToTemplate } from "./astToTemplate";
import type { RestoreAstDocument } from "./types";

const theme: RestoreAstDocument["theme"] = {
  colors: { primary: "#111", accent: "#222", secondary: "#999999", surface: "#fff" },
  spacing: { section: "24px", gap: "12px", pageInline: "20px" },
  typography: { display: "30px", h1: "20px", body: "14px", caption: "11px" },
  radius: { panel: "8px", cta: "999px" },
};

test("resolveBoxBorder hairline 默认 secondary 色与 1px 实线", () => {
  const applied = resolveBoxBorder("wrapperStyle.border", "hairline");
  assert.equal(applied.border.style, "solid");
  assert.equal(applied.border.top, "1px");
  assert.deepEqual(applied.border.color, { $themeRef: "colors.secondary" });
  assert.ok(applied.bindings?.["wrapperStyle.border.color"]);
});

test("resolveBoxBorder thin 为 2px 实线", () => {
  const applied = resolveBoxBorder("wrapperStyle.border", "thin");
  assert.equal(applied.border.top, "2px");
});

test("resolveBoxBorder dashed-hairline 为 1px 虚线", () => {
  const applied = resolveBoxBorder("wrapperStyle.border", "dashed-hairline");
  assert.equal(applied.border.style, "dashed");
  assert.equal(applied.border.top, "1px");
});

test("applyBoxWrapper 写入 border 与 borderRadius", () => {
  const applied = applyBoxWrapper("wrapperStyle", {
    radius: { px: 999 },
    pad: { px: 12 },
    border: "thin",
    borderTone: "secondary",
  });
  assert.equal(applied.wrapperExtras.borderRadius?.topLeft, "999px");
  assert.equal(applied.wrapperExtras.padding?.top, "12px");
  assert.equal(applied.wrapperExtras.border?.top, "2px");
  assert.deepEqual(applied.wrapperExtras.border?.color, { $themeRef: "colors.secondary" });
});

test("astToTemplate 横排描边圆标 stack 落盘 border 与 hug 宽", () => {
  const doc: RestoreAstDocument = {
    theme,
    tree: {
      t: "email",
      children: [
        {
          t: "stack",
          title: "评分区",
          align: "center",
          box: { pad: "section", radius: "panel", border: "hairline", borderTone: "secondary" },
          children: [
            {
              t: "row",
              title: "选项行",
              align: "center",
              gap: "gap",
              children: [
                {
                  t: "stack",
                  title: "圆标1",
                  align: "center",
                  box: {
                    radius: { px: 999 },
                    pad: { px: 12 },
                    border: "thin",
                    borderTone: "secondary",
                  },
                  children: [{ t: "text", content: "1", role: "body" }],
                },
              ],
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
    idPrefix: "t",
  });

  const moduleId = Object.keys(template.blockMeta ?? {}).find(
    (id) => template.blockMeta![id]?.name === "评分区模块"
  );
  const chipId = Object.keys(template.blockMeta ?? {}).find(
    (id) => template.blockMeta![id]?.name === "圆标1"
  );
  assert.ok(moduleId);
  assert.ok(chipId);
  const moduleBlock = template.blocks[moduleId!];
  const chipBlock = template.blocks[chipId!];
  assert.equal(moduleBlock!.wrapperStyle?.border?.top, "1px");
  assert.equal(chipBlock!.wrapperStyle?.border?.top, "2px");
  assert.equal(chipBlock!.wrapperStyle?.borderRadius?.topLeft, "999px");
  assert.equal(chipBlock!.wrapperStyle?.widthMode, "hug");
  assert.equal(chipBlock!.wrapperStyle?.contentAlign?.vertical, "center");
});
