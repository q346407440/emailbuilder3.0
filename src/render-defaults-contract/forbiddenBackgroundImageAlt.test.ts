import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  EmailBlock,
  EmailTemplate,
  WrapperBackgroundImage,
} from "../types/email";
import {
  stripForbiddenBackgroundImageAltFromTemplate,
  validateForbiddenBackgroundImageAlt,
} from "./forbiddenBackgroundImageAlt";
import { validateTemplate } from "../lib/validate";

function templateWithBgAlt(block: EmailBlock): EmailTemplate {
  return {
    schemaVersion: "4.0.0",
    templateId: "t",
    templateVersion: 1,
    rootBlockId: "root",
    blocks: {
      root: {
        id: "root",
        type: "emailRoot",
        parentId: null,
        children: [block.id],
        wrapperStyle: { widthMode: "fill", heightMode: "hug" },
        props: {
          backgroundColor: "#fff",
          width: "600px",
          padding: { mode: "unified", unified: "0" },
          border: { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" },
          gapMode: "fixed",
          gap: "0",
        },
        bindings: {},
      },
      [block.id]: block,
    },
  };
}

describe("forbiddenBackgroundImageAlt", () => {
  it("backgroundImage.alt 与 bindings 应校验失败", () => {
    const block: EmailBlock = {
      id: "img1",
      type: "image",
      parentId: "root",
      children: [],
      wrapperStyle: {
        // 故意保留非法字段以验证运行时校验拒绝（类型已移除该字段）
        backgroundImage: {
          src: "https://example.com/a.jpg",
          alt: "自定义",
          fit: "cover",
        } as unknown as WrapperBackgroundImage,
      },
      props: { direction: "vertical", gapMode: "fixed", gap: "0" },
      bindings: {
        "wrapperStyle.backgroundImage.alt": { slotId: "heroAlt", mode: "variable" },
      },
    };
    const t = templateWithBgAlt(block);
    const issues = validateForbiddenBackgroundImageAlt(t);
    assert.equal(issues.length, 2);
    assert.ok(validateTemplate(t).some((i) => i.path.includes("backgroundImage.alt")));
  });

  it("strip 移除 alt 字段与 bindings", () => {
    const block: EmailBlock = {
      id: "lay1",
      type: "layout",
      parentId: "root",
      children: [],
      wrapperStyle: {
        // 故意保留非法字段以验证运行时校验拒绝（类型已移除该字段）
        backgroundImage: {
          src: "https://example.com/a.jpg",
          alt: "底图",
          link: "",
          fit: "cover",
        } as unknown as WrapperBackgroundImage,
      },
      props: { direction: "vertical", gapMode: "fixed", gap: "0" },
      bindings: {
        "wrapperStyle.backgroundImage.alt": { slotId: "x", mode: "variable" },
      },
    };
    const t = templateWithBgAlt(block);
    assert.equal(stripForbiddenBackgroundImageAltFromTemplate(t), true);
    assert.equal("alt" in (t.blocks.lay1!.wrapperStyle!.backgroundImage as object), false);
    assert.equal(t.blocks.lay1!.bindings?.["wrapperStyle.backgroundImage.alt"], undefined);
    assert.deepEqual(validateForbiddenBackgroundImageAlt(t), []);
  });
});
