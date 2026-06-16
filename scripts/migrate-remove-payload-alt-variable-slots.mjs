/**
 * 从全仓库 payload / template 剥离 *Alt 标量变量槽；从母版节 JSON 剥离 backgroundImage.alt。
 *
 *   npm run migrate:remove-payload-alt-slots
 *   npm run migrate:remove-payload-alt-slots:write
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { enumerateAllEmailTemplatePaths } from "../src/lib/emailLayoutVariant";
import { parseTemplateFromDisk, serializeTemplateToDisk } from "../src/lib/templateTreeAdapter";
import {
  stripAltVariableSlotsFromPayload,
  stripAltVariableSlotsFromTemplate,
  stripBackgroundImageAltDeep,
} from "../src/lib/stripPayloadAltVariableSlots";

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

function listMasterSectionPaths(root) {
  const out = [];
  if (!statSync(root, { throwIfNoEntry: false })) return out;
  for (const entry of readdirSync(root)) {
    if (!entry.endsWith(".json")) continue;
    out.push(join(root, entry));
  }
  return out.sort();
}

function main() {
  const args = process.argv.slice(2);
  const shouldWrite = args.includes("--write");
  const changedFiles = [];

  const emailsDir = resolve(REPO_ROOT, "data", "emails");
  for (const file of listPayloadPaths(emailsDir)) {
    const payload = JSON.parse(readFileSync(file, "utf8"));
    if (!stripAltVariableSlotsFromPayload(payload)) continue;
    changedFiles.push(file);
    if (shouldWrite) {
      writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    }
  }

  for (const file of enumerateAllEmailTemplatePaths(emailsDir)) {
    const graph = parseTemplateFromDisk(JSON.parse(readFileSync(file, "utf8")));
    if (!stripAltVariableSlotsFromTemplate(graph)) continue;
    changedFiles.push(file);
    if (shouldWrite) {
      writeFileSync(file, `${JSON.stringify(serializeTemplateToDisk(graph), null, 2)}\n`, "utf8");
    }
  }

  const mastersDir = resolve(REPO_ROOT, "data", "masters", "sections");
  for (const file of listMasterSectionPaths(mastersDir)) {
    const doc = JSON.parse(readFileSync(file, "utf8"));
    const result = stripBackgroundImageAltDeep(doc);
    if (!result.changed) continue;
    changedFiles.push(file);
    if (shouldWrite) {
      writeFileSync(file, `${JSON.stringify(result.value, null, 2)}\n`, "utf8");
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
