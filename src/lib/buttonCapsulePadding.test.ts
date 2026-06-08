import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BUTTON_INNER_LINE_HEIGHT,
  BUTTON_INNER_PADDING,
} from "../render-defaults-contract/values";

/** 与 EmailPreview 按钮胶囊 inline style 对齐，用于 DOM 回归。 */
function applyButtonCapsuleStyles(anchor: HTMLAnchorElement, fontSize = "16px") {
  anchor.style.display = "inline-block";
  anchor.style.boxSizing = "border-box";
  anchor.style.padding = BUTTON_INNER_PADDING;
  anchor.style.lineHeight = BUTTON_INNER_LINE_HEIGHT;
  anchor.style.fontSize = fontSize;
  anchor.style.fontFamily = "Arial, sans-serif";
  anchor.style.border = "1px solid #000";
}

describe("buttonCapsulePadding", () => {
  it("显式 lineHeight 使 td anti-strut 下垂直 padding 生效", () => {
    if (typeof document === "undefined") return;

    const td = document.createElement("td");
    td.style.lineHeight = "0";
    td.style.fontSize = "0";

    const anchor = document.createElement("a");
    anchor.textContent = "按钮";
    applyButtonCapsuleStyles(anchor);
    td.appendChild(anchor);
    document.body.appendChild(td);

    try {
      const cs = getComputedStyle(anchor);
      assert.equal(cs.paddingTop, "8px");
      assert.equal(cs.paddingBottom, "8px");
      assert.notEqual(cs.lineHeight, "0px");

      const anchorRect = anchor.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(anchor);
      const textRect = range.getClientRects()[0]!;
      const topGap = textRect.top - anchorRect.top;
      const bottomGap = anchorRect.bottom - textRect.bottom;

      assert.ok(topGap >= 6, `上侧视觉空隙应约 8px，实际 ${topGap}`);
      assert.ok(bottomGap >= 6, `下侧视觉空隙应约 8px，实际 ${bottomGap}`);
      assert.ok(anchorRect.height >= textRect.height + 14, "胶囊高度应大于文字 + 上下 padding");
    } finally {
      td.remove();
    }
  });
});
