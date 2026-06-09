import test from "node:test";
import assert from "node:assert/strict";
import { lintManualRestoreTemplate } from "./mjsVisualLint";

function textNode(id: string, name: string, fontSize: string) {
  return {
    id,
    type: "text",
    blockMeta: { blockType: "content.text", name },
    props: {
      textBody: { paragraphs: [{ runs: [{ text: name }] }] },
      fontSize,
      color: "#000",
      bold: false,
      italic: false,
      decoration: "none",
    },
    wrapperStyle: { widthMode: "fill", heightMode: "hug" },
  };
}

test("lintManualRestoreTemplate 拦截占位图片与默认大尺寸", () => {
  const issues = lintManualRestoreTemplate({
    root: {
      id: "root",
      children: [
        {
          id: "hero",
          type: "image",
          blockMeta: { blockType: "content.image", name: "首屏图" },
          wrapperStyle: {
            height: "480px",
            backgroundImage: { src: "#", alt: "hero" },
          },
        },
      ],
    },
  });

  assert.ok(issues.some((item) => item.code === "asset.placeholderSrc"));
  assert.ok(issues.some((item) => item.code === "layout.heroTooTall"));
});

test("lintManualRestoreTemplate 识别页脚字号过大与 auto gap", () => {
  const issues = lintManualRestoreTemplate({
    root: {
      id: "root",
      children: [
        {
          id: "footer-row",
          type: "layout",
          blockMeta: { blockType: "layout.container", name: "页脚链接行" },
          props: { direction: "horizontal", gapMode: "fixed", gap: "auto" },
          wrapperStyle: { widthMode: "fill", heightMode: "hug" },
          children: [textNode("privacy", "Privacy Statement", "12px")],
        },
      ],
    },
  });

  assert.ok(issues.some((item) => item.code === "layout.unsupportedAutoGap"));
  assert.ok(issues.some((item) => item.code === "typography.footerTooLarge"));
});

test("lintManualRestoreTemplate 识别裸社媒图标和空 App glyph", () => {
  const issues = lintManualRestoreTemplate({
    root: {
      id: "root",
      children: [
        {
          id: "social-row",
          type: "layout",
          blockMeta: { blockType: "layout.container", name: "社媒图标行" },
          props: { direction: "horizontal", gapMode: "fixed", gap: "16px" },
          wrapperStyle: { widthMode: "fill", heightMode: "hug" },
          children: [
            {
              id: "instagram",
              type: "icon",
              blockMeta: { blockType: "content.icon", name: "Instagram" },
              props: { src: "https://cdn.example/icon.svg", size: "32px", color: "#000" },
              wrapperStyle: { widthMode: "hug", heightMode: "hug" },
            },
          ],
        },
        {
          id: "app-logo",
          type: "layout",
          blockMeta: { blockType: "layout.container", name: "App 图标" },
          wrapperStyle: { widthMode: "fixed", heightMode: "fixed" },
          children: [],
        },
      ],
    },
  });

  assert.ok(issues.some((item) => item.code === "icon.missingBox"));
  assert.ok(issues.some((item) => item.code === "icon.emptyAppGlyph"));
});
