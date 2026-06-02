#!/usr/bin/env node
/**
 * 商品列表 payload / template：扩展 skus 子列表 itemFields（现价/原价/库存/销量）并回填 values。
 * 用法：tsx scripts/migrate-sku-nested-item-fields.mjs [--write]
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { BUILTIN_PRODUCT_SKU_NESTED_ITEM_FIELDS } from "../../../src/payload-contract/builtin-collection-item-fields.ts";
import { BUILTIN_PRODUCTS_MOCK_RAW } from "../../../src/lib/builtinProductsMockData.ts";
import { projectRowsToItemFields } from "../../../src/lib/builtinCollectionCatalog.ts";
import { normalizeCollectionItems } from "../../../src/lib/collectionDataSource.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const EMAILS_DIR = join(resolve(__dirname, "../../.."), "data", "emails");
const write = process.argv.includes("--write");

const SKU_FIELDS = structuredClone(BUILTIN_PRODUCT_SKU_NESTED_ITEM_FIELDS);

function skuFieldsEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** 递归替换 collection 字段 skus 的 itemFields */
function patchSkusItemFieldsInTree(itemFields) {
  if (!Array.isArray(itemFields)) return false;
  let changed = false;
  for (const field of itemFields) {
    if (field?.key === "skus" && field.valueType === "collection") {
      if (!skuFieldsEqual(field.itemFields ?? [], SKU_FIELDS)) {
        field.itemFields = structuredClone(SKU_FIELDS);
        changed = true;
      }
    }
    if (field?.valueType === "collection" && Array.isArray(field.itemFields)) {
      if (patchSkusItemFieldsInTree(field.itemFields)) changed = true;
    }
  }
  return changed;
}

function findMockProduct(row) {
  const name = typeof row.name === "string" ? row.name.trim() : "";
  const href = typeof row.href === "string" ? row.href.trim() : "";
  return (
    BUILTIN_PRODUCTS_MOCK_RAW.find(
      (p) => (name && p.title === name) || (href && p.href === href)
    ) ?? null
  );
}

/** 按规格 title/href 在全目录 mock 中匹配 SKU（相似品 SPU 下混有其它商品规格行） */
function findMockSkuGlobally(skuRow) {
  const title = typeof skuRow.title === "string" ? skuRow.title.trim() : "";
  const href = typeof skuRow.href === "string" ? skuRow.href.trim() : "";
  for (const product of BUILTIN_PRODUCTS_MOCK_RAW) {
    for (const sku of product.skus ?? []) {
      if ((title && sku.title === title) || (href && sku.href === href)) return sku;
    }
  }
  return null;
}

function enrichSkuValuesForRow(parentRow) {
  const skus = parentRow.skus;
  if (!Array.isArray(skus)) return parentRow;
  const mock = findMockProduct(parentRow);
  const nextSkus = skus.map((skuRow, index) => {
    if (!skuRow || typeof skuRow !== "object" || Array.isArray(skuRow)) return skuRow;
    const mockSku =
      mock?.skus.find(
        (s) =>
          (typeof skuRow.title === "string" && s.title === skuRow.title) ||
          (typeof skuRow.href === "string" && s.href === skuRow.href)
      ) ??
      mock?.skus[index] ??
      findMockSkuGlobally(skuRow);
    const source = mockSku ?? skuRow;
    const projected = projectRowsToItemFields([source], SKU_FIELDS);
    return projected[0] ?? skuRow;
  });
  const normalized = normalizeCollectionItems(nextSkus, SKU_FIELDS, {
    maxLength: nextSkus.length,
  });
  return normalized.ok ? { ...parentRow, skus: normalized.items } : parentRow;
}

function migratePayloadValues(payload) {
  let changed = false;
  for (const [slotId, slotDef] of Object.entries(payload.slots ?? {})) {
    if (slotDef?.valueType !== "collection") continue;
    const hasSkus = (slotDef.itemFields ?? []).some(
      (f) => f.key === "skus" && f.valueType === "collection"
    );
    if (!hasSkus) continue;
    const raw = payload.values?.[slotId];
    if (!Array.isArray(raw)) continue;
    const next = raw.map((row) =>
      row && typeof row === "object" && !Array.isArray(row)
        ? enrichSkuValuesForRow(row)
        : row
    );
    if (JSON.stringify(next) !== JSON.stringify(raw)) {
      payload.values[slotId] = next;
      changed = true;
    }
  }
  return changed;
}

function migratePayloadFile(payloadPath) {
  const payload = JSON.parse(readFileSync(payloadPath, "utf8"));
  let changed = false;
  for (const def of Object.values(payload.slots ?? {})) {
    if (patchSkusItemFieldsInTree(def?.itemFields)) changed = true;
  }
  if (migratePayloadValues(payload)) changed = true;
  if (changed && write) {
    writeFileSync(payloadPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  }
  return changed;
}

function patchRepeatBinding(repeat) {
  if (!repeat || repeat.mode !== "collection") return false;
  let changed = false;
  if (repeat.itemPath === "skus") {
    if (!skuFieldsEqual(repeat.itemFields ?? [], SKU_FIELDS)) {
      repeat.itemFields = structuredClone(SKU_FIELDS);
      changed = true;
    }
  }
  if (patchSkusItemFieldsInTree(repeat.itemFields)) changed = true;
  return changed;
}

function walkNestedTemplateNode(node) {
  let changed = false;
  if (patchRepeatBinding(node?.repeat)) changed = true;
  for (const child of node?.children ?? []) {
    if (walkNestedTemplateNode(child)) changed = true;
  }
  return changed;
}

function walkFlatTemplateBlocks(blocks) {
  let changed = false;
  for (const block of Object.values(blocks ?? {})) {
    if (patchRepeatBinding(block?.repeat)) changed = true;
  }
  return changed;
}

function migrateTemplateFile(templatePath) {
  const template = JSON.parse(readFileSync(templatePath, "utf8"));
  let changed = false;
  if (template.root) {
    if (walkNestedTemplateNode(template.root)) changed = true;
  }
  if (template.blocks) {
    if (walkFlatTemplateBlocks(template.blocks)) changed = true;
  }
  if (changed && write) {
    writeFileSync(templatePath, `${JSON.stringify(template, null, 2)}\n`, "utf8");
  }
  return changed;
}

function listEmailJsonFiles() {
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      const st = statSync(p, { throwIfNoEntry: false });
      if (!st) continue;
      if (st.isDirectory()) walk(p);
      else if (name === "payload.json" || name === "template.json") out.push(p);
    }
  };
  walk(EMAILS_DIR);
  return out;
}

let payloadCount = 0;
let templateCount = 0;
for (const filePath of listEmailJsonFiles()) {
  if (filePath.endsWith("payload.json") && migratePayloadFile(filePath)) {
    console.log(write ? "已迁移 payload" : "待迁移 payload", filePath);
    payloadCount++;
  }
  if (filePath.endsWith("template.json") && migrateTemplateFile(filePath)) {
    console.log(write ? "已迁移 template" : "待迁移 template", filePath);
    templateCount++;
  }
}
console.log(
  write
    ? `完成：payload ${payloadCount}、template ${templateCount}`
    : `预览：payload ${payloadCount}、template ${templateCount}（加 --write 落盘）`
);
