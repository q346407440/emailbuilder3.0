/**
 * 将 referral-friend-joined 主推区改为：1 个 SPU × 5 个 SKU 规格卡片横排。
 * 用法：node scripts/patch-referral-friend-joined-spotlight-skus.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const TEMPLATE_PATH = path.join(
  ROOT,
  "data/emails/referral-friend-joined/layouts/default/template.json"
);
const PAYLOAD_PATH = path.join(ROOT, "data/emails/referral-friend-joined/payload.json");
const SKU_COUNT = 5;

const template = JSON.parse(fs.readFileSync(TEMPLATE_PATH, "utf8"));

function themeBinding(tokenPath) {
  return {
    slotId: tokenPath,
    mode: "theme",
    tokenPath,
    fieldKind: "style",
  };
}

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

function makeSkuCardBlocks(n) {
  const id = `rfj-picked-spotlight-sku-${n}`;
  const imgId = `${id}-img`;
  const titleId = `${id}-title`;
  const priceId = `${id}-price`;
  const blocks = {};

  blocks[id] = {
    id,
    type: "layout",
    parentId: "rfj-picked-spotlight-sku-strip",
    children: [imgId, titleId, priceId],
    wrapperStyle: {
      widthMode: "fill",
      heightMode: "hug",
      border: { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" },
      borderRadius: { mode: "unified", radius: "0" },
      contentAlign: { vertical: "top", horizontal: "left" },
    },
    props: { direction: "vertical", gapMode: "fixed", gap: "4px" },
    bindings: {},
  };

  blocks[imgId] = {
    id: imgId,
    type: "layout",
    parentId: id,
    children: [],
    wrapperStyle: {
      widthMode: "fill",
      heightMode: "fixed",
      height: "72px",
      border: { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" },
      borderRadius: {
        mode: "unified",
        radius: { $themeRef: "tokens.radius.panel" },
      },
      backgroundImage: {
        src: "https://images.pexels.com/photos/90946/pexels-photo-90946.jpeg?auto=compress&cs=tinysrgb&w=400",
        alt: "SKU",
        link: "",
        fit: "cover",
        position: "center",
        borderRadius: {
          mode: "unified",
          radius: { $themeRef: "tokens.radius.panel" },
        },
        border: { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" },
      },
      padding: { mode: "unified", unified: "0" },
      contentAlign: { vertical: "top", horizontal: "left" },
    },
    props: { direction: "vertical", gapMode: "fixed", gap: "0" },
    bindings: {
      "wrapperStyle.backgroundImage.src": collectionBinding(
        "pickedSpotlightProduct",
        `0.skuImage${n}`
      ),
      "wrapperStyle.backgroundImage.alt": collectionBinding(
        "pickedSpotlightProduct",
        `0.skuImageAlt${n}`
      ),
      "wrapperStyle.backgroundImage.link": collectionBinding(
        "pickedSpotlightProduct",
        "0.href"
      ),
      "wrapperStyle.borderRadius.radius": themeBinding("tokens.radius.panel"),
      "wrapperStyle.backgroundImage.borderRadius.radius": themeBinding("tokens.radius.panel"),
    },
  };

  blocks[titleId] = {
    id: titleId,
    type: "text",
    parentId: id,
    children: [],
    wrapperStyle: {
      contentAlign: { horizontal: "left", vertical: "top" },
      widthMode: "fill",
      heightMode: "hug",
      border: { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" },
      borderRadius: { mode: "unified", radius: "0" },
    },
    props: {
      textBody: {
        paragraphs: [{ runs: [{ text: "规格" }] }],
      },
      fontSize: { $themeRef: "tokens.typography.caption" },
      color: { $themeRef: "colors.primary" },
      bold: false,
      italic: false,
      decoration: "none",
    },
    bindings: {
      "props.textBody.paragraphs.0.runs.0.text": collectionBinding(
        "pickedSpotlightProduct",
        `0.skuTitle${n}`
      ),
      "props.fontSize": themeBinding("tokens.typography.caption"),
      "props.color": themeBinding("colors.primary"),
    },
  };

  blocks[priceId] = {
    id: priceId,
    type: "text",
    parentId: id,
    children: [],
    wrapperStyle: {
      contentAlign: { horizontal: "left", vertical: "top" },
      widthMode: "fill",
      heightMode: "hug",
      border: { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" },
      borderRadius: { mode: "unified", radius: "0" },
    },
    props: {
      textBody: {
        paragraphs: [{ runs: [{ text: "$0.00", bold: true }] }],
      },
      fontSize: { $themeRef: "tokens.typography.caption" },
      color: { $themeRef: "colors.primary" },
      bold: true,
      italic: false,
      decoration: "none",
    },
    bindings: {
      "props.textBody.paragraphs.0.runs.0.text": collectionBinding(
        "pickedSpotlightProduct",
        `0.skuSalePrice${n}`
      ),
      "props.fontSize": themeBinding("tokens.typography.caption"),
      "props.color": themeBinding("colors.primary"),
    },
  };

  return blocks;
}

const skuStripChildren = [];
const newBlocks = {};
for (let n = 1; n <= SKU_COUNT; n++) {
  skuStripChildren.push(`rfj-picked-spotlight-sku-${n}`);
  Object.assign(newBlocks, makeSkuCardBlocks(n));
}

newBlocks["rfj-picked-spotlight-sku-strip"] = {
  id: "rfj-picked-spotlight-sku-strip",
  type: "layout",
  parentId: "rfj-picked-spotlight-cell",
  children: skuStripChildren,
  wrapperStyle: {
    widthMode: "fill",
    heightMode: "hug",
    border: { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" },
    borderRadius: { mode: "unified", radius: "0" },
    contentAlign: { vertical: "top", horizontal: "left" },
  },
  props: { direction: "horizontal", gapMode: "fixed", gap: "8px" },
  bindings: {},
};

template.blocks["rfj-picked-spotlight-cell"].children = [
  "rfj-picked-spotlight-name",
  "rfj-picked-spotlight-badge",
  "rfj-picked-spotlight-price-row",
  "rfj-picked-spotlight-sku-strip",
];

if (template.blocks["rfj-picked-spotlight-badge"]) {
  template.blocks["rfj-picked-spotlight-badge"].parentId = "rfj-picked-spotlight-cell";
}

template.blocks["rfj-picked-spotlight"].repeat.description =
  "精选区上方主推：1 款商品（SPU），横排展示其 SKU 规格卡片。";
template.blocks["rfj-picked-spotlight"].repeat.label = "主推单品（SPU）";

const baseItemFields = template.blocks["rfj-picked-spotlight"].repeat.itemFields.filter(
  (f) => !/^sku/.test(f.key)
);
const skuItemFields = [];
for (let n = 1; n <= SKU_COUNT; n++) {
  skuItemFields.push(
    { key: `skuImage${n}`, label: `SKU${n} 商品图`, valueType: "image", required: true },
    { key: `skuImageAlt${n}`, label: `SKU${n} 图替代文字`, valueType: "string", required: true },
    { key: `skuTitle${n}`, label: `SKU${n} 规格名`, valueType: "string", required: true },
    { key: `skuSalePrice${n}`, label: `SKU${n} 现价`, valueType: "string", required: true }
  );
}
template.blocks["rfj-picked-spotlight"].repeat.itemFields = [...baseItemFields, ...skuItemFields];

Object.assign(template.blocks, newBlocks);

delete template.blocks["rfj-picked-spotlight-img-wrap"];

template.blockMeta["rfj-picked-spotlight"].name = "主推单品（SPU·SKU 规格条）";
template.blockMeta["rfj-picked-spotlight-sku-strip"] = {
  blockType: "layout.container",
  name: "SKU 规格横排",
};
for (let n = 1; n <= SKU_COUNT; n++) {
  template.blockMeta[`rfj-picked-spotlight-sku-${n}`] = {
    blockType: "layout.container",
    name: `SKU 规格卡 ${n}`,
  };
  template.blockMeta[`rfj-picked-spotlight-sku-${n}-img`] = {
    blockType: "layout.container",
    name: `SKU${n} 图`,
  };
  template.blockMeta[`rfj-picked-spotlight-sku-${n}-title`] = {
    blockType: "content.text",
    name: `SKU${n} 规格名`,
  };
  template.blockMeta[`rfj-picked-spotlight-sku-${n}-price`] = {
    blockType: "content.text",
    name: `SKU${n} 现价`,
  };
}

fs.writeFileSync(TEMPLATE_PATH, `${JSON.stringify(template, null, 2)}\n`);
console.log("已更新 template.json（主推 SKU 横排）");
console.log("请运行: npm run validate:all");
