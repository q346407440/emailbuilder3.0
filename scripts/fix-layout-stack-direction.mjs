#!/usr/bin/env node
/**
 * 修正「左对齐文案栈」误用横向 layout.direction 的模板。
 * - 标题+说明等纯 text 子项栈 → vertical
 * - *-text-col / *-detail-* / 权益文案列 → vertical
 * - 权益 benefits-grid / activate-grid 两列栅格 → 纵向 layout 列表（与设计单列权益行一致）
 *
 * 用法：node scripts/fix-layout-stack-direction.mjs [--write]
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const EMAILS_DIR = join(REPO_ROOT, "data", "emails");

function isPriceRow(id, name) {
  return /price|sale|original|价格/i.test(`${id} ${name}`);
}

function fixTemplate(template) {
  let changed = false;
  const blocks = template.blocks ?? {};

  for (const block of Object.values(blocks)) {
    if (!block || typeof block !== "object") continue;

    const meta = template.blockMeta?.[block.id];
    const metaName = meta?.name ?? "";

    if (
      block.type === "grid" &&
      (/benefits-grid|activate-grid/i.test(block.id) || /权益栅格|权益列表/.test(metaName))
    ) {
      block.type = "layout";
      const gap = block.props?.gap ?? "12px";
      block.props = {
        direction: "vertical",
        gapMode: "fixed",
        gap,
      };
      if (meta) {
        meta.blockType = "layout.container";
        if (metaName.includes("栅格")) {
          meta.name = metaName.replace("栅格", "列表");
        }
      }
      changed = true;
    }
  }

  for (const block of Object.values(blocks)) {
    if (!block || block.type !== "layout") continue;

    const metaName = template.blockMeta?.[block.id]?.name ?? "";
    const kids = (block.children ?? [])
      .map((id) => blocks[id])
      .filter((child) => child && typeof child === "object");

    if (kids.length < 2 && !/text-col|detail-|文案列|详情列/i.test(`${block.id} ${metaName}`)) {
      if (
        /icon-wrap/i.test(block.id) &&
        kids.length === 1 &&
        kids[0]?.type === "icon" &&
        block.props?.direction === "horizontal"
      ) {
        block.props.direction = "vertical";
        changed = true;
      }
      continue;
    }

    const allText = kids.length >= 2 && kids.every((child) => child.type === "text");
    const isTextStackCol =
      /text-col|detail-|文案列|详情列/i.test(`${block.id} ${metaName}`) ||
      (allText && !isPriceRow(block.id, metaName));

    if (
      isTextStackCol &&
      block.props?.direction === "horizontal" &&
      !isPriceRow(block.id, metaName)
    ) {
      block.props.direction = "vertical";
      changed = true;
    }
  }

  return changed;
}

function main() {
  const write = process.argv.includes("--write");
  const changedFiles = [];

  for (const dir of readdirSync(EMAILS_DIR)) {
    if (dir === "placement-playground") continue;
    const file = join(EMAILS_DIR, dir, "template.json");
    if (!existsSync(file)) continue;
    const template = JSON.parse(readFileSync(file, "utf8"));
    if (!fixTemplate(template)) continue;
    changedFiles.push(file);
    if (write) {
      writeFileSync(file, `${JSON.stringify(template, null, 2)}\n`, "utf8");
    }
  }

  if (changedFiles.length === 0) {
    console.log("未发现需修正的 layout.direction / 权益栅格");
    return;
  }

  const verb = write ? "已修正" : "待修正";
  console.log(`${verb} ${changedFiles.length} 个模板：`);
  for (const file of changedFiles) {
    console.log(`- ${relative(REPO_ROOT, file)}`);
  }
  if (!write) {
    process.exitCode = 1;
  }
}

main();
