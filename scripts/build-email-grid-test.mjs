#!/usr/bin/env node
/**
 * 生成「栅格测试专用模板」→ data/emails/grid-test/
 *
 * 覆盖 layout.grid 常见场景（含 wrapperStyle.backgroundImage）：
 *  0 导读
 *  1 columns × gap（含末行不满列）
 *  2 cellWidthMode：auto vs fixed + cellWidth
 *  3 cellHeightMode：content-max vs fixed + cellHeight
 *  4 栅格外壳：padding / 描边 / 定高
 *  5 栅格矩阵格 contentAlign（三档速查；全矩阵见 layout-test）
 *  6 格内子块对齐与尺寸（matrix 槽 + fill/hug 对照）
 *  7 格内子块类型：text / layout / image / button
 *  8 栅格底图 backgroundImage（cover / contain / link / padding）
 *  9 多行 content-max 同行等高
 * 10 综合：底图 + 2×2 + 混合子块
 *
 * 用法：node scripts/build-email-grid-test.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CONTENT_ALIGN_NEUTRAL, contentAlignFromAxes } from "./lib/content-align-axis.mjs";
import { finalizeGeneratedTemplate } from "./lib/finalize-generated-template.mjs";
import { textBodyFromString } from "./lib/test-email-text-body.mjs";
import { graphToDiskJson } from "./lib/template-disk-io.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, "..");
const EMAIL_KEY = "grid-test";
const OUT = path.join(REPO, "data", "emails", EMAIL_KEY);
const LAYOUT_DIR = path.join(OUT, "layouts", "default");

const PEXELS = (id, w = 800) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;
const IMG_SRC = PEXELS(325185);
const IMG_ALT = "城市天际线（雾中高楼）";

const IMAGE_TEST_ASSET_BASE =
  process.env.IMAGE_TEST_ASSET_BASE?.replace(/\/$/, "") || "http://127.0.0.1:5180";
const positionAsset = (name) => `${IMAGE_TEST_ASSET_BASE}/image-test-position/${name}`;
const BORDER_ZERO = { style: "solid", color: "rgba(0,0,0,0)", top: "0", right: "0", bottom: "0", left: "0" };
const RADIUS_SM = { topLeft: "4px", topRight: "4px", bottomRight: "4px", bottomLeft: "4px" };
const RADIUS_MD = { topLeft: "12px", topRight: "12px", bottomRight: "12px", bottomLeft: "12px" };

/** @type {Record<string, object>} */
const blocks = {};
/** @type {Record<string, { blockType: string, name: string }>} */
const blockMeta = {};

function addBlock(block, name, metaType = "content.text") {
  blocks[block.id] = block;
  const bt =
    metaType === "layout"
      ? "layout.container"
      : metaType === "grid"
        ? "layout.grid"
        : metaType === "emailRoot"
          ? "email.root"
          : metaType === "content.image"
            ? "content.image"
            : metaType === "action.button"
              ? "action.button"
              : metaType;
  blockMeta[block.id] = { blockType: bt, name };
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
    contentAlign,
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
      padding: { top: "8px", right: "8px", bottom: "8px", left: "8px" },
      ...wrapperExtra,
    },
    props: { direction, gapMode: "fixed", gap: "6px", ...propsExtra },
    bindings: {},
  };
}

function grid(id, parentId, children, columns, wrapperExtra = {}, propsExtra = {}) {
  return {
    id,
    type: "grid",
    parentId,
    children,
    wrapperStyle: {
      contentAlign: { horizontal: "left", vertical: "top" },
      widthMode: "fill",
      heightMode: "hug",
      border: BORDER_ZERO,
      borderRadius: RADIUS_SM,
      padding: { top: "0", right: "0", bottom: "0", left: "0" },
      ...wrapperExtra,
    },
    props: {
      columns,
      gap: "8px",
      cellWidthMode: "auto",
      cellHeightMode: "content-max",
      ...propsExtra,
    },
    bindings: {},
  };
}

function imageBlock(id, parentId, opts = {}) {
  const {
    src = IMG_SRC,
    alt = IMG_ALT,
    link = "",
    fit = "cover",
    position = "center",
    widthMode = "fill",
    heightMode = "fixed",
    width,
    height = "72px",
    backgroundColor,
  } = opts;
  const ws = {
    contentAlign: contentAlignFromAxes("start", "start"),
    contentAlign: { horizontal: "left", vertical: "top" },
    widthMode,
    heightMode,
    border: BORDER_ZERO,
    borderRadius: RADIUS_SM,
    backgroundImage: {
      src,
      alt,
      link,
      fit,
      position,
      borderRadius: RADIUS_SM,
      border: BORDER_ZERO,
    },
  };
  if (width) ws.width = width;
  if (height) ws.height = height;
  if (backgroundColor) ws.backgroundColor = backgroundColor;
  return {
    id,
    type: "image",
    parentId,
    children: [],
    wrapperStyle: ws,
    props: {},
    bindings: {},
  };
}

function button(id, parentId, label, opts = {}) {
  const { widthMode = "fill", link = "#", bg = "#111827", color = "#FFFFFF" } = opts;
  return {
    id,
    type: "button",
    parentId,
    children: [],
    wrapperStyle: {
      widthMode,
      heightMode: "hug",
      contentAlign: contentAlignFromAxes("start", "start"),
      contentAlign: { horizontal: "center", vertical: "top" },
      border: BORDER_ZERO,
      borderRadius: RADIUS_SM,
    },
    props: {
      text: label,
      link,
      buttonStyle: {
        widthMode: "hug",
        backgroundColor: bg,
        textColor: color,
        fontSize: "13px",
        border: BORDER_ZERO,
        borderRadius: RADIUS_SM,
        bold: true,
        italic: false,
      },
    },
    bindings: {},
  };
}

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

function section(id, parentId, childIds, bg) {
  const sec = layout(id, parentId, "vertical", childIds, {
    backgroundColor: bg,
    padding: { top: "12px", right: "12px", bottom: "12px", left: "12px" },
  });
  addBlock(sec, id, "layout");
  return id;
}

/** 带标题的栅格演示格 */
function buildGridDemo(cellId, parentId, title, columns, childSpecs, gridExtra = {}, propsExtra = {}) {
  const gridId = `${cellId}-g`;
  const childIds = childSpecs.map((_, i) => `${gridId}-c${i}`);
  addBlock(
    text(`${cellId}-lbl`, cellId, title, { fontSize: "10px", color: "#6B7280" }),
    title
  );
  for (const [i, spec] of childSpecs.entries()) {
    const cid = childIds[i];
    if (spec.kind === "chip") {
      addBlock(
        chip(cid, gridId, spec.label, spec.color ?? "#3B82F6", spec.widthMode ?? "fill", {
          height: spec.height,
          heightMode: spec.heightMode,
          width: spec.width,
          contentAlign: spec.contentAlign ?? { horizontal: "left", vertical: "top" },
        }),
        spec.label
      );
    } else if (spec.kind === "text") {
      addBlock(text(cid, gridId, spec.label, spec.opts ?? {}), spec.label);
    } else if (spec.kind === "layout") {
      const layId = cid;
      const innerId = `${layId}-in`;
      addBlock(
        layout(layId, gridId, "vertical", [innerId], spec.wrapperExtra ?? {}, spec.propsExtra ?? {}),
        spec.label,
        "layout"
      );
      addBlock(
        chip(innerId, layId, spec.label, spec.color ?? "#8B5CF6", "fill"),
        spec.label
      );
    } else if (spec.kind === "image") {
      addBlock(imageBlock(cid, gridId, spec.opts ?? {}), spec.label, "content.image");
    } else if (spec.kind === "button") {
      addBlock(button(cid, gridId, spec.label, spec.opts ?? {}), spec.label, "action.button");
    }
  }
  addBlock(grid(gridId, cellId, childIds, columns, gridExtra, propsExtra), title, "grid");
  addBlock(
    layout(cellId, parentId, "vertical", [`${cellId}-lbl`, gridId], {
      widthMode: "fill",
      backgroundColor: "#FFFFFF",
      border: { style: "solid", color: "#E5E7EB", top: "1px", right: "1px", bottom: "1px", left: "1px" },
      padding: { top: "6px", right: "6px", bottom: "6px", left: "6px" },
    }),
    title,
    "layout"
  );
}

function buildDemoRow(rowId, parentId, title, cellBuilders) {
  addBlock(
    text(`${rowId}-title`, rowId, title, {
      fontSize: "12px",
      bold: true,
      color: "#1E3A8A",
      backgroundColor: "#EFF6FF",
    }),
    title
  );
  const cellIds = cellBuilders.map((_, i) => `${rowId}-c${i}`);
  cellBuilders.forEach((build, i) => build(`${rowId}-c${i}`, rowId));
  addBlock(
    layout(rowId, parentId, "vertical", [`${rowId}-title`, ...cellIds], {
      backgroundColor: "#FFFFFF",
      border: { style: "solid", color: "#BFDBFE", top: "1px", right: "1px", bottom: "1px", left: "1px" },
      padding: { top: "8px", right: "8px", bottom: "8px", left: "8px" },
    }),
    title,
    "layout"
  );
}

// ─── 根与导读 ─────────────────────────────────────────────
const ROOT_SECTIONS = [
  "gt-intro",
  "gt-ch1",
  "gt-ch2",
  "gt-ch3",
  "gt-ch4",
  "gt-ch5",
  "gt-ch6",
  "gt-ch7",
  "gt-ch8",
  "gt-ch9",
  "gt-ch10",
];

addBlock(
  {
    id: "gt-root",
    type: "emailRoot",
    parentId: null,
    children: ROOT_SECTIONS,
    wrapperStyle: { widthMode: "fill", heightMode: "hug" },
    props: {
      backgroundColor: "#F3F4F6",
      width: "600px",
      padding: { top: "0", right: "0", bottom: "0", left: "0" },
      border: BORDER_ZERO,
      gapMode: "fixed",
      gap: "20px",
    },
    bindings: {},
  },
  "画布根",
  "emailRoot"
);

addBlock(
  text(
    "gt-intro",
    "gt-root",
    [
      "栅格测试专用模板",
      "",
      "layout.grid：props 管列数/间距/单元格宽高模式；wrapperStyle 管外壳与可选 backgroundImage 底图。",
      "子块 parentKind = tableMatrixCell（非 layout 纵/横排槽位）。",
      "",
      "章节：columns·gap · cell 宽高 · 外壳 · 矩阵对齐 · 子块对齐尺寸 · 子类型 · 底图 · 多行等高 · 综合。layout 对齐真源见 layout-test。",
    ].join("\n"),
    { fontSize: "13px", backgroundColor: "#FFFFFF", color: "#374151" }
  ),
  "导读"
);

// ─── 1 columns × gap ─────────────────────────────────────
section("gt-ch1", "gt-root", ["gt-ch1-hdr", "gt-ch1-a", "gt-ch1-b"], "#EFF6FF");
chapterHeader(
  "gt-ch1",
  "gt-ch1",
  "1",
  "columns × gap",
  "columns 决定每行列数；gap 为列间/行间 spacer。末行不满列时补空 td。"
);
buildDemoRow("gt-ch1-a", "gt-ch1", "1A · 列数对照（gap=8px）", [
  (cid, pid) =>
    buildGridDemo(
      cid,
      pid,
      "2 列 · 4 子",
      2,
      [
        { kind: "chip", label: "A", color: "#3B82F6" },
        { kind: "chip", label: "B", color: "#10B981" },
        { kind: "chip", label: "C", color: "#F59E0B" },
        { kind: "chip", label: "D", color: "#EF4444" },
      ],
      {},
      { gap: "8px" }
    ),
  (cid, pid) =>
    buildGridDemo(
      cid,
      pid,
      "3 列 · 5 子\n（末行 2 格）",
      3,
      [
        { kind: "chip", label: "1", color: "#6366F1" },
        { kind: "chip", label: "2", color: "#6366F1" },
        { kind: "chip", label: "3", color: "#6366F1" },
        { kind: "chip", label: "4", color: "#6366F1" },
        { kind: "chip", label: "5", color: "#6366F1" },
      ]
    ),
  (cid, pid) =>
    buildGridDemo(
      cid,
      pid,
      "4 列 · 6 子",
      4,
      "A B C D E F".split(" ").map((l) => ({ kind: "chip", label: l, color: "#0EA5E9" }))
    ),
]);
buildDemoRow("gt-ch1-b", "gt-ch1", "1B · gap 与 1 列", [
  (cid, pid) =>
    buildGridDemo(
      cid,
      pid,
      "gap=0",
      2,
      [
        { kind: "chip", label: "L", color: "#64748B" },
        { kind: "chip", label: "R", color: "#64748B" },
      ],
      {},
      { gap: "0" }
    ),
  (cid, pid) =>
    buildGridDemo(
      cid,
      pid,
      "gap=20px",
      2,
      [
        { kind: "chip", label: "L", color: "#64748B" },
        { kind: "chip", label: "R", color: "#64748B" },
      ],
      {},
      { gap: "20px" }
    ),
  (cid, pid) =>
    buildGridDemo(
      cid,
      pid,
      "1 列纵排",
      1,
      [
        { kind: "chip", label: "上", color: "#475569" },
        { kind: "chip", label: "中", color: "#475569" },
        { kind: "chip", label: "下", color: "#475569" },
      ]
    ),
]);

// ─── 2 cellWidthMode ─────────────────────────────────────
section("gt-ch2", "gt-root", ["gt-ch2-hdr", "gt-ch2-row"], "#F0FDF4");
chapterHeader(
  "gt-ch2",
  "gt-ch2",
  "2",
  "cellWidthMode",
  "auto：按栅格外壳宽度均分列宽。fixed：每列 cellWidth（table width:auto）。"
);
buildDemoRow("gt-ch2-row", "gt-ch2", "2 · auto vs fixed 72px（3 列）", [
  (cid, pid) =>
    buildGridDemo(
      cid,
      pid,
      "auto\n均分",
      3,
      [
        { kind: "chip", label: "A", color: "#059669" },
        { kind: "chip", label: "B", color: "#059669" },
        { kind: "chip", label: "C", color: "#059669" },
      ],
      {},
      { cellWidthMode: "auto" }
    ),
  (cid, pid) =>
    buildGridDemo(
      cid,
      pid,
      "fixed 72px",
      3,
      [
        { kind: "chip", label: "A", color: "#047857" },
        { kind: "chip", label: "B", color: "#047857" },
        { kind: "chip", label: "C", color: "#047857" },
      ],
      { widthMode: "fill" },
      { cellWidthMode: "fixed", cellWidth: "72px" }
    ),
  (cid, pid) =>
    buildGridDemo(
      cid,
      pid,
      "fixed 100px\n4 列",
      4,
      "1 2 3 4".split(" ").map((l) => ({ kind: "chip", label: l, color: "#065F46" })),
      {},
      { cellWidthMode: "fixed", cellWidth: "100px", gap: "4px" }
    ),
]);

// ─── 3 cellHeightMode ────────────────────────────────────
section("gt-ch3", "gt-root", ["gt-ch3-hdr", "gt-ch3-row"], "#FFF7ED");
chapterHeader(
  "gt-ch3",
  "gt-ch3",
  "3",
  "cellHeightMode",
  "content-max：同行取最高子块等高。fixed：每行轨道固定 cellHeight。"
);
buildDemoRow("gt-ch3-row", "gt-ch3", "3 · 同行等高 vs 定高轨道", [
  (cid, pid) =>
    buildGridDemo(
      cid,
      pid,
      "content-max\n左矮右高",
      2,
      [
        { kind: "chip", label: "矮", color: "#EA580C", heightMode: "hug" },
        {
          kind: "text",
          label: "较高\n第二行",
          opts: { backgroundColor: "#FED7AA", fontSize: "11px", heightMode: "hug" },
        },
      ],
      {},
      { cellHeightMode: "content-max" }
    ),
  (cid, pid) =>
    buildGridDemo(
      cid,
      pid,
      "fixed 56px",
      2,
      [
        { kind: "chip", label: "A", color: "#C2410C" },
        { kind: "chip", label: "B", color: "#C2410C" },
      ],
      {},
      { cellHeightMode: "fixed", cellHeight: "56px" }
    ),
  (cid, pid) =>
    buildGridDemo(
      cid,
      pid,
      "fixed 88px\n+ 多行字",
      2,
      [
        {
          kind: "text",
          label: "行1\n行2\n行3",
          opts: { backgroundColor: "#FFEDD5", fontSize: "10px" },
        },
        { kind: "chip", label: "短", color: "#9A3412" },
      ],
      {},
      { cellHeightMode: "fixed", cellHeight: "88px" }
    ),
]);

// ─── 4 栅格外壳 ──────────────────────────────────────────
section("gt-ch4", "gt-root", ["gt-ch4-hdr", "gt-ch4-row"], "#FAF5FF");
chapterHeader("gt-ch4", "gt-ch4", "4", "栅格外壳", "wrapperStyle：padding / 描边 / 背景色 / 定高。");
buildDemoRow("gt-ch4-row", "gt-ch4", "4 · 外壳样式", [
  (cid, pid) =>
    buildGridDemo(
      cid,
      pid,
      "padding 12\n+ 描边",
      2,
      [
        { kind: "chip", label: "A", color: "#7C3AED" },
        { kind: "chip", label: "B", color: "#7C3AED" },
      ],
      {
        padding: { top: "12px", right: "12px", bottom: "12px", left: "12px" },
        border: { style: "solid", color: "#A78BFA", top: "2px", right: "2px", bottom: "2px", left: "2px" },
        backgroundColor: "#F5F3FF",
      }
    ),
  (cid, pid) =>
    buildGridDemo(
      cid,
      pid,
      "fixed 高 120px\n（轨道仍 content-max）",
      2,
      [
        { kind: "chip", label: "A", color: "#6D28D9" },
        { kind: "chip", label: "B", color: "#6D28D9" },
      ],
      { heightMode: "fixed", height: "120px", backgroundColor: "#EDE9FE" }
    ),
  (cid, pid) =>
    buildGridDemo(
      cid,
      pid,
      "hug 宽栅格\nfixed 列 80px",
      2,
      [
        { kind: "chip", label: "X", color: "#5B21B6" },
        { kind: "chip", label: "Y", color: "#5B21B6" },
      ],
      { widthMode: "hug", heightMode: "hug" },
      { cellWidthMode: "fixed", cellWidth: "80px" }
    ),
]);

// ─── 5 栅格矩阵格 contentAlign（三档速查）──────────────────
section("gt-ch5", "gt-root", ["gt-ch5-hdr", "gt-ch5-quick"], "#ECFEFF");
chapterHeader(
  "gt-ch5",
  "gt-ch5",
  "5",
  "栅格矩阵格 contentAlign",
  "每格 1×1 子块：双轴写在 grid.contentAlign。完整 9 宫格见 layout-test 第 2 章。"
);
{
  const wrapId = "gt-ch5-quick";
  addBlock(
    text(`${wrapId}-title`, wrapId, "5 · 三档速查（左上 / 正中 / 右下）", {
      fontSize: "12px",
      bold: true,
      color: "#0E7490",
      backgroundColor: "#CFFAFE",
    }),
    "5 速查",
    "content.text"
  );
  const cellIds = [];
  for (const [i, combo] of [
    { h: "start", v: "start", label: "左上" },
    { h: "center", v: "center", label: "正中" },
    { h: "end", v: "end", label: "右下" },
  ].entries()) {
    const cellId = `${wrapId}-c${i}`;
    const gId = `${cellId}-g`;
    const chId = `${gId}-a`;
    cellIds.push(cellId);
    addBlock(text(`${cellId}-lbl`, cellId, combo.label, { fontSize: "10px", color: "#64748B" }), combo.label);
    addBlock(
      grid(
        gId,
        cellId,
        [chId],
        1,
        {
          contentAlign: contentAlignFromAxes(combo.h, combo.v),
          backgroundColor: "#F0FDFA",
          border: { style: "solid", color: "#99F6E4", top: "1px", right: "1px", bottom: "1px", left: "1px" },
          heightMode: "fixed",
          height: "72px",
          padding: { top: "4px", right: "4px", bottom: "4px", left: "4px" },
        },
        { gap: "0" }
      ),
      combo.label,
      "grid"
    );
    addBlock(
      chip(chId, gId, "•", "#0891B2", "hug", {
        heightMode: combo.label === "正中" ? "fill" : "hug",
        contentAlign: CONTENT_ALIGN_NEUTRAL,
      }),
      "点"
    );
    addBlock(
      layout(cellId, `${wrapId}-row`, "vertical", [`${cellId}-lbl`, gId], {
        widthMode: "fill",
        backgroundColor: "#FFFFFF",
        padding: { top: "4px", right: "4px", bottom: "4px", left: "4px" },
      }),
      combo.label,
      "layout"
    );
  }
  addBlock(layout(`${wrapId}-row`, wrapId, "horizontal", cellIds, {}, { gap: "8px" }), "5 行", "layout");
  addBlock(
    layout(wrapId, "gt-ch5", "vertical", [`${wrapId}-title`, `${wrapId}-row`], {
      backgroundColor: "#FFFFFF",
      border: { style: "solid", color: "#67E8F9", top: "1px", right: "1px", bottom: "1px", left: "1px" },
      padding: { top: "8px", right: "8px", bottom: "8px", left: "8px" },
    }),
    "5 速查",
    "layout"
  );
}

// ─── 6 格内子块对齐与尺寸 ─────────────────────────────────
section("gt-ch6", "gt-root", ["gt-ch6-hdr", "gt-ch6-hug", "gt-ch6-size"], "#FEF3C7");
chapterHeader(
  "gt-ch6",
  "gt-ch6",
  "6",
  "格内子块对齐与尺寸",
  "matrix 槽：hug 宽可配水平三档；fill 宽会 scrub 水平 contentAlign。"
);
buildGridDemo(
  "gt-ch6-hug",
  "gt-ch6",
  "6A · hug 宽 · contentAlign.horizontal",
  3,
  [
    { kind: "chip", label: "h:start", color: "#DC2626", widthMode: "hug", contentAlign: contentAlignFromAxes("start", "start") },
    { kind: "chip", label: "h:center", color: "#DC2626", widthMode: "hug", contentAlign: contentAlignFromAxes("center", "start") },
    { kind: "chip", label: "h:end", color: "#DC2626", widthMode: "hug", contentAlign: contentAlignFromAxes("end", "start") },
  ],
  { heightMode: "fixed", height: "64px", backgroundColor: "#FFFBEB" }
);
buildDemoRow("gt-ch6-size", "gt-ch6", "6B · fill vs hug vs fixed", [
  (cid, pid) =>
    buildGridDemo(
      cid,
      pid,
      "fill 宽\nh:end→scrub start",
      1,
      [
        {
          kind: "chip",
          label: "fill·铺满格",
          color: "#991B1B",
          widthMode: "fill",
          contentAlign: contentAlignFromAxes("end", "start"),
        },
      ],
      { heightMode: "fixed", height: "48px", backgroundColor: "#FEF2F2" }
    ),
  (cid, pid) =>
    buildGridDemo(
      cid,
      pid,
      "hug 宽\ncontentAlign h:end",
      1,
      [
        {
          kind: "chip",
          label: "hug·end",
          color: "#B91C1C",
          widthMode: "hug",
          contentAlign: contentAlignFromAxes("end", "start"),
        },
      ],
      { heightMode: "fixed", height: "48px", backgroundColor: "#FEF2F2" }
    ),
  (cid, pid) =>
    buildGridDemo(
      cid,
      pid,
      "fixed 48×32\nh:center",
      1,
      [
        {
          kind: "chip",
          label: "fix",
          color: "#7F1D1D",
          widthMode: "fixed",
          width: "48px",
          heightMode: "fixed",
          height: "32px",
          contentAlign: contentAlignFromAxes("center", "start"),
        },
      ],
      { heightMode: "fixed", height: "48px", backgroundColor: "#FEF2F2" }
    ),
]);

// ─── 7 格内子块类型 ──────────────────────────────────────
section("gt-ch7", "gt-root", ["gt-ch7-hdr", "gt-ch7-types"], "#F1F5F9");
chapterHeader("gt-ch7", "gt-ch7", "7", "格内子块类型", "2×2：text / layout / content.image / button。");
buildGridDemo(
  "gt-ch7-types",
  "gt-ch7",
  "7 · 2×2 类型矩阵",
  2,
  [
    { kind: "text", label: "纯文本\n格", opts: { backgroundColor: "#E2E8F0", fontSize: "12px" } },
    { kind: "layout", label: "layout 壳", color: "#6366F1" },
    { kind: "image", label: "image", opts: { height: "64px", fit: "cover" } },
    { kind: "button", label: "按钮", opts: { bg: "#334155" } },
  ],
  { padding: { top: "6px", right: "6px", bottom: "6px", left: "6px" } },
  { gap: "10px" }
);

// ─── 8 栅格底图 ──────────────────────────────────────────
section("gt-ch8", "gt-root", ["gt-ch8-hdr", "gt-ch8-a", "gt-ch8-b"], "#EEF2FF");
chapterHeader(
  "gt-ch8",
  "gt-ch8",
  "8",
  "栅格 wrapper 底图",
  "wrapperStyle.backgroundImage：与 layout 底图同源渲染；栅格 table 叠在底图 td 内。"
);
buildDemoRow("gt-ch8-a", "gt-ch8", "8A · fit 对照（定高 120px）", [
  (cid, pid) =>
    buildGridDemo(
      cid,
      pid,
      "cover",
      2,
      [
        { kind: "chip", label: "A", color: "rgba(59,130,246,0.85)" },
        { kind: "chip", label: "B", color: "rgba(16,185,129,0.85)" },
      ],
      {
        heightMode: "fixed",
        height: "120px",
        backgroundImage: {
          src: IMG_SRC,
          alt: IMG_ALT,
          link: "",
          fit: "cover",
          position: "center",
          borderRadius: RADIUS_SM,
          border: BORDER_ZERO,
        },
      }
    ),
  (cid, pid) =>
    buildGridDemo(
      cid,
      pid,
      "contain\n+ 底色",
      2,
      [
        { kind: "chip", label: "A", color: "rgba(124,58,237,0.85)" },
        { kind: "chip", label: "B", color: "rgba(124,58,237,0.85)" },
      ],
      {
        heightMode: "fixed",
        height: "120px",
        backgroundColor: "#E0E7FF",
        backgroundImage: {
          src: IMG_SRC,
          alt: IMG_ALT,
          link: "",
          fit: "contain",
          position: "center",
          borderRadius: RADIUS_SM,
          border: BORDER_ZERO,
        },
      }
    ),
]);
buildGridDemo(
  "gt-ch8-b",
  "gt-ch8",
  "8B · 底图 + padding + link（点格跳转）",
  2,
  [
    { kind: "chip", label: "格1", color: "rgba(0,0,0,0.55)" },
    { kind: "chip", label: "格2", color: "rgba(0,0,0,0.55)" },
  ],
  {
    heightMode: "fixed",
    height: "100px",
    padding: { top: "10px", right: "10px", bottom: "10px", left: "10px" },
    backgroundImage: {
      src: IMG_SRC,
      alt: IMG_ALT,
      link: "https://www.pexels.com/",
      fit: "cover",
      position: "left center",
      borderRadius: RADIUS_SM,
      border: BORDER_ZERO,
    },
  },
  { gap: "12px" }
);

// ─── 9 多行 content-max ─────────────────────────────────
section("gt-ch9", "gt-root", ["gt-ch9-hdr", "gt-ch9-multi"], "#ECFDF5");
chapterHeader(
  "gt-ch9",
  "gt-ch9",
  "9",
  "多行 content-max",
  "2 列 × 3 行：每行独立等高；观察 ResizeObserver 行高同步。"
);
buildGridDemo(
  "gt-ch9-multi",
  "gt-ch9",
  "9 · 2×3 混合高度",
  2,
  [
    { kind: "chip", label: "R1·短", color: "#059669" },
    { kind: "text", label: "R1·两行\n文字", opts: { backgroundColor: "#A7F3D0", fontSize: "11px" } },
    {
      kind: "text",
      label: "R2·三行\nA\nB",
      opts: { backgroundColor: "#6EE7B7", fontSize: "10px" },
    },
    { kind: "chip", label: "R2·短", color: "#047857" },
    { kind: "chip", label: "R3·A", color: "#065F46" },
    { kind: "chip", label: "R3·B", color: "#065F46" },
  ],
  { border: { style: "solid", color: "#6EE7B7", top: "1px", right: "1px", bottom: "1px", left: "1px" } },
  { gap: "10px", cellHeightMode: "content-max" }
);

// ─── 10 综合 ─────────────────────────────────────────────
section("gt-ch10", "gt-root", ["gt-ch10-hdr", "gt-ch10-combo"], "#FFFBEB");
chapterHeader(
  "gt-ch10",
  "gt-ch10",
  "10",
  "综合场景",
  "底图 + padding + 2×2：hug contentAlign + image + 文案。"
);
{
  const comboId = "gt-ch10-combo";
  const gId = `${comboId}-g`;
  const childIds = [`${gId}-c0`, `${gId}-c1`, `${gId}-c2`, `${gId}-c3`];
  addBlock(
    text(`${comboId}-lbl`, comboId, "11 · 营销栅格卡（底图 + 2×2）", {
      fontSize: "11px",
      color: "#92400E",
    }),
    "综合",
    "content.text"
  );
  addBlock(
    chip(`${gId}-c0`, gId, "NEW", "#DC2626", "hug", {
      contentAlign: contentAlignFromAxes("start", "start"),
    }),
    "NEW"
  );
  addBlock(imageBlock(`${gId}-c1`, gId, { height: "56px", fit: "cover" }), "缩略图", "content.image");
  addBlock(
    text(`${gId}-c2`, gId, "栅格标题\n副文案两行", {
      fontSize: "12px",
      bold: true,
      backgroundColor: "rgba(255,255,255,0.92)",
    }),
    "标题"
  );
  addBlock(button(`${gId}-c3`, gId, "查看", { bg: "#B45309" }), "CTA", "action.button");
  addBlock(
    grid(
      gId,
      comboId,
      childIds,
      2,
      {
        heightMode: "fixed",
        height: "160px",
        padding: { top: "8px", right: "8px", bottom: "8px", left: "8px" },
        backgroundImage: {
          src: IMG_SRC,
          alt: IMG_ALT,
          link: "",
          fit: "cover",
          position: "center",
          borderRadius: RADIUS_MD,
          border: BORDER_ZERO,
        },
      },
      { gap: "8px", cellHeightMode: "content-max" }
    ),
    "综合栅格",
    "grid"
  );
  addBlock(
    layout(comboId, "gt-ch10", "vertical", [`${comboId}-lbl`, gId], {
      backgroundColor: "#FFFFFF",
      border: { style: "solid", color: "#FCD34D", top: "1px", right: "1px", bottom: "1px", left: "1px" },
      padding: { top: "8px", right: "8px", bottom: "8px", left: "8px" },
    }),
    "综合",
    "layout"
  );
}

// ─── 落盘 ───────────────────────────────────────────────
const template = {
  schemaVersion: "4.0.0",
  emailId: EMAIL_KEY,
  templateId: EMAIL_KEY,
  templateVersion: 1,
  locale: "zh-CN",
  rootBlockId: "gt-root",
  blockMeta,
  blocks,
};

const meta = {
  displayName: "栅格测试专用模板",
  description:
    "layout.grid 专有测试：columns/gap、cell 宽高、外壳、矩阵对齐速查、子块对齐尺寸、子类型、底图、多行等高、综合。对齐矩阵见 layout-test。",
  source: "agent",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  defaultStylePresetSelection: "local",
};

const layoutManifest = {
  schemaVersion: "1.0.0",
  activeLayoutVariantId: "default",
  variants: [{ id: "default", label: "默认", description: "栅格全场景测试" }],
};

const tokenPresets = {
  schemaVersion: "1.0.0",
  activePresetId: "default",
  presets: {
    default: {
      label: "测试预设",
      description: "最小 token",
      tokens: {
        colors: { primary: "#111827", accent: "#1A1A1A", secondary: "#6B7280", surface: "#FFFFFF" },
        spacing: { section: "12px", gap: "8px", pageInline: "12px" },
        typography: { display: "24px", h1: "18px", body: "13px", caption: "12px" },
        radius: { panel: "4px", cta: "4px" },
      },
    },
  },
  scopeSelections: {},
};

const payload = {
  schemaVersion: "1.0.0",
  slots: {},
  values: {},
};

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

writeJson(path.join(OUT, "meta.json"), meta);
writeJson(path.join(OUT, "payload.json"), payload);
writeJson(path.join(OUT, "layout-manifest.json"), layoutManifest);
writeJson(path.join(LAYOUT_DIR, "template.json"), graphToDiskJson(template));
writeJson(path.join(LAYOUT_DIR, "tokenPresets.json"), tokenPresets);

finalizeGeneratedTemplate(path.join(LAYOUT_DIR, "template.json"));

console.log(`已写入 data/emails/${EMAIL_KEY}/（${Object.keys(blocks).length} blocks）`);
