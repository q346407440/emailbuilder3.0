#!/usr/bin/env node
/**
 * member-welcome / centered：将权益列表 repeat 从 mwc-benefits-list 提升到 mwc-mod-benefits，
 * 与 expandRepeatRegions「保留静态兄弟」能力对齐（标题 + 行模板同级）。
 *
 * 前置：引擎已支持 repeat 宿主保留非 prototype 直接子节点。
 *
 * 用法：node scripts/migrate-member-welcome-centered-flatten-benefits-list.mjs [--write]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const TEMPLATE_PATH = join(
  ROOT,
  "data/emails/member-welcome/layouts/centered/template.json"
);
const WRITE = process.argv.includes("--write");

function migrateTemplate(template) {
  const mod = template.blocks["mwc-mod-benefits"];
  const list = template.blocks["mwc-benefits-list"];
  if (!mod) throw new Error("缺少 mwc-mod-benefits");

  if (mod.repeat?.slotId === "memberBenefits" && !list) {
    return { changed: false, reason: "已扁平化（repeat 在 mwc-mod-benefits，无 mwc-benefits-list）" };
  }

  if (!list?.repeat) {
    return {
      changed: false,
      reason: "跳过：未找到 mwc-benefits-list.repeat，请先运行 migrate:member-welcome-centered-benefits-repeat:write",
    };
  }

  const row = template.blocks["mwc-benefit-row"];
  if (!row) throw new Error("缺少 mwc-benefit-row");

  const next = structuredClone(template);
  const nextMod = next.blocks["mwc-mod-benefits"];
  const nextList = next.blocks["mwc-benefits-list"];
  const nextRow = next.blocks["mwc-benefit-row"];

  nextMod.repeat = { ...nextList.repeat };
  nextMod.children = ["mwc-benefits-title", "mwc-benefit-row"];
  nextRow.parentId = "mwc-mod-benefits";

  delete next.blocks["mwc-benefits-list"];
  if (next.blockMeta) {
    delete next.blockMeta["mwc-benefits-list"];
  }

  return { changed: true, next };
}

const template = JSON.parse(readFileSync(TEMPLATE_PATH, "utf8"));
const result = migrateTemplate(template);

if (!result.changed) {
  console.log(result.reason ?? "无需变更");
  process.exit(0);
}

console.log(`${WRITE ? "写入" : "预览"} ${TEMPLATE_PATH}`);
console.log("  - repeat · memberBenefits 迁至 mwc-mod-benefits");
console.log("  - mwc-mod-benefits.children → [标题, 行模板]");
console.log("  - 删除 mwc-benefits-list");

if (WRITE) {
  writeFileSync(TEMPLATE_PATH, `${JSON.stringify(result.next, null, 2)}\n`, "utf8");
}
