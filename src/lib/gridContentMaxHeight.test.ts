import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailTemplate } from "../types/email";
import { minimalEmailTemplate, minimalTextBlock } from "./testFixtures/emailTemplate";
import {
  computeGridRowHeightsWithFillStretch,
  gridDataRowUsesFillStretch,
  gridMatrixHasFillStretchRow,
  gridRowHasFillHeightChild,
  gridRowHeightsStable,
  measureGridRowContentMaxHeights,
  stabilizeGridRowHeights,
} from "./gridContentMaxHeight";

/**
 * 构造一行假单元格：scrollHeight 模拟表格单元格被「未放开的兄弟单元格」撑住行高的行为
 * —— 当任一兄弟仍锁着 minHeight 时，本格读回的是被拉伸的行高而非自身内容高。
 * 同时模拟格内拖拽占位（insert）在可见时计入内容高。
 */
function makeFakeGridRow(opts: { contents: number[]; lockedPx: number; insertPx?: number }) {
  const { contents, lockedPx, insertPx = 0 } = opts;
  const inserts: { _h: number; style: { display: string } }[] = [];
  const cells: {
    className: string;
    _content: number;
    _insert?: { _h: number; style: { display: string } };
    style: { height: string; minHeight: string };
    readonly scrollHeight: number;
  }[] = [];
  contents.forEach((content, idx) => {
    const insert = idx === 0 && insertPx > 0 ? { _h: insertPx, style: { display: "" } } : undefined;
    if (insert) inserts.push(insert);
    cells.push({
      className: "email-preview-grid-slot",
      _content: content,
      _insert: insert,
      style: { height: `${lockedPx}px`, minHeight: `${lockedPx}px` },
      get scrollHeight() {
        const lockedRow = cells.reduce((m, c) => {
          if (c === this) return m;
          const reset = c.style.height === "auto" && c.style.minHeight === "0";
          return Math.max(m, reset ? 0 : Number.parseInt(c.style.minHeight, 10) || 0);
        }, 0);
        const insertH = this._insert && this._insert.style.display !== "none" ? this._insert._h : 0;
        return Math.max(this._content + insertH, lockedRow);
      },
    });
  });
  const matches = (sel: string, token: string) => sel.includes(token);
  const tr = {
    getAttribute: () => null,
    querySelectorAll: (sel: string) =>
      matches(sel, "email-preview-grid-slot")
        ? cells
        : matches(sel, "email-preview-grid-cell-insert")
          ? inserts
          : [],
  };
  const host = {
    querySelectorAll: (sel: string) => (matches(sel, "tr") ? [tr] : []),
  } as unknown as HTMLTableElement;
  return host;
}

function miniTemplate(blocks: EmailTemplate["blocks"]): EmailTemplate {
  return minimalEmailTemplate({ blocks });
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
      a: minimalTextBlock({ id: "a", parentId: "g", wrapperStyle: { heightMode: "fill" } }),
      b: minimalTextBlock({ id: "b", parentId: "g", wrapperStyle: { heightMode: "hug" } }),
    });
    assert.equal(gridRowHasFillHeightChild(t, ["a"]), true);
    assert.equal(gridRowHasFillHeightChild(t, ["b"]), false);
  });

  it("gridDataRowUsesFillStretch：定高栅格 + fill 子块 + content-max 为 true", () => {
    const t = miniTemplate({
      dot: minimalTextBlock({ id: "dot", parentId: "g", wrapperStyle: { heightMode: "fill" } }),
    });
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

  it("measureGridRowContentMaxHeights 整行放开后量真实内容高，不被锁定的兄弟单元格污染", () => {
    // 兄弟单元格锁在 120px；真实内容最高 100px。逐个放开会读回 120（棘轮），整行放开应得 100。
    const host = makeFakeGridRow({ contents: [100, 50], lockedPx: 120 });
    assert.deepEqual(measureGridRowContentMaxHeights(host), [100]);
  });

  it("measureGridRowContentMaxHeights 测量时排除拖拽插入占位（不计入内容高）", () => {
    // 内容 80，叠加一个 44px 占位；测量须临时隐藏占位，得 80 而非 124。
    const host = makeFakeGridRow({ contents: [80, 40], lockedPx: 0, insertPx: 44 });
    assert.deepEqual(measureGridRowContentMaxHeights(host), [80]);
  });

  it("gridMatrixHasFillStretchRow 任一行含 fill 拉伸即为 true", () => {
    const t = miniTemplate({
      dot: minimalTextBlock({ id: "dot", parentId: "g", wrapperStyle: { heightMode: "fill" } }),
    });
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
