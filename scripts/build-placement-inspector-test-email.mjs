#!/usr/bin/env node
/**
 * 生成 placement 交互/校验测试邮件：data/emails/placement-inspector-test/
 * 用法：node scripts/build-placement-inspector-test-email.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, "..");
const EMAIL_KEY = "placement-inspector-test";
const OUT = path.join(REPO, "data", "emails", EMAIL_KEY);
const LAYOUT = path.join(OUT, "layouts", "default");

const BORDER_ZERO = {
  mode: "unified",
  width: "0",
  style: "solid",
  color: "rgba(0,0,0,0)",
};
const RADIUS_ZERO = { mode: "unified", radius: "0" };

function textBlock(id, parentId, label, widthMode, heightMode, placement, extra = "") {
  const ws = {
    contentAlign: { horizontal: "left", vertical: "top" },
    widthMode,
    heightMode,
    border: BORDER_ZERO,
    borderRadius: RADIUS_ZERO,
  };
  if (placement) ws.placement = placement;
  const body = `${label}${extra ? ` — ${extra}` : ""}`;
  return {
    id,
    type: "text",
    parentId,
    children: [],
    wrapperStyle: ws,
    props: {
      content: `<p>${body}</p>`,
      textBody: {
        version: 1,
        paragraphs: [{ runs: [{ text: body }] }],
      },
      fontFamily: "Arial, sans-serif",
      fontSize: "13px",
      color: "#1F2937",
      bold: false,
      italic: false,
      decoration: "none",
    },
    bindings: {},
  };
}

function layoutBlock(id, parentId, direction, children, wrapperExtra = {}) {
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
      borderRadius: RADIUS_ZERO,
      backgroundColor: "#F3F4F6",
      padding: { mode: "unified", unified: "12px" },
      ...wrapperExtra,
    },
    props: { direction, gapMode: "fixed", gap: "8px" },
    bindings: {},
  };
}

const blocks = {};
const blockMeta = {};

function addBlock(block, metaName, metaType = "content.text") {
  blocks[block.id] = block;
  blockMeta[block.id] = {
    blockType: metaType === "layout" ? "layout.container" : metaType,
    name: metaName,
  };
}

// --- root ---
addBlock(
  {
    id: "pt-root",
    type: "emailRoot",
    parentId: null,
    children: ["pt-intro", "pt-vstack-mod", "pt-hstack-mod"],
    wrapperStyle: { widthMode: "fill", heightMode: "hug" },
    props: {
      backgroundColor: "#E5E7EB",
      width: "600px",
      padding: { mode: "unified", unified: "0" },
      border: BORDER_ZERO,
      gapMode: "fixed",
      gap: "12px",
    },
    bindings: {},
  },
  "画布根",
  "layout"
);

addBlock(
  textBlock(
    "pt-intro",
    "pt-root",
    "【说明】选中下方各测试块，在 Inspector「布局」查看「容器相对父级摆放」是否出现。纵排父+fill宽/横排父+fill高=不展示；纵排父+hug宽=横三点；横排父+hug高=纵三点。",
    "fill",
    "hug"
  ),
  "使用说明"
);

// --- 纵排父 ---
const vChildren = ["pt-v-case1", "pt-v-case2", "pt-v-case3", "pt-v-case3-placed"];
const vLayout = layoutBlock("pt-vstack-mod", "pt-root", "vertical", vChildren);
addBlock(vLayout, "【纵排父】layout · vertical", "layout");

addBlock(
  textBlock(
    "pt-v-case1",
    "pt-vstack-mod",
    "Case V1",
    "fill",
    "hug",
    undefined,
    "纵排父+fill宽 → 应无「相对父级摆放」"
  ),
  "V1 · fill宽 · 无 placement"
);

addBlock(
  textBlock(
    "pt-v-case2",
    "pt-vstack-mod",
    "Case V2",
    "hug",
    "fixed",
    undefined,
    "纵排父+hug宽+fixed高 → 横排三点（纵排下禁止子 fill 高）"
  ),
  "V2 · hug宽+fixed高 · 横三点"
);
// fixed 高度需 wrapperStyle.height
blocks["pt-v-case2"].wrapperStyle.height = "48px";

addBlock(
  textBlock(
    "pt-v-case3",
    "pt-vstack-mod",
    "Case V3",
    "hug",
    "hug",
    undefined,
    "纵排父+hug×hug → 仅横排三点（非九宫格）"
  ),
  "V3 · hug×hug · 横三点"
);

addBlock(
  textBlock(
    "pt-v-case3-placed",
    "pt-vstack-mod",
    "Case V3b",
    "hug",
    "hug",
    { horizontal: "center" },
    "JSON 含 placement.horizontal:center · 合法"
  ),
  "V3b · hug×hug · placement 水平居中"
);

// --- 横排父 ---
const hRowChildren = ["pt-h-case1", "pt-h-case2", "pt-h-case3", "pt-h-case3-placed"];
const hRow = layoutBlock("pt-hrow", "pt-hstack-mod", "horizontal", hRowChildren, {
  backgroundColor: "#E0E7FF",
  padding: { mode: "unified", unified: "10px" },
});

const hSection = layoutBlock("pt-hstack-mod", "pt-root", "vertical", ["pt-hrow"]);
addBlock(hSection, "【横排父】外层纵排壳", "layout");
addBlock(hRow, "【横排父】横排行", "layout");

addBlock(
  {
    id: "pt-h-case1",
    type: "layout",
    parentId: "pt-hrow",
    children: ["pt-h-case1-label"],
    wrapperStyle: {
      contentAlign: { horizontal: "left", vertical: "top" },
      widthMode: "hug",
      heightMode: "fill",
      border: BORDER_ZERO,
      borderRadius: RADIUS_ZERO,
      backgroundColor: "#FEE2E2",
      padding: { mode: "unified", unified: "4px" },
    },
    props: { direction: "vertical", gapMode: "fixed", gap: "0" },
    bindings: {},
  },
  "H1 · fill高 · 无 placement",
  "layout"
);

addBlock(
  textBlock(
    "pt-h-case1-label",
    "pt-h-case1",
    "H1 fill高",
    "hug",
    "hug",
    undefined,
    "横排父+fill高 → 无相对父级摆放"
  ),
  "H1 文案",
  "content.text"
);

addBlock(
  textBlock(
    "pt-h-case2",
    "pt-hrow",
    "Case H2",
    "fill",
    "hug",
    undefined,
    "横排父+fill宽+hug高 → 纵排三点"
  ),
  "H2 · fill宽+hug高 · 纵三点"
);

addBlock(
  textBlock(
    "pt-h-case3",
    "pt-hrow",
    "Case H3",
    "hug",
    "hug",
    undefined,
    "横排父+hug×hug → 仅纵排三点"
  ),
  "H3 · hug×hug · 纵三点"
);

addBlock(
  textBlock(
    "pt-h-case3-placed",
    "pt-hrow",
    "Case H3b",
    "hug",
    "hug",
    { vertical: "center" },
    "JSON 含 placement.vertical:center · 合法"
  ),
  "H3b · hug×hug · placement 竖直居中"
);

const template = {
  schemaVersion: "3.0.0",
  emailId: EMAIL_KEY,
  templateId: EMAIL_KEY,
  templateVersion: 1,
  locale: "zh-CN",
  rootBlockId: "pt-root",
  blockMeta,
  blocks,
};

const meta = {
  displayName: "Placement 交互测试（开发专用）",
  description:
    "覆盖纵排/横排父级与子块 fill/hug 组合，用于验收「容器相对父级摆放」Inspector 与 template.json 校验。",
  source: "agent",
  status: "draft",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  designSource: { type: "internal", url: "" },
  defaultStylePresetSelection: "local",
};

const layoutManifest = {
  schemaVersion: "1.0.0",
  activeLayoutVariantId: "default",
  variants: [
    {
      id: "default",
      label: "默认测试版式",
      description: "placement 父级×子级尺寸场景矩阵",
    },
  ],
};

const tokenPresets = {
  schemaVersion: "1.0.0",
  activePresetId: "default",
  presets: {
    default: {
      label: "测试预设",
      description: "最小 token 集",
      tokens: {
        colors: { primary: "#1F2937", secondary: "#6B7280", surface: "#FFFFFF" },
        fonts: {
          heading: "Arial",
          body: "Arial",
        },
        spacing: { section: "12px", gap: "8px", pageInline: "12px" },
        typography: {
          display: "24px",
          h1: "18px",
          body: "13px",
          caption: "12px",
        },
        radius: { panel: "4px", cta: "4px" },
      },
    },
  },
  scopeSelections: {},
};

const payload = { schemaVersion: "1.0.0", values: {} };

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

writeJson(path.join(OUT, "meta.json"), meta);
writeJson(path.join(OUT, "payload.json"), payload);
writeJson(path.join(OUT, "layout-manifest.json"), layoutManifest);
writeJson(path.join(LAYOUT, "template.json"), template);
writeJson(path.join(LAYOUT, "tokenPresets.json"), tokenPresets);

console.log(`已写入 data/emails/${EMAIL_KEY}/`);
console.log("请运行 npm run validate:all，并在编辑器中选择该邮件测试。");
