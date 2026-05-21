#!/usr/bin/env node
/**
 * 生成「布局 / 放置语义演练」模板：data/emails/placement-playground/
 * 用于在前端肉眼校验横向 layout、纵向 layout、grid、placement、contentAlign、fill 等组合。
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeTokenPresetTokens } from "../src/lib/tokenPresetStandardOrder.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "data", "emails", "placement-playground");
const LAYOUT_DIR = defaultLayoutDir(OUT_DIR);

const border0 = () => ({
  mode: "unified",
  width: "0",
  style: "solid",
  color: "rgba(0,0,0,0)",
});
const radius0 = () => ({ mode: "unified", radius: "0" });
const placement = (h, v) => ({ horizontal: h, vertical: v });

const pad = (t, r, b, l) => ({
  mode: "separate",
  top: t,
  right: r,
  bottom: b,
  left: l,
});

const pad0 = () => ({ mode: "unified", unified: "0" });

function build() {
  const blockMeta = {};
  const blocks = {};
  const reg = (id, blockType, name, block) => {
    blockMeta[id] = { blockType, name };
    blocks[id] = block;
  };

  const ROOT_ID = "pl-root";
  const children = [];

  const text = (id, parentId, name, content, opts) => {
    const align = opts.contentAlign ?? "left";
    const wm = opts.widthMode ?? "fill";
    const ph = opts.placementH ?? "start";
    const pv = opts.placementV ?? "start";
    reg(id, "content.text", name, {
      id,
      type: "text",
      parentId,
      children: [],
      wrapperStyle: {
        placement: placement(ph, pv),
        contentAlign: { horizontal: align, vertical: "top" },
        widthMode: wm,
        heightMode: "hug",
        border: border0(),
        borderRadius: radius0(),
        ...(opts.bg ? { backgroundColor: opts.bg } : {}),
      },
      props: {
        content: `<p>${content}</p>`,
        textBody: { version: 1, paragraphs: [{ runs: [{ text: content }] }] },
        fontFamily: "'Source Sans 3'",
        fontSize: opts.fontSize ?? "14px",
        color: opts.color ?? "#222222",
        bold: opts.bold ?? false,
        italic: false,
        decoration: "none",
      },
      bindings: {},
    });
  };

  const layout = (id, parentId, name, ch, props, ws) => {
    reg(id, "layout.container", name, {
      id,
      type: "layout",
      parentId,
      children: ch,
      wrapperStyle: {
        placement: placement("start", "start"),
        contentAlign: { horizontal: "left", vertical: "top" },
        widthMode: "fill",
        heightMode: "hug",
        border: border0(),
        borderRadius: radius0(),
        backgroundColor: "#ffffff",
        ...ws,
      },
      props: { direction: props.direction, gapMode: "fixed", gap: props.gap ?? "12px" },
      bindings: {},
    });
  };

  const mod = (id, title, inner) => {
    children.push(id);
    layout(id, ROOT_ID, title, inner, { direction: "vertical", gap: "12px" }, {
      backgroundColor: "#f8f8f8",
      padding: pad("20px", "20px", "20px", "20px"),
      contentAlign: { horizontal: "left", vertical: "top" },
    });
  };

  const rowH = (id, parentId, name, ch, caH, gap = "10px", bg = "#eeeeee") => {
    reg(id, "layout.container", name, {
      id,
      type: "layout",
      parentId,
      children: ch,
      wrapperStyle: {
        placement: placement("start", "start"),
        contentAlign: { horizontal: caH, vertical: "top" },
        widthMode: "fill",
        heightMode: "hug",
        border: border0(),
        borderRadius: radius0(),
        backgroundColor: bg,
        padding: pad("10px", "10px", "10px", "10px"),
      },
      props: { direction: "horizontal", gapMode: "fixed", gap },
      bindings: {},
    });
  };

  const grid = (id, parentId, name, cols, ch, gap = "12px") => {
    reg(id, "layout.grid", name, {
      id,
      type: "grid",
      parentId,
      children: ch,
      wrapperStyle: {
        placement: placement("start", "start"),
        contentAlign: { horizontal: "left", vertical: "top" },
        widthMode: "fill",
        heightMode: "hug",
        border: border0(),
        borderRadius: radius0(),
        padding: pad0(),
      },
      props: { columns: cols, gap, cellHeightMode: "content-max" },
      bindings: {},
    });
  };

  // --- 模块 0：说明 ---
  const m0 = "pl-mod-intro";
  mod(m0, "模块 · 说明", ["pl-intro-t1", "pl-intro-t2"]);
  text("pl-intro-t1", m0, "标题", "布局放置语义演练（肉眼对照）", {
    fontSize: "20px",
    bold: true,
    contentAlign: "left",
    placementH: "start",
  });
  text(
    "pl-intro-t2",
    m0,
    "说明正文",
    "请逐项对照灰底条内的文案与区块选中框位置。A=横向父级主轴居中 + 单子 hug 的 placement 左/中/右；B=父主轴靠左 + 子居中；C=多子项+gap；D=grid 格内 placement；E=纵向父级下子块水平放置（交叉轴）；F=同一 hug 宽度下「文本对齐」左/中/右；G=横向行内 fill 子块（placement 主轴水平 margin 不输出）。",
    { fontSize: "13px", color: "#444444", contentAlign: "left" }
  );

  // --- A：父主轴居中，三行各一子 placement start / center / end ---
  const ma = "pl-mod-a";
  mod(ma, "模块 · A 横向父主轴居中 + 单子 placement", [
    "pl-a-cap",
    "pl-a-row1",
    "pl-a-row2",
    "pl-a-row3",
  ]);
  text("pl-a-cap", ma, "A 说明", "父行 contentAlign=center（横向表格行主轴居中）。子均为 hug。", {
    bold: true,
    color: "#000",
    contentAlign: "left",
  });
  rowH("pl-a-row1", ma, "A1 行", ["pl-a1-t"], "center");
  text("pl-a1-t", "pl-a-row1", "A1 文案", "A1 子 placement=start（应靠行左）", {
    placementH: "start",
    widthMode: "hug",
    contentAlign: "left",
    bg: "#fffacd",
  });
  rowH("pl-a-row2", ma, "A2 行", ["pl-a2-t"], "center");
  text("pl-a2-t", "pl-a-row2", "A2 文案", "A2 子 placement=center（应行中）", {
    placementH: "center",
    widthMode: "hug",
    contentAlign: "left",
    bg: "#fffacd",
  });
  rowH("pl-a-row3", ma, "A3 行", ["pl-a3-t"], "center");
  text("pl-a3-t", "pl-a-row3", "A3 文案", "A3 子 placement=end（应靠行右）", {
    placementH: "end",
    widthMode: "hug",
    contentAlign: "left",
    bg: "#fffacd",
  });

  // --- B：父主轴靠左，子 placement center ---
  const mb = "pl-mod-b";
  mod(mb, "模块 · B 父主轴靠左 + 子居中", ["pl-b-cap", "pl-b-row"]);
  text("pl-b-cap", mb, "B 说明", "父行 contentAlign=left（行从主轴起点排列）。子 hug + placement=center。", {
    bold: true,
    contentAlign: "left",
  });
  rowH("pl-b-row", mb, "B 行", ["pl-b-t"], "left");
  text("pl-b-t", "pl-b-row", "B 文案", "B 子 placement=center（应在行内水平居中）", {
    placementH: "center",
    widthMode: "hug",
    contentAlign: "left",
    bg: "#e0f7fa",
  });

  // --- C：多子项 ---
  const mc = "pl-mod-c";
  mod(mc, "模块 · C 横向多子项 + gap", ["pl-c-cap", "pl-c-row"]);
  text("pl-c-cap", mc, "C 说明", "父 left + gap。子1 start，子2 start，子3 end。", { bold: true, contentAlign: "left" });
  rowH("pl-c-row", mc, "C 行", ["pl-c1", "pl-c2", "pl-c3"], "left", "16px", "#f3e5f5");
  text("pl-c1", "pl-c-row", "C1", "子1 start", { placementH: "start", widthMode: "hug", bg: "#ffffff", contentAlign: "left" });
  text("pl-c2", "pl-c-row", "C2", "子2 start", { placementH: "start", widthMode: "hug", bg: "#ffffff", contentAlign: "left" });
  text("pl-c3", "pl-c-row", "C3", "子3 end", { placementH: "end", widthMode: "hug", bg: "#ffffff", contentAlign: "left" });

  // --- D：grid ---
  const md = "pl-mod-d";
  mod(md, "模块 · D grid 格内 placement", ["pl-d-cap", "pl-d-grid"]);
  text("pl-d-cap", md, "D 说明", "每格 hug 文本 + placement 左/中/右。", { bold: true, contentAlign: "left" });
  grid("pl-d-grid", md, "D 栅格", 2, ["pl-d1", "pl-d2", "pl-d3", "pl-d4"], "14px");
  text("pl-d1", "pl-d-grid", "D1", "格1 placement=start", { placementH: "start", widthMode: "hug", bg: "#e8f5e9", contentAlign: "left" });
  text("pl-d2", "pl-d-grid", "D2", "格2 placement=center", { placementH: "center", widthMode: "hug", bg: "#e8f5e9", contentAlign: "left" });
  text("pl-d3", "pl-d-grid", "D3", "格3 placement=end", { placementH: "end", widthMode: "hug", bg: "#e8f5e9", contentAlign: "left" });
  text("pl-d4", "pl-d-grid", "D4", "格4 对照", { placementH: "start", widthMode: "hug", bg: "#f1f8e9", contentAlign: "left" });

  // --- E：纵向 ---
  const me = "pl-mod-e";
  mod(me, "模块 · E 纵向父级 + 子水平放置（交叉轴）", ["pl-e-cap", "pl-e-col"]);
  text("pl-e-cap", me, "E 说明", "纵向 layout：子块 placement.horizontal 映射为 align-self（水平向）。", {
    bold: true,
    contentAlign: "left",
  });
  layout("pl-e-col", me, "E 列", ["pl-e1", "pl-e2", "pl-e3"], { direction: "vertical", gap: "10px" }, {
    backgroundColor: "#eceff1",
    padding: pad("12px", "12px", "12px", "12px"),
    widthMode: "fill",
    heightMode: "hug",
  });
  text("pl-e1", "pl-e-col", "E1", "E1 子 placement.h=start", { placementH: "start", widthMode: "hug", bg: "#ffffff", contentAlign: "left" });
  text("pl-e2", "pl-e-col", "E2", "E2 子 placement.h=center", { placementH: "center", widthMode: "hug", bg: "#ffffff", contentAlign: "left" });
  text("pl-e3", "pl-e-col", "E3", "E3 子 placement.h=end", { placementH: "end", widthMode: "hug", bg: "#ffffff", contentAlign: "left" });

  // --- F：文本对齐 ---
  const mf = "pl-mod-f";
  mod(mf, "模块 · F 文本对齐（块内 text-align）", ["pl-f-cap", "pl-f-row"]);
  text("pl-f-cap", mf, "F 说明", "三块均为 hug、placement 相同；仅 contentAlign（文本对齐）不同。", {
    bold: true,
    contentAlign: "left",
  });
  rowH("pl-f-row", mf, "F 行", ["pl-f-l", "pl-f-c", "pl-f-r"], "left", "12px", "#fff3e0");
  text("pl-f-l", "pl-f-row", "F左", "文本对齐=left", {
    placementH: "start",
    widthMode: "hug",
    contentAlign: "left",
    bg: "#ffffff",
  });
  text("pl-f-c", "pl-f-row", "F中", "文本对齐=center", {
    placementH: "start",
    widthMode: "hug",
    contentAlign: "center",
    bg: "#ffffff",
  });
  text("pl-f-r", "pl-f-row", "F右", "文本对齐=right", {
    placementH: "start",
    widthMode: "hug",
    contentAlign: "right",
    bg: "#ffffff",
  });

  // --- G：fill 子块 ---
  const mg = "pl-mod-g";
  mod(mg, "模块 · G 横向行内 fill 子块", ["pl-g-cap", "pl-g-row"]);
  text(
    "pl-g-cap",
    mg,
    "G 说明",
    "左：子 widthMode=fill + placement=start（主轴水平 margin 不输出，应铺满行宽）。右：hug + placement=end。",
    { bold: true, contentAlign: "left", fontSize: "13px" }
  );
  rowH("pl-g-row", mg, "G 行", ["pl-g-fill", "pl-g-hug"], "center", "8px", "#ede7f6");
  text("pl-g-fill", "pl-g-row", "G fill", "左 fill 子块（placement=start 主轴不钉边）", {
    placementH: "start",
    widthMode: "fill",
    contentAlign: "left",
    bg: "#d1c4e9",
  });
  text("pl-g-hug", "pl-g-row", "G hug", "右 hug end", {
    placementH: "end",
    widthMode: "hug",
    contentAlign: "left",
    bg: "#b39ddb",
    color: "#ffffff",
  });

  reg(ROOT_ID, "layout.container", "画布根节点", {
    id: ROOT_ID,
    type: "emailRoot",
    parentId: null,
    children,
    wrapperStyle: {
      placement: { horizontal: "center" },
      widthMode: "fill",
      heightMode: "hug",
    },
    props: {
      border: border0(),
      backgroundColor: "#ffffff",
      width: "600px",
      padding: { mode: "unified", unified: "0" },
      gapMode: "fixed",
      gap: "0",
    },
    bindings: {},
  });

  const template = {
    schemaVersion: "3.0.0",
    emailId: "placement_playground",
    templateId: "placement_playground",
    templateVersion: 1,
    locale: "zh-CN",
    rootBlockId: ROOT_ID,
    blockMeta,
    blocks,
  };

  const meta = {
    displayName: "布局放置语义演练",
    description:
      "覆盖横向/纵向 layout、grid、placement 左中右、父 contentAlign、文本对齐、fill 子块等，供前端肉眼校验。",
    source: "agent",
    status: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const payload = { schemaVersion: "1.0.0", values: {} };
  const tokenPresets = {
    schemaVersion: "1.0.0",
    activePresetId: "default",
    presets: {
      default: {
        label: "演练默认",
        description: "标准 14 键；本模板以布局语义为主，数值仅作占位。",
        tokens: normalizeTokenPresetTokens({
          colors: {
            primary: "#222222",
            secondary: "#666666",
            surface: "#ffffff",
          },
          fonts: {
            heading: "'Source Sans 3'",
            body: "'Source Sans 3'",
          },
          spacing: {
            section: "20px",
            gap: "12px",
            pageInline: "20px",
          },
          typography: {
            display: "20px",
            h1: "18px",
            body: "14px",
            caption: "13px",
          },
          radius: {
            panel: "0",
            cta: "0",
          },
        }),
      },
    },
    scopeSelections: {},
  };

  const configSchema = {
    schemaVersion: "1.0.0",
    scopes: [],
  };

  mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(LAYOUT_DIR, { recursive: true });
  writeFileSync(join(LAYOUT_DIR, "template.json"), JSON.stringify(template, null, 2), "utf8");
  writeFileSync(join(OUT_DIR, "meta.json"), JSON.stringify(meta, null, 2), "utf8");
  writeFileSync(join(OUT_DIR, "payload.json"), JSON.stringify(payload, null, 2), "utf8");
  writeFileSync(join(LAYOUT_DIR, "tokenPresets.json"), JSON.stringify(tokenPresets, null, 2), "utf8");
  writeFileSync(join(LAYOUT_DIR, "configSchema.json"), JSON.stringify(configSchema, null, 2), "utf8");
  process.stdout.write(`Wrote ${OUT_DIR}\n`);
}

build();
