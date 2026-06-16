/**
 * 从全仓库 payload / template / 场景预设剥离列表变量 imageAlt、coverAlt 等替代文字列。
 *
 *   npm run migrate:remove-collection-image-alt
 *   npm run migrate:remove-collection-image-alt:write
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { enumerateAllEmailTemplatePaths } from "../src/lib/emailLayoutVariant";
import { parseTemplateFromDisk, serializeTemplateToDisk } from "../src/lib/templateTreeAdapter";
import {
  stripImageAltDeep,
  stripImageAltFromItemFields,
  stripImageAltFromPayload,
  stripImageAltFromTemplate,
} from "../src/lib/stripCollectionImageAltField";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");

function listPayloadPaths(emailsDir) {
  const out = [];
  for (const entry of readdirSync(emailsDir)) {
    const emailDir = join(emailsDir, entry);
    if (!statSync(emailDir).isDirectory()) continue;
    const payloadPath = join(emailDir, "payload.json");
    try {
      statSync(payloadPath);
      out.push(payloadPath);
    } catch {
      // 无 payload 的邮件目录跳过
    }
  }
  return out.sort();
}

function listScenePresetPaths(root) {
  const out = [];
  function walk(dir) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (entry.endsWith(".json")) out.push(full);
    }
  }
  walk(root);
  return out.sort();
}

function stripScenePreset(doc) {
  let changed = false;
  if (Array.isArray(doc.itemFields)) {
    const result = stripImageAltFromItemFields(doc.itemFields);
    if (result.changed) {
      doc.itemFields = result.fields;
      changed = true;
    }
  }
  if (Array.isArray(doc.seedValues)) {
    const result = stripImageAltDeep(doc.seedValues);
    if (result.changed) {
      doc.seedValues = result.value;
      changed = true;
    }
  }
  return changed;
}

function main() {
  const args = process.argv.slice(2);
  const shouldWrite = args.includes("--write");
  const changedFiles = [];

  const emailsDir = resolve(REPO_ROOT, "data", "emails");
  for (const file of listPayloadPaths(emailsDir)) {
    const payload = JSON.parse(readFileSync(file, "utf8"));
    if (!stripImageAltFromPayload(payload)) continue;
    changedFiles.push(file);
    if (shouldWrite) {
      writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    }
  }

  for (const file of enumerateAllEmailTemplatePaths(emailsDir)) {
    const graph = parseTemplateFromDisk(JSON.parse(readFileSync(file, "utf8")));
    if (!stripImageAltFromTemplate(graph)) continue;
    changedFiles.push(file);
    if (shouldWrite) {
      writeFileSync(file, `${JSON.stringify(serializeTemplateToDisk(graph), null, 2)}\n`, "utf8");
    }
  }

  const presetsDir = resolve(REPO_ROOT, "data", "scene-collection-presets");
  for (const file of listScenePresetPaths(presetsDir)) {
    const doc = JSON.parse(readFileSync(file, "utf8"));
    if (!stripScenePreset(doc)) continue;
    changedFiles.push(file);
    if (shouldWrite) {
      writeFileSync(file, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
    }
  }

  if (changedFiles.length === 0) {
    console.log("无变更");
    return;
  }
  console.log(shouldWrite ? "已写入：" : "将变更（加 --write）：");
  for (const file of changedFiles) {
    console.log(`  ${relative(REPO_ROOT, file)}`);
  }
}

main();
