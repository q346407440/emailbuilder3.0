#!/usr/bin/env node
/**
 * 移除 template 中标量 variable / interpolate 原子槽上的 defaultValue。
 * 赋值真源：payload.values（迁移前若缺键则从 binding 抄入 payload）。
 *
 * 用法：
 *   tsx scripts/migrate-prune-scalar-binding-default-value.mjs [--write]
 */
import { readFileSync, writeFileSync, statSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readTemplateDisk, writeTemplateDisk } from "../../lib/template-disk-io.mjs";
import { enumerateAllEmailTemplatePaths } from "../../../src/lib/emailLayoutVariant.ts";
import { PAYLOAD_SCHEMA_VERSION } from "../../../src/payload-contract/types.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../../..");
const EMAILS_DIR = join(ROOT, "data/emails");
const WRITE = process.argv.includes("--write");

const SCALAR_VALUE_TYPES = new Set(["string", "url", "image", "color", "number", "boolean"]);

function emailDirFromTemplatePath(templatePath) {
  const rel = templatePath.replace(`${ROOT}/`, "");
  const parts = rel.split("/");
  const idx = parts.indexOf("emails");
  if (idx < 0 || !parts[idx + 1]) return null;
  return join(EMAILS_DIR, parts[idx + 1]);
}

function isScalarVariableBinding(spec) {
  return (
    spec?.mode === "variable" &&
    spec.allowExternal === true &&
    spec.valueType !== "collection" &&
    SCALAR_VALUE_TYPES.has(spec.valueType ?? "string")
  );
}

function migrateTemplate(template, values, valuePatches) {
  const next = structuredClone(template);
  let changed = false;
  const stripped = [];

  for (const [blockId, block] of Object.entries(next.blocks ?? {})) {
    if (!block.bindings) continue;

    for (const [bindPath, spec] of Object.entries(block.bindings)) {
      if (isScalarVariableBinding(spec) && spec.defaultValue !== undefined) {
        const slotId = spec.slotId;
        if (values[slotId] === undefined && valuePatches[slotId] === undefined) {
          valuePatches[slotId] = spec.defaultValue;
        }
        delete spec.defaultValue;
        changed = true;
        stripped.push(`${blockId}.${bindPath} (${slotId})`);
        continue;
      }

      if (spec.mode === "interpolate" && Array.isArray(spec.interpolationSlots)) {
        for (let i = 0; i < spec.interpolationSlots.length; i++) {
          const slot = spec.interpolationSlots[i];
          if (slot.allowExternal !== true || slot.defaultValue === undefined) continue;
          const slotId = slot.slotId;
          if (values[slotId] === undefined && valuePatches[slotId] === undefined) {
            valuePatches[slotId] = slot.defaultValue;
          }
          const { defaultValue: _omit, ...rest } = slot;
          spec.interpolationSlots[i] = rest;
          changed = true;
          stripped.push(`${blockId}.${bindPath}.interpolationSlots[${i}] (${slotId})`);
        }
      }
    }
  }

  return { changed, next, stripped };
}

function main() {
  const paths = enumerateAllEmailTemplatePaths(EMAILS_DIR);
  const byEmail = new Map();
  for (const absPath of paths) {
    const dir = emailDirFromTemplatePath(absPath);
    if (!dir) continue;
    if (!byEmail.has(dir)) byEmail.set(dir, []);
    byEmail.get(dir).push(absPath);
  }

  let templateWriteCount = 0;
  let payloadWriteCount = 0;

  for (const [emailDir, templatePaths] of [...byEmail.entries()].sort((a, b) =>
    a[0].localeCompare(b[0])
  )) {
    const emailKey = emailDir.split("/").pop();
    const payloadPath = join(emailDir, "payload.json");
    if (!statSync(payloadPath, { throwIfNoEntry: false })?.isFile()) {
      console.log(`[skip] ${emailKey}: 无 payload.json`);
      continue;
    }

    const payload = JSON.parse(readFileSync(payloadPath, "utf8"));
    const values = { ...(payload.values ?? {}) };
    const valuePatches = {};
    let emailTemplateChanges = 0;

    for (const absPath of templatePaths) {
      const rel = absPath.replace(`${ROOT}/`, "");
      const { graph, ctx } = readTemplateDisk(absPath);
      const result = migrateTemplate(graph, values, valuePatches);

      if (!result.changed) {
        console.log(`[skip] ${rel}`);
        continue;
      }

      emailTemplateChanges += 1;
      console.log(`[${WRITE ? "write" : "dry"}] ${rel}（移除 ${result.stripped.length} 处 defaultValue）`);
      for (const line of result.stripped.slice(0, 8)) {
        console.log(`  - ${line}`);
      }
      if (result.stripped.length > 8) {
        console.log(`  ... +${result.stripped.length - 8} 处`);
      }

      if (WRITE) {
        writeTemplateDisk(absPath, result.next, ctx);
      }
    }

    const patchKeys = Object.keys(valuePatches);
    if (patchKeys.length > 0) {
      console.log(
        `[${WRITE ? "write" : "dry"}] ${emailKey}/payload.json：补写 ${patchKeys.length} 个 values 键`
      );
      for (const key of patchKeys) {
        values[key] = valuePatches[key];
      }
    }

    if (emailTemplateChanges > 0 || patchKeys.length > 0) {
      templateWriteCount += emailTemplateChanges;
      if (patchKeys.length > 0 && WRITE) {
        const nextPayload = {
          ...payload,
          schemaVersion: payload.schemaVersion ?? PAYLOAD_SCHEMA_VERSION,
          values,
        };
        writeFileSync(payloadPath, `${JSON.stringify(nextPayload, null, 2)}\n`, "utf8");
        payloadWriteCount += 1;
      }
    }
  }

  console.log(
    templateWriteCount === 0 && payloadWriteCount === 0
      ? "无需变更"
      : WRITE
        ? `完成：${templateWriteCount} 个 template、${payloadWriteCount} 个 payload 已写入`
        : `预览：${templateWriteCount} 个 template 待写入（加 --write）`
  );
}

main();
