import type { EmailTemplate } from "../types/email";
import { wrapperShellHasExplicitHeight } from "./emailTableLayout";

/** 测量栅格每一数据行内单元格的自然内容高度（px，已四舍五入）。 */
export function measureGridRowContentMaxHeights(host: HTMLTableElement): number[] {
  const dataRows = Array.from(
    host.querySelectorAll<HTMLTableRowElement>(":scope > tbody > tr:not([aria-hidden])")
  );
  const rowMaxes: number[] = [];

  for (const tr of dataRows) {
    const cells = Array.from(tr.querySelectorAll<HTMLElement>("td.email-preview-grid-slot"));
    if (cells.length === 0) {
      rowMaxes.push(0);
      continue;
    }
    // 先把整行所有单元格一起放开，再读 scrollHeight：
    // 逐个放开会被仍锁在旧高度的兄弟单元格把行撑住，读回的是被拉伸的行高而非内容高，
    // 导致测量值「只增不减」的棘轮（改内容/改 gap/拖拽占位条都会逐次放大行高）。
    const saved = cells.map((cell) => {
      const prevHeight = cell.style.height;
      const prevMinHeight = cell.style.minHeight;
      cell.style.height = "auto";
      cell.style.minHeight = "0";
      return { cell, prevHeight, prevMinHeight };
    });
    // 拖拽插入占位（.email-preview-grid-cell-insert）是临时 UI，不计入内容高。
    const hiddenInserts = Array.from(
      tr.querySelectorAll<HTMLElement>(".email-preview-grid-cell-insert")
    ).map((el) => {
      const prevDisplay = el.style.display;
      el.style.display = "none";
      return { el, prevDisplay };
    });

    let rowMax = 0;
    for (const { cell } of saved) {
      rowMax = Math.max(rowMax, Math.round(cell.scrollHeight));
    }

    for (const { el, prevDisplay } of hiddenInserts) el.style.display = prevDisplay;
    for (const { cell, prevHeight, prevMinHeight } of saved) {
      cell.style.height = prevHeight;
      cell.style.minHeight = prevMinHeight;
    }
    rowMaxes.push(rowMax);
  }

  return rowMaxes;
}

/** 行内是否存在 heightMode=fill 的格内子块。 */
export function gridRowHasFillHeightChild(
  template: EmailTemplate,
  childIds: readonly (string | undefined)[]
): boolean {
  for (const id of childIds) {
    if (!id) continue;
    if (template.blocks[id]?.wrapperStyle?.heightMode === "fill") return true;
  }
  return false;
}

/**
 * content-max 下行是否须把行高扩到栅格内层可用高（父栅格定高 + 行内 fill 高子块）。
 * cellHeightMode=fixed 时由 props.cellHeight 控制，不走本路径。
 */
export function gridDataRowUsesFillStretch(
  template: EmailTemplate,
  rowChildIds: readonly (string | undefined)[],
  gridWrapperStyle: { heightMode?: unknown; height?: unknown } | undefined,
  cellHeightMode: "content-max" | "fixed"
): boolean {
  if (cellHeightMode === "fixed") return false;
  if (!wrapperShellHasExplicitHeight(gridWrapperStyle)) return false;
  return gridRowHasFillHeightChild(template, rowChildIds);
}

export function gridMatrixHasFillStretchRow(
  template: EmailTemplate,
  rows: readonly (readonly string[])[],
  gridWrapperStyle: { heightMode?: unknown; height?: unknown } | undefined,
  cellHeightMode: "content-max" | "fixed"
): boolean {
  return rows.some((row) =>
    gridDataRowUsesFillStretch(template, row, gridWrapperStyle, cellHeightMode)
  );
}

/**
 * 在 content-max 测量结果上，为含 fill 高子块的数据行分配栅格 host 剩余内高。
 * 无 fill 拉伸行时原样返回 measuredContentHeights。
 */
export function computeGridRowHeightsWithFillStretch(params: {
  hostClientHeight: number;
  measuredContentHeights: number[];
  rowsUseFillStretch: boolean[];
  verticalGapPx: number;
}): number[] {
  const { hostClientHeight, measuredContentHeights, rowsUseFillStretch, verticalGapPx } = params;
  if (!rowsUseFillStretch.some(Boolean)) return measuredContentHeights;

  const dataRowCount = measuredContentHeights.length;
  const totalVgap = Math.max(0, dataRowCount - 1) * verticalGapPx;
  const stretchRowCount = rowsUseFillStretch.filter(Boolean).length;
  let contentOnlySum = 0;
  for (let i = 0; i < dataRowCount; i++) {
    if (!rowsUseFillStretch[i]) contentOnlySum += measuredContentHeights[i] ?? 0;
  }
  const stretchBudget = Math.max(0, hostClientHeight - totalVgap - contentOnlySum);
  const perStretch = stretchRowCount > 0 ? Math.floor(stretchBudget / stretchRowCount) : 0;
  return measuredContentHeights.map((h, i) =>
    rowsUseFillStretch[i] ? Math.max(h, perStretch) : h
  );
}

/** 与上一轮差在 1px 内视为同值，避免亚像素下反复 setState。 */
export function stabilizeGridRowHeights(next: number[], prev: number[] | null): number[] {
  if (!prev || prev.length !== next.length) return next;
  return next.map((h, i) => {
    const p = prev[i] ?? 0;
    return Math.abs(h - p) <= 1 ? p : h;
  });
}

export function gridRowHeightsStable(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((h, i) => Math.abs(h - (b[i] ?? 0)) <= 1);
}
