#!/usr/bin/env node
/**
 * 同步 data/masters/blocks 与 data/masters/sections 母版 JSON。
 * 用法：npm run sync:masters
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { EmailTemplate } from "../src/types/email";
import { buildBlockMasters, collectMasterValidationIssues } from "../src/lib/masterCatalog";
import { extractSectionMasterFromTemplate, OCA_SECTION_SOURCES } from "../src/lib/sectionExtract";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const BLOCK_DIR = join(ROOT, "data", "masters", "blocks");
const SECTION_DIR = join(ROOT, "data", "masters", "sections");
const OCA_TEMPLATE_PATH = join(ROOT, "data", "emails", "on-cart-abandon-2", "template.json");

mkdirSync(BLOCK_DIR, { recursive: true });
mkdirSync(SECTION_DIR, { recursive: true });

function writeMaster(dir: string, master: Record<string, unknown>) {
  const filePath = join(dir, `${master.masterId}.json`);
  writeFileSync(filePath, `${JSON.stringify(master, null, 2)}\n`, "utf8");
  return filePath;
}

const blockMasters = buildBlockMasters();
const blockIssues: string[] = [];
for (const master of blockMasters) {
  const issues = collectMasterValidationIssues(master);
  if (issues.length) {
    blockIssues.push(`${master.masterId}: ${issues.map((i) => `${i.path} ${i.reason}`).join("; ")}`);
  }
  writeMaster(BLOCK_DIR, master as unknown as Record<string, unknown>);
}

const ocaTemplate = JSON.parse(readFileSync(OCA_TEMPLATE_PATH, "utf8")) as EmailTemplate;
const sectionIssues: string[] = [];
for (const spec of OCA_SECTION_SOURCES) {
  const master = extractSectionMasterFromTemplate(ocaTemplate, spec);
  const issues = collectMasterValidationIssues(master);
  if (issues.length) {
    sectionIssues.push(`${master.masterId}: ${issues.map((i) => `${i.path} ${i.reason}`).join("; ")}`);
  }
  writeMaster(SECTION_DIR, master as unknown as Record<string, unknown>);
}

console.log(`已写入 ${blockMasters.length} 个 block 母版、${OCA_SECTION_SOURCES.length} 个 section 母版。`);

if (blockIssues.length || sectionIssues.length) {
  console.error("\n校验未通过：");
  for (const line of [...blockIssues, ...sectionIssues]) console.error(`  - ${line}`);
  process.exit(1);
}
