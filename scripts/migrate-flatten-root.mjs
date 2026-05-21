#!/usr/bin/env node
/**
 * 一次性迁移：扁平化邮件根节点。
 *
 * 背景：之前每份模板都在 `emailRoot` 下额外包一层 `*-page` (`layout`) 作为「页面主容器」，
 * 但 `emailRoot` 已经持有 outerBg/innerBg/width/fontFamily/padding/border 等画布字段，
 * 现已扩展 `direction` / `gapMode` / `gap`，可直接承担主容器职责。本脚本：
 *
 * 1. 读取 data/emails/<email>/template.json
 * 2. 若根节点 `emailRoot` 唯一子项是 `layout` 类型且 blockMeta.name 表达「主容器」语义，
 *    则把它的 props.direction / props.gap / wrapperStyle.padding / wrapperStyle.backgroundColor（仅当与根色相同时）
 *    上提到根节点，删除该层并将其子节点接到根节点 children 上、修正 parentId。
 * 3. 例外：`minimal_welcome` 的 `layout-main` 是真实存在的「白色画布内嵌灰色卡片」，
 *    不属于冗余主容器，仅改 blockMeta.name 为业务语义。
 *
 * 用法：node scripts/migrate-flatten-root.mjs --write   # 直写
 *       node scripts/migrate-flatten-root.mjs           # dry-run
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const EMAILS_DIR = join(REPO_ROOT, "data", "emails");

const WRITE = process.argv.includes("--write");

/**
 * 例外：layout 在视觉上是真实独立色块（非冗余主容器），不参与扁平化，仅重命名。
 * key = rootBlockId，value = { layoutId, newName }
 */
const PRESERVE_AS_INNER_PANEL = {
  "root-1": { layoutId: "layout-main", newName: "欢迎卡片区" },
};

function logChange(emailKey, msg) {
  console.log(`  · ${emailKey}: ${msg}`);
}

function migrateOne(emailKey, templatePath) {
  const json = JSON.parse(readFileSync(templatePath, "utf8"));
  const root = json.blocks[json.rootBlockId];
  if (!root || root.type !== "emailRoot") {
    logChange(emailKey, `跳过：未找到 emailRoot 根节点`);
    return false;
  }

  const preserve = PRESERVE_AS_INNER_PANEL[json.rootBlockId];
  if (preserve) {
    const meta = json.blockMeta?.[preserve.layoutId];
    if (meta && meta.name !== preserve.newName) {
      meta.name = preserve.newName;
      logChange(emailKey, `保留 ${preserve.layoutId} 作为内嵌色块，重命名为「${preserve.newName}」`);
      return true;
    }
    logChange(emailKey, `保留 ${preserve.layoutId} 作为内嵌色块（已重命名）`);
    return false;
  }

  if (!Array.isArray(root.children) || root.children.length !== 1) {
    logChange(emailKey, `跳过：root.children 不是单一子项`);
    return false;
  }
  const pageId = root.children[0];
  const page = json.blocks[pageId];
  if (!page || page.type !== "layout") {
    logChange(emailKey, `跳过：唯一子项 ${pageId} 不是 layout`);
    return false;
  }

  const newRootProps = { ...root.props };
  const pageProps = page.props ?? {};
  if (typeof pageProps.direction === "string") {
    newRootProps.direction = pageProps.direction === "horizontal" ? "horizontal" : "vertical";
  } else {
    newRootProps.direction = "vertical";
  }
  if (pageProps.gapMode === "auto") {
    newRootProps.gapMode = "auto";
  } else {
    newRootProps.gapMode = "fixed";
  }
  const pageGap = typeof pageProps.gap === "string" && pageProps.gap.trim() ? pageProps.gap.trim() : "0";
  newRootProps.gap = pageGap;

  const pageWrap = page.wrapperStyle ?? {};
  if (pageWrap.padding && typeof pageWrap.padding === "object") {
    newRootProps.padding = pageWrap.padding;
  }

  if (
    typeof pageWrap.backgroundColor === "string" &&
    pageWrap.backgroundColor.trim() &&
    pageWrap.backgroundColor.trim() !== newRootProps.backgroundColor
  ) {
    logChange(
      emailKey,
      `警告：${pageId} 背景色 ${pageWrap.backgroundColor} 与根 ${newRootProps.backgroundColor} 不同，请人工确认是否需要保留`
    );
  }

  if (pageWrap.heightMode === "fixed") {
    logChange(emailKey, `丢弃 ${pageId} 上的 fixed height（页面级容器不应固定高度）`);
  }

  root.props = newRootProps;
  root.children = [...page.children];
  for (const childId of root.children) {
    const child = json.blocks[childId];
    if (child) child.parentId = root.id;
  }
  delete json.blocks[pageId];
  if (json.blockMeta) delete json.blockMeta[pageId];

  logChange(emailKey, `已删除 ${pageId}，root.children 由 ${root.children.length} 个直接子节点构成`);

  if (WRITE) {
    writeFileSync(templatePath, JSON.stringify(json, null, 2) + "\n", "utf8");
  }
  return true;
}

function main() {
  if (!existsSync(EMAILS_DIR)) {
    console.error(`未找到目录 ${EMAILS_DIR}`);
    process.exit(1);
  }
  const emails = readdirSync(EMAILS_DIR).filter((name) => {
    const p = join(EMAILS_DIR, name);
    return existsSync(join(p, "template.json"));
  });
  console.log(`扫描 ${emails.length} 份模板（${WRITE ? "直写" : "dry-run"}）：`);
  let changed = 0;
  for (const emailKey of emails) {
    const tplPath = join(EMAILS_DIR, emailKey, "template.json");
    if (migrateOne(emailKey, tplPath)) changed += 1;
  }
  console.log(`完成：${changed}/${emails.length} 份模板需要修改${WRITE ? "（已写入）" : "（dry-run，未写入）"}`);
}

main();
