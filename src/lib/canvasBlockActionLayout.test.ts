import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeCanvasBlockActionLayout } from "./canvasBlockActionLayout";

describe("computeCanvasBlockActionLayout", () => {
  it("左右相对预览根 block 外缘各 20px，顶部对齐选中块", () => {
    const layout = computeCanvasBlockActionLayout({
      stageRect: { top: 100, left: 50, right: 650, bottom: 800 } as DOMRect,
      previewRootRect: { top: 124, left: 200, right: 800, bottom: 700 } as DOMRect,
      selectedBlockRect: { top: 180, left: 220, right: 780, bottom: 220 } as DOMRect,
      insetX: 20,
      insertColumnWidth: 104,
    });
    assert.equal(layout.top, 80);
    assert.equal(layout.insertLeft, 200 - 50 - 20 - 104);
    assert.equal(layout.deleteLeft, 800 - 50 + 20);
  });
});
