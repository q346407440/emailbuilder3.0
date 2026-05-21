import assert from "node:assert/strict";
import test from "node:test";
import {
  layoutColumnInnerShouldFillParentHeight,
  layoutColumnShouldUseFillFlex,
  layoutPreviewInnerShellStretchesHeight,
  layoutPreviewOuterBoxFillsParentHeight,
  layoutPreviewOuterTableUsesFullHeight,
  layoutPreviewOuterTableUsesFullWidth,
  layoutRenderedFixedGapPx,
  layoutRowChildTdWidthStyle,
  layoutRowFlexChildWrapperStyle,
  layoutRowInnerShouldFillParentHeight,
  layoutRowInnerShouldUseFullWidth,
  layoutRowInnerTablePresentationStyle,
  layoutRowOmitsSpacerGapCells,
  layoutRowParentAllowsFillChildExpansion,
  overlayCellAlignFromLayoutContentAlign,
  tableRowCellVerticalAlignFromFlexAlignItems,
  tableRowCellVerticalAlignFromPlacementAxis,
  tableValignFromContentVertical,
  wrapperHugWidthShrinkWrapCss,
} from "./emailTableLayout";

test("hug 横向 fixed gap → 外层表不强制全宽", () => {
  assert.equal(
    layoutPreviewOuterTableUsesFullWidth({
      widthMode: "hug",
      directionIsRow: true,
      gapModeAuto: false,
      childCount: 4,
    }),
    false
  );
});

test("hug 横向 gap auto → 外层表需全宽（等分列）", () => {
  assert.equal(
    layoutPreviewOuterTableUsesFullWidth({
      widthMode: "hug",
      directionIsRow: true,
      gapModeAuto: true,
      childCount: 3,
    }),
    true
  );
});

test("hug 纵向 → 外层表不强制全宽", () => {
  assert.equal(
    layoutPreviewOuterTableUsesFullWidth({
      widthMode: "hug",
      directionIsRow: false,
      gapModeAuto: false,
      childCount: 2,
    }),
    false
  );
});

test("fill / fixed → 外层表全宽", () => {
  assert.equal(
    layoutPreviewOuterTableUsesFullWidth({
      widthMode: "fill",
      directionIsRow: false,
      gapModeAuto: false,
      childCount: 1,
    }),
    true
  );
  assert.equal(
    layoutPreviewOuterTableUsesFullWidth({
      widthMode: "fixed",
      directionIsRow: false,
      gapModeAuto: false,
      childCount: 1,
    }),
    true
  );
});

test("tableRowCellVerticalAlignFromPlacementAxis 映射 start/center/end", () => {
  assert.equal(tableRowCellVerticalAlignFromPlacementAxis("start"), "top");
  assert.equal(tableRowCellVerticalAlignFromPlacementAxis("center"), "middle");
  assert.equal(tableRowCellVerticalAlignFromPlacementAxis("end"), "bottom");
  assert.equal(tableRowCellVerticalAlignFromPlacementAxis(undefined), undefined);
  assert.equal(tableRowCellVerticalAlignFromFlexAlignItems("flex-end"), "bottom");
  assert.equal(tableRowCellVerticalAlignFromFlexAlignItems("center"), "middle");
  assert.equal(tableRowCellVerticalAlignFromFlexAlignItems("flex-start"), "top");
});

test("overlayCellAlignFromLayoutContentAlign 按排列方向取主轴", () => {
  assert.deepEqual(overlayCellAlignFromLayoutContentAlign(false, { vertical: "center" }), {
    align: "left",
    valign: "middle",
  });
  assert.deepEqual(overlayCellAlignFromLayoutContentAlign(true, { horizontal: "right" }), {
    align: "right",
    valign: "top",
  });
  assert.deepEqual(overlayCellAlignFromLayoutContentAlign(false, undefined), {
    align: "left",
    valign: "top",
  });
});

test("tableValignFromContentVertical 映射 top/center/bottom", () => {
  assert.equal(tableValignFromContentVertical("top"), "top");
  assert.equal(tableValignFromContentVertical("center"), "middle");
  assert.equal(tableValignFromContentVertical("bottom"), "bottom");
  assert.equal(tableValignFromContentVertical(undefined), "top");
});

test("fill 纵排外壳铺满父级，fixed 仅内层撑满", () => {
  assert.equal(layoutPreviewOuterBoxFillsParentHeight("fill"), true);
  assert.equal(layoutPreviewOuterBoxFillsParentHeight("fixed"), false);
  assert.equal(
    layoutPreviewInnerShellStretchesHeight({
      heightMode: "fixed",
      directionIsRow: false,
      gapModeAuto: false,
      childCount: 2,
    }),
    true
  );
});

test("layoutRowInnerShouldFillParentHeight fixed 高且有多子项", () => {
  assert.equal(
    layoutRowInnerShouldFillParentHeight({ heightMode: "fixed", height: "200px" }, 3),
    true
  );
  assert.equal(layoutRowInnerShouldFillParentHeight({ heightMode: "hug" }, 1), false);
});

test("layoutColumnInnerShouldFillParentHeight：单子块 hug 不撑满（父 contentAlign 可定位）", () => {
  assert.equal(
    layoutColumnInnerShouldFillParentHeight({
      wrapperStyle: { heightMode: "fixed", height: "140px" },
      childCount: 1,
      hasFillHeightChild: false,
      gapModeAuto: false,
    }),
    false
  );
});

test("layoutColumnInnerShouldFillParentHeight：fill 高子块或 gap auto 时撑满", () => {
  assert.equal(
    layoutColumnInnerShouldFillParentHeight({
      wrapperStyle: { heightMode: "fixed", height: "140px" },
      childCount: 1,
      hasFillHeightChild: true,
      gapModeAuto: false,
    }),
    true
  );
  assert.equal(
    layoutColumnInnerShouldFillParentHeight({
      wrapperStyle: { heightMode: "fixed", height: "140px" },
      childCount: 3,
      hasFillHeightChild: false,
      gapModeAuto: true,
    }),
    true
  );
});

test("layoutColumnShouldUseFillFlex：定高父级且存在 fill 高子块时用 flex 纵列", () => {
  assert.equal(
    layoutColumnShouldUseFillFlex({
      wrapperStyle: { heightMode: "fixed", height: "300px" },
      hasFillHeightChild: true,
    }),
    true
  );
  assert.equal(
    layoutColumnShouldUseFillFlex({
      wrapperStyle: { heightMode: "fixed", height: "120px" },
      hasFillHeightChild: false,
    }),
    false
  );
});

test("fill 纵向 → 内层表需全高", () => {
  assert.equal(
    layoutPreviewOuterTableUsesFullHeight({
      heightMode: "fill",
      directionIsRow: false,
      gapModeAuto: false,
      childCount: 2,
    }),
    true
  );
});

test("wrapperHugWidthShrinkWrapCss：hug 用 fit-content，其余为空", () => {
  assert.deepEqual(wrapperHugWidthShrinkWrapCss("hug"), {
    width: "fit-content",
    maxWidth: "100%",
  });
  assert.deepEqual(wrapperHugWidthShrinkWrapCss("fill"), {});
  assert.deepEqual(wrapperHugWidthShrinkWrapCss(undefined), {});
});

test("layoutRowParentAllowsFillChildExpansion：仅 fill/fixed 父级", () => {
  assert.equal(layoutRowParentAllowsFillChildExpansion("fill"), true);
  assert.equal(layoutRowParentAllowsFillChildExpansion("fixed"), true);
  assert.equal(layoutRowParentAllowsFillChildExpansion("hug"), false);
});

test("layoutRowInnerShouldUseFullWidth：gap auto 或父 fill 且含 fill 子块", () => {
  assert.equal(
    layoutRowInnerShouldUseFullWidth({
      parentWidthMode: "hug",
      gapModeAuto: true,
      childCount: 3,
      hasFillWidthChild: false,
    }),
    true
  );
  assert.equal(
    layoutRowInnerShouldUseFullWidth({
      parentWidthMode: "fill",
      gapModeAuto: false,
      childCount: 2,
      hasFillWidthChild: true,
    }),
    true
  );
  assert.equal(
    layoutRowInnerShouldUseFullWidth({
      parentWidthMode: "fill",
      gapModeAuto: false,
      childCount: 4,
      hasFillWidthChild: false,
    }),
    false
  );
});

test("layoutRowInnerTablePresentationStyle：含 fill 子块时内层表满宽 fixed", () => {
  const style = layoutRowInnerTablePresentationStyle({
    parentWidthMode: "fill",
    gapModeAuto: false,
    childCount: 2,
    hasFillWidthChild: true,
  });
  assert.equal(style.width, "100%");
  assert.equal(style.tableLayout, "fixed");
});

test("layoutRowOmitsSpacerGapCells：fill 行 fixed gap 用 padding 代替间隔列", () => {
  assert.equal(
    layoutRowOmitsSpacerGapCells({ gapModeAuto: false, hasFillWidthChild: true, gapPx: 8 }),
    true
  );
  assert.equal(
    layoutRowOmitsSpacerGapCells({ gapModeAuto: true, hasFillWidthChild: true, gapPx: 8 }),
    false
  );
});

test("layoutRenderedFixedGapPx：auto 模式不渲染旧 fixed gap", () => {
  assert.equal(layoutRenderedFixedGapPx({ gapModeAuto: false, gapPx: 10 }), 10);
  assert.equal(layoutRenderedFixedGapPx({ gapModeAuto: true, gapPx: 10 }), 0);
});

test("layoutRowChildTdWidthStyle：满宽行内 fill 100%、hug 1% nowrap", () => {
  assert.deepEqual(
    layoutRowChildTdWidthStyle("hug", undefined, {
      innerTableFullWidth: true,
      gapModeAuto: false,
      childCount: 2,
      rowHasFillWidthChild: true,
    }),
    { whiteSpace: "nowrap" }
  );
  assert.deepEqual(
    layoutRowChildTdWidthStyle("hug", undefined, {
      innerTableFullWidth: true,
      gapModeAuto: false,
      childCount: 3,
      rowHasFillWidthChild: false,
    }),
    { width: "1%", whiteSpace: "nowrap" }
  );
  assert.deepEqual(
    layoutRowChildTdWidthStyle("fill", undefined, {
      innerTableFullWidth: true,
      gapModeAuto: false,
      childCount: 2,
      rowHasFillWidthChild: true,
    }),
    {}
  );
  assert.deepEqual(
    layoutRowChildTdWidthStyle("fixed", "120px", {
      innerTableFullWidth: true,
      gapModeAuto: false,
      childCount: 2,
    }),
    { width: "120px", whiteSpace: "nowrap" }
  );
});

test("layoutRowFlexChildWrapperStyle：横排行 fill 高子块铺满行高，普通子块读 placement.vertical", () => {
  assert.deepEqual(
    layoutRowFlexChildWrapperStyle({
      childWidthMode: "fill",
      childHeightMode: "fill",
      placementVertical: "center",
      fallbackAlignItems: "flex-start",
    }),
    {
      flex: "1 1 0%",
      minWidth: 0,
      alignSelf: "stretch",
      minHeight: 0,
      boxSizing: "border-box",
    }
  );
  assert.equal(
    layoutRowFlexChildWrapperStyle({
      childWidthMode: "hug",
      childHeightMode: "hug",
      placementVertical: "center",
      fallbackAlignItems: "flex-start",
    }).alignSelf,
    "center"
  );
});
