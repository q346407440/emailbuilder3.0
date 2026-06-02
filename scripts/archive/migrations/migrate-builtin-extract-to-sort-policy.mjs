#!/usr/bin/env node
/**
 * 将 payload.slots 中 builtin 列表的 extract（similarTo/complement）迁移为 sort 策略对象。
 *
 * 用法：node scripts/migrate-builtin-extract-to-sort-policy.mjs [--write]
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../../..");
const EMAILS_DIR = join(ROOT, "data", "emails");
const WRITE = process.argv.includes("--write");

function migratePayload(payloadPath) {
  const payload = JSON.parse(readFileSync(payloadPath, "utf8"));
  if (!payload.slots || typeof payload.slots !== "object") return { changed: false };

  let changed = false;
  const slots = { ...payload.slots };

  for (const [slotId, def] of Object.entries(slots)) {
    if (!def || def.valueType !== "collection") continue;
    const ds = def.dataSource;
    if (ds?.type !== "remote" || ds.provider !== "builtin") continue;

    const extract = ds.extract;
    if (!extract || (extract.kind !== "similarTo" && extract.kind !== "complement")) continue;

    const fromSlotId = extract.fromSlotId?.trim();
    if (!fromSlotId) continue;

    const nextDs = { ...ds };
    nextDs.sort = {
      strategy: extract.kind,
      targetSlotId: fromSlotId,
    };
    delete nextDs.extract;
    slots[slotId] = { ...def, dataSource: nextDs };
    changed = true;
  }

  if (!changed) return { changed: false };
  return { changed: true, next: { ...payload, slots } };
}

let total = 0;
for (const emailDir of readdirSync(EMAILS_DIR)) {
  const dirPath = join(EMAILS_DIR, emailDir);
  if (!statSync(dirPath).isDirectory()) continue;
  const payloadPath = join(dirPath, "payload.json");
  if (!statSync(payloadPath, { throwIfNoEntry: false })?.isFile()) continue;
  const result = migratePayload(payloadPath);
  if (!result.changed) continue;
  total++;
  console.log(`${WRITE ? "写入" : "预览"} ${emailDir}/payload.json`);
  if (WRITE) {
    writeFileSync(payloadPath, `${JSON.stringify(result.next, null, 2)}\n`, "utf8");
  }
}

console.log(`${WRITE ? "已迁移" : "待迁移"} ${total} 个 payload.json`);
