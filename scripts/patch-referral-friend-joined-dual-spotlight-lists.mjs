/**
 * 主推区改为双列表变量：
 * - pickedSpotlightProduct（1 项 SPU：主图 + 文案）
 * - pickedSpotlightSkus（5 项 SKU：缩略图条 repeat）
 *
 * 用法：node scripts/patch-referral-friend-joined-dual-spotlight-lists.mjs
 */
import fs from "node:fs";
import path from "node:path";
const ROOT = path.resolve(import.meta.dirname, "..");
const TEMPLATE_PATH = path.join(
  ROOT,
  "data/emails/referral-friend-joined/layouts/default/template.json"
);
const PAYLOAD_PATH = path.join(ROOT, "data/emails/referral-friend-joined/payload.json");

const SPU_ITEM_FIELDS = [
  { key: "imageSrc", label: "商品图", valueType: "image", required: true },
  { key: "imageAlt", label: "图片替代文字", valueType: "string", required: true },
  { key: "name", label: "商品名", valueType: "string", required: true },
  { key: "salePrice", label: "现价", valueType: "string", required: true },
  { key: "originalPrice", label: "原价", valueType: "string", required: true },
  { key: "badge", label: "角标", valueType: "string", required: true },
  { key: "href", label: "商品链接", valueType: "url", required: true },
];

const SKU_ITEM_FIELDS = [
  { key: "imageSrc", label: "规格图", valueType: "image", required: true },
  { key: "imageAlt", label: "图替代文字", valueType: "string", required: true },
  { key: "title", label: "规格名", valueType: "string", required: true },
  { key: "href", label: "规格链接", valueType: "url", required: true },
];

const SKU_PROTOTYPE_ROOT = "rfj-picked-spotlight-sku-1";
const SKU_BLOCKS_TO_REMOVE = [
  "rfj-picked-spotlight-sku-2",
  "rfj-picked-spotlight-sku-2-img",
  "rfj-picked-spotlight-sku-2-title",
  "rfj-picked-spotlight-sku-3",
  "rfj-picked-spotlight-sku-3-img",
  "rfj-picked-spotlight-sku-3-title",
  "rfj-picked-spotlight-sku-4",
  "rfj-picked-spotlight-sku-4-img",
  "rfj-picked-spotlight-sku-4-title",
  "rfj-picked-spotlight-sku-5",
  "rfj-picked-spotlight-sku-5-img",
  "rfj-picked-spotlight-sku-5-title",
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

function themeBinding(tokenPath) {
  return {
    slotId: tokenPath,
    mode: "theme",
    tokenPath,
    fieldKind: "style",
  };
}

const template = JSON.parse(fs.readFileSync(TEMPLATE_PATH, "utf8"));
const payload = JSON.parse(fs.readFileSync(PAYLOAD_PATH, "utf8"));

// --- template: 外层 repeat 仅 SPU 字段 ---
const spotlightRepeat = template.blocks["rfj-picked-spotlight"].repeat;
spotlightRepeat.itemFields = [...SPU_ITEM_FIELDS];
spotlightRepeat.minItems = 1;
spotlightRepeat.maxItems = 1;
spotlightRepeat.label = "主推单品（SPU）";
spotlightRepeat.description =
  "精选区上方主推：1 款商品（SPU 主图与文案）；SKU 规格见变量 pickedSpotlightSkus。";

// --- template: SKU 横条 repeat ---
template.blocks["rfj-picked-spotlight-sku-strip"].children = [SKU_PROTOTYPE_ROOT];
template.blocks["rfj-picked-spotlight-sku-strip"].repeat = {
  mode: "collection",
  slotId: "pickedSpotlightSkus",
  prototypeChildIds: [SKU_PROTOTYPE_ROOT],
  fallbackChildIds: [SKU_PROTOTYPE_ROOT],
  itemFields: [...SKU_ITEM_FIELDS],
  minItems: 5,
  maxItems: 5,
  label: "主推 SKU 规格列表",
  description: "主推商品下的 SKU 缩略图横排，固定 5 项。",
};

// --- template: SKU 行模板绑定 pickedSpotlightSkus ---
const skuImg = template.blocks["rfj-picked-spotlight-sku-1-img"];
skuImg.bindings["wrapperStyle.backgroundImage.src"] = collectionBinding(
  "pickedSpotlightSkus",
  "0.imageSrc"
);
skuImg.bindings["wrapperStyle.backgroundImage.alt"] = collectionBinding(
  "pickedSpotlightSkus",
  "0.imageAlt"
);
skuImg.bindings["wrapperStyle.backgroundImage.link"] = collectionBinding(
  "pickedSpotlightSkus",
  "0.href"
);

const skuTitle = template.blocks["rfj-picked-spotlight-sku-1-title"];
skuTitle.bindings["props.textBody.paragraphs.0.runs.0.text"] = collectionBinding(
  "pickedSpotlightSkus",
  "0.title"
);

// --- 删除多余静态 SKU 块 ---
for (const id of SKU_BLOCKS_TO_REMOVE) {
  delete template.blocks[id];
  delete template.blockMeta?.[id];
}

// --- blockMeta ---
template.blockMeta["rfj-picked-spotlight"].name = "主推单品（SPU + SKU 列表）";
template.blockMeta["rfj-picked-spotlight-sku-strip"].name = "SKU 规格列表（repeat）";
template.blockMeta[SKU_PROTOTYPE_ROOT] = {
  blockType: "layout.container",
  name: "SKU 规格卡（行模板）",
};
template.blockMeta["rfj-picked-spotlight-sku-1-img"].name = "SKU 规格图";
template.blockMeta["rfj-picked-spotlight-sku-1-title"].name = "SKU 规格名";

// --- payload slots ---
const prevRow = payload.values.pickedSpotlightProduct?.[0] ?? {};

function skuRowsFromPrev(row) {
  const out = [];
  for (let n = 1; n <= 5; n++) {
    const imageSrc = row[`skuImage${n}`];
    if (!imageSrc) continue;
    out.push({
      imageSrc: String(imageSrc),
      imageAlt: String(row[`skuImageAlt${n}`] ?? ""),
      title: String(row[`skuTitle${n}`] ?? ""),
      href: String(row.href ?? ""),
    });
  }
  return out;
}

const spuRow = {
  imageSrc: String(prevRow.imageSrc ?? ""),
  imageAlt: String(prevRow.imageAlt ?? ""),
  name: String(prevRow.name ?? ""),
  salePrice: String(prevRow.salePrice ?? ""),
  originalPrice: String(prevRow.originalPrice ?? ""),
  badge: String(prevRow.badge ?? ""),
  href: String(prevRow.href ?? ""),
};

const skuRows = skuRowsFromPrev(prevRow);

payload.slots.pickedSpotlightProduct = {
  label: "主推单品",
  valueType: "collection",
  description: "精选区上方主推 SPU：主图与文案（1 项）。",
  itemFields: [...SPU_ITEM_FIELDS],
  minItems: 1,
  maxItems: 1,
  dataSource: payload.slots.pickedSpotlightProduct?.dataSource ?? {
    type: "remote",
    provider: "builtin",
    catalog: "products",
    sort: "catalogOrder",
  },
};

payload.slots.pickedSpotlightSkus = {
  label: "主推 SKU 规格",
  valueType: "collection",
  description: "主推商品下的 SKU 缩略图列表（与 pickedSpotlightProduct 同源，横排 repeat）。",
  itemFields: [...SKU_ITEM_FIELDS],
  minItems: 5,
  maxItems: 5,
};

payload.values.pickedSpotlightProduct = [spuRow];

payload.values.pickedSpotlightSkus = skuRows;

fs.writeFileSync(TEMPLATE_PATH, `${JSON.stringify(template, null, 2)}\n`);
fs.writeFileSync(PAYLOAD_PATH, `${JSON.stringify(payload, null, 2)}\n`);

console.log("已改为双列表：pickedSpotlightProduct + pickedSpotlightSkus");
console.log(`SKU 行数：${payload.values.pickedSpotlightSkus.length}`);
console.log("请运行: npm run validate:all");
