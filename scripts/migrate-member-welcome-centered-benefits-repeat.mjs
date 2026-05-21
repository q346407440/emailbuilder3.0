#!/usr/bin/env node
/**
 * member-welcome / centered：将权益区从「静态 5 行 + 下标 slotPath」迁为列表重复（repeat）。
 *
 * 用法：node scripts/migrate-member-welcome-centered-benefits-repeat.mjs [--write]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const TEMPLATE_PATH = join(
  ROOT,
  "data/emails/member-welcome/layouts/centered/template.json"
);
const WRITE = process.argv.includes("--write");

const RENAME = {
  "mwc-benefit-row-1": "mwc-benefit-row",
  "mwc-benefit-icon-wrap-1": "mwc-benefit-icon-wrap",
  "mwc-benefit-icon-1": "mwc-benefit-icon",
  "mwc-benefit-text-col-1": "mwc-benefit-text-col",
  "mwc-benefit-title-1": "mwc-benefit-title",
  "mwc-benefit-sub-1": "mwc-benefit-sub",
};

const DELETE_ID =
  /^mwc-benefit-(?:row|icon-wrap|icon|text-col|title|sub)-[2-5]$/;

const MEMBER_BENEFITS_REPEAT = {
  mode: "collection",
  slotId: "memberBenefits",
  prototypeChildIds: ["mwc-benefit-row"],
  fallbackChildIds: ["mwc-benefit-row"],
  itemFields: [
    { key: "title", label: "权益标题", valueType: "string", required: true },
    { key: "subtitle", label: "权益说明", valueType: "string", required: true },
    { key: "iconSrc", label: "图标地址", valueType: "image", required: true },
  ],
  minItems: 5,
  maxItems: 5,
  label: "会员权益列表",
  description: "权益项：图标、标题与说明文案。",
};

function mapBlockId(id) {
  if (typeof id !== "string") return id;
  if (DELETE_ID.test(id)) return null;
  return RENAME[id] ?? id;
}

function walkReplaceIds(value) {
  if (typeof value === "string") {
    const next = mapBlockId(value);
    return next === null ? value : next;
  }
  if (Array.isArray(value)) {
    const out = [];
    for (const item of value) {
      if (typeof item === "string") {
        const next = mapBlockId(item);
        if (next !== null) out.push(next);
      } else {
        out.push(walkReplaceIds(item));
      }
    }
    return out;
  }
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = walkReplaceIds(v);
    }
    return out;
  }
  return value;
}

function migrateTemplate(template) {
  if (template.blocks["mwc-benefits-list"]?.repeat?.slotId === "memberBenefits") {
    return { changed: false, reason: "已迁移（存在 mwc-benefits-list.repeat）" };
  }

  const next = structuredClone(template);

  for (const id of Object.keys(next.blocks)) {
    if (DELETE_ID.test(id)) delete next.blocks[id];
  }

  const renamedBlocks = {};
  for (const [id, block] of Object.entries(next.blocks)) {
    const newId = mapBlockId(id);
    if (!newId || newId === null) continue;
    const blockCopy = walkReplaceIds(block);
    blockCopy.id = newId;
    renamedBlocks[newId] = blockCopy;
  }
  next.blocks = renamedBlocks;

  if (next.blockMeta) {
    const meta = {};
    for (const [id, entry] of Object.entries(next.blockMeta)) {
      const newId = mapBlockId(id);
      if (!newId || DELETE_ID.test(id)) continue;
      meta[newId] = { ...entry };
    }
    meta["mwc-benefits-list"] = {
      blockType: "layout.container",
      name: "权益列表（重复）",
    };
    if (meta["mwc-benefit-row"]) {
      meta["mwc-benefit-row"] = {
        ...meta["mwc-benefit-row"],
        name: "权益行",
      };
    }
    if (meta["mwc-benefit-icon-wrap"]) {
      meta["mwc-benefit-icon-wrap"] = {
        ...meta["mwc-benefit-icon-wrap"],
        name: "权益图标底",
      };
    }
    if (meta["mwc-benefit-icon"]) {
      meta["mwc-benefit-icon"] = { ...meta["mwc-benefit-icon"], name: "权益图标" };
    }
    if (meta["mwc-benefit-text-col"]) {
      meta["mwc-benefit-text-col"] = {
        ...meta["mwc-benefit-text-col"],
        name: "权益文案列",
      };
    }
    if (meta["mwc-benefit-title"]) {
      meta["mwc-benefit-title"] = { ...meta["mwc-benefit-title"], name: "权益标题" };
    }
    if (meta["mwc-benefit-sub"]) {
      meta["mwc-benefit-sub"] = { ...meta["mwc-benefit-sub"], name: "权益说明" };
    }
    next.blockMeta = meta;
  }

  const mod = next.blocks["mwc-mod-benefits"];
  if (!mod) throw new Error("缺少 mwc-mod-benefits");
  mod.children = ["mwc-benefits-title", "mwc-benefits-list"];

  const row = next.blocks["mwc-benefit-row"];
  if (!row) throw new Error("缺少 mwc-benefit-row（迁移后行模板）");
  row.parentId = "mwc-benefits-list";

  next.blocks["mwc-benefits-list"] = {
    id: "mwc-benefits-list",
    type: "layout",
    parentId: "mwc-mod-benefits",
    children: ["mwc-benefit-row"],
    repeat: MEMBER_BENEFITS_REPEAT,
    wrapperStyle: {
      contentAlign: { horizontal: "left", vertical: "top" },
      widthMode: "fill",
      heightMode: "hug",
      border: {
        mode: "unified",
        width: "0",
        style: "solid",
        color: "rgba(0,0,0,0)",
      },
      borderRadius: { mode: "unified", radius: "0" },
    },
    props: {
      direction: "vertical",
      gapMode: "fixed",
      gap: { $themeRef: "tokens.spacing.gap" },
    },
    bindings: {
      "props.gap": {
        slotId: "tokens.spacing.gap",
        mode: "theme",
        tokenPath: "tokens.spacing.gap",
        fieldKind: "style",
      },
    },
  };

  return { changed: true, next };
}

const template = JSON.parse(readFileSync(TEMPLATE_PATH, "utf8"));
const result = migrateTemplate(template);

if (!result.changed) {
  console.log(result.reason ?? "无需变更");
  process.exit(0);
}

console.log(`${WRITE ? "写入" : "预览"} ${TEMPLATE_PATH}`);
console.log("  - 删除权益行 2–5 及子树");
console.log("  - 行模板重命名为 mwc-benefit-row 等");
console.log("  - 新增 mwc-benefits-list（repeat · memberBenefits）");

if (WRITE) {
  writeFileSync(TEMPLATE_PATH, `${JSON.stringify(result.next, null, 2)}\n`, "utf8");
}
