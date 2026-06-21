import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeCanvasBlockActionLayout,
  estimateCanvasBlockActionColumnHeight,
  pickCanvasBlockActionHorizontalAnchorRect,
  resolveCanvasBlockActionVerticalLayout,
} from "./canvasBlockActionLayout";
import {
  EMAIL_CANVAS_BLOCK_ACTION_BUTTON_GAP,
  EMAIL_CANVAS_BLOCK_ACTION_BUTTON_HEIGHT,
} from "../editor-canvas-contract/values";

describe("estimateCanvasBlockActionColumnHeight", () => {
  it("6 个按钮列高 = 6×高 + 5×间距", () => {
    const h = estimateCanvasBlockActionColumnHeight(6);
    assert.equal(
      h,
      6 * EMAIL_CANVAS_BLOCK_ACTION_BUTTON_HEIGHT + 5 * EMAIL_CANVAS_BLOCK_ACTION_BUTTON_GAP
    );
  });
});

describe("resolveCanvasBlockActionVerticalLayout", () => {
  it("下方空间充足时顶对齐块顶", () => {
    const result = resolveCanvasBlockActionVerticalLayout({
      blockTopInStage: 80,
      blockBottomInStage: 120,
      stageHeight: 700,
      maxColumnHeight: 100,
    });
    assert.equal(result.top, 80);
    assert.equal(result.verticalAlign, "top");
  });

  it("顶对齐会超出 stage 底边时改底对齐块底", () => {
    const columnHeight =
      6 * EMAIL_CANVAS_BLOCK_ACTION_BUTTON_HEIGHT + 5 * EMAIL_CANVAS_BLOCK_ACTION_BUTTON_GAP;
    const blockTopInStage = 320;
    const blockBottomInStage = 360;
    const result = resolveCanvasBlockActionVerticalLayout({
      blockTopInStage,
      blockBottomInStage,
      stageHeight: 400,
      maxColumnHeight: columnHeight,
    });
    assert.equal(result.verticalAlign, "bottom");
    assert.equal(result.top, blockBottomInStage - columnHeight);
    assert.ok(result.top < blockTopInStage);
  });
});

describe("computeCanvasBlockActionLayout", () => {
  it("左右相对预览根 block 外缘各 20px，顶部对齐选中块", () => {
    const layout = computeCanvasBlockActionLayout({
      stageRect: { top: 100, left: 50, right: 650, bottom: 800, height: 700 } as DOMRect,
      horizontalAnchorRect: { top: 124, left: 200, right: 800, bottom: 700 } as DOMRect,
      selectedBlockRect: { top: 180, left: 220, right: 780, bottom: 220 } as DOMRect,
      insetX: 20,
      insertColumnWidth: 104,
    });
    assert.equal(layout.insert.top, 180);
    assert.equal(layout.insert.verticalAlign, "top");
    assert.equal(layout.insertLeft, 200 - 20 - 104);
    assert.equal(layout.deleteLeft, 800 + 20);
  });

  it("选中块靠近 stage 底边时左列底对齐块底", () => {
    const stageRect = { top: 100, left: 50, right: 650, bottom: 500, height: 400 } as DOMRect;
    const columnHeight =
      6 * EMAIL_CANVAS_BLOCK_ACTION_BUTTON_HEIGHT + 5 * EMAIL_CANVAS_BLOCK_ACTION_BUTTON_GAP;
    const blockTopInStage = 320;
    const blockBottomInStage = 360;
    const layout = computeCanvasBlockActionLayout({
      stageRect,
      horizontalAnchorRect: { top: 124, left: 200, right: 800, bottom: 700 } as DOMRect,
      selectedBlockRect: {
        top: stageRect.top + blockTopInStage,
        left: 220,
        right: 780,
        bottom: stageRect.top + blockBottomInStage,
      } as DOMRect,
      insertButtonCount: 6,
      deleteButtonCount: 1,
    });
    assert.equal(layout.insert.verticalAlign, "bottom");
    assert.equal(layout.insert.top, stageRect.top + (blockBottomInStage - columnHeight));
    assert.equal(layout.delete.verticalAlign, "top");
  });

  it("移动预览：水平锚点用视窗而非 600px 根外壳右缘", () => {
    const rootRect = { top: 124, left: 88, right: 688, bottom: 700 } as DOMRect;
    const viewportRect = { top: 124, left: 200, right: 575, bottom: 700 } as DOMRect;
    const anchor = pickCanvasBlockActionHorizontalAnchorRect({
      previewViewportPx: 375,
      rootConfiguredWidthPx: 600,
      previewRootRect: rootRect,
      previewViewportRect: viewportRect,
    });
    assert.equal(anchor, viewportRect);
    const layout = computeCanvasBlockActionLayout({
      stageRect: { top: 100, left: 50, right: 650, bottom: 800, height: 700 } as DOMRect,
      horizontalAnchorRect: anchor,
      selectedBlockRect: { top: 180, left: 220, right: 400, bottom: 220 } as DOMRect,
      insetX: 20,
      insertColumnWidth: 104,
    });
    assert.equal(layout.deleteLeft, 575 + 20);
    assert.notEqual(layout.deleteLeft, 688 + 20);
  });
});
