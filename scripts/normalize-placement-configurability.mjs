#!/usr/bin/env node
/**
 * 清除无效的 wrapperStyle.placement（与 resolvePlacementSemantics / validate 一致）。
 * 用法：npx tsx scripts/normalize-placement-configurability.mjs [--write]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listEmailTemplatePaths } from "./lib/list-email-template-paths.mjs";
import { normalizeTemplatePlacement } from "../src/lib/placementConfigurability.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, "..");
const write = process.argv.includes("--write");

const paths = listEmailTemplatePaths(path.join(REPO, "data", "emails"));
let totalChanges = 0;

for (const tplPath of paths) {
  const raw = JSON.parse(fs.readFileSync(tplPath, "utf8"));
  const { template, changes } = normalizeTemplatePlacement(raw);
  if (changes.length === 0) continue;
  totalChanges += changes.length;
  const rel = path.relative(REPO, tplPath);
  console.log(`${rel}: ${changes.length} 处`);
  for (const id of changes.slice(0, 8)) console.log(`  · ${id}`);
  if (changes.length > 8) console.log(`  · …共 ${changes.length} 个区块`);
  if (write) fs.writeFileSync(tplPath, `${JSON.stringify(template, null, 2)}\n`, "utf8");
}

if (totalChanges === 0) {
  console.log("\n未发现无效 placement。");
} else if (!write) {
  console.log(`\n预览：${totalChanges} 处将清除无效 placement。执行：npx tsx scripts/normalize-placement-configurability.mjs --write`);
} else {
  console.log(`\n已写入，共清理 ${totalChanges} 处。请运行：npm run validate:all`);
}
