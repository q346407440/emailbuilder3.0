#!/usr/bin/env node
/**
 * 生成「hug / fill / gap 关系测试」→ data/emails/hug-fill-gap-test/
 *
 * 覆盖 layout.container（及 emailRoot 纵排间距对照）中：
 *  - 主轴方向：纵排 / 横排
 *  - gapMode：fixed（0 / 小 / 大）与 auto（主轴剩余进缝）
 *  - 父级 widthMode / heightMode：fill / hug / fixed
 *  - 子级 widthMode / heightMode 组合（含 fill 吃剩余、同轴 fill 禁止等合法形态）
 *
 * 用法：node scripts/build-email-hug-fill-gap-test.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { finalizeGeneratedTemplate } from "./lib/finalize-generated-template.mjs";
import { textBodyFromString } from "./lib/test-email-text-body.mjs";
import { graphToDiskJson } from "./lib/template-disk-io.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, "..");
const EMAIL_KEY = "hug-fill-gap-test";
const OUT = path.join(REPO, "data", "emails", EMAIL_KEY);
const LAYOUT_DIR = path.join(OUT, "layouts", "default");

const BORDER_ZERO = { style: "solid", color: "rgba(0,0,0,0)", top: "0", right: "0", bottom: "0", left: "0" };
const RADIUS_SM = { topLeft: "4px", topRight: "4px", bottomRight: "4px", bottomLeft: "4px" };

const MODE_COLOR = { hug: "#2563EB", fill: "#DC2626", fixed: "#7C3AED" };

/** @type {Record<string, object>} */
const blocks = {};
/** @type {Record<string, { blockType: string, name: string }>} */
const blockMeta = {};

function addBlock(block, name, metaType = "content.text") {
  blocks[block.id] = block;
  blockMeta[block.id] = {
    blockType:
      metaType === "layout"
        ? "layout.container"
        : metaType === "emailRoot"
          ? "email.root"
          : metaType,
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
    fontSize = "12px",
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

function chip(id, parentId, label, widthMode, heightMode, opts = {}) {
  const { width, height, color = MODE_COLOR[widthMode] ?? "#64748B" } = opts;
  return text(id, parentId, label, {
    widthMode,
    heightMode,
    width,
    height,
    backgroundColor: color,
    fontSize: "11px",
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
      padding: { top: "6px", right: "6px", bottom: "6px", left: "6px" },
      ...wrapperExtra,
    },
    props: { direction, gapMode: "fixed", gap: "12px", ...propsExtra },
    bindings: {},
  };
}

function section(id, parentId, childIds, bg) {
  const sec = layout(id, parentId, "vertical", childIds, {
    backgroundColor: bg,
    padding: { top: "12px", right: "12px", bottom: "12px", left: "12px" },
  });
  addBlock(sec, id, "layout");
  return id;
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

/** @typedef {{ key: string, label: string, widthMode: 'hug'|'fill'|'fixed', heightMode: 'hug'|'fill'|'fixed', width?: string, height?: string }} ChildSpec */

/**
 * 在 parentId 下生成带说明的 layout 演示格。
 * @param {string} cellId
 * @param {string} parentId
 * @param {object} cfg
 * @param {string} cfg.caption
 * @param {'vertical'|'horizontal'} cfg.direction
 * @param {ChildSpec[]} cfg.children
 * @param {object} [cfg.parent]
 */
function buildGapCell(cellId, parentId, cfg) {
  const {
    caption,
    direction,
    children: childSpecs,
    parent = {},
  } = cfg;
  const {
    widthMode = "fill",
    heightMode = "hug",
    width,
    height,
    gapMode = "fixed",
    gap = "12px",
    backgroundColor = "#F8FAFC",
    borderColor = "#CBD5E1",
  } = parent;

  addBlock(
    text(`${cellId}-cap`, cellId, caption, {
      fontSize: "10px",
      color: "#475569",
      backgroundColor: "#F1F5F9",
    }),
    caption
  );

  const layId = `${cellId}-lay`;
  const childIds = childSpecs.map((spec) => {
    const chId = `${cellId}-${spec.key}`;
    const modeLine = `W:${spec.widthMode}\nH:${spec.heightMode}`;
    addBlock(
      chip(chId, layId, `${spec.label}\n${modeLine}`, spec.widthMode, spec.heightMode, {
        width: spec.width,
        height: spec.height,
      }),
      spec.label
    );
    return chId;
  });

  const ws = {
    widthMode,
    heightMode,
    backgroundColor,
    border: { style: "solid", color: borderColor, top: "1px", right: "1px", bottom: "1px", left: "1px" },
    padding: { top: "6px", right: "6px", bottom: "6px", left: "6px" },
  };
  if (width) ws.width = width;
  if (height) ws.height = height;

  addBlock(
    layout(layId, cellId, direction, childIds, ws, { gapMode, gap }),
    "演示 layout",
    "layout"
  );
  addBlock(
    layout(cellId, parentId, "vertical", [`${cellId}-cap`, layId], {
      widthMode: "fill",
      backgroundColor: "#FFFFFF",
      border: { style: "solid", color: "#E2E8F0", top: "1px", right: "1px", bottom: "1px", left: "1px" },
      padding: { top: "4px", right: "4px", bottom: "4px", left: "4px" },
    }),
    caption,
    "layout"
  );
}

/**
 * @param {string} rowId
 * @param {string} parentId
 * @param {string} rowTitle
 * @param {Array<(cellId: string, parentId: string) => void>} builders
 */
/** 内联 stage layout（写入 blocks） */
function stageLayout(id, parentId, direction, childIds, parent) {
  const {
    widthMode = "fill",
    heightMode = "hug",
    width,
    height,
    gapMode = "fixed",
    gap = "12px",
    backgroundColor = "#F8FAFC",
    borderColor = "#CBD5E1",
  } = parent;
  const ws = {
    widthMode,
    heightMode,
    backgroundColor,
    border: { style: "solid", color: borderColor, top: "1px", right: "1px", bottom: "1px", left: "1px" },
    padding: { top: "6px", right: "6px", bottom: "6px", left: "6px" },
  };
  if (width) ws.width = width;
  if (height) ws.height = height;
  addBlock(layout(id, parentId, direction, childIds, ws, { gapMode, gap }), id, "layout");
}

function buildDemoRow(rowId, parentId, rowTitle, builders) {
  addBlock(
    text(`${rowId}-title`, rowId, rowTitle, {
      fontSize: "12px",
      bold: true,
      color: "#0F172A",
      backgroundColor: "#E2E8F0",
    }),
    rowTitle
  );
  const cellIds = builders.map((fn, i) => {
    const cellId = `${rowId}-c${i}`;
    fn(cellId, rowId);
    return cellId;
  });
  addBlock(
    layout(rowId, parentId, "vertical", [`${rowId}-title`, ...cellIds], {
      backgroundColor: "#FFFFFF",
      border: { style: "solid", color: "#94A3B8", top: "1px", right: "1px", bottom: "1px", left: "1px" },
      padding: { top: "8px", right: "8px", bottom: "8px", left: "8px" },
    }, { gap: "10px" }),
    rowTitle,
    "layout"
  );
}

const HUG = /** @type {const} */ ("hug");
const FILL = /** @type {const} */ ("fill");
const FIX = /** @type {const} */ ("fixed");

// ─── 根与导读 ─────────────────────────────────────────────
const ROOT_SECTIONS = [
  "hfg-intro",
  "hfg-ch1",
  "hfg-ch2",
  "hfg-ch3",
  "hfg-ch4",
  "hfg-ch5",
  "hfg-ch6",
  "hfg-ch7",
  "hfg-ch8",
];

addBlock(
  {
    id: "hfg-root",
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
      gap: "16px",
    },
    bindings: {},
  },
  "画布根",
  "emailRoot"
);

addBlock(
  text(
    "hfg-intro",
    "hfg-root",
    [
      "hug / fill / gap 关系测试",
      "",
      "验收要点：",
      "· gap fixed：缝高/宽 = props.gap 像素；子级之间可见灰底父壳。",
      "· gap auto：主轴剩余空间进缝（非子级均分）；纵排须父定高，横排须父满宽。",
      "· 横排 + gap fixed + fill 子：hug/fixed 先占位，fill 吃剩余宽。",
      "· 父 hug：容器随内容收缩（横排全 hug 时不应无故拉满 600px）。",
      "",
      "章节：纵排宽轴 · 纵排高轴 · 纵排 gap auto · 横排宽轴 · 横排 gap auto · 父外壳 · 嵌套 hug · 根 gap",
    ].join("\n"),
    { fontSize: "13px", backgroundColor: "#FFFFFF", color: "#374151" }
  ),
  "导读"
);

// ─── 1 纵排 · gap fixed · 宽度轴 ─────────────────────────
section("hfg-ch1", "hfg-root", ["hfg-ch1-hdr", "hfg-ch1-a", "hfg-ch1-b"], "#EFF6FF");
chapterHeader(
  "hfg-ch1",
  "hfg-ch1",
  "1",
  "纵排 · gap fixed · 宽度轴",
  "父 fill 宽；观察子级 widthMode 与 gap 像素叠加。主轴=竖直，交叉轴=水平。"
);
buildDemoRow("hfg-ch1-a", "hfg-ch1", "1A · gap 像素（3×子 W:hug）", [
  (cid, pid) =>
    buildGapCell(cid, pid, {
      caption: "gap=0\n父 W:fill H:hug",
      direction: "vertical",
      parent: { gap: "0" },
      children: [
        { key: "a", label: "A", widthMode: HUG, heightMode: HUG },
        { key: "b", label: "B", widthMode: HUG, heightMode: HUG },
        { key: "c", label: "C", widthMode: HUG, heightMode: HUG },
      ],
    }),
  (cid, pid) =>
    buildGapCell(cid, pid, {
      caption: "gap=12px",
      direction: "vertical",
      parent: { gap: "12px" },
      children: [
        { key: "a", label: "A", widthMode: HUG, heightMode: HUG },
        { key: "b", label: "B", widthMode: HUG, heightMode: HUG },
        { key: "c", label: "C", widthMode: HUG, heightMode: HUG },
      ],
    }),
  (cid, pid) =>
    buildGapCell(cid, pid, {
      caption: "gap=28px",
      direction: "vertical",
      parent: { gap: "28px" },
      children: [
        { key: "a", label: "A", widthMode: HUG, heightMode: HUG },
        { key: "b", label: "B", widthMode: HUG, heightMode: HUG },
        { key: "c", label: "C", widthMode: HUG, heightMode: HUG },
      ],
    }),
]);
buildDemoRow("hfg-ch1-b", "hfg-ch1", "1B · gap=12 · 子级宽度组合", [
  (cid, pid) =>
    buildGapCell(cid, pid, {
      caption: "全 hug 宽",
      direction: "vertical",
      parent: { gap: "12px" },
      children: [
        { key: "a", label: "A", widthMode: HUG, heightMode: HUG },
        { key: "b", label: "B", widthMode: HUG, heightMode: HUG },
      ],
    }),
  (cid, pid) =>
    buildGapCell(cid, pid, {
      caption: "hug + fill 宽",
      direction: "vertical",
      parent: { gap: "12px" },
      children: [
        { key: "a", label: "A", widthMode: HUG, heightMode: HUG },
        { key: "b", label: "B", widthMode: FILL, heightMode: HUG },
      ],
    }),
  (cid, pid) =>
    buildGapCell(cid, pid, {
      caption: "全 fill 宽",
      direction: "vertical",
      parent: { gap: "12px" },
      children: [
        { key: "a", label: "A", widthMode: FILL, heightMode: HUG },
        { key: "b", label: "B", widthMode: FILL, heightMode: HUG },
      ],
    }),
  (cid, pid) =>
    buildGapCell(cid, pid, {
      caption: "fixed72 + hug",
      direction: "vertical",
      parent: { gap: "12px" },
      children: [
        { key: "a", label: "A", widthMode: FIX, heightMode: HUG, width: "72px" },
        { key: "b", label: "B", widthMode: HUG, heightMode: HUG },
      ],
    }),
]);

// ─── 2 纵排 · gap fixed · 高度轴 ─────────────────────────
section("hfg-ch2", "hfg-root", ["hfg-ch2-hdr", "hfg-ch2-a", "hfg-ch2-b"], "#F0FDF4");
chapterHeader(
  "hfg-ch2",
  "hfg-ch2",
  "2",
  "纵排 · gap fixed · 高度轴",
  "父 fill 宽 + fixed 高；主轴=竖直，观察子 heightMode、gap 与 3×H hug+fill+hug。"
);
buildDemoRow("hfg-ch2-a", "hfg-ch2", "2A · 父 H:fixed · gap=12 · 高度组合", [
  (cid, pid) =>
    buildGapCell(cid, pid, {
      caption: "子全 H:hug",
      direction: "vertical",
      parent: { heightMode: FIX, height: "100px", gap: "12px" },
      children: [
        { key: "a", label: "A", widthMode: FILL, heightMode: HUG },
        { key: "b", label: "B", widthMode: FILL, heightMode: HUG },
      ],
    }),
  (cid, pid) =>
    buildGapCell(cid, pid, {
      caption: "hug + fill 高",
      direction: "vertical",
      parent: { heightMode: FIX, height: "100px", gap: "12px" },
      children: [
        { key: "a", label: "A", widthMode: FILL, heightMode: HUG },
        { key: "b", label: "B", widthMode: FILL, heightMode: FILL },
      ],
    }),
  (cid, pid) =>
    buildGapCell(cid, pid, {
      caption: "全 fill 高",
      direction: "vertical",
      parent: { heightMode: FIX, height: "100px", gap: "12px" },
      children: [
        { key: "a", label: "A", widthMode: FILL, heightMode: FILL },
        { key: "b", label: "B", widthMode: FILL, heightMode: FILL },
      ],
    }),
  (cid, pid) =>
    buildGapCell(cid, pid, {
      caption: "3×H: hug+fill+hug",
      direction: "vertical",
      parent: { heightMode: FIX, height: "120px", gap: "12px" },
      children: [
        { key: "a", label: "A", widthMode: FILL, heightMode: HUG },
        { key: "b", label: "B", widthMode: FILL, heightMode: FILL },
        { key: "c", label: "C", widthMode: FILL, heightMode: HUG },
      ],
    }),
]);
buildDemoRow("hfg-ch2-b", "hfg-ch2", "2B · gap=0 vs gap=20（子 H:hug）", [
  (cid, pid) =>
    buildGapCell(cid, pid, {
      caption: "gap=0",
      direction: "vertical",
      parent: { heightMode: FIX, height: "88px", gap: "0" },
      children: [
        { key: "a", label: "A", widthMode: FILL, heightMode: HUG },
        { key: "b", label: "B", widthMode: FILL, heightMode: HUG },
        { key: "c", label: "C", widthMode: FILL, heightMode: HUG },
      ],
    }),
  (cid, pid) =>
    buildGapCell(cid, pid, {
      caption: "gap=20px",
      direction: "vertical",
      parent: { heightMode: FIX, height: "88px", gap: "20px" },
      children: [
        { key: "a", label: "A", widthMode: FILL, heightMode: HUG },
        { key: "b", label: "B", widthMode: FILL, heightMode: HUG },
        { key: "c", label: "C", widthMode: FILL, heightMode: HUG },
      ],
    }),
  (cid, pid) =>
    buildGapCell(cid, pid, {
      caption: "fixed32 + hug",
      direction: "vertical",
      parent: { heightMode: FIX, height: "100px", gap: "10px" },
      children: [
        { key: "a", label: "A", widthMode: FILL, heightMode: FIX, height: "32px" },
        { key: "b", label: "B", widthMode: FILL, heightMode: HUG },
        { key: "c", label: "C", widthMode: FILL, heightMode: FILL },
      ],
    }),
]);

// ─── 3 纵排 · gap auto ───────────────────────────────────
section("hfg-ch3", "hfg-root", ["hfg-ch3-hdr", "hfg-ch3-row"], "#FFF7ED");
chapterHeader(
  "hfg-ch3",
  "hfg-ch3",
  "3",
  "纵排 · gap auto",
  "父定高 + gap auto：剩余竖直空间应进缝。对照同壳 gap fixed。"
);
buildDemoRow("hfg-ch3-row", "hfg-ch3", "3 · 父 H:fixed 120px · 3×H:hug", [
  (cid, pid) =>
    buildGapCell(cid, pid, {
      caption: "gap fixed 12",
      direction: "vertical",
      parent: { heightMode: FIX, height: "120px", gapMode: "fixed", gap: "12px" },
      children: [
        { key: "a", label: "A", widthMode: FILL, heightMode: HUG },
        { key: "b", label: "B", widthMode: FILL, heightMode: HUG },
        { key: "c", label: "C", widthMode: FILL, heightMode: HUG },
      ],
    }),
  (cid, pid) =>
    buildGapCell(cid, pid, {
      caption: "gap auto",
      direction: "vertical",
      parent: { heightMode: FIX, height: "120px", gapMode: "auto", gap: "12px" },
      children: [
        { key: "a", label: "A", widthMode: FILL, heightMode: HUG },
        { key: "b", label: "B", widthMode: FILL, heightMode: HUG },
        { key: "c", label: "C", widthMode: FILL, heightMode: HUG },
      ],
    }),
  (cid, pid) =>
    buildGapCell(cid, pid, {
      caption: "auto + 2 子",
      direction: "vertical",
      parent: { heightMode: FIX, height: "100px", gapMode: "auto", gap: "0" },
      children: [
        { key: "a", label: "A", widthMode: FILL, heightMode: HUG },
        { key: "b", label: "B", widthMode: FILL, heightMode: HUG },
      ],
    }),
]);

// ─── 4 横排 · gap fixed · 宽度轴 ─────────────────────────
section("hfg-ch4", "hfg-root", ["hfg-ch4-hdr", "hfg-ch4-a", "hfg-ch4-b", "hfg-ch4-c"], "#FAF5FF");
chapterHeader(
  "hfg-ch4",
  "hfg-ch4",
  "4",
  "横排 · gap fixed · 宽度轴",
  "父 fill 宽；横排 fill 子吃剩余宽，fixed gap 为独立列。"
);
buildDemoRow("hfg-ch4-a", "hfg-ch4", "4A · gap 0 / 16（3×W:hug）", [
  (cid, pid) =>
    buildGapCell(cid, pid, {
      caption: "gap=0",
      direction: "horizontal",
      parent: { gap: "0" },
      children: [
        { key: "a", label: "A", widthMode: HUG, heightMode: HUG },
        { key: "b", label: "B", widthMode: HUG, heightMode: HUG },
        { key: "c", label: "C", widthMode: HUG, heightMode: HUG },
      ],
    }),
  (cid, pid) =>
    buildGapCell(cid, pid, {
      caption: "gap=16px",
      direction: "horizontal",
      parent: { gap: "16px" },
      children: [
        { key: "a", label: "A", widthMode: HUG, heightMode: HUG },
        { key: "b", label: "B", widthMode: HUG, heightMode: HUG },
        { key: "c", label: "C", widthMode: HUG, heightMode: HUG },
      ],
    }),
]);
buildDemoRow("hfg-ch4-b", "hfg-ch4", "4B · gap=12 · 子级宽度组合", [
  (cid, pid) =>
    buildGapCell(cid, pid, {
      caption: "全 hug",
      direction: "horizontal",
      parent: { gap: "12px" },
      children: [
        { key: "a", label: "A", widthMode: HUG, heightMode: HUG },
        { key: "b", label: "B", widthMode: HUG, heightMode: HUG },
        { key: "c", label: "C", widthMode: HUG, heightMode: HUG },
      ],
    }),
  (cid, pid) =>
    buildGapCell(cid, pid, {
      caption: "hug+fill+hug",
      direction: "horizontal",
      parent: { gap: "12px" },
      children: [
        { key: "a", label: "A", widthMode: HUG, heightMode: HUG },
        { key: "b", label: "B", widthMode: FILL, heightMode: HUG },
        { key: "c", label: "C", widthMode: HUG, heightMode: HUG },
      ],
    }),
  (cid, pid) =>
    buildGapCell(cid, pid, {
      caption: "fill+fill",
      direction: "horizontal",
      parent: { gap: "12px" },
      children: [
        { key: "a", label: "A", widthMode: FILL, heightMode: HUG },
        { key: "b", label: "B", widthMode: FILL, heightMode: HUG },
      ],
    }),
  (cid, pid) =>
    buildGapCell(cid, pid, {
      caption: "fix64+hug+fill",
      direction: "horizontal",
      parent: { gap: "12px" },
      children: [
        { key: "a", label: "A", widthMode: FIX, heightMode: HUG, width: "64px" },
        { key: "b", label: "B", widthMode: HUG, heightMode: HUG },
        { key: "c", label: "C", widthMode: FILL, heightMode: HUG },
      ],
    }),
]);
buildDemoRow("hfg-ch4-c", "hfg-ch4", "4C · 父 H:fixed 72px · 子高度组合（横排）", [
  (cid, pid) =>
    buildGapCell(cid, pid, {
      caption: "全 H:hug",
      direction: "horizontal",
      parent: { heightMode: FIX, height: "72px", gap: "10px" },
      children: [
        { key: "a", label: "A", widthMode: HUG, heightMode: HUG },
        { key: "b", label: "B", widthMode: HUG, heightMode: HUG },
        { key: "c", label: "C", widthMode: HUG, heightMode: HUG },
      ],
    }),
  (cid, pid) =>
    buildGapCell(cid, pid, {
      caption: "hug+fill 高",
      direction: "horizontal",
      parent: { heightMode: FIX, height: "72px", gap: "10px" },
      children: [
        { key: "a", label: "A", widthMode: HUG, heightMode: HUG },
        { key: "b", label: "B", widthMode: HUG, heightMode: FILL },
      ],
    }),
  (cid, pid) =>
    buildGapCell(cid, pid, {
      caption: "fixed40+hug",
      direction: "horizontal",
      parent: { heightMode: FIX, height: "72px", gap: "10px" },
      children: [
        { key: "a", label: "A", widthMode: HUG, heightMode: FIX, height: "40px" },
        { key: "b", label: "B", widthMode: HUG, heightMode: HUG },
      ],
    }),
]);

// ─── 5 横排 · gap auto ───────────────────────────────────
section("hfg-ch5", "hfg-root", ["hfg-ch5-hdr", "hfg-ch5-row"], "#ECFEFF");
chapterHeader(
  "hfg-ch5",
  "hfg-ch5",
  "5",
  "横排 · gap auto",
  "父 fill 宽 + 全 hug 子：缝隙均分剩余宽（非子级等分）。"
);
buildDemoRow("hfg-ch5-row", "hfg-ch5", "5 · 横排 3×W:hug", [
  (cid, pid) =>
    buildGapCell(cid, pid, {
      caption: "gap fixed 12",
      direction: "horizontal",
      parent: { gapMode: "fixed", gap: "12px" },
      children: [
        { key: "a", label: "A", widthMode: HUG, heightMode: HUG },
        { key: "b", label: "B", widthMode: HUG, heightMode: HUG },
        { key: "c", label: "C", widthMode: HUG, heightMode: HUG },
      ],
    }),
  (cid, pid) =>
    buildGapCell(cid, pid, {
      caption: "gap auto",
      direction: "horizontal",
      parent: { gapMode: "auto", gap: "12px" },
      children: [
        { key: "a", label: "A", widthMode: HUG, heightMode: HUG },
        { key: "b", label: "B", widthMode: HUG, heightMode: HUG },
        { key: "c", label: "C", widthMode: HUG, heightMode: HUG },
      ],
    }),
  (cid, pid) =>
    buildGapCell(cid, pid, {
      caption: "auto+fill+hug",
      direction: "horizontal",
      parent: { gapMode: "auto", gap: "8px" },
      children: [
        { key: "a", label: "A", widthMode: HUG, heightMode: HUG },
        { key: "b", label: "B", widthMode: FILL, heightMode: HUG },
        { key: "c", label: "C", widthMode: HUG, heightMode: HUG },
      ],
    }),
]);

// ─── 6 父级外壳 W×H ───────────────────────────────────────
section("hfg-ch6", "hfg-root", ["hfg-ch6-hdr", "hfg-ch6-row"], "#FDF2F8");
chapterHeader(
  "hfg-ch6",
  "hfg-ch6",
  "6",
  "父级外壳 W×H",
  "横排 2 子 hug：观察父 widthMode/heightMode 对壳体与 gap 的影响。"
);
buildDemoRow("hfg-ch6-row", "hfg-ch6", "6 · 父壳矩阵（gap fixed 10）", [
  (cid, pid) =>
    buildGapCell(cid, pid, {
      caption: "父 W:fill H:hug",
      direction: "horizontal",
      parent: { widthMode: FILL, heightMode: HUG, gap: "10px" },
      children: [
        { key: "a", label: "A", widthMode: HUG, heightMode: HUG },
        { key: "b", label: "B", widthMode: HUG, heightMode: HUG },
      ],
    }),
  (cid, pid) =>
    buildGapCell(cid, pid, {
      caption: "父 W:hug H:hug",
      direction: "horizontal",
      parent: { widthMode: HUG, heightMode: HUG, gap: "10px", borderColor: "#F9A8D4" },
      children: [
        { key: "a", label: "A", widthMode: HUG, heightMode: HUG },
        { key: "b", label: "B", widthMode: HUG, heightMode: HUG },
      ],
    }),
  (cid, pid) =>
    buildGapCell(cid, pid, {
      caption: "父 W:fixed 240",
      direction: "horizontal",
      parent: { widthMode: FIX, width: "240px", heightMode: HUG, gap: "10px" },
      children: [
        { key: "a", label: "A", widthMode: HUG, heightMode: HUG },
        { key: "b", label: "B", widthMode: HUG, heightMode: HUG },
      ],
    }),
  (cid, pid) =>
    buildGapCell(cid, pid, {
      caption: "父 H:fixed 56",
      direction: "horizontal",
      parent: { widthMode: FILL, heightMode: FIX, height: "56px", gap: "10px" },
      children: [
        { key: "a", label: "A", widthMode: HUG, heightMode: HUG },
        { key: "b", label: "B", widthMode: HUG, heightMode: HUG },
      ],
    }),
]);

// ─── 7 嵌套：纵 fill 槽内的横 hug 父 ─────────────────────
section("hfg-ch7", "hfg-root", ["hfg-ch7-hdr", "hfg-ch7-a", "hfg-ch7-b"], "#FEF3C7");
chapterHeader(
  "hfg-ch7",
  "hfg-ch7",
  "7",
  "嵌套 hug 父",
  "外层纵排 fill 宽；内层横排 hug 父应随内容收缩（非拉满 600）。"
);
{
  const wrapId = "hfg-ch7-a";
  addBlock(
    text(`${wrapId}-title`, wrapId, "7A · 外层纵排 fill · 内层横排父 W:hug", {
      fontSize: "12px",
      bold: true,
      color: "#92400E",
      backgroundColor: "#FDE68A",
    }),
    "7A"
  );
  const outerId = `${wrapId}-outer`;
  const innerId = `${wrapId}-inner`;
  stageLayout(innerId, outerId, "horizontal", [`${innerId}-a`, `${innerId}-b`], {
    widthMode: HUG,
    heightMode: HUG,
    gap: "14px",
    backgroundColor: "#FFFBEB",
    borderColor: "#FCD34D",
  });
  addBlock(chip(`${innerId}-a`, innerId, "A\nW:hug", HUG, HUG), "A");
  addBlock(chip(`${innerId}-b`, innerId, "B\nW:hug", HUG, HUG), "B");
  addBlock(
    layout(outerId, wrapId, "vertical", [`${wrapId}-tag`, innerId], {
      widthMode: FILL,
      backgroundColor: "#E5E7EB",
      padding: { top: "8px", right: "8px", bottom: "8px", left: "8px" },
    }),
    "外层",
    "layout"
  );
  addBlock(
    text(`${wrapId}-tag`, outerId, "外层 · W:fill（灰底应满宽）", {
      fontSize: "10px",
      color: "#57534E",
      widthMode: FILL,
    }),
    "外层标签"
  );
  addBlock(
    layout(wrapId, "hfg-ch7", "vertical", [`${wrapId}-title`, outerId], {
      backgroundColor: "#FFFFFF",
      border: { style: "solid", color: "#FCD34D", top: "1px", right: "1px", bottom: "1px", left: "1px" },
      padding: { top: "8px", right: "8px", bottom: "8px", left: "8px" },
    }),
    "7A",
    "layout"
  );
}

buildDemoRow("hfg-ch7-b", "hfg-ch7", "7B · 内层横排 fill 子对照", [
  (cid, pid) =>
    buildGapCell(cid, pid, {
      caption: "内层 W:fill + hug+fill",
      direction: "horizontal",
      parent: { widthMode: FILL, heightMode: HUG, gap: "12px" },
      children: [
        { key: "a", label: "A", widthMode: HUG, heightMode: HUG },
        { key: "b", label: "B", widthMode: FILL, heightMode: HUG },
      ],
    }),
  (cid, pid) =>
    buildGapCell(cid, pid, {
      caption: "内层 W:hug + 双 hug\n（禁止子 fill 宽）",
      direction: "horizontal",
      parent: { widthMode: HUG, heightMode: HUG, gap: "12px", borderColor: "#F59E0B" },
      children: [
        { key: "a", label: "A", widthMode: HUG, heightMode: HUG },
        { key: "b", label: "B", widthMode: HUG, heightMode: HUG },
      ],
    }),
]);

// ─── 8 画布根 gap（emailRoot）────────────────────────────
section("hfg-ch8", "hfg-root", ["hfg-ch8-hdr", "hfg-ch8-note"], "#EEF2FF");
chapterHeader(
  "hfg-ch8",
  "hfg-ch8",
  "8",
  "画布根 gap",
  "emailRoot 仅纵排；各章之间缝高 = 根 props.gap 16px（见章节间灰底间隔）。"
);
addBlock(
  text(
    "hfg-ch8-note",
    "hfg-ch8",
    "8 · 根 props.gap=16px\n验收：滚动查看第 7 章底与本节顶之间，灰底 (#F3F4F6) 缝高应为 16px。",
    {
      fontSize: "11px",
      color: "#4338CA",
      backgroundColor: "#E0E7FF",
    }
  ),
  "根 gap 说明"
);

// ─── 落盘 ───────────────────────────────────────────────
const template = {
  schemaVersion: "4.0.0",
  emailId: EMAIL_KEY,
  templateId: EMAIL_KEY,
  templateVersion: 1,
  locale: "zh-CN",
  rootBlockId: "hfg-root",
  blockMeta,
  blocks,
};

const meta = {
  displayName: "hug / fill / gap 关系测试",
  description:
    "layout.container 与根节点：穷举纵/横排、gap fixed/auto、父子 widthMode/heightMode 组合，验收 gap 像素与 fill 吃剩余空间。",
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
      description: "hug / fill / gap 关系测试",
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
        colors: { primary: "#111827", accent: "#1A1A1A", secondary: "#6B7280", surface: "#FFFFFF" },
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
writeJson(path.join(LAYOUT_DIR, "template.json"), graphToDiskJson(template));
writeJson(path.join(LAYOUT_DIR, "tokenPresets.json"), tokenPresets);

finalizeGeneratedTemplate(path.join(LAYOUT_DIR, "template.json"));

console.log(`已写入 data/emails/${EMAIL_KEY}/（${Object.keys(blocks).length} blocks）`);
