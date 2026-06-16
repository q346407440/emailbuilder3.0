import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailTemplate, WrapperBackgroundImage } from "../types/email";
import {
  stripForbiddenBackgroundImageChromeFromTemplate,
  validateForbiddenBackgroundImageChrome,
  WRAPPER_BACKGROUND_IMAGE_CHROME_FORBIDDEN_REASON,
} from "./forbiddenBackgroundImageChrome";

function makeTemplate(blocks: EmailTemplate["blocks"]): EmailTemplate {
  return {
    schemaVersion: "4.0.0",
    templateId: "t",
    templateVersion: 1,
    rootBlockId: "root",
    blocks,
  };
}

describe("forbiddenBackgroundImageChrome", () => {
  it("backgroundImage.border / borderRadius 与对应 bindings 应报错", () => {
    const t = makeTemplate({
      img: {
        id: "img",
        type: "image",
        parentId: "root",
        children: [],
        wrapperStyle: {
          // 故意保留非法字段以验证运行时校验拒绝（类型已移除该字段）
          backgroundImage: {
            src: "https://example.com/x.jpg",
            fit: "cover",
            border: { mode: "unified", width: "0", style: "solid", color: "#000" },
            borderRadius: { mode: "unified", radius: "8px" },
          } as unknown as WrapperBackgroundImage,
        },
        props: {},
        bindings: {
          "wrapperStyle.backgroundImage.borderRadius.radius": {
            slotId: "r",
            mode: "theme",
            tokenPath: "tokens.radius.md",
            fieldKind: "style",
          },
        },
      },
    });
    const issues = validateForbiddenBackgroundImageChrome(t);
    assert.ok(issues.length >= 3);
    assert.ok(
      issues.every((i) => i.reason === WRAPPER_BACKGROUND_IMAGE_CHROME_FORBIDDEN_REASON)
    );
  });

  it("剥离后提升字面量圆角并 remap bindings 到 wrapperStyle", () => {
    const t = makeTemplate({
      img: {
        id: "img",
        type: "image",
        parentId: "root",
        children: [],
        wrapperStyle: {
          // 故意保留非法字段以验证运行时校验拒绝（类型已移除该字段）
          backgroundImage: {
            src: "https://example.com/x.jpg",
            fit: "cover",
            borderRadius: { mode: "unified", radius: "12px" },
            border: { mode: "unified", width: "0", style: "solid", color: "#000" },
          } as unknown as WrapperBackgroundImage,
        },
        props: {},
        bindings: {
          "wrapperStyle.backgroundImage.borderRadius.radius": {
            slotId: "tokens.radius.panel",
            mode: "theme",
            tokenPath: "tokens.radius.panel",
            fieldKind: "style",
          },
        },
      },
    });
    assert.equal(stripForbiddenBackgroundImageChromeFromTemplate(t), true);
    const bg = t.blocks.img?.wrapperStyle?.backgroundImage as Record<string, unknown>;
    assert.equal("border" in bg, false);
    assert.equal("borderRadius" in bg, false);
    assert.deepEqual(t.blocks.img?.wrapperStyle?.borderRadius, {
      mode: "unified",
      radius: "12px",
    });
    assert.equal(
      "wrapperStyle.backgroundImage.borderRadius.radius" in (t.blocks.img?.bindings ?? {}),
      false
    );
    assert.ok(t.blocks.img?.bindings?.["wrapperStyle.borderRadius.radius"]);
    assert.deepEqual(validateForbiddenBackgroundImageChrome(t), []);
  });
});
