#!/usr/bin/env node
/**
 * 清理 wrapperStyle.selfAlign 非法 horizontal，并移除 emailRoot 上的 selfAlign。
 * 读写经 templateTreeAdapter（nested 4.0.0 落盘）。
 *
 * 用法：npm run migrate:self-align [-- --write]
 */
import { readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readTemplateDisk, writeTemplateDisk } from "../../lib/template-disk-io.mjs";
import { listEmailTemplatePaths } from "../../lib/list-email-template-paths.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO = resolve(__dirname, "../../..");
const EMAILS_DIR = join(REPO, "data", "emails");
const write = process.argv.includes("--write");

function isValidHorizontalAlign(value) {
  return value === "left" || value === "center" || value === "right";
}

function ensureObject(value) {
  return value && typeof value === "object" ? value : {};
}

function listTemplatePaths() {
  return listEmailTemplatePaths(EMAILS_DIR);
}

function migrateGraph(graph) {
  let changed = false;
  let blockCount = 0;

  for (const block of Object.values(graph.blocks)) {
    if (!block || typeof block !== "object") continue;
    blockCount += 1;

    const wrapperStyle = ensureObject(block.wrapperStyle);
    if (wrapperStyle !== block.wrapperStyle) {
      block.wrapperStyle = wrapperStyle;
      changed = true;
    }

    if (block.type === "emailRoot") {
      if (wrapperStyle.selfAlign !== undefined) {
        delete wrapperStyle.selfAlign;
        changed = true;
      }
      continue;
    }

    const selfAlign = ensureObject(wrapperStyle.selfAlign);
    if (selfAlign !== wrapperStyle.selfAlign) {
      wrapperStyle.selfAlign = selfAlign;
      changed = true;
    }

    if (!isValidHorizontalAlign(selfAlign.horizontal)) {
      selfAlign.horizontal = "center";
      changed = true;
    }
  }

  return { changed, blockCount };
}

let updatedCount = 0;
const paths = listTemplatePaths();
for (const filePath of paths) {
  const { graph, ctx } = readTemplateDisk(filePath);
  const { changed, blockCount } = migrateGraph(graph);
  if (!changed) {
    console.log(`- 无变化 ${filePath}（${blockCount} 个 block）`);
    continue;
  }
  updatedCount += 1;
  if (write) writeTemplateDisk(filePath, graph, ctx);
  console.log(`- ${write ? "已更新" : "待更新"} ${filePath}（${blockCount} 个 block）`);
}

console.log(`\n迁移完成：共 ${paths.length} 个模板，${write ? "已更新" : "待更新"} ${updatedCount} 个。`);
if (updatedCount > 0 && !write) process.exitCode = 1;
