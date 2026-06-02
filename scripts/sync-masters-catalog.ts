#!/usr/bin/env node
/**
 * 同步 data/masters/blocks 下 block 母版 JSON（由 block-contract 目录生成）。
 * 用法：npm run sync:masters
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { BlockMaster } from "../src/types/master";
import { buildBlockMasters, collectMasterValidationIssues } from "../src/lib/masterCatalog";
import { serializeEditorMasterToDisk } from "../src/lib/templateTreeAdapter";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const BLOCK_DIR = join(ROOT, "data", "masters", "blocks");

mkdirSync(BLOCK_DIR, { recursive: true });

function writeMaster(dir: string, master: BlockMaster) {
  const filePath = join(dir, `${master.masterId}.json`);
  writeFileSync(filePath, `${JSON.stringify(serializeEditorMasterToDisk(master), null, 2)}\n`, "utf8");
  return filePath;
}

const blockMasters = buildBlockMasters();
const blockIssues: string[] = [];
for (const master of blockMasters) {
  const issues = collectMasterValidationIssues(master);
  if (issues.length) {
    blockIssues.push(`${master.masterId}: ${issues.map((i) => `${i.path} ${i.reason}`).join("; ")}`);
  }
  writeMaster(BLOCK_DIR, master);
}

console.log(`已写入 ${blockMasters.length} 个 block 母版。`);

if (blockIssues.length) {
  console.error("\n校验未通过：");
  for (const line of blockIssues) console.error(`  - ${line}`);
  process.exit(1);
}
