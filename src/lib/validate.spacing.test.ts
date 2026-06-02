import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { validateTemplate } from "./validate";
import type { EmailTemplate } from "../types/email";

function minimalTemplate(blockPadding: unknown): EmailTemplate {
  return {
    schemaVersion: "4.0.0",
    emailId: "spacing_test",
    templateId: "spacing_test",
    templateVersion: 1,
    locale: "en-US",
    rootBlockId: "root",
    blocks: {
      root: {
        id: "root",
        type: "emailRoot",
        parentId: null,
        children: ["box"],
        props: {
          width: "600px",
          padding: { mode: "unified", unified: "0" },
        },
      },
      box: {
        id: "box",
        type: "layout",
        parentId: "root",
        children: [],
        wrapperStyle: {
          widthMode: "fill",
          heightMode: "hug",
          contentAlign: { horizontal: "left", vertical: "top" },
          padding: blockPadding,
          border: { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" },
          borderRadius: { mode: "unified", radius: "0" },
        },
        props: { direction: "vertical", gapMode: "fixed", gap: "0" },
      },
    },
  } as EmailTemplate;
}

describe("validateSpacingValue · unified 仅允许单边长度", () => {
  test("unified 单值通过", () => {
    const issues = validateTemplate(
      minimalTemplate({ mode: "unified", unified: "8px" })
    );
    assert.equal(
      issues.some((i) => i.path.includes("padding") && i.reason.includes("多值简写")),
      false
    );
  });

  test("unified 四值简写失败", () => {
    const issues = validateTemplate(
      minimalTemplate({ mode: "unified", unified: "8px 0 0 0" })
    );
    assert.ok(
      issues.some(
        (i) =>
          i.path === "blocks.box.wrapperStyle.padding.unified" &&
          i.reason.includes("separate")
      )
    );
  });

  test("separate 四边独立通过", () => {
    const issues = validateTemplate(
      minimalTemplate({
        mode: "separate",
        top: "8px",
        right: "0",
        bottom: "0",
        left: "0",
      })
    );
    assert.equal(
      issues.some((i) => i.path.includes("padding") && i.reason.includes("多值简写")),
      false
    );
  });
});
