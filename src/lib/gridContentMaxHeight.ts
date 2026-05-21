/** 测量栅格每一数据行内单元格的自然内容高度（px，已四舍五入）。 */
export function measureGridRowContentMaxHeights(host: HTMLTableElement): number[] {
  const dataRows = Array.from(
    host.querySelectorAll<HTMLTableRowElement>(":scope > tbody > tr:not([aria-hidden])")
  );
  const rowMaxes: number[] = [];

  for (const tr of dataRows) {
    const cells = Array.from(tr.querySelectorAll<HTMLElement>("td.email-preview-grid-slot"));
    let rowMax = 0;
    for (const cell of cells) {
      const prevHeight = cell.style.height;
      const prevMinHeight = cell.style.minHeight;
      cell.style.height = "auto";
      cell.style.minHeight = "0";
      rowMax = Math.max(rowMax, Math.round(cell.scrollHeight));
      cell.style.height = prevHeight;
      cell.style.minHeight = prevMinHeight;
    }
    rowMaxes.push(rowMax);
  }

  return rowMaxes;
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
