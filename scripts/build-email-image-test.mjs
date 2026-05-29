#!/usr/bin/env node

import { contentAlignFromAxes } from "./lib/content-align-axis.mjs";
/**
 * 生成「图片测试专用模板」→ data/emails/image-test/
 *
 * 图源（Pexels，交付前 curl -I 200）：
 * - 默认横图（雾中城市）：325185
 * - 第 2 章画面位置：仓库自研 PNG（public/image-test-position/，先 npm run generate:image-test-position-assets）
 *
 * 章节（穷举 content.image + layout 底图常见场景）：
 *  0 导读
 *  1 fit：cover / contain
 *  2 cover + position 九宫格（裁切焦点）
 *  3 contain 对照（position 不参与摆放）
 *  4 视窗尺寸：fill×定高 / fixed×fixed / hug 等
 *  5 描边与圆角（wrapper vs backgroundImage）
 *  6 跳转 link
 *  7 叠放子内容（image 块 + 文案叠层；双轴矩阵见 layout-test）
 *  8 layout.container 底图 vs content.image 对照
 *  9 payload 变量绑定 src / alt
 *
 * 用法：node scripts/build-email-image-test.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { finalizeGeneratedTemplate } from "./lib/finalize-generated-template.mjs";
import { textBodyFromString } from "./lib/test-email-text-body.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, "..");
const EMAIL_KEY = "image-test";
const OUT = path.join(REPO, "data", "emails", EMAIL_KEY);
const LAYOUT_DIR = path.join(OUT, "layouts", "default");

const PEXELS = (id, w = 800) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

/** 其余章节通用 */
const IMG_SRC = PEXELS(325185);
const IMG_ALT = "城市天际线（雾中高楼）";

/**
 * 第 2 章：白底九宫格数字 1–9 测试图（scripts/generate-image-test-position-assets.py）
 * 默认经 Vite public 提供；可用 IMAGE_TEST_ASSET_BASE 覆盖根 URL。
 */
const IMAGE_TEST_ASSET_BASE =
  process.env.IMAGE_TEST_ASSET_BASE?.replace(/\/$/, "") || "http://127.0.0.1:5180";
const positionAsset = (name) => `${IMAGE_TEST_ASSET_BASE}/image-test-position/${name}`;
const IMG_SRC_POSITION_SQUARE = positionAsset("position-markers-square.png");
const IMG_SRC_POSITION_SPAN_LR = positionAsset("position-markers-span-lr.png");
const IMG_SRC_POSITION_SPAN_TB = positionAsset("position-markers-span-tb.png");
const IMG_ALT_POSITION_SQUARE = "画面位置测试·正方九宫格数字1-9";
const IMG_ALT_POSITION_SPAN_LR = "画面位置测试·全宽三列数字1-9（2:1）";
const IMG_ALT_POSITION_SPAN_TB = "画面位置测试·全高三行数字1-9（1:2）";

const BORDER_ZERO = {
  mode: "unified",
  width: "0",
  style: "solid",
  color: "rgba(0,0,0,0)",
};
const RADIUS_SM = { mode: "unified", radius: "4px" };
const RADIUS_MD = { mode: "unified", radius: "12px" };
const RADIUS_LG = { mode: "unified", radius: "24px" };

/** 与 src/lib/imageObjectPosition.ts IMAGE_OBJECT_POSITION_PRESETS 一致 */
const POSITION_PRESETS = [
  { value: "left top", label: "左上" },
  { value: "center top", label: "上中" },
  { value: "right top", label: "右上" },
  { value: "left center", label: "左中" },
  { value: "center", label: "正中" },
  { value: "right center", label: "右中" },
  { value: "left bottom", label: "左下" },
  { value: "center bottom", label: "下中" },
  { value: "right bottom", label: "右下" },
];

/** @type {Record<string, object>} */
const blocks = {};
/** @type {Record<string, { blockType: string, name: string }>} */
const blockMeta = {};

function addBlock(block, name, metaType = "content.image") {
  blocks[block.id] = block;
  const bt =
    metaType === "layout"
      ? "layout.container"
      : metaType === "emailRoot"
        ? "email.root"
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

/**
 * content.image：资源在 wrapperStyle.backgroundImage
 */
function imageBlock(id, parentId, opts = {}, children = []) {
  const {
    src = IMG_SRC,
    alt = IMG_ALT,
    link = "",
    fit = "cover",
    position = "center",
    widthMode = "fill",
    heightMode = "fixed",
    width,
    height,
    contentAlign = { horizontal: "left", vertical: "top" },
    backgroundColor,
    wrapperBorder = BORDER_ZERO,
    wrapperRadius = RADIUS_SM,
    bgBorder = BORDER_ZERO,
    bgRadius = RADIUS_SM,
    bindings = {},
  } = opts;
  const ws = {
    contentAlign,
    widthMode,
    heightMode,
    border: wrapperBorder,
    borderRadius: wrapperRadius,
    backgroundImage: {
      src,
      alt,
      link,
      fit,
      position,
      borderRadius: bgRadius,
      border: bgBorder,
    },
  };
  if (width) ws.width = width;
  if (height) ws.height = height;
  if (backgroundColor) ws.backgroundColor = backgroundColor;

  const hasOverlay = children.length > 0;
  const props = hasOverlay
    ? { direction: "vertical", gapMode: "fixed", gap: "8px", ...(opts.propsExtra ?? {}) }
    : (opts.propsExtra ?? {});

  return {
    id,
    type: "image",
    parentId,
    children,
    wrapperStyle: ws,
    props,
    bindings,
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
    `${num} ${title}`,
    "content.text"
  );
  return titleId;
}

function section(id, parentId, childIds, bg) {
  const sec = layout(id, parentId, "vertical", childIds, {
    backgroundColor: bg,
    padding: { mode: "unified", unified: "12px" },
  });
  addBlock(sec, id, "layout");
  return id;
}

/** 叠放子级演示用小标签（hug） */
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

/** 两列对照格 */
function buildCompareRow(rowId, parentId, title, cells) {
  addBlock(
    text(`${rowId}-title`, rowId, title, {
      fontSize: "12px",
      bold: true,
      color: "#1E3A8A",
      backgroundColor: "#EFF6FF",
    }),
    title,
    "content.text"
  );
  const cellIds = cells.map((cell, i) => {
    const cellId = `${rowId}-c${i}`;
    addBlock(
      text(`${cellId}-lbl`, cellId, cell.label, { fontSize: "10px", color: "#6B7280" }),
      cell.label,
      "content.text"
    );
    addBlock(imageBlock(`${cellId}-img`, cellId, cell.imgOpts), cell.label);
    addBlock(
      layout(cellId, rowId, "vertical", [`${cellId}-lbl`, `${cellId}-img`], {
        widthMode: "fill",
        backgroundColor: "#FFFFFF",
        border: { mode: "unified", width: "1px", style: "solid", color: "#BFDBFE" },
        padding: { mode: "unified", unified: "6px" },
      }),
      cell.label,
      "layout"
    );
    return cellId;
  });
  addBlock(
    layout(rowId, parentId, "vertical", [`${rowId}-title`, ...cellIds], {}, { gap: "8px" }),
    title,
    "layout"
  );
}

/** cover + position 3×3（视窗宜明显偏离图源比例，cover 才有裁切，position 才肉眼可辨） */
function buildPositionGrid(gridId, parentId, opts = {}) {
  const {
    fit = "cover",
    height = "100px",
    width,
    widthMode = "fill",
    src = IMG_SRC,
    alt = IMG_ALT,
    title = `position 九宫格 · fit=${fit}`,
    backgroundColor,
    /** 定宽视窗时在格内水平居中（写在该图片块 contentAlign.horizontal） */
    centerFixedViewport = widthMode === "fixed" && Boolean(width),
  } = opts;
  addBlock(
    text(`${gridId}-title`, gridId, title, {
      fontSize: "12px",
      bold: true,
      color: "#7C2D12",
      backgroundColor: "#FFEDD5",
    }),
    "九宫格",
    "content.text"
  );
  const rowIds = [];
  for (let r = 0; r < 3; r++) {
    const rowId = `${gridId}-r${r}`;
    rowIds.push(rowId);
    const cellIds = [];
    for (let c = 0; c < 3; c++) {
      const preset = POSITION_PRESETS[r * 3 + c];
      const cellId = `${rowId}-c${c}`;
      cellIds.push(cellId);
      addBlock(
        text(`${cellId}-lbl`, cellId, `${preset.label}\n${preset.value}`, {
          fontSize: "10px",
          color: "#9A3412",
        }),
        preset.label,
        "content.text"
      );
      addBlock(
        imageBlock(`${cellId}-img`, cellId, {
          src,
          alt,
          fit,
          position: preset.value,
          widthMode,
          width,
          heightMode: "fixed",
          height,
          backgroundColor,
          ...(centerFixedViewport
            ? { contentAlign: contentAlignFromAxes("center", "start") }
            : {}),
        }),
        preset.label
      );
      addBlock(
        layout(cellId, rowId, "vertical", [`${cellId}-lbl`, `${cellId}-img`], {
          widthMode: "fill",
          backgroundColor: "#FFFBEB",
          border: { mode: "unified", width: "1px", style: "solid", color: "#FED7AA" },
          padding: { mode: "unified", unified: "4px" },
        }),
        preset.label,
        "layout"
      );
    }
    addBlock(layout(rowId, gridId, "horizontal", cellIds, {}, { gap: "6px" }), `行${r + 1}`, "layout");
  }
  addBlock(
    layout(gridId, parentId, "vertical", [`${gridId}-title`, ...rowIds], {
      backgroundColor: "#FFFFFF",
      border: { mode: "unified", width: "1px", style: "solid", color: "#FDBA74" },
      padding: { mode: "unified", unified: "8px" },
    }),
    "九宫格",
    "layout"
  );
}

// ─── 根与导读 ─────────────────────────────────────────────
const ROOT_SECTIONS = [
  "it-intro",
  "it-ch1",
  "it-ch2",
  "it-ch3",
  "it-ch4",
  "it-ch5",
  "it-ch6",
  "it-ch7",
  "it-ch8",
  "it-ch9",
];

addBlock(
  {
    id: "it-root",
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
  "emailRoot"
);

addBlock(
  text(
    "it-intro",
    "it-root",
    "图片测试专用模板\n\n默认图源：Pexels 325185。第 2 章：自研白底九宫格数字 1–9 图（public/image-test-position/，预览需 dev:all）。\n\ncontent.image：资源在 wrapperStyle.backgroundImage（src / alt / link / fit / position / 描边圆角）；视窗由 widthMode / heightMode / width / height 控制。\n\n叠放子内容时 props.direction / gap 与带底图 layout 一致；容器内双轴 contentAlign 矩阵见 layout-test，本模板只保留图片专有语义。",
    { fontSize: "13px", backgroundColor: "#FFFFFF", color: "#374151" }
  ),
  "导读",
  "content.text"
);

// ─── 1 fit ───────────────────────────────────────────────
section("it-ch1", "it-root", ["it-ch1-hdr", "it-ch1-fit"], "#EFF6FF");
chapterHeader(
  "it-ch1",
  "it-ch1",
  "1",
  "fit 裁切模式",
  "cover 填满视窗可裁切；contain 完整显示（letterbox）。position 仅在 cover 时作裁切焦点。"
);
buildCompareRow("it-ch1-fit", "it-ch1", "1 · fit 对照（fill 宽 · 定高 140px）", [
  {
    label: "cover\n默认",
    imgOpts: { fit: "cover", position: "center", height: "140px" },
  },
  {
    label: "contain\n完整显示",
    imgOpts: { fit: "contain", position: "center", height: "140px", backgroundColor: "#E5E7EB" },
  },
]);

// ─── 2 position cover 九宫格（横图 + 竖图）────────────────
section("it-ch2", "it-root", ["it-ch2-hdr", "it-ch2-land", "it-ch2-port", "it-ch2-square"], "#FFF7ED");
chapterHeader(
  "it-ch2",
  "it-ch2",
  "2",
  "position · cover 九宫格",
  "自研测试图（public/image-test-position/，数字 1–9：1=左上 … 9=右下）。2A/2B 用全宽三列、全高三行数字图；须用小视窗制造 cover 裁切。2C 用正方图 + 扁宽视窗。"
);
buildPositionGrid("it-ch2-land", "it-ch2", {
  fit: "cover",
  height: "112px",
  width: "52px",
  widthMode: "fixed",
  src: IMG_SRC_POSITION_SPAN_LR,
  alt: IMG_ALT_POSITION_SPAN_LR,
  title:
    "2A · 全宽三列数字 1–9（画布 2:1）\n窄高视窗 52×112 · cover 强裁切水平\n验收：同行格左/中/右列应分别露出不同列数字（如 1/4/7 vs 2/5/8）",
  backgroundColor: "#F3F4F6",
});
buildPositionGrid("it-ch2-port", "it-ch2", {
  fit: "cover",
  height: "52px",
  width: "112px",
  widthMode: "fixed",
  src: IMG_SRC_POSITION_SPAN_TB,
  alt: IMG_ALT_POSITION_SPAN_TB,
  title:
    "2B · 全高三行数字 1–9（画布 1:2）\n扁宽视窗 112×52 · cover 强裁切垂直\n验收：同行格上/中/下排应分别露出不同行数字（如 1/2/3 vs 7/8/9）",
  backgroundColor: "#F3F4F6",
});
buildPositionGrid("it-ch2-square", "it-ch2", {
  fit: "cover",
  height: "44px",
  width: "128px",
  widthMode: "fixed",
  src: IMG_SRC_POSITION_SQUARE,
  alt: IMG_ALT_POSITION_SQUARE,
  title:
    "2C · 正方图源（900×900，数字 1–9）\n扁宽视窗 128×44（非正方）· cover 裁切上下\n验收：九格应露出不同数字；勿用正方视窗（会与图源同比例导致九格同图）",
  backgroundColor: "#F3F4F6",
});

// ─── 3 contain 对照 ──────────────────────────────────────
section("it-ch3", "it-root", ["it-ch3-hdr", "it-ch3-contain"], "#F0FDF4");
chapterHeader(
  "it-ch3",
  "it-ch3",
  "3",
  "contain · position 无效对照",
  "contain 时 position 不参与画面在视窗内的摆放（渲染固定 center）；三格 position 不同但视觉应一致。"
);
buildCompareRow("it-ch3-contain", "it-ch3", "3 · contain + 不同 position（应对齐一致）", [
  { label: "position\nleft top", imgOpts: { fit: "contain", position: "left top", height: "120px", backgroundColor: "#DCFCE7" } },
  { label: "position\ncenter", imgOpts: { fit: "contain", position: "center", height: "120px", backgroundColor: "#DCFCE7" } },
  { label: "position\nright bottom", imgOpts: { fit: "contain", position: "right bottom", height: "120px", backgroundColor: "#DCFCE7" } },
]);

// ─── 4 视窗尺寸 ──────────────────────────────────────────
section("it-ch4", "it-root", ["it-ch4-hdr", "it-ch4-sizes"], "#FAF5FF");
chapterHeader(
  "it-ch4",
  "it-ch4",
  "4",
  "视窗尺寸模式",
  "widthMode / heightMode / 自定义 width·height 组合。"
);
const sizeDemos = [
  {
    id: "banner",
    label: "fill × 定高 160px\n通栏横幅",
    opts: { widthMode: "fill", heightMode: "fixed", height: "160px", fit: "cover" },
  },
  {
    id: "fixed-rect",
    label: "fixed 240×100\n矩形缩略",
    opts: {
      widthMode: "fixed",
      width: "240px",
      heightMode: "fixed",
      height: "100px",
      fit: "cover",
    },
  },
  {
    id: "hug-row",
    label: "fixed 200px × hug\ncontain 整图",
    opts: {
      widthMode: "fixed",
      width: "200px",
      heightMode: "hug",
      fit: "contain",
      backgroundColor: "#EDE9FE",
    },
  },
  {
    id: "wide-short",
    label: "fill × 定高 56px\n矮条",
    opts: { widthMode: "fill", heightMode: "fixed", height: "56px", fit: "cover", position: "center bottom" },
  },
];
addBlock(
  text("it-ch4-sizes-title", "it-ch4-sizes", "4 · 尺寸矩阵", {
    fontSize: "12px",
    bold: true,
    color: "#5B21B6",
    backgroundColor: "#F3E8FF",
  }),
  "尺寸",
  "content.text"
);
const sizeCellIds = [];
for (const demo of sizeDemos) {
  const cellId = `it-ch4-sizes-${demo.id}`;
  sizeCellIds.push(cellId);
  addBlock(
    text(`${cellId}-lbl`, cellId, demo.label, { fontSize: "10px", color: "#6B7280" }),
    demo.label,
    "content.text"
  );
  addBlock(imageBlock(`${cellId}-img`, cellId, demo.opts), demo.label);
  addBlock(
    layout(cellId, "it-ch4-sizes", "vertical", [`${cellId}-lbl`, `${cellId}-img`], {
      widthMode: "fill",
      backgroundColor: "#FFFFFF",
      border: { mode: "unified", width: "1px", style: "solid", color: "#DDD6FE" },
      padding: { mode: "unified", unified: "6px" },
    }),
    demo.label,
    "layout"
  );
}
addBlock(
  layout("it-ch4-sizes", "it-ch4", "vertical", ["it-ch4-sizes-title", ...sizeCellIds], {
    backgroundColor: "#FFFFFF",
    border: { mode: "unified", width: "1px", style: "solid", color: "#C4B5FD" },
    padding: { mode: "unified", unified: "8px" },
  }),
  "尺寸矩阵",
  "layout"
);

// ─── 5 描边圆角 ──────────────────────────────────────────
section("it-ch5", "it-root", ["it-ch5-hdr", "it-ch5-style"], "#FDF2F8");
chapterHeader("it-ch5", "it-ch5", "5", "描边与圆角", "wrapper 外层 vs backgroundImage 内层可分别设置。");
buildCompareRow("it-ch5-style", "it-ch5", "5 · 样式对照", [
  {
    label: "无描边\n圆角 0",
    imgOpts: {
      height: "100px",
      wrapperRadius: { mode: "unified", radius: "0" },
      bgRadius: { mode: "unified", radius: "0" },
    },
  },
  {
    label: "图级圆角 12px\nwrapper 0",
    imgOpts: {
      height: "100px",
      wrapperRadius: { mode: "unified", radius: "0" },
      bgRadius: RADIUS_MD,
    },
  },
  {
    label: "wrapper 圆角 24px\n图级 0",
    imgOpts: {
      height: "100px",
      wrapperRadius: RADIUS_LG,
      bgRadius: { mode: "unified", radius: "0" },
    },
  },
  {
    label: "图级描边 3px\n#DC2626",
    imgOpts: {
      height: "100px",
      bgBorder: { mode: "unified", width: "3px", style: "solid", color: "#DC2626" },
      bgRadius: RADIUS_MD,
    },
  },
]);

// ─── 6 link ──────────────────────────────────────────────
section("it-ch6", "it-root", ["it-ch6-hdr", "it-ch6-link"], "#ECFEFF");
chapterHeader("it-ch6", "it-ch6", "6", "跳转 link", "backgroundImage.link 非空时可点击（预览与发信导出需点检）。");
buildCompareRow("it-ch6-link", "it-ch6", "6 · link", [
  { label: "无 link", imgOpts: { height: "90px", link: "" } },
  {
    label: "有 link\nhttps://www.pexels.com",
    imgOpts: { height: "90px", link: "https://www.pexels.com/" },
  },
]);

// ─── 7 叠放子内容 ────────────────────────────────────────
section("it-ch7", "it-root", ["it-ch7-hdr", "it-ch7-overlay"], "#FEF3C7");
chapterHeader(
  "it-ch7",
  "it-ch7",
  "7",
  "叠放子内容",
  "image 块作底图容器：子级 text 叠在图上。底栏叠放（contentAlign.bottom + 纵排子块）；双子级双轴矩阵见 layout-test 第 3 章。"
);
const ovId = "it-ch7-overlay-card";
addBlock(
  text(`${ovId}-lbl`, ovId, "7 · 底栏叠放（HOT + 标题 · 父 bottom）", {
    fontSize: "11px",
    color: "#92400E",
  }),
  "叠层说明",
  "content.text"
);
const ovImg = "it-ch7-overlay-img";
const ovBadge = "it-ch7-overlay-badge";
const ovTitle = "it-ch7-overlay-title";
addBlock(
  imageBlock(
    ovImg,
    "it-ch7-overlay-card",
    {
      heightMode: "fixed",
      height: "160px",
      fit: "cover",
      position: "center",
      contentAlign: { horizontal: "left", vertical: "bottom" },
    },
    [ovBadge, ovTitle]
  ),
  "叠层图",
  "content.image"
);
addBlock(
  text(ovBadge, ovImg, "HOT", {
    widthMode: "hug",
    backgroundColor: "#DC2626",
    color: "#FFFFFF",
    bold: true,
    fontSize: "11px",
    contentAlign: contentAlignFromAxes("start", "start"),
  }),
  "角标",
  "content.text"
);
addBlock(
  text(ovTitle, ovImg, "雾中城市 · 底栏标题", {
    widthMode: "fill",
    backgroundColor: "rgba(0,0,0,0.55)",
    color: "#FFFFFF",
    fontSize: "14px",
    bold: true,
  }),
  "底栏标题",
  "content.text"
);
addBlock(
  layout(ovId, "it-ch7-overlay", "vertical", [`${ovId}-lbl`, ovImg], {
    backgroundColor: "#FFFFFF",
    border: { mode: "unified", width: "1px", style: "solid", color: "#FCD34D" },
    padding: { mode: "unified", unified: "8px" },
  }),
  "叠层卡",
  "layout"
);
addBlock(
  layout("it-ch7-overlay", "it-ch7", "vertical", [ovId], {
    padding: { mode: "unified", unified: "0" },
    border: BORDER_ZERO,
  }),
  "第7节内容",
  "layout"
);

// ─── 8 layout 底图 vs image 块 ───────────────────────────
section("it-ch8", "it-root", ["it-ch8-hdr", "it-ch8-compare"], "#F1F5F9");
chapterHeader(
  "it-ch8",
  "it-ch8",
  "8",
  "layout 底图 vs content.image",
  "同图同 fit/position/定高；左为 layout.container 底图，右为 content.image。"
);
{
  const rowId = "it-ch8-compare";
  addBlock(
    text(`${rowId}-title`, rowId, "8 · 块类型对照（cover · left center · 高 120px）", {
      fontSize: "12px",
      bold: true,
      color: "#334155",
      backgroundColor: "#E2E8F0",
    }),
    "对照",
    "content.text"
  );
  const bgShared = {
    src: IMG_SRC,
    alt: IMG_ALT,
    link: "",
    fit: "cover",
    position: "left center",
    borderRadius: RADIUS_SM,
    border: BORDER_ZERO,
  };
  const cellIds = [];
  for (const [i, spec] of [
    { label: "layout.container\nbackgroundImage", kind: "layout" },
    { label: "content.image\nbackgroundImage", kind: "image" },
  ].entries()) {
    const cellId = `${rowId}-c${i}`;
    cellIds.push(cellId);
    const blockChildId = spec.kind === "layout" ? `${cellId}-lay` : `${cellId}-img`;
    addBlock(
      text(`${cellId}-lbl`, cellId, spec.label, { fontSize: "10px", color: "#64748B" }),
      spec.label,
      "content.text"
    );
    if (spec.kind === "layout") {
      addBlock(
        layout(blockChildId, cellId, "vertical", [], {
          heightMode: "fixed",
          height: "120px",
          backgroundImage: bgShared,
        }),
        "layout 底图",
        "layout"
      );
    } else {
      addBlock(
        imageBlock(blockChildId, cellId, {
          heightMode: "fixed",
          height: "120px",
          fit: "cover",
          position: "left center",
        }),
        "image 块",
        "content.image"
      );
    }
    addBlock(
      layout(cellId, rowId, "vertical", [`${cellId}-lbl`, blockChildId], {
        widthMode: "fill",
        backgroundColor: "#FFFFFF",
        border: { mode: "unified", width: "1px", style: "solid", color: "#CBD5E1" },
        padding: { mode: "unified", unified: "6px" },
      }),
      spec.label,
      "layout"
    );
  }
  addBlock(
    layout(rowId, "it-ch8", "vertical", [`${rowId}-title`, ...cellIds], {
      backgroundColor: "#FFFFFF",
      border: { mode: "unified", width: "1px", style: "solid", color: "#94A3B8" },
      padding: { mode: "unified", unified: "8px" },
    }),
    "对照行",
    "layout"
  );
}

// ─── 9 payload 变量 ───────────────────────────────────
section("it-ch9", "it-root", ["it-ch9-hdr", "it-ch9-var"], "#ECFDF5");
chapterHeader(
  "it-ch9",
  "it-ch9",
  "9",
  "payload 变量绑定",
  "src / alt 走 payload 槽；改 Payload 面板应同步预览。"
);
addBlock(
  text("it-ch9-var-hint", "it-ch9-var", "9 · 绑定 heroImageSrc / heroImageAlt", {
    fontSize: "11px",
    color: "#047857",
  }),
  "变量说明",
  "content.text"
);
addBlock(
  imageBlock("it-ch9-var-img", "it-ch9-var", {
    heightMode: "fixed",
    height: "140px",
    fit: "cover",
    bindings: {
      "wrapperStyle.backgroundImage.src": {
        slotId: "heroImageSrc",
        mode: "variable",
        valueType: "image",
        fieldKind: "content",
        label: "主图地址",
        description: "图片测试：Pexels 325185",
      },
      "wrapperStyle.backgroundImage.alt": {
        slotId: "heroImageAlt",
        mode: "variable",
        valueType: "string",
        fieldKind: "content",
        label: "主图替代文字",
      },
    },
  }),
  "变量图",
  "content.image"
);
addBlock(
  layout("it-ch9-var", "it-ch9", "vertical", ["it-ch9-var-hint", "it-ch9-var-img"], {
    backgroundColor: "#FFFFFF",
    border: { mode: "unified", width: "1px", style: "solid", color: "#A7F3D0" },
    padding: { mode: "unified", unified: "8px" },
  }),
  "变量区",
  "layout"
);

// ─── 落盘 ───────────────────────────────────────────────
const template = {
  schemaVersion: "3.0.0",
  emailId: EMAIL_KEY,
  templateId: EMAIL_KEY,
  templateVersion: 1,
  locale: "zh-CN",
  rootBlockId: "it-root",
  blockMeta,
  blocks,
};

const meta = {
  displayName: "图片测试专用模板",
  description:
    "content.image 专有测试：fit、position 九宫格、视窗尺寸、描边圆角、link、叠放、与 layout 底图对照、payload。对齐矩阵见 layout-test。",
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
      description: "图片块全场景测试",
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

const payload = {
  schemaVersion: "1.0.0",
  slots: {
    heroImageSrc: {
      label: "主图地址",
      valueType: "image",
      description: "图片测试专用：默认 Pexels 325185",
    },
    heroImageAlt: {
      label: "主图替代文字",
      valueType: "string",
      description: "无障碍 alt",
    },
  },
  values: {
    heroImageSrc: IMG_SRC,
    heroImageAlt: IMG_ALT,
  },
};

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
