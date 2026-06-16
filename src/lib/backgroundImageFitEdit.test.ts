import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  EmailBlock,
  EmailPayload,
  EmailTemplate,
  WrapperBackgroundImage,
} from "../types/email";
import { applyBackgroundImageFitChange } from "./backgroundImageFitEdit";
import {
  backgroundImageFitUsesPosition,
  stripBackgroundImagePositionWhenContainFromTemplate,
  validateForbiddenBackgroundImagePositionWhenContain,
} from "../render-defaults-contract/backgroundImageFitSemantics";
import { validateTemplate } from "./validate";

function imageBlock(fit: string, position?: string): EmailBlock {
  return {
    id: "img1",
    type: "image",
    parentId: "root",
    children: [],
    wrapperStyle: {
      // fit 取自 string 参数以覆盖任意取值分支，类型已收窄为字面量联合，故局部转换
      backgroundImage: {
        src: "https://example.com/a.jpg",
        fit,
        ...(position !== undefined ? { position } : {}),
      } as unknown as WrapperBackgroundImage,
    },
    props: { direction: "vertical", gapMode: "fixed", gap: "0" },
    bindings: {},
  };
}

function minimalTemplate(block: EmailBlock): EmailTemplate {
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

describe("backgroundImageFitSemantics", () => {
  it("contain 不使用 position 配置", () => {
    assert.equal(backgroundImageFitUsesPosition("contain"), false);
    assert.equal(backgroundImageFitUsesPosition("cover"), true);
    assert.equal(backgroundImageFitUsesPosition(undefined), true);
  });

  it("contain 且带 position 应校验失败", () => {
    const t = minimalTemplate(imageBlock("contain", "left top"));
    assert.equal(validateForbiddenBackgroundImagePositionWhenContain(t).length, 1);
    assert.ok(validateTemplate(t).some((i) => i.path.includes("backgroundImage.position")));
  });

  it("切换为 contain 时剥离 position", () => {
    const t = minimalTemplate(imageBlock("cover", "left top"));
    const p = { schemaVersion: "1.0.0", slots: {}, values: {} } as EmailPayload;
    const next = applyBackgroundImageFitChange(t, p, "img1", "contain");
    const bg = next.template.blocks.img1!.wrapperStyle!.backgroundImage as Record<string, unknown>;
    assert.equal(bg.fit, "contain");
    assert.equal(bg.position, undefined);
    assert.deepEqual(validateForbiddenBackgroundImagePositionWhenContain(next.template), []);
  });

  it("迁移脚本逻辑：contain 块剥离 position", () => {
    const t = minimalTemplate(imageBlock("contain", "center"));
    assert.equal(stripBackgroundImagePositionWhenContainFromTemplate(t), true);
    assert.equal(
      (t.blocks.img1!.wrapperStyle!.backgroundImage as Record<string, unknown>).position,
      undefined
    );
  });
});
