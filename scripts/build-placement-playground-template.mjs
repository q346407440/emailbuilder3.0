#!/usr/bin/env node
/**
 * 生成 data/emails/placement-playground/template.json（布局放置语义肉眼对照）。
 * 运行：node scripts/build-placement-playground-template.mjs
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, "../data/emails/placement-playground/template.json");

const border0 = {
  mode: "unified",
  width: "0",
  style: "solid",
  color: "rgba(0,0,0,0)",
};
const radius0 = { mode: "unified", radius: "0" };
const placementStart = { horizontal: "start", vertical: "start" };
const font =
  "'Source Sans 3', Helvetica, Arial, sans-serif";

function textBody(text) {
  return {
    version: 1,
    paragraphs: [{ runs: [{ text }] }],
  };
}

function textBlock(id, parentId, label, content, ws = {}) {
  return {
    id,
    type: "text",
    parentId,
    children: [],
    wrapperStyle: {
      placement: { ...placementStart },
      contentAlign: { horizontal: "left" },
      widthMode: "hug",
      heightMode: "hug",
      border: border0,
      borderRadius: radius0,
      ...ws,
    },
    props: {
      content: `<p>${content}</p>`,
      textBody: textBody(content),
      fontFamily: font,
      fontSize: ws._fontSize ?? "14px",
      color: ws._color ?? "#222222",
      bold: ws._bold ?? false,
      italic: false,
      decoration: "none",
    },
    bindings: {},
  };
}

function capBlock(id, parentId, content) {
  const b = textBlock(id, parentId, "cap", content, {
    widthMode: "fill",
    _bold: true,
    _fontSize: "14px",
  });
  delete b.wrapperStyle.backgroundColor;
  return b;
}

function moduleShell(id, parentId, children, name) {
  return {
    id,
    type: "layout",
    parentId,
    children,
    wrapperStyle: {
      placement: { ...placementStart },
      widthMode: "fill",
      heightMode: "hug",
      border: border0,
      borderRadius: radius0,
      backgroundColor: "#f8f8f8",
      padding: {
        mode: "separate",
        top: "20px",
        right: "20px",
        bottom: "20px",
        left: "20px",
      },
      contentAlign: { vertical: "top" },
    },
    props: { direction: "vertical", gapMode: "fixed", gap: "12px" },
    bindings: {},
    _name: name,
  };
}

function hRow(id, parentId, children, opts = {}) {
  return {
    id,
    type: "layout",
    parentId,
    children,
    wrapperStyle: {
      placement: { ...placementStart },
      widthMode: "fill",
      heightMode: opts.heightMode ?? "hug",
      ...(opts.height ? { height: opts.height } : {}),
      border: border0,
      borderRadius: radius0,
      backgroundColor: opts.bg ?? "#eeeeee",
      padding: {
        mode: "separate",
        top: "10px",
        right: "10px",
        bottom: "10px",
        left: "10px",
      },
      contentAlign: opts.contentAlign ?? { horizontal: "left" },
    },
    props: {
      direction: "horizontal",
      gapMode: opts.gapMode ?? "fixed",
      gap: opts.gap ?? "10px",
    },
    bindings: {},
  };
}

function vCol(id, parentId, children, opts = {}) {
  return {
    id,
    type: "layout",
    parentId,
    children,
    wrapperStyle: {
      placement: { ...placementStart },
      widthMode: "fill",
      heightMode: opts.heightMode ?? "hug",
      ...(opts.height ? { height: opts.height } : {}),
      border: border0,
      borderRadius: radius0,
      backgroundColor: opts.bg ?? "#eceff1",
      padding: {
        mode: "separate",
        top: "12px",
        right: "12px",
        bottom: "12px",
        left: "12px",
      },
      contentAlign: opts.contentAlign ?? { vertical: "top" },
    },
    props: { direction: "vertical", gapMode: "fixed", gap: opts.gap ?? "10px" },
    bindings: {},
  };
}

function chip(id, parentId, content, placement, bg = "#fffacd") {
  return textBlock(id, parentId, content, content, {
    placement: { ...placement },
    backgroundColor: bg,
  });
}

const blocks = {};

// intro
blocks["pl-mod-intro"] = moduleShell(
  "pl-mod-intro",
  "pl-root",
  ["pl-intro-t1", "pl-intro-t2"],
  "模块 · 说明"
);
blocks["pl-intro-t1"] = textBlock(
  "pl-intro-t1",
  "pl-mod-intro",
  "title",
  "布局放置语义演练（肉眼对照）",
  { widthMode: "fill", _bold: true, _fontSize: "20px" }
);
blocks["pl-intro-t2"] = textBlock(
  "pl-intro-t2",
  "pl-mod-intro",
  "intro",
  "对照灰底区与选中框。placement=整块相对父槽；layout 的 contentAlign=壳定宽高后子组在主轴上的对齐（横排 horizontal、纵排 vertical）；text 的 contentAlign=胶囊内 text-align。A=横排父 contentAlign；B=横排固定高子 placement.vertical；C=gap auto 三等分后子 placement.horizontal；D=grid 格内 placement；E=纵排子 placement.horizontal；F=fill 宽文本 contentAlign；G=fill 与 hug 子块；H=纵排父 contentAlign；I=底图叠放层 contentAlign。",
  { widthMode: "fill", _fontSize: "13px", _color: "#444444" }
);

// A — 横排 fill 父 contentAlign 左/中/右
blocks["pl-mod-a"] = moduleShell(
  "pl-mod-a",
  "pl-root",
  ["pl-a-cap", "pl-a-row1", "pl-a-row2", "pl-a-row3"],
  "模块 · A 横排父 contentAlign"
);
blocks["pl-a-cap"] = capBlock(
  "pl-a-cap",
  "pl-mod-a",
  "横排 fill 行：父 layout.contentAlign.horizontal = left / center / right。子均为 hug、placement=start（组内对齐由父 contentAlign 决定）。"
);
blocks["pl-a-row1"] = hRow("pl-a-row1", "pl-mod-a", ["pl-a1-t"], {
  contentAlign: { horizontal: "left" },
});
blocks["pl-a1-t"] = chip(
  "pl-a1-t",
  "pl-a-row1",
  "A1 父 contentAlign=left",
  placementStart
);
blocks["pl-a-row2"] = hRow("pl-a-row2", "pl-mod-a", ["pl-a2-t"], {
  contentAlign: { horizontal: "center" },
});
blocks["pl-a2-t"] = chip(
  "pl-a2-t",
  "pl-a-row2",
  "A2 父 contentAlign=center",
  placementStart
);
blocks["pl-a-row3"] = hRow("pl-a-row3", "pl-mod-a", ["pl-a3-t"], {
  contentAlign: { horizontal: "right" },
});
blocks["pl-a3-t"] = chip(
  "pl-a3-t",
  "pl-a-row3",
  "A3 父 contentAlign=right",
  placementStart
);

// B — 固定高横排，子 placement.vertical
blocks["pl-mod-b"] = moduleShell(
  "pl-mod-b",
  "pl-root",
  ["pl-b-cap", "pl-b-row1", "pl-b-row2", "pl-b-row3"],
  "模块 · B 横排交叉轴 placement.vertical"
);
blocks["pl-b-cap"] = capBlock(
  "pl-b-cap",
  "pl-mod-b",
  "横排 fixed 高 140px、父 contentAlign 默认。三行分别演示子 placement.vertical = top / center / bottom（交叉轴 valign）。"
);
for (const [rowId, childId, vert, label, bg] of [
  ["pl-b-row1", "pl-b-t1", "start", "B1 子 placement.v=top", "#e0f7fa"],
  ["pl-b-row2", "pl-b-t2", "center", "B2 子 placement.v=center", "#b2ebf2"],
  ["pl-b-row3", "pl-b-t3", "end", "B3 子 placement.v=bottom", "#80deea"],
]) {
  blocks[rowId] = hRow(rowId, "pl-mod-b", [childId], {
    heightMode: "fixed",
    height: "140px",
  });
  blocks[childId] = chip(
    childId,
    rowId,
    label,
    { horizontal: "start", vertical: vert },
    bg
  );
}

// C — gap auto 三等分 + placement.horizontal
blocks["pl-mod-c"] = moduleShell(
  "pl-mod-c",
  "pl-root",
  ["pl-c-cap", "pl-c-row"],
  "模块 · C gap auto + 子 placement.horizontal"
);
blocks["pl-c-cap"] = capBlock(
  "pl-c-cap",
  "pl-mod-c",
  "gapMode=auto 使三列等宽；槽内有剩余宽时，子 hug + placement.horizontal 主轴 start/center/end 才可见。"
);
blocks["pl-c-row"] = hRow("pl-c-row", "pl-mod-c", ["pl-c1", "pl-c2", "pl-c3"], {
  gapMode: "auto",
  gap: "0",
  bg: "#f3e5f5",
});
blocks["pl-c1"] = chip(
  "pl-c1",
  "pl-c-row",
  "C1 placement.h=start",
  { horizontal: "start", vertical: "start" },
  "#ffffff"
);
blocks["pl-c2"] = chip(
  "pl-c2",
  "pl-c-row",
  "C2 placement.h=center",
  { horizontal: "center", vertical: "start" },
  "#ffffff"
);
blocks["pl-c3"] = chip(
  "pl-c3",
  "pl-c-row",
  "C3 placement.h=end",
  { horizontal: "end", vertical: "start" },
  "#ffffff"
);

// D — grid
blocks["pl-mod-d"] = moduleShell(
  "pl-mod-d",
  "pl-root",
  ["pl-d-cap", "pl-d-grid"],
  "模块 · D grid 格内 placement"
);
blocks["pl-d-cap"] = capBlock(
  "pl-d-cap",
  "pl-mod-d",
  "grid 单元格为定宽槽；子 hug 文本 + placement.horizontal 左/中/右。"
);
blocks["pl-d-grid"] = {
  id: "pl-d-grid",
  type: "grid",
  parentId: "pl-mod-d",
  children: ["pl-d1", "pl-d2", "pl-d3", "pl-d4"],
  wrapperStyle: {
    placement: { ...placementStart },
    widthMode: "fill",
    heightMode: "hug",
    border: border0,
    borderRadius: radius0,
    padding: { mode: "unified", unified: "0" },
  },
  props: { columns: 2, gap: "14px", cellHeightMode: "content-max" },
  bindings: {},
};
for (const [id, ph, label, bg] of [
  ["pl-d1", "start", "格1 placement=start", "#e8f5e9"],
  ["pl-d2", "center", "格2 placement=center", "#e8f5e9"],
  ["pl-d3", "end", "格3 placement=end", "#e8f5e9"],
  ["pl-d4", "start", "格4 对照 start", "#f1f8e9"],
]) {
  blocks[id] = chip(
    id,
    "pl-d-grid",
    label,
    { horizontal: ph, vertical: "start" },
    bg
  );
}

// E — 纵排 placement.horizontal
blocks["pl-mod-e"] = moduleShell(
  "pl-mod-e",
  "pl-root",
  ["pl-e-cap", "pl-e-col"],
  "模块 · E 纵排子 placement.horizontal"
);
blocks["pl-e-cap"] = capBlock(
  "pl-e-cap",
  "pl-mod-e",
  "纵向 layout：子块 placement.horizontal 为交叉轴（水平）align，映射外层 td align。"
);
blocks["pl-e-col"] = vCol("pl-e-col", "pl-mod-e", ["pl-e1", "pl-e2", "pl-e3"]);
for (const [id, ph, label] of [
  ["pl-e1", "start", "E1 placement.h=start"],
  ["pl-e2", "center", "E2 placement.h=center"],
  ["pl-e3", "end", "E3 placement.h=end"],
]) {
  blocks[id] = chip(
    id,
    "pl-e-col",
    label,
    { horizontal: ph, vertical: "start" },
    "#ffffff"
  );
}

// F — fill 宽文本 contentAlign
blocks["pl-mod-f"] = moduleShell(
  "pl-mod-f",
  "pl-root",
  ["pl-f-cap", "pl-f-col"],
  "模块 · F 文本 contentAlign"
);
blocks["pl-f-cap"] = capBlock(
  "pl-f-cap",
  "pl-mod-f",
  "三块均为 widthMode=fill；placement 相同，仅 text.contentAlign.horizontal（text-align）不同。"
);
blocks["pl-f-col"] = vCol("pl-f-col", "pl-mod-f", ["pl-f-l", "pl-f-c", "pl-f-r"], {
  bg: "#fff3e0",
});
blocks["pl-f-l"] = textBlock(
  "pl-f-l",
  "pl-f-col",
  "F左",
  "文本 contentAlign=left（块 fill 宽）",
  {
    widthMode: "fill",
    contentAlign: { horizontal: "left" },
    backgroundColor: "#ffffff",
  }
);
blocks["pl-f-c"] = textBlock(
  "pl-f-c",
  "pl-f-col",
  "F中",
  "文本 contentAlign=center",
  {
    widthMode: "fill",
    contentAlign: { horizontal: "center" },
    backgroundColor: "#ffffff",
  }
);
blocks["pl-f-r"] = textBlock(
  "pl-f-r",
  "pl-f-col",
  "F右",
  "文本 contentAlign=right",
  {
    widthMode: "fill",
    contentAlign: { horizontal: "right" },
    backgroundColor: "#ffffff",
  }
);

// G — fill vs hug
blocks["pl-mod-g"] = moduleShell(
  "pl-mod-g",
  "pl-root",
  ["pl-g-cap", "pl-g-row"],
  "模块 · G 横排 fill 与 hug"
);
blocks["pl-g-cap"] = capBlock(
  "pl-g-cap",
  "pl-mod-g",
  "左：子 widthMode=fill（主轴占满，placement 水平 margin 不输出）。右：hug + placement.h=end（占剩余行宽时靠右）。"
);
blocks["pl-g-row"] = hRow("pl-g-row", "pl-mod-g", ["pl-g-fill", "pl-g-hug"], {
  bg: "#ede7f6",
  gap: "8px",
});
blocks["pl-g-fill"] = textBlock(
  "pl-g-fill",
  "pl-g-row",
  "G fill",
  "左 fill 子块",
  {
    widthMode: "fill",
    backgroundColor: "#d1c4e9",
  }
);
blocks["pl-g-hug"] = textBlock(
  "pl-g-hug",
  "pl-g-row",
  "G hug",
  "右 hug end",
  {
    placement: { horizontal: "end", vertical: "start" },
    backgroundColor: "#b39ddb",
    _color: "#ffffff",
  }
);

// H — 纵排父 contentAlign.vertical
blocks["pl-mod-h"] = moduleShell(
  "pl-mod-h",
  "pl-root",
  ["pl-h-cap", "pl-h-col1", "pl-h-col2", "pl-h-col3"],
  "模块 · H 纵排父 contentAlign"
);
blocks["pl-h-cap"] = capBlock(
  "pl-h-cap",
  "pl-mod-h",
  "纵排 fixed 高 120px、fill 宽：父 contentAlign.vertical = top / center / bottom；单子 hug、placement=start。"
);
for (const [colId, childId, vert, label] of [
  ["pl-h-col1", "pl-h-t1", "top", "H1 父 contentAlign.v=top"],
  ["pl-h-col2", "pl-h-t2", "center", "H2 父 contentAlign.v=center"],
  ["pl-h-col3", "pl-h-t3", "bottom", "H3 父 contentAlign.v=bottom"],
]) {
  blocks[colId] = vCol(colId, "pl-mod-h", [childId], {
    heightMode: "fixed",
    height: "120px",
    bg: "#e8eaf6",
    contentAlign: { vertical: vert },
  });
  blocks[childId] = chip(childId, colId, label, placementStart, "#c5cae9");
}

// I — 底图 + contentAlign
const bgSrc =
  "https://images.pexels.com/photos/2905238/pexels-photo-2905238.jpeg?auto=compress&cs=tinysrgb&w=600";
blocks["pl-mod-i"] = moduleShell(
  "pl-mod-i",
  "pl-root",
  ["pl-i-cap", "pl-i-bg1", "pl-i-bg2", "pl-i-bg3"],
  "模块 · I 底图 contentAlign"
);
blocks["pl-i-cap"] = capBlock(
  "pl-i-cap",
  "pl-mod-i",
  "layout 底图叠放层：纵排 fixed 高，父 contentAlign.vertical 顶/中/底；叠放子组随 valign 对齐。"
);
for (const [id, childId, vert, label] of [
  ["pl-i-bg1", "pl-i-t1", "top", "I1 底图 contentAlign.v=top"],
  ["pl-i-bg2", "pl-i-t2", "center", "I2 底图 contentAlign.v=center"],
  ["pl-i-bg3", "pl-i-t3", "bottom", "I3 底图 contentAlign.v=bottom"],
]) {
  blocks[id] = {
    id,
    type: "layout",
    parentId: "pl-mod-i",
    children: [childId],
    wrapperStyle: {
      placement: { ...placementStart },
      widthMode: "fill",
      heightMode: "fixed",
      height: "100px",
      border: border0,
      borderRadius: radius0,
      backgroundImage: {
        src: bgSrc,
        alt: "占位摄影",
        link: "",
        fit: "cover",
        position: "center",
        borderRadius: radius0,
        border: border0,
      },
      contentAlign: { vertical: vert },
    },
    props: { direction: "vertical", gapMode: "fixed", gap: "0" },
    bindings: {},
  };
  blocks[childId] = chip(childId, id, label, placementStart, "rgba(255,255,255,0.92)");
}

blocks["pl-root"] = {
  id: "pl-root",
  type: "emailRoot",
  parentId: null,
  children: [
    "pl-mod-intro",
    "pl-mod-a",
    "pl-mod-b",
    "pl-mod-c",
    "pl-mod-d",
    "pl-mod-e",
    "pl-mod-f",
    "pl-mod-g",
    "pl-mod-h",
    "pl-mod-i",
  ],
  wrapperStyle: {
    placement: { horizontal: "center" },
    widthMode: "fill",
    heightMode: "hug",
  },
  props: {
    backgroundColor: "#ffffff",
    width: "600px",
    padding: { mode: "unified", unified: "0" },
    border: border0,
    gapMode: "fixed",
    gap: "0",
  },
  bindings: {},
};

const blockMeta = {};
const nameMap = {
  "pl-mod-intro": "模块 · 说明",
  "pl-intro-t1": "标题",
  "pl-intro-t2": "说明正文",
  "pl-mod-a": "模块 · A 横排父 contentAlign",
  "pl-a-cap": "A 说明",
  "pl-a-row1": "A1 行",
  "pl-a1-t": "A1 文案",
  "pl-a-row2": "A2 行",
  "pl-a2-t": "A2 文案",
  "pl-a-row3": "A3 行",
  "pl-a3-t": "A3 文案",
  "pl-mod-b": "模块 · B 横排交叉轴 placement",
  "pl-b-cap": "B 说明",
  "pl-b-row1": "B1 行",
  "pl-b-t1": "B1 文案",
  "pl-b-row2": "B2 行",
  "pl-b-t2": "B2 文案",
  "pl-b-row3": "B3 行",
  "pl-b-t3": "B3 文案",
  "pl-mod-c": "模块 · C gap auto + placement",
  "pl-c-cap": "C 说明",
  "pl-c-row": "C 行",
  "pl-c1": "C1",
  "pl-c2": "C2",
  "pl-c3": "C3",
  "pl-mod-d": "模块 · D grid placement",
  "pl-d-cap": "D 说明",
  "pl-d-grid": "D 栅格",
  "pl-d1": "D1",
  "pl-d2": "D2",
  "pl-d3": "D3",
  "pl-d4": "D4",
  "pl-mod-e": "模块 · E 纵排 placement",
  "pl-e-cap": "E 说明",
  "pl-e-col": "E 列",
  "pl-e1": "E1",
  "pl-e2": "E2",
  "pl-e3": "E3",
  "pl-mod-f": "模块 · F 文本对齐",
  "pl-f-cap": "F 说明",
  "pl-f-col": "F 列",
  "pl-f-l": "F 左",
  "pl-f-c": "F 中",
  "pl-f-r": "F 右",
  "pl-mod-g": "模块 · G fill 与 hug",
  "pl-g-cap": "G 说明",
  "pl-g-row": "G 行",
  "pl-g-fill": "G fill",
  "pl-g-hug": "G hug",
  "pl-mod-h": "模块 · H 纵排父 contentAlign",
  "pl-h-cap": "H 说明",
  "pl-h-col1": "H1 列",
  "pl-h-t1": "H1 文案",
  "pl-h-col2": "H2 列",
  "pl-h-col3": "H3 列",
  "pl-h-t2": "H2 文案",
  "pl-h-t3": "H3 文案",
  "pl-mod-i": "模块 · I 底图 contentAlign",
  "pl-i-cap": "I 说明",
  "pl-i-bg1": "I1 底图",
  "pl-i-t1": "I1 文案",
  "pl-i-bg2": "I2 底图",
  "pl-i-t2": "I2 文案",
  "pl-i-bg3": "I3 底图",
  "pl-i-t3": "I3 文案",
  "pl-root": "画布根节点",
};

for (const [id, block] of Object.entries(blocks)) {
  const type =
    block.type === "emailRoot"
      ? "layout.container"
      : block.type === "layout"
        ? "layout.container"
        : block.type === "grid"
          ? "layout.grid"
          : "content.text";
  blockMeta[id] = { blockType: type, name: nameMap[id] ?? id };
  if (block._name) delete block._name;
  for (const key of Object.keys(block.wrapperStyle ?? {})) {
    if (key.startsWith("_")) delete block.wrapperStyle[key];
  }
  for (const key of Object.keys(block.props ?? {})) {
    if (key.startsWith("_")) delete block.props[key];
  }
}

const template = {
  schemaVersion: "3.0.0",
  emailId: "placement_playground",
  templateId: "placement_playground",
  templateVersion: 1,
  locale: "zh-CN",
  rootBlockId: "pl-root",
  blockMeta,
  blocks,
};

writeFileSync(outPath, `${JSON.stringify(template, null, 2)}\n`, "utf8");
console.log(`Wrote ${outPath} (${Object.keys(blocks).length} blocks)`);
