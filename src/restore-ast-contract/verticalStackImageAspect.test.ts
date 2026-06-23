import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { astToTemplate } from "./astToTemplate";
import { shouldDeriveFixedImageBoxFromAspect } from "./rowInlineImageBox";
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

describe("shouldDeriveFixedImageBoxFromAspect", () => {
  test("横排 row 内一律推导", () => {
    assert.equal(shouldDeriveFixedImageBoxFromAspect({ inHorizontalRow: true }, {}), true);
  });

  test("任意父级下写了 aspect 即推导", () => {
    assert.equal(
      shouldDeriveFixedImageBoxFromAspect({}, { aspect: { w: 135, h: 40 } }),
      true
    );
  });

  test("hug 父级 + 显式定高推导", () => {
    assert.equal(
      shouldDeriveFixedImageBoxFromAspect(
        { parentWidthHug: true },
        { height: { px: 32 } }
      ),
      true
    );
  });

  test("hug 父级但无显式定高不推导", () => {
    assert.equal(shouldDeriveFixedImageBoxFromAspect({ parentWidthHug: true }, {}), false);
  });
});

describe("纵排 hug stack 内 badge image", () => {
  test("aspect + 定高 → reconcile 后仍为 fixed 宽", () => {
    const doc: RestoreAstDocument = {
      theme,
      tree: {
        t: "email",
        children: [
          {
            t: "row",
            title: "页脚行",
            align: "between",
            children: [
              { t: "text", content: "左栏", role: "body" },
              {
                t: "stack",
                title: "下载徽章列",
                children: [
                  {
                    t: "image",
                    query: "app-store-badge",
                    height: { px: 32 },
                    aspect: { w: 135, h: 40 },
                  },
                  {
                    t: "image",
                    query: "google-play-badge",
                    height: { px: 32 },
                    aspect: { w: 135, h: 40 },
                  },
                ],
              },
            ],
          },
        ],
      },
    };

    const { template } = astToTemplate(doc, astOpts);
    const images = Object.values(template.blocks).filter((b) => b.type === "image");
    assert.equal(images.length, 2);
    for (const img of images) {
      assert.equal(img.wrapperStyle?.widthMode, "fixed");
      assert.equal(img.wrapperStyle?.width, "108px");
      assert.equal(img.wrapperStyle?.height, "32px");
    }
  });

  test("hug 父级 + 仅定高无 aspect → fixed 宽不低于下限", () => {
    const doc: RestoreAstDocument = {
      theme,
      tree: {
        t: "email",
        children: [
          {
            t: "row",
            title: "页脚行",
            children: [
              {
                t: "stack",
                title: "徽章列",
                children: [{ t: "image", query: "badge", height: { px: 32 } }],
              },
            ],
          },
        ],
      },
    };

    const { template } = astToTemplate(doc, astOpts);
    const image = Object.values(template.blocks).find((b) => b.type === "image");
    assert.ok(image);
    assert.equal(image!.wrapperStyle?.widthMode, "fixed");
    assert.equal(image!.wrapperStyle?.width, "72px");
    assert.equal(image!.wrapperStyle?.height, "32px");
  });
});
