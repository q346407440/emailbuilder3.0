#!/usr/bin/env node
/**
 * 容器 width/height hug 但子级无尺寸锚点 → fill（与 wrapperHugConstraint 同规则）。
 *
 *   npm run migrate:container-hug-without-child-anchor
 *   npm run migrate:container-hug-without-child-anchor:write
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { enumerateAllEmailTemplatePaths } from "../src/lib/emailLayoutVariant.ts";
import {
  readTemplateGraphFromDiskRaw,
  serializeTemplateToDisk,
} from "../src/lib/templateTreeAdapter.ts";
import { reconcileTemplateWrapperStyles } from "../src/lib/wrapperLayoutReconcile.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");

function migrateContainerHugOnDisk(raw) {
  const graph = readTemplateGraphFromDiskRaw(raw);
  const { template, changes } = reconcileTemplateWrapperStyles(graph);
  const hugChanges = changes.filter((c) => c.reasonCode === "hug_blocked_by_missing_child_anchor");
  return {
    changed: hugChanges.length > 0,
    fixes: hugChanges,
    disk: hugChanges.length > 0 ? serializeTemplateToDisk(template) : raw,
  };
}

function main() {
  const shouldWrite = process.argv.includes("--write");
  const emailsDir = resolve(REPO_ROOT, "data", "emails");
  const files = enumerateAllEmailTemplatePaths(emailsDir);
  const changedFiles = [];
  let changeCount = 0;

  for (const file of files) {
    const raw = JSON.parse(readFileSync(file, "utf8"));
    const { changed, fixes, disk } = migrateContainerHugOnDisk(raw);
    if (!changed) continue;
    changedFiles.push({ file, fixes });
    changeCount += fixes.length;
    if (shouldWrite) {
      writeFileSync(file, `${JSON.stringify(disk, null, 2)}\n`, "utf8");
    }
  }

  if (changedFiles.length === 0) {
    console.log("无变更：无容器 hug 缺子级锚点需回落");
    return;
  }
  console.log(shouldWrite ? "已写入：" : "将变更（加 --write 执行写入）：");
  for (const { file, fixes } of changedFiles) {
    const summary = fixes.map((f) => `${f.blockId}.${f.field}`).join(", ");
    console.log(`  ${relative(REPO_ROOT, file)} (${summary})`);
  }
  console.log(`共 ${changedFiles.length} 个 template.json，${changeCount} 处 hug→fill`);
}

main();
