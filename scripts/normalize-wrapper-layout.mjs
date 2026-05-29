#!/usr/bin/env node
/**
 * 全量协调 wrapperStyle（fill ↔ contentAlign），与编辑器结构性编辑同一管道。
 * 用法：npx tsx scripts/normalize-wrapper-layout.mjs [--write]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listEmailTemplatePaths } from "./lib/list-email-template-paths.mjs";
import {
  blockIdsFromReconcileChanges,
  reconcileTemplateWrapperStyles,
} from "../src/lib/wrapperLayoutReconcile.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, "..");
const write = process.argv.includes("--write");

const paths = listEmailTemplatePaths(path.join(REPO, "data", "emails"));
let totalBlockTouches = 0;

for (const tplPath of paths) {
  const raw = JSON.parse(fs.readFileSync(tplPath, "utf8"));
  const { template, changes } = reconcileTemplateWrapperStyles(raw);
  const blockIds = blockIdsFromReconcileChanges(changes);
  if (blockIds.length === 0) continue;
  totalBlockTouches += blockIds.length;
  const rel = path.relative(REPO, tplPath);
  console.log(`${rel}: ${blockIds.length} 个区块（${changes.length} 处字段）`);
  for (const id of blockIds.slice(0, 8)) console.log(`  · ${id}`);
  if (blockIds.length > 8) console.log(`  · …共 ${blockIds.length} 个区块`);
  if (write) fs.writeFileSync(tplPath, `${JSON.stringify(template, null, 2)}\n`, "utf8");
}

if (totalBlockTouches === 0) {
  console.log("\n未发现需要协调的 wrapperStyle。");
} else if (!write) {
  console.log(
    `\n预览：${totalBlockTouches} 个区块将协调。执行：npm run normalize:wrapper-layout:write`
  );
} else {
  console.log(`\n已写入，共协调 ${totalBlockTouches} 个区块。请运行：npm run validate:all`);
}
