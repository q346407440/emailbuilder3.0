import assert from "node:assert/strict";
import test from "node:test";
import {
  layoutColumnInnerShouldFillParentHeight,
  layoutPreviewInnerShellStretchesHeight,
  layoutPreviewOuterBoxFillsParentHeight,
  layoutHorizontalOuterPresentationShellFillWidth,
  layoutPreviewOuterTableUsesFullWidth,
  layoutRenderedFixedGapPx,
  layoutRowAutoGapSpacerTdStyle,
  layoutRowChildTdWidthAttr,
  layoutRowChildTdWidthStyle,
  layoutRowFlexChildWrapperStyle,
  layoutRowInnerShouldFillParentHeight,
  layoutRowInnerShouldUseFixedTableLayout,
  layoutRowInnerShouldUseFullWidth,
  layoutRowInnerTablePresentationStyle,
  layoutRowOmitsSpacerGapCells,
  layoutRowParentAllowsFillChildExpansion,
  layoutStackCrossAlignForChild,
  layoutStackMainValignForChild,
  overlayCellAlignFromLayoutContentAlign,
  tableRowCellVerticalAlignFromFlexAlignItems,
  tableValignFromContentVertical,
  wrapperHugWidthShrinkWrapCss,
} from "./emailTableLayout";

test("layoutStack：子块槽位对齐仅读父级 contentAlign", () => {
  const parent = { horizontal: "right", vertical: "bottom" } as const;
  const child = { horizontal: "center", vertical: "center" } as const;
  assert.equal(layoutStackCrossAlignForChild("vertical", parent, child), "right");
  assert.equal(layoutStackMainValignForChild("vertical", parent, child), "bottom");
  assert.equal(layoutStackCrossAlignForChild("horizontal", parent, child), "right");
  assert.equal(layoutStackMainValignForChild("horizontal", parent, child), "bottom");
});

test("hug 横向 fixed gap 且无 fill 子块 → 外层表可随内容收缩", () => {
  assert.equal(
    layoutHorizontalOuterPresentationShellFillWidth({
      directionIsRow: true,
      gapModeAuto: false,
      hasFillWidthChild: false,
      childCount: 4,
    }),
    false
  );
  assert.equal(
    layoutPreviewOuterTableUsesFullWidth({
      widthMode: "hug",
      directionIsRow: true,
      gapModeAuto: false,
      hasFillWidthChild: false,
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
      hasFillWidthChild: false,
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
      hasFillWidthChild: false,
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
      hasFillWidthChild: false,
      childCount: 1,
    }),
    true
  );
  assert.equal(
    layoutPreviewOuterTableUsesFullWidth({
      widthMode: "fixed",
      directionIsRow: false,
      gapModeAuto: false,
      hasFillWidthChild: false,
      childCount: 1,
    }),
    true
  );
});

test("tableRowCellVerticalAlignFromFlexAlignItems 映射 flex 对齐", () => {
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

test("layoutRowInnerShouldFillParentHeight：hug 高横排有兄弟锚点时拉伸 fill 子级", () => {
  const template = {
    blocks: {
      row: {
        id: "row",
        type: "layout",
        children: ["img", "stack"],
        wrapperStyle: { heightMode: "hug" },
      },
      img: {
        id: "img",
        type: "image",
        wrapperStyle: { widthMode: "fixed", width: "130px", heightMode: "fill" },
      },
      stack: {
        id: "stack",
        type: "layout",
        children: ["txt"],
        wrapperStyle: { heightMode: "hug" },
      },
      txt: {
        id: "txt",
        type: "text",
        wrapperStyle: { heightMode: "hug" },
        props: { text: "hi" },
      },
    },
  } as unknown as import("../types/email").EmailTemplate;
  assert.equal(
    layoutRowInnerShouldFillParentHeight(
      { heightMode: "hug" },
      2,
      { template, childIds: ["img", "stack"] }
    ),
    true
  );
  assert.equal(
    layoutRowInnerShouldFillParentHeight(
      { heightMode: "hug" },
      1,
      { template, childIds: ["img"] }
    ),
    false
  );
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

test("fill 纵向 → 内层表需全高", () => {
  assert.equal(
    layoutPreviewInnerShellStretchesHeight({
      heightMode: "fill",
      directionIsRow: false,
      gapModeAuto: false,
      childCount: 2,
    }),
    true
  );
});

test("wrapperHugWidthShrinkWrapCss：hug 仅 maxWidth，宽度收缩在 presentation td", () => {
  assert.deepEqual(wrapperHugWidthShrinkWrapCss("hug"), {
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

test("layoutRowInnerShouldUseFixedTableLayout：仅 fill/fixed 子级用 fixed；hug+fill 混排用 auto", () => {
  const base = {
    parentWidthMode: "fill" as const,
    gapModeAuto: false,
    childCount: 3,
  };
  assert.equal(
    layoutRowInnerShouldUseFixedTableLayout({
      ...base,
      hasFillWidthChild: true,
      hasHugWidthChild: false,
    }),
    true
  );
  assert.equal(
    layoutRowInnerShouldUseFixedTableLayout({
      ...base,
      hasFillWidthChild: true,
      hasHugWidthChild: true,
    }),
    false
  );
  assert.equal(
    layoutRowInnerShouldUseFixedTableLayout({
      ...base,
      hasFillWidthChild: false,
      hasHugWidthChild: true,
    }),
    false
  );
  assert.equal(
    layoutRowInnerShouldUseFixedTableLayout({
      parentWidthMode: "fill",
      gapModeAuto: true,
      childCount: 3,
      hasFillWidthChild: false,
      hasHugWidthChild: true,
    }),
    false
  );
  assert.equal(
    layoutRowInnerShouldUseFixedTableLayout({
      parentWidthMode: "fill",
      gapModeAuto: true,
      childCount: 2,
      hasFillWidthChild: true,
      hasHugWidthChild: true,
    }),
    false
  );
});

test("layoutRowInnerTablePresentationStyle：仅 fill 子块时内层表满宽 fixed", () => {
  const style = layoutRowInnerTablePresentationStyle({
    parentWidthMode: "fill",
    gapModeAuto: false,
    childCount: 2,
    hasFillWidthChild: true,
    hasHugWidthChild: false,
  });
  assert.equal(style.width, "100%");
  assert.equal(style.tableLayout, "fixed");
});

test("layoutRowInnerTablePresentationStyle：hug+fill 混排时满宽 auto（hug 列可随内容撑开）", () => {
  const style = layoutRowInnerTablePresentationStyle({
    parentWidthMode: "fill",
    gapModeAuto: false,
    childCount: 3,
    hasFillWidthChild: true,
    hasHugWidthChild: true,
  });
  assert.equal(style.width, "100%");
  assert.equal(style.tableLayout, "auto");
  assert.equal(style.display, undefined);
});

test("layoutRowInnerTablePresentationStyle：全 hug 子块时内层表 inline-table 收缩", () => {
  const style = layoutRowInnerTablePresentationStyle({
    parentWidthMode: "fill",
    gapModeAuto: false,
    childCount: 3,
    hasFillWidthChild: false,
  });
  assert.equal(style.width, "1px");
  assert.equal(style.tableLayout, "auto");
  assert.equal(style.display, "inline-table");
});

test("layoutRowInnerTablePresentationStyle：gap auto + 全 hug 时满宽 auto（缝列百分比 + 子级 width=1）", () => {
  const style = layoutRowInnerTablePresentationStyle({
    parentWidthMode: "fill",
    gapModeAuto: true,
    childCount: 3,
    hasFillWidthChild: false,
    hasHugWidthChild: true,
  });
  assert.equal(style.width, "100%");
  assert.equal(style.tableLayout, "auto");
  assert.equal(style.display, undefined);
});

test("layoutRowOmitsSpacerGapCells：仅 gap auto + fill 时跳过缝隙列", () => {
  assert.equal(
    layoutRowOmitsSpacerGapCells({ gapModeAuto: false, hasFillWidthChild: true, gapPx: 8 }),
    false
  );
  assert.equal(
    layoutRowOmitsSpacerGapCells({ gapModeAuto: true, hasFillWidthChild: true, gapPx: 8 }),
    true
  );
  assert.equal(
    layoutRowOmitsSpacerGapCells({ gapModeAuto: false, hasFillWidthChild: false, gapPx: 8 }),
    false
  );
});

test("layoutRenderedFixedGapPx：auto 模式不渲染旧 fixed gap", () => {
  assert.equal(layoutRenderedFixedGapPx({ gapModeAuto: false, gapPx: 10 }), 10);
  assert.equal(layoutRenderedFixedGapPx({ gapModeAuto: true, gapPx: 10 }), 0);
});

test("layoutRowAutoGapSpacerTdStyle：缝隙列均分剩余宽", () => {
  assert.deepEqual(layoutRowAutoGapSpacerTdStyle(1), { width: "100%" });
  assert.deepEqual(layoutRowAutoGapSpacerTdStyle(2), { width: "50.0000%" });
});

test("layoutRowChildTdWidthStyle：满宽行内 hug 仅 nowrap（列宽由 td width=\"1\"），fill 吃剩余宽", () => {
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
    { whiteSpace: "nowrap" }
  );
  assert.deepEqual(
    layoutRowChildTdWidthStyle("fill", undefined, {
      innerTableFullWidth: true,
      innerTableUsesFixedLayout: true,
      gapModeAuto: false,
      childCount: 2,
      rowHasFillWidthChild: true,
    }),
    { width: "100%" }
  );
  assert.deepEqual(
    layoutRowChildTdWidthStyle("fill", undefined, {
      innerTableFullWidth: true,
      innerTableUsesFixedLayout: false,
      gapModeAuto: false,
      childCount: 3,
      rowHasFillWidthChild: true,
      rowHasHugWidthChild: true,
    }),
    { minWidth: 0 }
  );
  assert.deepEqual(
    layoutRowChildTdWidthStyle("hug", undefined, {
      innerTableFullWidth: true,
      gapModeAuto: true,
      childCount: 2,
      rowHasFillWidthChild: true,
    }),
    { whiteSpace: "nowrap" }
  );
  assert.deepEqual(
    layoutRowChildTdWidthStyle("fixed", "120px", {
      innerTableFullWidth: true,
      gapModeAuto: false,
      childCount: 2,
    }),
    { width: "120px" }
  );
  assert.deepEqual(
    layoutRowChildTdWidthStyle("hug", undefined, {
      innerTableFullWidth: false,
      gapModeAuto: false,
      childCount: 3,
    }),
    { whiteSpace: "nowrap" }
  );
});

test("layoutRowChildTdWidthStyle：满宽行内 hug 纵排 layout 卡片不 nowrap", () => {
  assert.deepEqual(
    layoutRowChildTdWidthStyle("hug", undefined, {
      innerTableFullWidth: true,
      gapModeAuto: false,
      childCount: 2,
      rowHasFillWidthChild: true,
      childIsVerticalLayout: true,
    }),
    {}
  );
  assert.deepEqual(
    layoutRowChildTdWidthStyle("hug", undefined, {
      innerTableFullWidth: true,
      gapModeAuto: true,
      childCount: 2,
      rowHasFillWidthChild: false,
      childIsVerticalLayout: false,
    }),
    { whiteSpace: "nowrap" }
  );
});

test("layoutRowChildTdWidthAttr：满宽行内 hug 列补 td width=\"1\"，其余模式不写 attr", () => {
  assert.equal(layoutRowChildTdWidthAttr("hug", { innerTableFullWidth: true }), "1");
  assert.equal(layoutRowChildTdWidthAttr("fill", { innerTableFullWidth: true }), undefined);
  assert.equal(layoutRowChildTdWidthAttr("fixed", { innerTableFullWidth: true }), undefined);
  assert.equal(layoutRowChildTdWidthAttr("hug", { innerTableFullWidth: false }), undefined);
});

test("layoutRowFlexChildWrapperStyle：横排行 fill 高子块铺满行高，普通子块读竖直对齐参数", () => {
  assert.deepEqual(
    layoutRowFlexChildWrapperStyle({
      childWidthMode: "fill",
      childHeightMode: "fill",
      contentAlignVertical: "center",
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
      contentAlignVertical: "center",
      fallbackAlignItems: "flex-start",
    }).alignSelf,
    "center"
  );
});
