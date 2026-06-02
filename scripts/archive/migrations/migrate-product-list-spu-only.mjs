#!/usr/bin/env node
/**
 * 商品列表变量层废弃 sku 扁平行：归一化 productConfig 为 spu，清除 skuSelection。
 * 用法：node scripts/migrate-product-list-spu-only.mjs [--write]
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const EMAILS_DIR = join(resolve(__dirname, "../../.."), "data", "emails");
const write = process.argv.includes("--write");

function listPayloadPaths() {
  return readdirSync(EMAILS_DIR)
    .map((name) => join(EMAILS_DIR, name, "payload.json"))
    .filter((p) => statSync(p, { throwIfNoEntry: false })?.isFile());
}

function migrateProductConfig(pc) {
  if (!pc || typeof pc !== "object") return pc;
  const next = { ...pc };
  if (next.rowGranularity === "sku") {
    if (!Array.isArray(next.selectedSpuIds) || next.selectedSpuIds.length === 0) {
      const spuIds = new Set();
      for (const key of next.skuSelection ?? []) {
        if (typeof key !== "string") continue;
        const idx = key.indexOf("::");
        if (idx > 0) spuIds.add(key.slice(0, idx));
      }
      next.selectedSpuIds = [...spuIds];
    }
  }
  next.rowGranularity = "spu";
  delete next.skuSelection;
  return next;
}

function migratePayload(payloadPath) {
  const payload = JSON.parse(readFileSync(payloadPath, "utf8"));
  if (!payload?.slots) return false;
  let changed = false;
  for (const def of Object.values(payload.slots)) {
    const ds = def?.dataSource;
    if (ds?.type !== "remote" || ds.provider !== "builtin" || ds.catalog !== "products") continue;
    if (!ds.productConfig) continue;
    const migrated = migrateProductConfig(ds.productConfig);
    if (JSON.stringify(migrated) !== JSON.stringify(ds.productConfig)) {
      ds.productConfig = migrated;
      changed = true;
    }
  }
  if (changed && write) {
    writeFileSync(payloadPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  }
  return changed;
}

let count = 0;
for (const payloadPath of listPayloadPaths()) {
  if (migratePayload(payloadPath)) {
    console.log(write ? "已迁移" : "待迁移", payloadPath);
    count++;
  }
}
console.log(write ? `完成，共 ${count} 个 payload` : `预览：共 ${count} 个 payload 需迁移（加 --write 落盘）`);
