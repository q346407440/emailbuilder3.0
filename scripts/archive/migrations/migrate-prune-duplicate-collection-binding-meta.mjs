#!/usr/bin/env node
/**
 * 清理列表 repeat 迁移后留在「叶子 binding」上的重复 collection 元数据。
 * 真源：repeat.itemFields + payload.slots + payload.values。
 *
 * 同时删除空的 template.meta.easyEmailBindingUi。
 *
 * 用法：
 *   node scripts/migrate-prune-duplicate-collection-binding-meta.mjs [--write]
 */
import { statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readTemplateDisk, writeTemplateDisk } from "../../lib/template-disk-io.mjs";
import { enumerateAllEmailTemplatePaths } from "../../../src/lib/emailLayoutVariant.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../../..");
const EMAILS_DIR = join(ROOT, "data", "emails");
const WRITE = process.argv.includes("--write");

const COLLECTION_META_KEYS = [
  "itemFields",
  "minItems",
  "maxItems",
  "label",
  "description",
  "defaultValue",
];

/** slotId → repeat 宿主（已声明 itemFields） */
function buildRepeatCollectionHosts(template) {
  const hosts = new Map();
  for (const [blockId, block] of Object.entries(template.blocks ?? {})) {
    const repeat = block.repeat;
    if (repeat?.mode === "collection" && repeat.itemFields?.length) {
      hosts.set(repeat.slotId, { blockId, repeat });
    }
  }
  return hosts;
}

function pruneBindingSpec(spec, slotHosts) {
  if (
    spec?.mode !== "variable" ||
    spec.valueType !== "collection" ||
    spec.allowExternal !== true
  ) {
    return { spec, changed: false };
  }
  if (!slotHosts.has(spec.slotId)) {
    return { spec, changed: false };
  }

  let changed = false;
  const next = { ...spec };
  for (const key of COLLECTION_META_KEYS) {
    if (key in next) {
      delete next[key];
      changed = true;
    }
  }
  return { spec: changed ? next : spec, changed };
}

function pruneEmptyBindingUiMeta(template) {
  const meta = template.meta;
  if (!meta || typeof meta !== "object") {
    return { changed: false, detail: null };
  }

  const ui = meta.easyEmailBindingUi;
  if (!ui || typeof ui !== "object") {
    return { changed: false, detail: null };
  }

  const hasThemeRestore =
    (ui.themeRestoreJson && Object.keys(ui.themeRestoreJson).length > 0) ||
    (ui.themeRestoreBindingJson && Object.keys(ui.themeRestoreBindingJson).length > 0);
  if (hasThemeRestore) {
    return { changed: false, detail: null };
  }

  if (Object.keys(ui).length > 0) {
    return { changed: false, detail: null };
  }

  const { easyEmailBindingUi: _omit, ...restMeta } = meta;
  if (Object.keys(restMeta).length === 0) {
    delete template.meta;
  } else {
    template.meta = restMeta;
  }
  return { changed: true, detail: "移除空的 meta.easyEmailBindingUi" };
}

function migrateTemplate(template) {
  const slotHosts = buildRepeatCollectionHosts(template);
  const next = structuredClone(template);
  let changed = false;
  const stripped = [];

  for (const [blockId, block] of Object.entries(next.blocks ?? {})) {
    if (!block.bindings) continue;
    for (const [bindPath, spec] of Object.entries(block.bindings)) {
      const { spec: pruned, changed: bindingChanged } = pruneBindingSpec(spec, slotHosts);
      if (!bindingChanged) continue;
      block.bindings[bindPath] = pruned;
      changed = true;
      stripped.push(`${blockId}.${bindPath} (${spec.slotId})`);
    }
  }

  const metaResult = pruneEmptyBindingUiMeta(next);
  if (metaResult.changed) {
    if (metaResult.detail) stripped.push(metaResult.detail);
    changed = true;
  }

  return { changed, next, stripped, slotHosts: [...slotHosts.keys()] };
}

function main() {
  const paths = enumerateAllEmailTemplatePaths(EMAILS_DIR);
  let totalChanged = 0;

  for (const absPath of paths) {
    if (!statSync(absPath, { throwIfNoEntry: false })?.isFile()) continue;
    const rel = absPath.replace(`${ROOT}/`, "");
    const { graph, ctx } = readTemplateDisk(absPath);
    const result = migrateTemplate(graph);

    if (!result.changed) {
      console.log(`[skip] ${rel}`);
      continue;
    }

    totalChanged += 1;
    console.log(`[${WRITE ? "write" : "dry"}] ${rel}`);
    if (result.slotHosts.length) {
      console.log(`  repeat 槽：${result.slotHosts.join(", ")}`);
    }
    for (const line of result.stripped.slice(0, 12)) {
      console.log(`  - ${line}`);
    }
    if (result.stripped.length > 12) {
      console.log(`  ... +${result.stripped.length - 12} 处`);
    }

    if (WRITE) {
      writeTemplateDisk(absPath, result.next, ctx);
    }
  }

  console.log(
    totalChanged === 0
      ? "无需变更"
      : WRITE
        ? `完成：已写入 ${totalChanged} 个模板`
        : `预览：${totalChanged} 个模板待写入（加 --write）`
  );
}

main();
