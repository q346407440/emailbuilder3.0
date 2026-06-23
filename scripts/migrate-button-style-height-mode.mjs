#!/usr/bin/env node
/**
 * 为全仓库 template.json 中所有 button 补齐 props.buttonStyle.heightMode: "hug"（直接改落盘 JSON，不经 normalize）。
 *
 *   npm run migrate:button-style-height-mode
 *   npm run migrate:button-style-height-mode:write
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { enumerateAllEmailTemplatePaths } from "../src/lib/emailLayoutVariant.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");

/** @param {unknown} node */
function walkNestedNodes(node, visit) {
  if (!node || typeof node !== "object" || Array.isArray(node)) return;
  visit(node);
  const children = /** @type {{ children?: unknown[] }} */ (node).children;
  if (!Array.isArray(children)) return;
  for (const child of children) {
    walkNestedNodes(child, visit);
  }
}

/** @param {Record<string, unknown>} disk nested 4.0.0 template.json */
function ensureButtonStyleHeightModeHugOnDisk(disk) {
  let changed = false;
  walkNestedNodes(disk.root, (node) => {
    if (/** @type {{ type?: string }} */ (node).type !== "button") return;
    const props = /** @type {{ props?: Record<string, unknown> }} */ (node).props;
    if (!props || typeof props !== "object" || Array.isArray(props)) return;
    const rawStyle = props.buttonStyle;
    if (!rawStyle || typeof rawStyle !== "object" || Array.isArray(rawStyle)) {
      props.buttonStyle = { heightMode: "hug" };
      changed = true;
      return;
    }
    if (/** @type {{ heightMode?: unknown }} */ (rawStyle).heightMode === undefined) {
      /** @type {{ heightMode: string }} */ (rawStyle).heightMode = "hug";
      changed = true;
    }
  });
  return changed;
}

function main() {
  const shouldWrite = process.argv.includes("--write");
  const emailsDir = resolve(REPO_ROOT, "data", "emails");
  const files = enumerateAllEmailTemplatePaths(emailsDir);
  const changedFiles = [];
  let buttonCount = 0;

  for (const file of files) {
    const disk = JSON.parse(readFileSync(file, "utf8"));
    let fileButtonCount = 0;
    walkNestedNodes(disk.root, (node) => {
      if (/** @type {{ type?: string }} */ (node).type === "button") fileButtonCount += 1;
    });
    if (!ensureButtonStyleHeightModeHugOnDisk(disk)) continue;
    changedFiles.push(file);
    buttonCount += fileButtonCount;
    if (shouldWrite) {
      writeFileSync(file, `${JSON.stringify(disk, null, 2)}\n`, "utf8");
    }
  }

  if (changedFiles.length === 0) {
    console.log("无变更：所有按钮已显式包含 buttonStyle.heightMode");
    return;
  }
  console.log(shouldWrite ? "已写入：" : "将变更（加 --write 执行写入）：");
  for (const file of changedFiles) {
    console.log(`  ${relative(REPO_ROOT, file)}`);
  }
  console.log(`共 ${changedFiles.length} 个 template.json，约 ${buttonCount} 个按钮块`);
}

main();
