#!/usr/bin/env node
/**
 * 生成「layout 布局测试专用模板」→ data/emails/layout-test/
 *
 * 覆盖范围（仅 layout.container；grid / 图片语义见 grid-test、image-test）：
 *  1. 父级 contentAlign 主轴三档 + 无效对照
 *  2. 单子级 9 宫格（stage 双轴，layout 对齐真源）
 *  3. 双子级 stage 双轴 3×3
 *  4. 子级 hug / fill / fixed × contentAlign（含同轴 fill 禁止）
 *  5. 父 hug 等 Inspector 约束
 *
 * 用法：node scripts/build-email-layout-test.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  axisHToContentHorizontal,
  axisVToContentVertical,
  contentAlignFromAxes,
  CONTENT_ALIGN_NEUTRAL,
  dualChildStageContentAlign,
  dualChildStageDetailLabel,
  NINE_GRID_ALIGN_COMBOS,
  nineGridStageCellConfig,
} from "./lib/content-align-axis.mjs";
import { finalizeGeneratedTemplate } from "./lib/finalize-generated-template.mjs";
import { textBodyFromString } from "./lib/test-email-text-body.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, "..");
const EMAIL_KEY = "layout-test";
const OUT = path.join(REPO, "data", "emails", EMAIL_KEY);
const LAYOUT_DIR = path.join(OUT, "layouts", "default");

const BORDER_ZERO = {
  mode: "unified",
  width: "0",
  style: "solid",
  color: "rgba(0,0,0,0)",
};
const RADIUS_SM = { mode: "unified", radius: "4px" };

/** @type {Record<string, object>} */
const blocks = {};
/** @type {Record<string, { blockType: string, name: string }>} */
const blockMeta = {};

function addBlock(block, name, metaType = "content.text") {
  blocks[block.id] = block;
  blockMeta[block.id] = {
    blockType: metaType === "layout" ? "layout.container" : metaType,
    name,
  };
}

function text(id, parentId, body, opts = {}) {
  const {
    widthMode = "fill",
    heightMode = "hug",
    contentAlign = { horizontal: "left", vertical: "top" },
    backgroundColor,
    width,
    height,
    fontSize = "13px",
    color = "#1F2937",
    bold = false,
  } = opts;
  const ws = {
    contentAlign,
    widthMode,
    heightMode,
    border: BORDER_ZERO,
    borderRadius: RADIUS_SM,
  };
  if (backgroundColor) ws.backgroundColor = backgroundColor;
  if (width) ws.width = width;
  if (height) ws.height = height;
  return {
    id,
    type: "text",
    parentId,
    children: [],
    wrapperStyle: ws,
    props: {
      textBody: textBodyFromString(body),
      fontSize,
      color,
      bold,
      italic: false,
      decoration: "none",
    },
    bindings: {},
  };
}

function chip(id, parentId, label, color, widthMode = "hug", opts = {}) {
  const { heightMode = "hug", width, height, contentAlign } = opts;
  return text(id, parentId, label, {
    widthMode,
    heightMode,
    width,
    height,
    contentAlign: contentAlign ?? { horizontal: "left", vertical: "top" },
    backgroundColor: color,
    fontSize: "12px",
    color: "#FFFFFF",
    bold: true,
  });
}

function layout(id, parentId, direction, children, wrapperExtra = {}, propsExtra = {}) {
  return {
    id,
    type: "layout",
    parentId,
    children,
    wrapperStyle: {
      contentAlign: { horizontal: "left", vertical: "top" },
      widthMode: "fill",
      heightMode: "hug",
      border: BORDER_ZERO,
      borderRadius: RADIUS_SM,
      padding: { mode: "unified", unified: "8px" },
      ...wrapperExtra,
    },
    props: { direction, gapMode: "fixed", gap: "6px", ...propsExtra },
    bindings: {},
  };
}

/** 章标题 + 说明（灰底条） */
function chapterHeader(sectionId, parentId, num, title, hint, tint = "#F9FAFB") {
  const titleId = `${sectionId}-hdr`;
  addBlock(
    text(titleId, parentId, `${num} · ${title}\n${hint}`, {
      bold: true,
      fontSize: "14px",
      color: "#111827",
      backgroundColor: tint,
    }),
    `${num} ${title}`
  );
  return titleId;
}

/** 节外壳 */
function section(id, parentId, childIds, bg) {
  const sec = layout(id, parentId, "vertical", childIds, {
    backgroundColor: bg,
    padding: { mode: "unified", unified: "12px" },
  });
  addBlock(sec, id, "layout");
  return id;
}

/** 定高/定宽「舞台」layout，用于观察对齐 */
function stage(id, parentId, direction, childIds, { height, width, contentAlign, bg = "#E5E7EB" }) {
  const ws = {
    widthMode: width ? "fixed" : "fill",
    heightMode: height ? "fixed" : "hug",
    contentAlign: contentAlign ?? { horizontal: "left", vertical: "top" },
    backgroundColor: bg,
    padding: { mode: "unified", unified: "6px" },
  };
  if (height) ws.height = height;
  if (width) ws.width = width;
  const b = layout(id, parentId, direction, childIds, ws);
  addBlock(b, id, "layout");
  return id;
}

/** 父 contentAlign 主轴：纵排定高 + 2×hug 子（三列对照） */
function buildVerticalMainAxisRow(rowId, parentId, rowHint) {
  const cols = ["top", "center", "bottom"].map((v, i) => {
    const colId = `${rowId}-c${i}`;
    const innerId = `${colId}-inner`;
    const labels = { top: "vertical: top", center: "vertical: center", bottom: "vertical: bottom" };
    addBlock(
      text(`${colId}-lbl`, colId, labels[v], { fontSize: "11px", color: "#6B7280" }),
      labels[v]
    );
    stage(innerId, colId, "vertical", [`${colId}-a`, `${colId}-b`], {
      height: "112px",
      contentAlign: { horizontal: "left", vertical: v },
    });
    addBlock(chip(`${colId}-a`, innerId, "A", "#3B82F6"), "A");
    addBlock(chip(`${colId}-b`, innerId, "B", "#10B981"), "B");
    const col = layout(colId, rowId, "vertical", [`${colId}-lbl`, innerId], {
      widthMode: "fill",
      backgroundColor: "#FFFFFF",
      border: { mode: "unified", width: "1px", style: "solid", color: "#A7F3D0" },
      padding: { mode: "unified", unified: "6px" },
    });
    addBlock(col, labels[v], "layout");
    return colId;
  });
  addBlock(
    text(`${rowId}-hint`, rowId, rowHint, {
      fontSize: "11px",
      color: "#047857",
      backgroundColor: "#D1FAE5",
    }),
    "说明"
  );
  const row = layout(rowId, parentId, "vertical", [`${rowId}-hint`, ...cols], {}, { gap: "8px" });
  addBlock(row, "纵排主轴三列", "layout");
}

/** 父 contentAlign 主轴：横排满宽 + 3×hug 子（三行对照） */
function buildHorizontalMainAxisCol(colId, parentId, hAlign) {
  const innerId = `${colId}-inner`;
  const labels = { left: "horizontal: left", center: "horizontal: center", right: "horizontal: right" };
  addBlock(
    text(`${colId}-lbl`, colId, labels[hAlign], { fontSize: "11px", color: "#6B7280" }),
    labels[hAlign]
  );
  stage(innerId, colId, "horizontal", [`${colId}-1`, `${colId}-2`, `${colId}-3`], {
    height: "64px",
    contentAlign: { horizontal: hAlign, vertical: "top" },
  });
  addBlock(chip(`${colId}-1`, innerId, "1", "#8B5CF6"), "1");
  addBlock(chip(`${colId}-2`, innerId, "2", "#F59E0B"), "2");
  addBlock(chip(`${colId}-3`, innerId, "3", "#EF4444"), "3");
  const col = layout(colId, parentId, "vertical", [`${colId}-lbl`, innerId], {
    widthMode: "fill",
    backgroundColor: "#FFFFFF",
    border: { mode: "unified", width: "1px", style: "solid", color: "#DDD6FE" },
    padding: { mode: "unified", unified: "6px" },
  });
  addBlock(col, labels[hAlign], "layout");
}

/** 单子级 9 宫格：舞台 contentAlign 双轴 + 叶子中性 left/top */
function buildSingleChildAlignGrid(gridId, parentId, parentDirection, title, hint) {
  const isVert = parentDirection === "vertical";
  addBlock(
    text(`${gridId}-title`, gridId, `${title}\n${hint}`, {
      fontSize: "12px",
      bold: true,
      color: "#3730A3",
      backgroundColor: "#EEF2FF",
    }),
    title
  );
  const rowIds = [];
  for (let r = 0; r < 3; r++) {
    const rowId = `${gridId}-r${r}`;
    rowIds.push(rowId);
    const cellIds = [];
    for (let c = 0; c < 3; c++) {
      const cfg = nineGridStageCellConfig(parentDirection, r, c);
      const cellId = `${rowId}-c${c}`;
      const stageId = `${cellId}-st`;
      const chipId = `${cellId}-chip`;
      cellIds.push(cellId);
      addBlock(
        text(`${cellId}-lbl`, cellId, `${cfg.cornerLabel}\n${cfg.detailLabel}`, {
          fontSize: "10px",
          color: "#6B7280",
        }),
        cfg.cornerLabel
      );
      stage(stageId, cellId, parentDirection, [chipId], {
        height: "80px",
        contentAlign: cfg.contentAlign,
      });
      addBlock(
        chip(chipId, stageId, cfg.cornerLabel, "#0D9488", "hug", { contentAlign: cfg.leafContentAlign }),
        cfg.cornerLabel
      );
      addBlock(
        layout(cellId, rowId, "vertical", [`${cellId}-lbl`, stageId], {
          widthMode: "fill",
          backgroundColor: "#FAFAFF",
          border: { mode: "unified", width: "1px", style: "solid", color: "#E5E7EB" },
          padding: { mode: "unified", unified: "4px" },
        }),
        cfg.cornerLabel,
        "layout"
      );
    }
    const rowHint = isVert
      ? `行 ${r + 1}：stage contentAlign.vertical=${axisVToContentVertical(NINE_GRID_ALIGN_COMBOS[r * 3].v)}`
      : `行 ${r + 1}：stage contentAlign.vertical 随格变化`;
    addBlock(layout(rowId, gridId, "horizontal", cellIds, {}, { gap: "6px" }), rowHint, "layout");
  }
  addBlock(
    layout(gridId, parentId, "vertical", [`${gridId}-title`, ...rowIds], {
      backgroundColor: "#FFFFFF",
      border: { mode: "unified", width: "1px", style: "solid", color: "#C7D2FE" },
      padding: { mode: "unified", unified: "8px" },
    }),
    title,
    "layout"
  );
}

/** 双子级：舞台 contentAlign 双轴（3×3），两子 hug 保持中性 */
function buildDualChildAxisGrid(gridId, parentId, innerDirection, title, hint, stageHeight = "96px") {
  const isVert = innerDirection === "vertical";
  const mainVals = isVert
    ? [
        { content: "top", label: "竖↕上" },
        { content: "center", label: "竖↕中" },
        { content: "bottom", label: "竖↕下" },
      ]
    : [
        { content: "left", label: "横↔左" },
        { content: "center", label: "横↔中" },
        { content: "right", label: "横↔右" },
      ];
  const crossVals = [
    { key: "start", label: "横⊥始" },
    { key: "center", label: "横⊥中" },
    { key: "end", label: "横⊥末" },
  ];

  addBlock(
    text(`${gridId}-title`, gridId, `${title}\n${hint}`, {
      fontSize: "12px",
      bold: true,
      color: "#065F46",
      backgroundColor: "#ECFDF5",
    }),
    title
  );

  const rowIds = [];
  for (let ri = 0; ri < 3; ri++) {
    const main = mainVals[ri];
    const rowId = `${gridId}-r${ri}`;
    rowIds.push(rowId);
    const cellIds = [];
    for (let ci = 0; ci < 3; ci++) {
      const cross = crossVals[ci];
      const cellId = `${rowId}-c${ci}`;
      const innerId = `${cellId}-in`;
      cellIds.push(cellId);
      const contentAlign = dualChildStageContentAlign(isVert, main.content, cross.key);
      const lbl = dualChildStageDetailLabel(isVert, main.content, cross.key);
      addBlock(text(`${cellId}-lbl`, cellId, `${lbl}\n2×hug`, { fontSize: "10px", color: "#6B7280" }), lbl);
      stage(innerId, cellId, innerDirection, [`${innerId}-a`, `${innerId}-b`], {
        height: stageHeight,
        contentAlign,
      });
      addBlock(chip(`${innerId}-a`, innerId, "A", "#3B82F6", "hug", { contentAlign: CONTENT_ALIGN_NEUTRAL }), "A");
      addBlock(chip(`${innerId}-b`, innerId, "B", "#10B981", "hug", { contentAlign: CONTENT_ALIGN_NEUTRAL }), "B");
      addBlock(
        layout(cellId, rowId, "vertical", [`${cellId}-lbl`, innerId], {
          widthMode: "fill",
          backgroundColor: "#FAFAFF",
          border: { mode: "unified", width: "1px", style: "solid", color: "#E5E7EB" },
          padding: { mode: "unified", unified: "4px" },
        }),
        `${main.label}${cross.label}`,
        "layout"
      );
    }
    addBlock(layout(rowId, gridId, "horizontal", cellIds, {}, { gap: "6px" }), main.label, "layout");
  }

  addBlock(
    layout(gridId, parentId, "vertical", [`${gridId}-title`, ...rowIds], {
      backgroundColor: "#FFFFFF",
      border: { mode: "unified", width: "1px", style: "solid", color: "#A7F3D0" },
      padding: { mode: "unified", unified: "8px" },
    }),
    title,
    "layout"
  );
}

/** 单子级尺寸 × contentAlign 演示格（纵排父 stage） */
function buildStackChildSizeDemo(cellId, parentId, title, hint, spec) {
  const stageId = `${cellId}-st`;
  const childId = `${cellId}-ch`;
  addBlock(text(`${cellId}-lbl`, cellId, `${title}\n${hint}`, { fontSize: "10px", color: "#92400E" }), title);
  stage(stageId, cellId, "vertical", [childId], { height: "80px" });
  addBlock(
    chip(childId, stageId, spec.label, spec.color, spec.widthMode, {
      heightMode: spec.heightMode ?? "hug",
      width: spec.width,
      height: spec.height,
      contentAlign: spec.contentAlign ?? { horizontal: "left", vertical: "top" },
    }),
    spec.label
  );
  addBlock(
    layout(cellId, parentId, "vertical", [`${cellId}-lbl`, stageId], {
      widthMode: "fill",
      backgroundColor: "#FFFFFF",
      border: { mode: "unified", width: "1px", style: "solid", color: "#FDE68A" },
      padding: { mode: "unified", unified: "6px" },
    }),
    title,
    "layout"
  );
}

/** 单子级尺寸 × contentAlign（横排父 stage） */
function buildRowChildSizeDemo(cellId, parentId, title, hint, spec) {
  const stageId = `${cellId}-st`;
  const childId = `${cellId}-ch`;
  addBlock(text(`${cellId}-lbl`, cellId, `${title}\n${hint}`, { fontSize: "10px", color: "#5B21B6" }), title);
  stage(stageId, cellId, "horizontal", [childId], { height: "72px" });
  addBlock(
    chip(childId, stageId, spec.label, spec.color, spec.widthMode ?? "hug", {
      heightMode: spec.heightMode ?? "hug",
      width: spec.width,
      height: spec.height,
      contentAlign: spec.contentAlign ?? { horizontal: "left", vertical: "top" },
    }),
    spec.label
  );
  addBlock(
    layout(cellId, parentId, "vertical", [`${cellId}-lbl`, stageId], {
      widthMode: "fill",
      backgroundColor: "#FFFFFF",
      border: { mode: "unified", width: "1px", style: "solid", color: "#DDD6FE" },
      padding: { mode: "unified", unified: "6px" },
    }),
    title,
    "layout"
  );
}

// ─── 根与导读 ─────────────────────────────────────────────
const ROOT_SECTIONS = [
  "lt-intro",
  "lt-ch1",
  "lt-ch2",
  "lt-ch3",
  "lt-ch4",
  "lt-ch5",
];

addBlock(
  {
    id: "lt-root",
    type: "emailRoot",
    parentId: null,
    children: ROOT_SECTIONS,
    wrapperStyle: { widthMode: "fill", heightMode: "hug" },
    props: {
      backgroundColor: "#F3F4F6",
      width: "600px",
      padding: { mode: "unified", unified: "0" },
      border: BORDER_ZERO,
      gapMode: "fixed",
      gap: "20px",
    },
    bindings: {},
  },
  "画布根",
  "layout"
);

addBlock(
  text(
    "lt-intro",
    "lt-root",
    [
      "layout 布局测试专用模板",
      "",
      "仅 layout 容器。contentAlign 语义：",
      "· 写在父容器上 → 控制子块在其壳内的水平/竖直摆放",
      "· 子块 contentAlign 仅影响该子块自身壳内内容，不参与父槽位对齐",
      "",
      "章节：1 父主轴 · 2 单子 9 宫格 · 3 双子 3×3 · 4 子尺寸 · 5 约束。图片/栅格对齐见 image-test、grid-test。",
    ].join("\n"),
    { fontSize: "13px", backgroundColor: "#DBEAFE", contentAlign: { horizontal: "left", vertical: "top" } }
  ),
  "导读"
);

// ─── 第 1 章：父级 contentAlign ─────────────────────────
section("lt-ch1", "lt-root", ["lt-ch1-hdr", "lt-ch1-a", "lt-ch1-c", "lt-ch1-e"], "#EFF6FF");
chapterHeader(
  "lt-ch1",
  "lt-ch1",
  "1",
  "父级 contentAlign（layout）",
  "纵排演示竖直三档；横排演示水平三档。另一轴双轴组合见第 2 章 9 宫格。"
);

// 1A 纵排主轴
section("lt-ch1-a", "lt-ch1", ["lt-ch1-a-hdr", "lt-ch1-a-row"], "#FFFFFF"); // row 内含 hint + 三列
chapterHeader(
  "lt-ch1-a",
  "lt-ch1-a",
  "1A",
  "纵排父 · 主轴竖直（定高 112px）",
  "改 vertical：两组色条在壳内上/中/下。子均为 hug。"
);
buildVerticalMainAxisRow("lt-ch1-a-row", "lt-ch1-a", "direction=vertical；子 2×hug。");

// 1C 横排主轴
section("lt-ch1-c", "lt-ch1", ["lt-ch1-c-hdr", "lt-ch1-c-left", "lt-ch1-c-center", "lt-ch1-c-right"], "#FFFFFF");
chapterHeader(
  "lt-ch1-c",
  "lt-ch1-c",
  "1C",
  "横排父 · 主轴水平（满宽）",
  "改 horizontal：三色条组在壳内左/中/右。"
);
buildHorizontalMainAxisCol("lt-ch1-c-left", "lt-ch1-c", "left");
buildHorizontalMainAxisCol("lt-ch1-c-center", "lt-ch1-c", "center");
buildHorizontalMainAxisCol("lt-ch1-c-right", "lt-ch1-c", "right");

// 1E 无效对照
section("lt-ch1-e", "lt-ch1", ["lt-ch1-e-hdr", "lt-ch1-e1", "lt-ch1-e2", "lt-ch1-e3"], "#FFFFFF");
chapterHeader(
  "lt-ch1-e",
  "lt-ch1-e",
  "1E",
  "contentAlign 看不出变化（预期）",
  "无剩余空间时对应轴几乎无效；应改另一轴、子尺寸或父定高/满宽。"
);

// E1 纵排 + 子 fill 宽
{
  const id = "lt-ch1-e1";
  const inner = `${id}-in`;
  addBlock(text(`${id}-lbl`, id, "E1 · 纵排 + 子 width fill\nhorizontal=center 无效", { fontSize: "11px", color: "#991B1B" }), "E1");
  stage(inner, id, "vertical", [`${id}-a`, `${id}-b`], { height: "72px" });
  addBlock(chip(`${id}-a`, inner, "fill A", "#DC2626", "fill"), "A");
  addBlock(chip(`${id}-b`, inner, "fill B", "#B91C1C", "fill"), "B");
  addBlock(
    layout(id, "lt-ch1-e", "vertical", [`${id}-lbl`, inner], {
      border: { mode: "unified", width: "1px", style: "solid", color: "#FCA5A5" },
      backgroundColor: "#FFF",
      padding: { mode: "unified", unified: "8px" },
    }),
    "E1",
    "layout"
  );
}

// E2 纵排 hug 高
{
  const id = "lt-ch1-e2";
  const inner = `${id}-in`;
  addBlock(text(`${id}-lbl`, id, "E2 · 纵排父 hug 高\nvertical=center 无效", { fontSize: "11px", color: "#991B1B" }), "E2");
  stage(inner, id, "vertical", [`${id}-a`], {});
  addBlock(chip(`${id}-a`, inner, "hug", "#DC2626"), "A");
  addBlock(
    layout(id, "lt-ch1-e", "vertical", [`${id}-lbl`, inner], {
      heightMode: "hug",
      border: { mode: "unified", width: "1px", style: "solid", color: "#FCA5A5" },
      backgroundColor: "#FFF",
      padding: { mode: "unified", unified: "8px" },
    }),
    "E2",
    "layout"
  );
}

// E3 横排 + 子 fill 高
{
  const id = "lt-ch1-e3";
  const inner = `${id}-in`;
  const wrap = `${id}-wrap`;
  addBlock(text(`${id}-lbl`, id, "E3 · 横排定高 + 子 height fill\nvertical=center 无效", { fontSize: "11px", color: "#991B1B" }), "E3");
  stage(inner, id, "horizontal", [wrap], { height: "64px" });
  addBlock(
    layout(wrap, inner, "vertical", [`${id}-txt`], {
      widthMode: "hug",
      heightMode: "fill",
      backgroundColor: "#B91C1C",
    }),
    "wrap",
    "layout"
  );
  addBlock(
    text(`${id}-txt`, wrap, "fill 高", { widthMode: "hug", fontSize: "12px", color: "#FFF", bold: true }),
    "文案"
  );
  addBlock(
    layout(id, "lt-ch1-e", "vertical", [`${id}-lbl`, inner], {
      border: { mode: "unified", width: "1px", style: "solid", color: "#FCA5A5" },
      backgroundColor: "#FFF",
      padding: { mode: "unified", unified: "8px" },
    }),
    "E3",
    "layout"
  );
}

// ─── 第 2 章：单子级 contentAlign 9 宫格 ─────────────────
section("lt-ch2", "lt-root", ["lt-ch2-hdr", "lt-ch2-stack", "lt-ch2-row"], "#EEF2FF");
chapterHeader(
  "lt-ch2",
  "lt-ch2",
  "2",
  "单子级 contentAlign（hug 子）",
  "9 宫格 = 定高/定宽 stage 的 contentAlign 双轴组合；hug 叶子保持 left/top。"
);
buildSingleChildAlignGrid(
  "lt-ch2-stack",
  "lt-ch2",
  "vertical",
  "2A · 纵排父（tableStackCell）",
  "行↕ stage contentAlign.vertical；列↔ stage contentAlign.horizontal。"
);
buildSingleChildAlignGrid(
  "lt-ch2-row",
  "lt-ch2",
  "horizontal",
  "2B · 横排父（tableRowCell）",
  "列↔ stage contentAlign.horizontal；行↕ stage contentAlign.vertical。"
);

// ─── 第 3 章：双子级舞台双轴 3×3 ───────────────────────
section("lt-ch3", "lt-root", ["lt-ch3-hdr", "lt-ch3-stack", "lt-ch3-row"], "#ECFDF5");
chapterHeader(
  "lt-ch3",
  "lt-ch3",
  "3",
  "双子级：stage contentAlign 双轴",
  "行=竖直轴；列=水平轴。两子 hug 保持 left/top。"
);
buildDualChildAxisGrid(
  "lt-ch3-stack",
  "lt-ch3",
  "vertical",
  "3A · 纵排 2×hug",
  "stage vertical × stage horizontal contentAlign。"
);
buildDualChildAxisGrid(
  "lt-ch3-row",
  "lt-ch3",
  "horizontal",
  "3B · 横排 2×hug",
  "stage horizontal × stage vertical contentAlign。",
  "72px"
);

// ─── 第 4 章：子级尺寸 × contentAlign ─────────────────────
section(
  "lt-ch4",
  "lt-root",
  ["lt-ch4-hdr", "lt-ch4-stack-single", "lt-ch4-stack-fillw", "lt-ch4-row-single", "lt-ch4-row-fillh"],
  "#FFFBEB"
);
chapterHeader(
  "lt-ch4",
  "lt-ch4",
  "4",
  "子级 hug / fill / fixed × contentAlign",
  "fixed 可调交叉轴 contentAlign；同轴 fill 时整块 contentAlign 禁止（见 4C/4E）。"
);

// 4A 纵排 · 单子级三格
section("lt-ch4-stack-single", "lt-ch4", ["lt-ch4-ss-h", "lt-ch4-ss-cells"], "#FFFFFF");
addBlock(
  text(
    "lt-ch4-ss-h",
    "lt-ch4-stack-single",
    "4A · 纵排父 · 单子级：hug 宽 / fixed 72px / hug+fill 高",
    { fontSize: "11px", color: "#B45309", backgroundColor: "#FEF3C7" }
  ),
  "4A"
);
const ssCells = layout("lt-ch4-ss-cells", "lt-ch4-stack-single", "horizontal", [], {}, { gap: "8px" });
addBlock(ssCells, "4A 格", "layout");
const ssIds = ["lt-4a-hug", "lt-4a-fix", "lt-4a-fh"];
buildStackChildSizeDemo(ssIds[0], "lt-ch4-ss-cells", "hug·h:end", "hug 宽", {
  label: "hug",
  color: "#D97706",
  widthMode: "hug",
  contentAlign: contentAlignFromAxes("end", "start"),
});
buildStackChildSizeDemo(ssIds[1], "lt-ch4-ss-cells", "fixed·h:中", "fixed 72px", {
  label: "72px",
  color: "#B45309",
  widthMode: "fixed",
  width: "72px",
  contentAlign: contentAlignFromAxes("center", "start"),
});
buildStackChildSizeDemo(ssIds[2], "lt-ch4-ss-cells", "fill高·h:中", "hug 宽 + fill 高", {
  label: "fill高",
  color: "#92400E",
  widthMode: "hug",
  heightMode: "fill",
  contentAlign: contentAlignFromAxes("center", "start"),
});
blocks["lt-ch4-ss-cells"].children = ssIds;

// 4C 纵排 · 子宽 fill
section("lt-ch4-stack-fillw", "lt-ch4", ["lt-ch4-sfw-h", "lt-ch4-sfw-st"], "#FFFFFF");
addBlock(
  text(
    "lt-ch4-sfw-h",
    "lt-ch4-stack-fillw",
    "4C · 纵排父 · 子 width fill → 整块 contentAlign 禁止（对照 4A）",
    { fontSize: "11px", color: "#991B1B" }
  ),
  "4C"
);
stage("lt-ch4-sfw-st", "lt-ch4-stack-fillw", "vertical", ["lt-4c-chip"], { height: "72px", bg: "#FECACA" });
addBlock(chip("lt-4c-chip", "lt-ch4-sfw-st", "width fill", "#DC2626", "fill"), "chip");

// 4D 横排 · 单子级
section("lt-ch4-row-single", "lt-ch4", ["lt-ch4-rs-h", "lt-ch4-rs-cells"], "#FFFFFF");
addBlock(
  text(
    "lt-ch4-rs-h",
    "lt-ch4-row-single",
    "4D · 横排父 · 单子级：hug 高 / fixed 40px / fill 宽",
    { fontSize: "11px", color: "#5B21B6", backgroundColor: "#EDE9FE" }
  ),
  "4D"
);
const rsCells = layout("lt-ch4-rs-cells", "lt-ch4-row-single", "horizontal", [], {}, { gap: "8px" });
addBlock(rsCells, "4D 格", "layout");
const rsIds = ["lt-4d-hug", "lt-4d-fix", "lt-4d-fw"];
buildRowChildSizeDemo(rsIds[0], "lt-ch4-rs-cells", "hug·v:end", "hug 高", {
  label: "hug",
  color: "#7C3AED",
  heightMode: "hug",
  contentAlign: contentAlignFromAxes("start", "end"),
});
buildRowChildSizeDemo(rsIds[1], "lt-ch4-rs-cells", "fixed·v:中", "fixed 40px", {
  label: "40px",
  color: "#6D28D9",
  heightMode: "fixed",
  height: "40px",
  contentAlign: contentAlignFromAxes("start", "center"),
});
buildRowChildSizeDemo(rsIds[2], "lt-ch4-rs-cells", "fill宽·v:中", "fill 宽 + hug 高", {
  label: "fill宽",
  color: "#5B21B6",
  widthMode: "fill",
  heightMode: "hug",
  contentAlign: contentAlignFromAxes("start", "center"),
});
blocks["lt-ch4-rs-cells"].children = rsIds;

// 4E 横排 · 子高 fill
section("lt-ch4-row-fillh", "lt-ch4", ["lt-ch4-rfh-h", "lt-ch4-rfh-st"], "#FFFFFF");
addBlock(
  text(
    "lt-ch4-rfh-h",
    "lt-ch4-row-fillh",
    "4E · 横排父 · 子 height fill → 整块 contentAlign 禁止（对照 4D）",
    { fontSize: "11px", color: "#991B1B" }
  ),
  "4E"
);
stage("lt-ch4-rfh-st", "lt-ch4-row-fillh", "horizontal", ["lt-4e-wrap"], { height: "72px", bg: "#FECACA" });
addBlock(
  layout("lt-4e-wrap", "lt-ch4-rfh-st", "vertical", ["lt-4e-txt"], {
    widthMode: "hug",
    heightMode: "fill",
    backgroundColor: "#B91C1C",
  }),
  "wrap",
  "layout"
);
addBlock(
  text("lt-4e-txt", "lt-4e-wrap", "height fill", { widthMode: "hug", fontSize: "12px", color: "#FFF", bold: true }),
  "文案"
);

// ─── 第 5 章：布局约束 ─────────────────────────────────
section("lt-ch5", "lt-root", ["lt-ch5-hdr", "lt-ch5-hug"], "#F5F5F4");
chapterHeader(
  "lt-ch5",
  "lt-ch5",
  "5",
  "Inspector 约束",
  "父 hug 时子不可同轴 fill；同轴 fill 禁止整块 contentAlign 见第 4 章 4C/4E。"
);

// 5A 父 hug
section("lt-ch5-hug", "lt-ch5", ["lt-ch5-hug-h", "lt-ch5-hug-demo"], "#FFFFFF");
addBlock(
  text(
    "lt-ch5-hug-h",
    "lt-ch5-hug",
    "5 · 横排父 width=hug → 子不可 width fill（同轴循环）",
    { fontSize: "11px", color: "#57534E" }
  ),
  "5 约束"
);
const hugDemo = layout("lt-ch5-hug-demo", "lt-ch5-hug", "horizontal", ["lt-5b-a", "lt-5b-b"], {
  widthMode: "hug",
  heightMode: "hug",
  backgroundColor: "#E7E5E4",
  border: { mode: "unified", width: "1px", style: "solid", color: "#D6D3D1" },
});
addBlock(hugDemo, "hug 父", "layout");
addBlock(chip("lt-5b-a", "lt-ch5-hug-demo", "hug A", "#78716C"), "A");
addBlock(chip("lt-5b-b", "lt-ch5-hug-demo", "hug B", "#57534E"), "B");

// ─── 落盘 ───────────────────────────────────────────────
const template = {
  schemaVersion: "3.0.0",
  emailId: EMAIL_KEY,
  templateId: EMAIL_KEY,
  templateVersion: 1,
  locale: "zh-CN",
  rootBlockId: "lt-root",
  blockMeta,
  blocks,
};

const meta = {
  displayName: "layout 布局测试专用模板",
  description:
    "layout.container 对齐与尺寸测试（5 章）：父主轴、单子 9 宫格、双子 3×3、子尺寸、约束。图片/栅格见 image-test、grid-test。",
  source: "agent",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  defaultStylePresetSelection: "local",
};

const layoutManifest = {
  schemaVersion: "1.0.0",
  activeLayoutVariantId: "default",
  variants: [
    {
      id: "default",
      label: "默认",
      description: "layout 布局测试（contentAlign + contentAlign + 尺寸模式）",
    },
  ],
};

const tokenPresets = {
  schemaVersion: "1.0.0",
  activePresetId: "default",
  presets: {
    default: {
      label: "测试预设",
      description: "最小 token",
      tokens: {
        colors: { primary: "#111827", secondary: "#6B7280", surface: "#FFFFFF" },
        spacing: { section: "12px", gap: "8px", pageInline: "12px" },
        typography: { display: "24px", h1: "18px", body: "13px", caption: "12px" },
        radius: { panel: "4px", cta: "4px" },
      },
    },
  },
  scopeSelections: {},
};

const payload = { schemaVersion: "1.0.0", slots: {}, values: {} };

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

writeJson(path.join(OUT, "meta.json"), meta);
writeJson(path.join(OUT, "payload.json"), payload);
writeJson(path.join(OUT, "layout-manifest.json"), layoutManifest);
writeJson(path.join(LAYOUT_DIR, "template.json"), template);
writeJson(path.join(LAYOUT_DIR, "tokenPresets.json"), tokenPresets);

finalizeGeneratedTemplate(path.join(LAYOUT_DIR, "template.json"));

console.log(`已写入 data/emails/${EMAIL_KEY}/（${Object.keys(blocks).length} blocks）`);
