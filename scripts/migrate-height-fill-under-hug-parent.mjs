#!/usr/bin/env node
/**
 * 父级 layout/image heightMode=hug 时，子级 height fill → hug（与 wrapperFillConstraint 同规则；含横排）。
 *
 *   npm run migrate:height-fill-under-hug-parent
 *   npm run migrate:height-fill-under-hug-parent:write
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { enumerateAllEmailTemplatePaths } from "../src/lib/emailLayoutVariant.ts";
import {
  readTemplateGraphFromDiskRaw,
  serializeTemplateToDisk,
} from "../src/lib/templateTreeAdapter.ts";
import { normalizeBlockWrapperDimensionModes } from "../src/lib/wrapperFillConstraint.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");

function normalizeHeightFillUnderHugParentOnDisk(raw) {
  const graph = readTemplateGraphFromDiskRaw(raw);
  const fixes = [];
  let changed = false;
  for (const blockId of Object.keys(graph.blocks)) {
    const result = normalizeBlockWrapperDimensionModes(graph, blockId);
    if (!result.changed) continue;
    const block = graph.blocks[blockId];
    if (!block) continue;
    block.wrapperStyle = result.wrapperStyle;
    changed = true;
    for (const c of result.changes) {
      if (c.axis === "height" && c.from === "fill" && c.to === "hug") {
        fixes.push(blockId);
      }
    }
  }
  return { changed, fixes, disk: changed ? serializeTemplateToDisk(graph) : raw };
}

function main() {
  const shouldWrite = process.argv.includes("--write");
  const emailsDir = resolve(REPO_ROOT, "data", "emails");
  const files = enumerateAllEmailTemplatePaths(emailsDir);
  const changedFiles = [];
  let blockCount = 0;

  for (const file of files) {
    const raw = JSON.parse(readFileSync(file, "utf8"));
    const { changed, fixes, disk } = normalizeHeightFillUnderHugParentOnDisk(raw);
    if (!changed) continue;
    changedFiles.push({ file, fixes });
    blockCount += fixes.length;
    if (shouldWrite) {
      writeFileSync(file, `${JSON.stringify(disk, null, 2)}\n`, "utf8");
    }
  }

  if (changedFiles.length === 0) {
    console.log("无变更：无父 hug + 子 height fill 需回落");
    return;
  }
  console.log(shouldWrite ? "已写入：" : "将变更（加 --write 执行写入）：");
  for (const { file, fixes } of changedFiles) {
    console.log(`  ${relative(REPO_ROOT, file)} (${fixes.join(", ")})`);
  }
  console.log(`共 ${changedFiles.length} 个 template.json，${blockCount} 个子块 height fill→hug`);
}

main();
