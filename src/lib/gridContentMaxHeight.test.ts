import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailTemplate } from "../types/email";
import {
  computeGridRowHeightsWithFillStretch,
  gridDataRowUsesFillStretch,
  gridMatrixHasFillStretchRow,
  gridRowHasFillHeightChild,
  gridRowHeightsStable,
  stabilizeGridRowHeights,
} from "./gridContentMaxHeight";

function miniTemplate(blocks: EmailTemplate["blocks"]): EmailTemplate {
  return {
    rootBlockId: "root",
    blocks,
    bindings: {},
    blockMeta: {},
  };
}

describe("gridContentMaxHeight", () => {
  it("stabilizeGridRowHeights 在 1px 内保持上一轮值", () => {
    assert.deepEqual(stabilizeGridRowHeights([101, 200], [100, 199]), [100, 199]);
    assert.deepEqual(stabilizeGridRowHeights([103, 200], [100, 199]), [103, 199]);
  });

  it("gridRowHeightsStable 判断行高数组是否稳定", () => {
    assert.equal(gridRowHeightsStable([100, 200], [100, 200]), true);
    assert.equal(gridRowHeightsStable([101, 200], [100, 200]), true);
    assert.equal(gridRowHeightsStable([102, 200], [100, 200]), false);
  });

  it("gridRowHasFillHeightChild 检测行内 fill 高子块", () => {
    const t = miniTemplate({
      a: { id: "a", type: "text", parentId: "g", children: [], wrapperStyle: { heightMode: "fill" } },
      b: { id: "b", type: "text", parentId: "g", children: [], wrapperStyle: { heightMode: "hug" } },
    } as EmailTemplate["blocks"]);
    assert.equal(gridRowHasFillHeightChild(t, ["a"]), true);
    assert.equal(gridRowHasFillHeightChild(t, ["b"]), false);
  });

  it("gridDataRowUsesFillStretch：定高栅格 + fill 子块 + content-max 为 true", () => {
    const t = miniTemplate({
      dot: {
        id: "dot",
        type: "text",
        parentId: "g",
        children: [],
        wrapperStyle: { heightMode: "fill" },
      },
    } as EmailTemplate["blocks"]);
    assert.equal(
      gridDataRowUsesFillStretch(t, ["dot"], { heightMode: "fixed", height: "72px" }, "content-max"),
      true
    );
    assert.equal(
      gridDataRowUsesFillStretch(t, ["dot"], { heightMode: "hug" }, "content-max"),
      false
    );
    assert.equal(
      gridDataRowUsesFillStretch(t, ["dot"], { heightMode: "fixed", height: "72px" }, "fixed"),
      false
    );
  });

  it("computeGridRowHeightsWithFillStretch 为 fill 行分配 host 剩余内高", () => {
    assert.deepEqual(
      computeGridRowHeightsWithFillStretch({
        hostClientHeight: 64,
        measuredContentHeights: [16],
        rowsUseFillStretch: [true],
        verticalGapPx: 0,
      }),
      [64]
    );
    assert.deepEqual(
      computeGridRowHeightsWithFillStretch({
        hostClientHeight: 100,
        measuredContentHeights: [20, 16],
        rowsUseFillStretch: [false, true],
        verticalGapPx: 8,
      }),
      [20, 72]
    );
    assert.deepEqual(
      computeGridRowHeightsWithFillStretch({
        hostClientHeight: 100,
        measuredContentHeights: [16, 16],
        rowsUseFillStretch: [false, false],
        verticalGapPx: 0,
      }),
      [16, 16]
    );
  });

  it("gridMatrixHasFillStretchRow 任一行含 fill 拉伸即为 true", () => {
    const t = miniTemplate({
      dot: {
        id: "dot",
        type: "text",
        parentId: "g",
        children: [],
        wrapperStyle: { heightMode: "fill" },
      },
    } as EmailTemplate["blocks"]);
    assert.equal(
      gridMatrixHasFillStretchRow(t, [["dot"]], { heightMode: "fixed", height: "72px" }, "content-max"),
      true
    );
    assert.equal(
      gridMatrixHasFillStretchRow(t, [["x"]], { heightMode: "fixed", height: "72px" }, "content-max"),
      false
    );
  });
});
