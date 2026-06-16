import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailTemplate } from "../types/email";
import {
  countVerticalStackFillHeightChildren,
  EMAIL_PRESENTATION_TD_ANTI_STRUT_STYLE,
  emailPresentationHugSlotAntiStrutStyle,
  emailPresentationHugTdWidthAttr,
  emailPresentationLeafShellOuterStyle,
  emailPresentationLeafShellTableStyle,
  presentationLeafShellOuterBoxCss,
  layoutPreviewHugOuterShellBoxStyle,
  presentationLeafShellStretchInnerHeight,
  progressBarFillTdWidthAttr,
  verticalStackRowHeightStyle,
  gridMatrixSlotContentAlignCss,
  gridMatrixSlotChildWrapStyle,
  gridMatrixSlotTableCellAttrs,
  wrapperContentAlignTableCellAttrs,
  emailTextContentWrapCss,
} from "./emailPresentationLayout";

describe("wrapperContentAlignTableCellAttrs", () => {
  it("映射为 td align / valign / textAlign", () => {
    assert.deepEqual(wrapperContentAlignTableCellAttrs({ horizontal: "center", vertical: "bottom" }), {
      align: "center",
      valign: "bottom",
      textAlign: "center",
    });
  });
});

describe("gridMatrixSlotChildWrapStyle", () => {
  it("fixed/hug 宽子块须 inline-block 包裹；fill 宽不包裹", () => {
    assert.deepEqual(gridMatrixSlotChildWrapStyle("fixed", "top"), {
      display: "inline-block",
      maxWidth: "100%",
      verticalAlign: "top",
    });
    assert.equal(gridMatrixSlotChildWrapStyle("fill", "top"), undefined);
  });
});

describe("gridMatrixSlotTableCellAttrs", () => {
  it("栅格槽位须含 HTML align/valign（fixed 宽子块居中依赖 align）", () => {
    assert.deepEqual(gridMatrixSlotTableCellAttrs({ horizontal: "center", vertical: "top" }), {
      align: "center",
      valign: "top",
      textAlign: "center",
    });
  });
});

describe("gridMatrixSlotContentAlignCss", () => {
  it("栅格 contentAlign 映射槽位水平与竖直对齐", () => {
    assert.deepEqual(gridMatrixSlotContentAlignCss({ horizontal: "right", vertical: "center" }), {
      textAlign: "right",
      verticalAlign: "middle",
    });
  });
});

describe("verticalStackRowHeightStyle", () => {
  const template = {
    blocks: {
      a: { wrapperStyle: { heightMode: "fill" } },
      b: { wrapperStyle: { heightMode: "hug" } },
    },
  } as unknown as EmailTemplate;

  it("仅 fill 子块在 stretchColumn 时参与均分高度", () => {
    assert.deepEqual(
      verticalStackRowHeightStyle(template, "b", {
        stretchColumn: true,
        fillChildCount: 1,
        fillChildIndex: 0,
      }),
      {}
    );
    assert.deepEqual(
      verticalStackRowHeightStyle(template, "a", {
        stretchColumn: true,
        fillChildCount: 2,
        fillChildIndex: 0,
      }),
      { height: "50%" }
    );
    assert.deepEqual(
      verticalStackRowHeightStyle(template, "a", {
        stretchColumn: true,
        fillChildCount: 2,
        fillChildIndex: 1,
      }),
      { height: "50%" }
    );
  });
});

describe("countVerticalStackFillHeightChildren", () => {
  it("统计 fill 高子块", () => {
    const template = {
      blocks: {
        x: { wrapperStyle: { heightMode: "fill" } },
        y: { wrapperStyle: { heightMode: "hug" } },
      },
    } as unknown as EmailTemplate;
    assert.equal(countVerticalStackFillHeightChildren(template, ["x", "y"]), 1);
  });
});

describe("progressBarFillTdWidthAttr", () => {
  it("钳制 0–100 并取整", () => {
    assert.equal(progressBarFillTdWidthAttr(33.6), "34%");
    assert.equal(progressBarFillTdWidthAttr(150), "100%");
  });
});

describe("emailPresentationHugSlotAntiStrutStyle", () => {
  it("仅 hug 高返回 anti-strut，fill/fixed 与缺省不返回", () => {
    assert.deepEqual(emailPresentationHugSlotAntiStrutStyle("hug"), EMAIL_PRESENTATION_TD_ANTI_STRUT_STYLE);
    assert.deepEqual(emailPresentationHugSlotAntiStrutStyle("fill"), {});
    assert.deepEqual(emailPresentationHugSlotAntiStrutStyle("fixed"), {});
    assert.deepEqual(emailPresentationHugSlotAntiStrutStyle(undefined), EMAIL_PRESENTATION_TD_ANTI_STRUT_STYLE);
  });
});

describe("presentationLeafShellStretchInnerHeight", () => {
  it("fixed/fill 高须拉伸内层 table 链，hug 高不拉伸", () => {
    assert.equal(presentationLeafShellStretchInnerHeight("fixed"), true);
    assert.equal(presentationLeafShellStretchInnerHeight("fill"), true);
    assert.equal(presentationLeafShellStretchInnerHeight("hug"), false);
    assert.equal(presentationLeafShellStretchInnerHeight(undefined), false);
  });
});

describe("presentationLeafShellOuterBoxCss", () => {
  it("剥离 border/padding/背景/圆角，保留宽高与排版", () => {
    const stripped = presentationLeafShellOuterBoxCss({
      width: "100%",
      height: "120px",
      padding: "12px",
      border: "2px solid #A78BFA",
      borderRadius: "4px",
      backgroundColor: "#F5F3FF",
      textAlign: "left",
      overflow: "hidden",
    });
    assert.equal(stripped.width, "100%");
    assert.equal(stripped.height, "120px");
    assert.equal(stripped.textAlign, "left");
    assert.equal(stripped.overflow, "hidden");
    assert.equal(stripped.padding, undefined);
    assert.equal(stripped.border, undefined);
    assert.equal(stripped.borderRadius, undefined);
    assert.equal(stripped.backgroundColor, undefined);
  });
});

describe("emailTextContentWrapCss", () => {
  it("fill/fixed 宽正文启用栏内断行", () => {
    assert.deepEqual(emailTextContentWrapCss("fill"), {
      overflowWrap: "anywhere",
      wordBreak: "break-word",
      maxWidth: "100%",
    });
    assert.deepEqual(emailTextContentWrapCss("fixed"), {
      overflowWrap: "anywhere",
      wordBreak: "break-word",
      maxWidth: "100%",
    });
  });

  it("hug 宽正文不写断行（单行收缩由 td nowrap 承担）", () => {
    assert.deepEqual(emailTextContentWrapCss("hug"), {});
  });
});

describe("emailPresentationLeafShell hug 收缩", () => {
  it("hug 叶壳表为 auto 宽、非 fixed 满宽", () => {
    assert.equal(emailPresentationLeafShellTableStyle("hug").width, "auto");
    assert.equal(emailPresentationLeafShellTableStyle("hug").tableLayout, "auto");
    assert.equal(emailPresentationLeafShellTableStyle("fill").width, "100%");
    assert.equal(emailPresentationLeafShellTableStyle("fill").tableLayout, "fixed");
  });

  it("hug 叶壳外层盒为 auto 宽且 inline-block 收缩", () => {
    const hugOuter = emailPresentationLeafShellOuterStyle({ width: "100%", color: "red" }, "hug");
    assert.equal(hugOuter.width, "auto");
    assert.equal(hugOuter.display, "inline-block");
    assert.equal(emailPresentationLeafShellOuterStyle({ width: "100%" }, "fill").width, "100%");
  });

  it("hug td width 属性为 1", () => {
    assert.equal(emailPresentationHugTdWidthAttr("hug"), "1");
    assert.equal(emailPresentationHugTdWidthAttr("fill"), undefined);
  });
});

describe("layoutPreviewHugOuterShellBoxStyle", () => {
  it("hug 且外层行表不撑满时，layout 外壳与叶壳同为 inline-block 收缩", () => {
    const shrunk = layoutPreviewHugOuterShellBoxStyle(
      { width: "auto", maxWidth: "100%", backgroundColor: "#eee" },
      { widthMode: "hug", outerShellTableFullWidth: false }
    );
    assert.equal(shrunk.display, "inline-block");
    assert.equal(shrunk.width, "auto");
  });

  it("外层行表须满宽时不强制收缩 layout 外壳", () => {
    const full = layoutPreviewHugOuterShellBoxStyle(
      { width: "auto", maxWidth: "100%" },
      { widthMode: "hug", outerShellTableFullWidth: true }
    );
    assert.equal(full.display, undefined);
  });
});
