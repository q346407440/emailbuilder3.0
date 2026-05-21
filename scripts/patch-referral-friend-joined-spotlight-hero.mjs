/**
 * 优化 referral-friend-joined 主推区布局：
 * - 上行：SPU 主图（imageSrc）+ 右侧标题/角标/价格（类 HTML 商品卡）
 * - 下行：SKU 缩略图条（仅小图 + 规格名，去掉每格重复标价）
 *
 * 用法：node scripts/patch-referral-friend-joined-spotlight-hero.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const TEMPLATE_PATH = path.join(
  ROOT,
  "data/emails/referral-friend-joined/layouts/default/template.json"
);
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

const noBorder = {
  mode: "unified",
  width: "0",
  style: "solid",
  color: "rgba(0,0,0,0)",
};

/** SKU 缩略图格：小图 + 规格名 */
function makeSkuThumbBlocks(n) {
  const id = `rfj-picked-spotlight-sku-${n}`;
  const imgId = `${id}-img`;
  const titleId = `${id}-title`;
  const blocks = {};

  blocks[id] = {
    id,
    type: "layout",
    parentId: "rfj-picked-spotlight-sku-strip",
    children: [imgId, titleId],
    wrapperStyle: {
      widthMode: "fill",
      heightMode: "hug",
      border: noBorder,
      borderRadius: { mode: "unified", radius: "0" },
      contentAlign: { vertical: "top", horizontal: "center" },
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
      height: "52px",
      border: {
        mode: "unified",
        width: "1px",
        style: "solid",
        color: "#E5E0D6",
      },
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
        border: noBorder,
      },
      padding: { mode: "unified", unified: "0" },
      contentAlign: { vertical: "top", horizontal: "center" },
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
      "wrapperStyle.backgroundImage.borderRadius.radius": themeBinding(
        "tokens.radius.panel"
      ),
    },
  };

  blocks[titleId] = {
    id: titleId,
    type: "text",
    parentId: id,
    children: [],
    wrapperStyle: {
      contentAlign: { horizontal: "center", vertical: "top" },
      widthMode: "fill",
      heightMode: "hug",
      border: noBorder,
      borderRadius: { mode: "unified", radius: "0" },
    },
    props: {
      textBody: {
        version: 1,
        paragraphs: [{ runs: [{ text: "规格" }] }],
      },
      fontFamily: { $themeRef: "fonts.body" },
      fontSize: { $themeRef: "tokens.typography.caption" },
      color: { $themeRef: "colors.secondary" },
      bold: false,
      italic: false,
      decoration: "none",
    },
    bindings: {
      "props.textBody.paragraphs.0.runs.0.text": collectionBinding(
        "pickedSpotlightProduct",
        `0.skuTitle${n}`
      ),
      "props.fontFamily": themeBinding("fonts.body"),
      "props.fontSize": themeBinding("tokens.typography.caption"),
      "props.color": themeBinding("colors.secondary"),
    },
  };

  return blocks;
}

// 移除旧 SKU 现价块
for (let n = 1; n <= SKU_COUNT; n++) {
  delete template.blocks[`rfj-picked-spotlight-sku-${n}-price`];
  delete template.blockMeta?.[`rfj-picked-spotlight-sku-${n}-price`];
}

const skuStripChildren = [];
const skuBlocks = {};
for (let n = 1; n <= SKU_COUNT; n++) {
  skuStripChildren.push(`rfj-picked-spotlight-sku-${n}`);
  Object.assign(skuBlocks, makeSkuThumbBlocks(n));
}
Object.assign(template.blocks, skuBlocks);

template.blocks["rfj-picked-spotlight-main-img"] = {
  id: "rfj-picked-spotlight-main-img",
  type: "layout",
  parentId: "rfj-picked-spotlight-hero-row",
  children: [],
  wrapperStyle: {
    widthMode: "fixed",
    width: "132px",
    heightMode: "fixed",
    height: "132px",
    border: noBorder,
    borderRadius: {
      mode: "unified",
      radius: { $themeRef: "tokens.radius.panel" },
    },
    backgroundImage: {
      src: "https://images.pexels.com/photos/90946/pexels-photo-90946.jpeg?auto=compress&cs=tinysrgb&w=600",
      alt: "商品主图",
      link: "",
      fit: "cover",
      position: "center",
      borderRadius: {
        mode: "unified",
        radius: { $themeRef: "tokens.radius.panel" },
      },
      border: noBorder,
    },
    padding: { mode: "unified", unified: "0" },
    contentAlign: { vertical: "top", horizontal: "left" },
  },
  props: { direction: "vertical", gapMode: "fixed", gap: "0" },
  bindings: {
    "wrapperStyle.backgroundImage.src": collectionBinding(
      "pickedSpotlightProduct",
      "0.imageSrc"
    ),
    "wrapperStyle.backgroundImage.alt": collectionBinding(
      "pickedSpotlightProduct",
      "0.imageAlt"
    ),
    "wrapperStyle.backgroundImage.link": collectionBinding(
      "pickedSpotlightProduct",
      "0.href"
    ),
    "wrapperStyle.borderRadius.radius": themeBinding("tokens.radius.panel"),
    "wrapperStyle.backgroundImage.borderRadius.radius": themeBinding(
      "tokens.radius.panel"
    ),
  },
};

template.blocks["rfj-picked-spotlight-info-col"] = {
  id: "rfj-picked-spotlight-info-col",
  type: "layout",
  parentId: "rfj-picked-spotlight-hero-row",
  children: [
    "rfj-picked-spotlight-name",
    "rfj-picked-spotlight-badge",
    "rfj-picked-spotlight-price-row",
  ],
  wrapperStyle: {
    widthMode: "fill",
    heightMode: "hug",
    border: noBorder,
    borderRadius: { mode: "unified", radius: "0" },
    contentAlign: { vertical: "center", horizontal: "left" },
  },
  props: { direction: "vertical", gapMode: "fixed", gap: "6px" },
  bindings: {},
};

template.blocks["rfj-picked-spotlight-hero-row"] = {
  id: "rfj-picked-spotlight-hero-row",
  type: "layout",
  parentId: "rfj-picked-spotlight-cell",
  children: ["rfj-picked-spotlight-main-img", "rfj-picked-spotlight-info-col"],
  wrapperStyle: {
    widthMode: "fill",
    heightMode: "hug",
    border: noBorder,
    borderRadius: { mode: "unified", radius: "0" },
    contentAlign: { vertical: "top", horizontal: "left" },
  },
  props: { direction: "horizontal", gapMode: "fixed", gap: "12px" },
  bindings: {},
};

template.blocks["rfj-picked-spotlight-sku-label"] = {
  id: "rfj-picked-spotlight-sku-label",
  type: "text",
  parentId: "rfj-picked-spotlight-cell",
  children: [],
  wrapperStyle: {
    contentAlign: { horizontal: "left", vertical: "top" },
    widthMode: "fill",
    heightMode: "hug",
    border: noBorder,
    borderRadius: { mode: "unified", radius: "0" },
    padding: {
      mode: "separate",
      top: "4px",
      right: "0",
      bottom: "0",
      left: "0",
    },
  },
  props: {
    textBody: {
      version: 1,
      paragraphs: [{ runs: [{ text: "可选规格" }] }],
    },
    fontFamily: { $themeRef: "fonts.body" },
    fontSize: { $themeRef: "tokens.typography.caption" },
    color: { $themeRef: "colors.secondary" },
    bold: false,
    italic: false,
    decoration: "none",
  },
  bindings: {
    "props.fontFamily": themeBinding("fonts.body"),
    "props.fontSize": themeBinding("tokens.typography.caption"),
    "props.color": themeBinding("colors.secondary"),
  },
};

template.blocks["rfj-picked-spotlight-sku-strip"] = {
  id: "rfj-picked-spotlight-sku-strip",
  type: "layout",
  parentId: "rfj-picked-spotlight-cell",
  children: skuStripChildren,
  wrapperStyle: {
    widthMode: "fill",
    heightMode: "hug",
    border: noBorder,
    borderRadius: { mode: "unified", radius: "0" },
    contentAlign: { vertical: "top", horizontal: "left" },
  },
  props: { direction: "horizontal", gapMode: "fixed", gap: "6px" },
  bindings: {},
};

template.blocks["rfj-picked-spotlight-cell"].children = [
  "rfj-picked-spotlight-hero-row",
  "rfj-picked-spotlight-sku-label",
  "rfj-picked-spotlight-sku-strip",
];
template.blocks["rfj-picked-spotlight-cell"].props.gap = "10px";

template.blocks["rfj-picked-spotlight-name"].parentId = "rfj-picked-spotlight-info-col";
template.blocks["rfj-picked-spotlight-badge"].parentId = "rfj-picked-spotlight-info-col";
template.blocks["rfj-picked-spotlight-price-row"].parentId = "rfj-picked-spotlight-info-col";

// 主图区标题略加大层次
if (template.blocks["rfj-picked-spotlight-name"]?.props?.fontSize) {
  template.blocks["rfj-picked-spotlight-name"].props.fontSize = {
    $themeRef: "tokens.typography.h1",
  };
  template.blocks["rfj-picked-spotlight-name"].bindings["props.fontSize"] = themeBinding(
    "tokens.typography.h1"
  );
}

template.blocks["rfj-picked-spotlight"].repeat.label = "主推单品（SPU）";
template.blocks["rfj-picked-spotlight"].repeat.description =
  "精选区上方主推：SPU 主图 + 文案，下方 SKU 规格缩略图条。";

template.blockMeta["rfj-picked-spotlight"].name = "主推单品（主图 + SKU 规格）";
template.blockMeta["rfj-picked-spotlight-hero-row"] = {
  blockType: "layout.container",
  name: "主推主图与信息",
};
template.blockMeta["rfj-picked-spotlight-main-img"] = {
  blockType: "layout.container",
  name: "SPU 主图",
};
template.blockMeta["rfj-picked-spotlight-info-col"] = {
  blockType: "layout.container",
  name: "主推信息区",
};
template.blockMeta["rfj-picked-spotlight-sku-label"] = {
  blockType: "content.text",
  name: "SKU 区标题",
};
template.blockMeta["rfj-picked-spotlight-sku-strip"] = {
  blockType: "layout.container",
  name: "SKU 缩略图条",
};
for (let n = 1; n <= SKU_COUNT; n++) {
  template.blockMeta[`rfj-picked-spotlight-sku-${n}`] = {
    blockType: "layout.container",
    name: `SKU 缩略 ${n}`,
  };
  template.blockMeta[`rfj-picked-spotlight-sku-${n}-img`] = {
    blockType: "layout.container",
    name: `SKU${n} 缩略图`,
  };
  template.blockMeta[`rfj-picked-spotlight-sku-${n}-title`] = {
    blockType: "content.text",
    name: `SKU${n} 规格名`,
  };
}

fs.writeFileSync(TEMPLATE_PATH, `${JSON.stringify(template, null, 2)}\n`);
console.log("已优化 referral-friend-joined 主推区（主图 + SKU 缩略图条）");
console.log("请运行: npm run validate:all");
