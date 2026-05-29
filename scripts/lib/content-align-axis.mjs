/**
 * 构建脚本用：start/center/end 轴命名 → wrapperStyle.contentAlign。
 */

/** @type {Array<{ h: string, v: string, label: string }>} */
export const NINE_GRID_ALIGN_COMBOS = [
  { h: "start", v: "start", label: "左上" },
  { h: "center", v: "start", label: "上中" },
  { h: "end", v: "start", label: "右上" },
  { h: "start", v: "center", label: "左中" },
  { h: "center", v: "center", label: "正中" },
  { h: "end", v: "center", label: "右中" },
  { h: "start", v: "end", label: "左下" },
  { h: "center", v: "end", label: "下中" },
  { h: "end", v: "end", label: "右下" },
];

/** 叶子块默认中性 contentAlign（不参与父槽位对齐） */
export const CONTENT_ALIGN_NEUTRAL = { horizontal: "left", vertical: "top" };

/** @param {"start"|"center"|"end"|string} h */
export function axisHToContentHorizontal(h) {
  if (h === "end") return "right";
  if (h === "center") return "center";
  return "left";
}

/** @param {"start"|"center"|"end"|string} v */
export function axisVToContentVertical(v) {
  if (v === "end") return "bottom";
  if (v === "center") return "center";
  return "top";
}

/** @param {"start"|"center"|"end"|string} h @param {"start"|"center"|"end"|string} v */
export function contentAlignFromAxes(h, v) {
  return {
    horizontal: axisHToContentHorizontal(h),
    vertical: axisVToContentVertical(v),
  };
}

/** @param {{ horizontal?: string, vertical?: string } | null | undefined} rec */
export function axesAlignRecord(rec) {
  return contentAlignFromAxes(rec?.horizontal ?? "start", rec?.vertical ?? "start");
}

/**
 * 单子级 9 宫格：由 stage / 栅格 / 底图容器 的 contentAlign 承担双轴组合；
 * 叶子块保持中性 left/top。
 * @param {"vertical"|"horizontal"} stageDirection
 * @param {number} row
 * @param {number} col
 * @param {Array<{ h: string, v: string, label: string }>} [nineGrid]
 */
export function nineGridStageCellConfig(stageDirection, row, col, nineGrid = NINE_GRID_ALIGN_COMBOS) {
  const combo = nineGrid[row * 3 + col];
  const isVert = stageDirection === "vertical";
  if (isVert) {
    const rowAnchor = nineGrid[row * 3];
    const vertical = axisVToContentVertical(rowAnchor.v);
    const horizontal = axisHToContentHorizontal(combo.h);
    return {
      cornerLabel: combo.label,
      detailLabel: `竖直:${vertical}\n水平:${horizontal}`,
      contentAlign: { horizontal, vertical },
      leafContentAlign: CONTENT_ALIGN_NEUTRAL,
    };
  }
  const horizontal = axisHToContentHorizontal(combo.h);
  const vertical = axisVToContentVertical(combo.v);
  return {
    cornerLabel: combo.label,
    detailLabel: `水平:${horizontal}\n竖直:${vertical}`,
    contentAlign: { horizontal, vertical },
    leafContentAlign: CONTENT_ALIGN_NEUTRAL,
  };
}

/**
 * @deprecated 请用 nineGridStageCellConfig（返回 leafContentAlign）
 */
export function nineGridParentChildContentAlign(stageDirection, row, col, nineGrid) {
  const cfg = nineGridStageCellConfig(stageDirection, row, col, nineGrid);
  return {
    ...cfg,
    childContentAlign: cfg.leafContentAlign,
  };
}

/**
 * 双子级 3×3：舞台容器 contentAlign 双轴；两枚 hug 子块保持中性。
 * @param {boolean} isVert stage direction === vertical
 * @param {string} mainContent top|center|bottom|left|right
 * @param {"start"|"center"|"end"|string} crossKey
 */
export function dualChildStageContentAlign(isVert, mainContent, crossKey) {
  return isVert
    ? { horizontal: axisHToContentHorizontal(crossKey), vertical: mainContent }
    : { horizontal: mainContent, vertical: axisVToContentVertical(crossKey) };
}

/** @param {boolean} isVert @param {string} mainContent @param {string} crossKey */
export function dualChildStageDetailLabel(isVert, mainContent, crossKey) {
  return isVert ? `竖直:${mainContent}\n水平:${crossKey}` : `水平:${mainContent}\n竖直:${crossKey}`;
}
