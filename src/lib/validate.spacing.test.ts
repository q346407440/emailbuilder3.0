import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { validateTemplate } from "./validate";
import type { EmailTemplate } from "../types/email";
import { borderNoneFlat, borderRadiusZeroFlat, spacingZero } from "./boxModelFlat";

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
          padding: spacingZero(),
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
          border: borderNoneFlat(),
          borderRadius: borderRadiusZeroFlat(),
        },
        props: { direction: "vertical", gapMode: "fixed", gap: "0" },
      },
    },
  } as EmailTemplate;
}

describe("validateSpacingValue · 四边平铺", () => {
  test("四边字面量通过", () => {
    const issues = validateTemplate(
      minimalTemplate({
        top: "8px",
        right: "8px",
        bottom: "8px",
        left: "8px",
      })
    );
    assert.equal(
      issues.some((i) => i.path.includes("padding")),
      false
    );
  });

  test("单边 CSS 多值简写失败", () => {
    const issues = validateTemplate(
      minimalTemplate({
        top: "8px 0 0 0",
        right: "0",
        bottom: "0",
        left: "0",
      })
    );
    assert.ok(
      issues.some(
        (i) =>
          i.path === "blocks.box.wrapperStyle.padding.top" &&
          i.reason.includes("多值简写")
      )
    );
  });

  test("legacy mode: unified 拒绝", () => {
    const issues = validateTemplate(
      minimalTemplate({ mode: "unified", unified: "8px" })
    );
    assert.ok(
      issues.some(
        (i) =>
          i.path === "blocks.box.wrapperStyle.padding" &&
          i.reason.includes("mode: unified/separate")
      )
    );
  });

  test("四边独立平铺通过", () => {
    const issues = validateTemplate(
      minimalTemplate({
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
