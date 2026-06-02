#!/usr/bin/env node
/**
 * 为 payload.slots 中所有 collection 槽补充 dataSource（默认 custom）并规范化 min/max 固定长度。
 *
 * 用法：node scripts/migrate-collection-data-sources.mjs [--write]
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../../..");
const EMAILS_DIR = join(ROOT, "data", "emails");
const WRITE = process.argv.includes("--write");

function listEmailDirs() {
  return readdirSync(EMAILS_DIR)
    .map((name) => join(EMAILS_DIR, name))
    .filter((p) => statSync(p).isDirectory());
}

function migratePayload(payloadPath) {
  const payload = JSON.parse(readFileSync(payloadPath, "utf8"));
  if (!payload.slots || typeof payload.slots !== "object") return { changed: false };

  let changed = false;
  const slots = { ...payload.slots };

  for (const [slotId, def] of Object.entries(slots)) {
    if (!def || def.valueType !== "collection") continue;
    const next = { ...def };

    if (!next.dataSource) {
      next.dataSource = { type: "custom" };
      changed = true;
    }

    const len =
      next.minItems !== undefined &&
      next.maxItems !== undefined &&
      next.minItems === next.maxItems
        ? next.minItems
        : next.maxItems ?? next.minItems;

    if (len !== undefined && Number.isInteger(len) && len >= 1 && len <= 10) {
      if (next.minItems !== len || next.maxItems !== len) {
        next.minItems = len;
        next.maxItems = len;
        changed = true;
      }
    }

    slots[slotId] = next;
  }

  if (!changed) return { changed: false };
  return {
    changed: true,
    next: { ...payload, slots },
  };
}

let total = 0;
for (const emailDir of listEmailDirs()) {
  const payloadPath = join(emailDir, "payload.json");
  if (!statSync(payloadPath, { throwIfNoEntry: false })?.isFile()) continue;
  const result = migratePayload(payloadPath);
  if (!result.changed) continue;
  total++;
  const emailKey = emailDir.split("/").pop();
  console.log(`${WRITE ? "写入" : "预览"} ${emailKey}/payload.json`);
  if (WRITE) {
    writeFileSync(payloadPath, `${JSON.stringify(result.next, null, 2)}\n`, "utf8");
  }
}

console.log(`${WRITE ? "已迁移" : "待迁移"} ${total} 个 payload.json`);
