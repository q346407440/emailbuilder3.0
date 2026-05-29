#!/usr/bin/env node

import { contentAlignFromAxes, axesAlignRecord } from "./lib/content-align-axis.mjs";
/**
 * 生成 contentAlign 交互/校验测试邮件：data/emails/align-inspector-test/
 * 用法：node scripts/build-align-inspector-test-email.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, "..");
const EMAIL_KEY = "align-inspector-test";
const OUT = path.join(REPO, "data", "emails", EMAIL_KEY);
const LAYOUT = path.join(OUT, "layouts", "default");

const BORDER_ZERO = {
  mode: "unified",
  width: "0",
  style: "solid",
  color: "rgba(0,0,0,0)",
};
const RADIUS_ZERO = { mode: "unified", radius: "0" };

function textBlock(id, parentId, label, widthMode, heightMode, crossAlignAxes, extra = "") {
  const ws = {
    contentAlign: { horizontal: "left", vertical: "top" },
    widthMode,
    heightMode,
    border: BORDER_ZERO,
    borderRadius: RADIUS_ZERO,
  };
  if (crossAlignAxes) ws.contentAlign = axesAlignRecord(crossAlignAxes);
  const body = `${label}${extra ? ` — ${extra}` : ""}`;
  return {
    id,
    type: "text",
    parentId,
    children: [],
    wrapperStyle: ws,
    props: {
      textBody: {
        paragraphs: [{ runs: [{ text: body }] }],
      },
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
  "V1 · fill宽 · 仅主轴 contentAlign"
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
    "fixed",
    "hug",
    { horizontal: "center" },
    "定宽 + contentAlign.horizontal:center"
  ),
  "V3b · fixed宽 · 水平居中"
);
blocks["pt-v-case3-placed"].wrapperStyle.width = "200px";

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
  "H1 · fill高 · 仅主轴 contentAlign",
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
    "fixed",
    { vertical: "center" },
    "定高 + contentAlign.vertical:center"
  ),
  "H3b · fixed高 · 竖直居中"
);
blocks["pt-h-case3-placed"].wrapperStyle.height = "48px";

// --- 内置商品列表 · 按 SKU 扁平行（仅规格块，无 SPU 卡）---
const SLOT_SKU_LIST = "ptSkuList";

const SKU_ITEM_FIELDS = [
  { key: "imageSrc", label: "规格图", valueType: "image", required: true },
  { key: "imageAlt", label: "图替代文字", valueType: "string", required: true },
  { key: "title", label: "规格名", valueType: "string", required: true },
  { key: "href", label: "规格链接", valueType: "url", required: true },
  { key: "salePrice", label: "售价", valueType: "string", required: true },
  { key: "originalPrice", label: "对比价", valueType: "string", required: true },
];

/** mock：Aura 3 色 + Pulse 2 色，共 5 行 SKU（无 SPU 外层卡） */
const SKU_SELECTION_KEYS = [
  "gid://shopify/Product/aura-earbuds::gid://shopify/ProductVariant/aura-earbuds-1",
  "gid://shopify/Product/aura-earbuds::gid://shopify/ProductVariant/aura-earbuds-2",
  "gid://shopify/Product/aura-earbuds::gid://shopify/ProductVariant/aura-earbuds-3",
  "gid://shopify/Product/pulse-watch::gid://shopify/ProductVariant/pulse-watch-1",
  "gid://shopify/Product/pulse-watch::gid://shopify/ProductVariant/pulse-watch-2",
];

function collectionBinding(slotId, slotPath) {
  return {
    slotId,
    mode: "variable",
    valueType: "collection",
    allowExternal: true,
    fieldKind: "content",
    slotPath,
  };
}

blocks["pt-root"].children.push("pt-sku-mod");

addBlock(
  textBlock(
    "pt-sku-intro",
    "pt-sku-mod",
    "【SKU 扁平行】每行一块规格（图+规格名+价），无 SPU 商品卡、无规格子列表双循环。变量 ptSkuList：内置商品列表 · 按 SKU · 自由勾选 5 个规格。",
    "fill",
    "hug"
  ),
  "SKU 区说明"
);

const skuMod = layoutBlock("pt-sku-mod", "pt-root", "vertical", ["pt-sku-intro", "pt-sku-strip"], {
  backgroundColor: "#ECFDF5",
  padding: { mode: "unified", unified: "12px" },
});
addBlock(skuMod, "【SKU 扁平行】仅父级循环", "layout");

addBlock(
  {
    id: "pt-sku-row",
    type: "layout",
    parentId: "pt-sku-strip",
    children: ["pt-sku-row-img", "pt-sku-row-body"],
    wrapperStyle: {
      contentAlign: { horizontal: "left", vertical: "top" },
      widthMode: "fill",
      heightMode: "hug",
      border: BORDER_ZERO,
      borderRadius: RADIUS_ZERO,
      backgroundColor: "#FFFFFF",
      padding: { mode: "unified", unified: "8px" },
    },
    props: { direction: "horizontal", gapMode: "fixed", gap: "10px" },
    bindings: {},
  },
  "SKU 行模板",
  "layout"
);

addBlock(
  {
    id: "pt-sku-row-img",
    type: "layout",
    parentId: "pt-sku-row",
    children: [],
    wrapperStyle: {
      widthMode: "fixed",
      width: "56px",
      heightMode: "fixed",
      height: "56px",
      border: { mode: "unified", width: "1px", style: "solid", color: "#D1D5DB" },
      borderRadius: RADIUS_ZERO,
      backgroundImage: {
        src: "https://images.pexels.com/photos/90946/pexels-photo-90946.jpeg?auto=compress&cs=tinysrgb&w=400",
        alt: "规格图",
        link: "",
        fit: "cover",
        position: "center",
        borderRadius: RADIUS_ZERO,
        border: BORDER_ZERO,
      },
      padding: { mode: "unified", unified: "0" },
      contentAlign: { horizontal: "center", vertical: "center" },
    },
    props: { direction: "vertical", gapMode: "fixed", gap: "0" },
    bindings: {
      "wrapperStyle.backgroundImage.src": collectionBinding(SLOT_SKU_LIST, "0.imageSrc"),
      "wrapperStyle.backgroundImage.alt": collectionBinding(SLOT_SKU_LIST, "0.imageAlt"),
      "wrapperStyle.backgroundImage.link": collectionBinding(SLOT_SKU_LIST, "0.href"),
    },
  },
  "SKU 图",
  "layout"
);

addBlock(
  {
    id: "pt-sku-row-body",
    type: "layout",
    parentId: "pt-sku-row",
    children: ["pt-sku-row-title", "pt-sku-row-price"],
    wrapperStyle: {
      contentAlign: { horizontal: "left", vertical: "top" },
      widthMode: "fill",
      heightMode: "hug",
      border: BORDER_ZERO,
      borderRadius: RADIUS_ZERO,
    },
    props: { direction: "vertical", gapMode: "fixed", gap: "4px" },
    bindings: {},
  },
  "SKU 文案列",
  "layout"
);

addBlock(
  {
    ...textBlock("pt-sku-row-title", "pt-sku-row-body", "规格名", "fill", "hug"),
    bindings: {
      "props.textBody.paragraphs.0.runs.0.text": collectionBinding(SLOT_SKU_LIST, "0.title"),
    },
  },
  "SKU 规格名"
);

addBlock(
  {
    ...textBlock("pt-sku-row-price", "pt-sku-row-body", "$0.00", "fill", "hug"),
    bindings: {
      "props.textBody.paragraphs.0.runs.0.text": collectionBinding(SLOT_SKU_LIST, "0.salePrice"),
    },
  },
  "SKU 售价"
);

const skuStrip = layoutBlock("pt-sku-strip", "pt-sku-mod", "vertical", ["pt-sku-row"], {
  backgroundColor: "transparent",
  padding: { mode: "unified", unified: "0" },
});
skuStrip.repeat = {
  mode: "collection",
  slotId: SLOT_SKU_LIST,
  prototypeChildIds: ["pt-sku-row"],
  fallbackChildIds: ["pt-sku-row"],
  itemFields: SKU_ITEM_FIELDS,
  minItems: 1,
  maxItems: 5,
  label: "SKU 扁平行（开发测试）",
  description: "按 SKU 粒度仅父级循环；行模板不含 SPU 名/角标/规格子列表。",
};
addBlock(skuStrip, "SKU 列表 repeat", "layout");

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
  displayName: "ContentAlign 交互测试（开发专用）",
  description:
    "覆盖纵排/横排父级与子块 fill/hug 组合，用于验收「容器相对父级摆放」Inspector 与 template.json 校验。含 SKU-only 示例（变量 ptSkuList：内置商品列表按 SKU 扁平行，仅规格块、无 SPU 卡）。",
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
      label: "默认测试版式",
      description: "contentAlign 父级×子级尺寸场景矩阵",
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

const payload = {
  schemaVersion: "1.0.0",
  slots: {
    [SLOT_SKU_LIST]: {
      label: "SKU 扁平行（仅规格）",
      valueType: "collection",
      description:
        "开发用：内置商品列表 · 按 SKU · 自由勾选；模板仅父级循环，不展示 SPU 商品卡。",
      itemFields: SKU_ITEM_FIELDS,
      minItems: 1,
      maxItems: 5,
      dataSource: {
        type: "remote",
        provider: "builtin",
        catalog: "products",
        sort: "catalogOrder",
        productConfig: {
          rowGranularity: "sku",
          rangeMode: "freeSelect",
          skuSelection: SKU_SELECTION_KEYS,
          selectedSpuIds: [
            "gid://shopify/Product/aura-earbuds",
            "gid://shopify/Product/pulse-watch",
          ],
        },
      },
    },
  },
  values: {
    [SLOT_SKU_LIST]: [
      {
        imageSrc:
          "https://images.pexels.com/photos/90946/pexels-photo-90946.jpeg?auto=compress&cs=tinysrgb&w=400",
        imageAlt: "Aura 无线耳机 — 曜石黑",
        title: "曜石黑",
        href: "https://example.com/products/aura-earbuds?variant=1",
        salePrice: "$79.00",
        originalPrice: "$99.00",
      },
      {
        imageSrc:
          "https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=400",
        imageAlt: "Aura 无线耳机 — 云雾白",
        title: "云雾白",
        href: "https://example.com/products/aura-earbuds?variant=2",
        salePrice: "$79.00",
        originalPrice: "$99.00",
      },
      {
        imageSrc:
          "https://images.pexels.com/photos/1181676/pexels-photo-1181676.jpeg?auto=compress&cs=tinysrgb&w=400",
        imageAlt: "Aura 无线耳机 — 薄荷绿",
        title: "薄荷绿",
        href: "https://example.com/products/aura-earbuds?variant=3",
        salePrice: "$84.00",
        originalPrice: "$99.00",
      },
      {
        imageSrc:
          "https://images.pexels.com/photos/2983468/pexels-photo-2983468.jpeg?auto=compress&cs=tinysrgb&w=400",
        imageAlt: "Pulse 智能手表 42mm 星空灰",
        title: "42mm 星空灰",
        href: "https://example.com/products/pulse-watch?variant=1",
        salePrice: "$149.00",
        originalPrice: "$199.00",
      },
      {
        imageSrc:
          "https://images.pexels.com/photos/437037/pexels-photo-437037.jpeg?auto=compress&cs=tinysrgb&w=400",
        imageAlt: "Pulse 智能手表 42mm 玫瑰金",
        title: "42mm 玫瑰金",
        href: "https://example.com/products/pulse-watch?variant=2",
        salePrice: "$149.00",
        originalPrice: "$199.00",
      },
    ],
  },
};

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
