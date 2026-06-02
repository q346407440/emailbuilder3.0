#!/usr/bin/env node
/**
 * 从各场景全部版式 template 合并外部变量槽定义，写入 payload.json 的 slots（唯一真源）。
 * 保留已有 payload.slots 中的 label（若存在）；values 中无目录项的键会按值推断类型并补全。
 *
 * 用法：node scripts/migrate-payload-slots-from-templates.mjs [--write]
 */
import { readFileSync, writeFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildUnionExternalSlotRegistry } from "../../../src/payload-contract/slot-registry.ts";
import { enumerateAllEmailTemplatePaths } from "../../../src/lib/emailLayoutVariant.ts";
import { PAYLOAD_SCHEMA_VERSION } from "../../../src/payload-contract/types.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../../..");
const EMAILS_DIR = join(ROOT, "data", "emails");
const WRITE = process.argv.includes("--write");

function inferScalarValueType(value) {
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number" && Number.isFinite(value)) return "number";
  if (typeof value !== "string") return null;
  const t = value.trim();
  if (!t) return "string";
  if (/^mailto:/i.test(t) || /^tel:/i.test(t) || /^https?:\/\//i.test(t)) {
    if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(t)) return "image";
    return "url";
  }
  if (/^#[0-9a-f]{3,8}$/i.test(t) || /^rgba?\(/i.test(t)) return "color";
  return "string";
}

function loadTemplatesForEmail(emailDir) {
  const emailKey = emailDir.split("/").pop();
  const allPaths = enumerateAllEmailTemplatePaths(EMAILS_DIR);
  return allPaths
    .filter((p) => p.includes(`/emails/${emailKey}/`))
    .map((p) => JSON.parse(readFileSync(p, "utf8")));
}

function mergeSlotsFromRegistry(registry, existingSlots, values) {
  const slots = { ...existingSlots };
  for (const [slotId, def] of registry) {
    const prev = slots[slotId];
    slots[slotId] = {
      label: prev?.label?.trim() || def.label?.trim() || slotId,
      valueType: def.valueType,
      ...(def.description || prev?.description
        ? { description: prev?.description ?? def.description }
        : {}),
      ...(def.itemFields?.length ? { itemFields: def.itemFields } : prev?.itemFields ? { itemFields: prev.itemFields } : {}),
      ...(def.minItems !== undefined ? { minItems: def.minItems } : prev?.minItems !== undefined ? { minItems: prev.minItems } : {}),
      ...(def.maxItems !== undefined ? { maxItems: def.maxItems } : prev?.maxItems !== undefined ? { maxItems: prev.maxItems } : {}),
    };
  }
  for (const [slotId, value] of Object.entries(values ?? {})) {
    if (slots[slotId]) continue;
    if (Array.isArray(value)) {
      slots[slotId] = {
        label: slotId,
        valueType: "collection",
      };
      continue;
    }
    const valueType = inferScalarValueType(value);
    if (valueType) {
      slots[slotId] = { label: slotId, valueType };
    }
  }
  return slots;
}

function migrateEmailPayload(emailDir) {
  const payloadPath = join(emailDir, "payload.json");
  if (!statSync(payloadPath, { throwIfNoEntry: false })?.isFile()) return null;
  const templates = loadTemplatesForEmail(emailDir);
  if (templates.length === 0) return null;

  const payload = JSON.parse(readFileSync(payloadPath, "utf8"));
  const registry = buildUnionExternalSlotRegistry(templates);
  const next = {
    schemaVersion: PAYLOAD_SCHEMA_VERSION,
    slots: mergeSlotsFromRegistry(registry, payload.slots ?? {}, payload.values ?? {}),
    values: payload.values ?? {},
    ...(payload.detachedVariableSlotIds?.length
      ? { detachedVariableSlotIds: payload.detachedVariableSlotIds }
      : {}),
  };

  const before = JSON.stringify(payload);
  const after = JSON.stringify(next);
  if (before === after) return { emailKey: emailDir.split("/").pop(), changed: false };

  if (WRITE) {
    writeFileSync(payloadPath, `${JSON.stringify(next, null, 2)}\n`);
  }
  return { emailKey: emailDir.split("/").pop(), changed: true, slotCount: Object.keys(next.slots).length };
}

import { readdirSync } from "node:fs";

const dirs = readdirSync(EMAILS_DIR)
  .map((name) => join(EMAILS_DIR, name))
  .filter((p) => statSync(p).isDirectory());

let changedCount = 0;
for (const dir of dirs) {
  const result = migrateEmailPayload(dir);
  if (!result) continue;
  if (result.changed) {
    changedCount += 1;
    console.log(
      `${WRITE ? "[write]" : "[dry]"} ${result.emailKey}: ${result.slotCount} slots`
    );
  }
}

if (!WRITE) {
  console.log(`\n干跑完成：${changedCount} 个 payload 待写入。加 --write 落盘。`);
} else {
  console.log(`\n已写入 ${changedCount} 个 payload.json`);
}
