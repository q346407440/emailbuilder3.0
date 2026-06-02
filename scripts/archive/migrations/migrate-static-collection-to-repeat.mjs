#!/usr/bin/env node
/**
 * 将「静态多行/多格 + collection 数字下标 slotPath」迁为列表重复（repeat）。
 *
 * 用法：
 *   node scripts/migrate-static-collection-to-repeat.mjs [--write] [--only=<emailKey>]
 */
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readTemplateDisk, writeTemplateDisk } from "../../lib/template-disk-io.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../../..");
const WRITE = process.argv.includes("--write");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice("--only=".length);

const MEMBER_BENEFITS_ITEM_FIELDS = [
  { key: "title", label: "权益标题", valueType: "string", required: true },
  { key: "subtitle", label: "权益说明", valueType: "string", required: true },
  { key: "iconSrc", label: "图标地址", valueType: "image", required: true },
];

const JOBS = [
  {
    id: "coupon-available",
    path: "data/emails/coupon-available/layouts/default/template.json",
    kind: "grid-cells",
    hostId: "ca-picked-grid",
    prototypeCellId: "ca-picked-cell-1",
    cellPattern: /^ca-picked-cell-(\d+)$/,
    slotId: "pickedProducts",
  },
  {
    id: "referral-friend-joined",
    path: "data/emails/referral-friend-joined/layouts/default/template.json",
    kind: "grid-cells",
    hostId: "rfj-picked-grid",
    prototypeCellId: "rfj-picked-cell-1",
    cellPattern: /^rfj-picked-cell-(\d+)$/,
    slotId: "pickedProducts",
  },
  {
    id: "member-congrats",
    path: "data/emails/member-congrats/layouts/default/template.json",
    kind: "vertical-rows",
    modId: "mc-mod-benefits",
    listId: "mc-benefits-list",
    titleId: "mc-benefits-title",
    rowId: "mc-benefit-row",
    renameFrom: {
      "mc-benefit-row-1": "mc-benefit-row",
      "mc-benefit-icon-wrap-1": "mc-benefit-icon-wrap",
      "mc-benefit-icon-1": "mc-benefit-icon",
      "mc-benefit-text-col-1": "mc-benefit-text-col",
      "mc-benefit-title-1": "mc-benefit-title",
      "mc-benefit-sub-1": "mc-benefit-sub",
    },
    deletePattern:
      /^mc-benefit-(?:row|icon-wrap|icon|text-col|title|sub)-[2-9]\d*$/,
    slotId: "memberBenefits",
    itemFields: MEMBER_BENEFITS_ITEM_FIELDS,
    listMetaName: "权益列表（重复）",
  },
  {
    id: "member-birthday",
    path: "data/emails/member-birthday/layouts/default/template.json",
    kind: "mod-cards",
    modId: "bd-mod-coupons",
    prototypeCardId: "bd-coupon-card-1",
    renameFrom: {
      "bd-coupon-card-1": "bd-coupon-card",
      "bd-coupon-offer-1": "bd-coupon-offer",
      "bd-coupon-detail-1": "bd-coupon-detail",
      "bd-coupon-title-1": "bd-coupon-title",
      "bd-coupon-desc-1": "bd-coupon-desc",
    },
    deletePattern: /^bd-coupon-(?:card|offer|detail|title|desc)-[2-9]\d*$/,
    slotId: "birthdayCoupons",
  },
  {
    id: "member-vip-join",
    path: "data/emails/member-vip-join/layouts/default/template.json",
    kind: "grid-cells",
    hostId: "mj-benefits-grid",
    prototypeCellId: "mj-benefit-cell-1",
    cellPattern: /^mj-benefit-cell-(\d+)$/,
    slotId: "memberBenefits",
    itemFields: MEMBER_BENEFITS_ITEM_FIELDS,
  },
  {
    id: "member-vip-update-benefits",
    path: "data/emails/member-vip-update/layouts/default/template.json",
    kind: "grid-cells",
    hostId: "mv-benefits-grid",
    prototypeCellId: "mv-benefit-cell-1",
    cellPattern: /^mv-benefit-cell-(\d+)$/,
    slotId: "currentMemberBenefits",
    itemFields: MEMBER_BENEFITS_ITEM_FIELDS,
  },
  {
    id: "member-vip-update-activate",
    path: "data/emails/member-vip-update/layouts/default/template.json",
    kind: "grid-cells",
    hostId: "mv-activate-grid",
    prototypeCellId: "mv-activate-cell-1",
    cellPattern: /^mv-activate-cell-(\d+)$/,
    slotId: "activationBenefits",
    itemFields: MEMBER_BENEFITS_ITEM_FIELDS,
  },
];

function extractCollectionMeta(template, slotId) {
  for (const block of Object.values(template.blocks)) {
    for (const spec of Object.values(block.bindings ?? {})) {
      if (
        spec?.mode === "variable" &&
        spec.slotId === slotId &&
        spec.valueType === "collection" &&
        spec.itemFields?.length
      ) {
        return {
          itemFields: spec.itemFields,
          minItems: spec.minItems,
          maxItems: spec.maxItems,
          label: spec.label,
          description: spec.description,
        };
      }
    }
  }
  return null;
}

function collectDescendantIds(template, rootId) {
  const out = [];
  const stack = [...(template.blocks[rootId]?.children ?? [])];
  while (stack.length) {
    const id = stack.pop();
    out.push(id);
    const children = template.blocks[id]?.children ?? [];
    for (const c of children) stack.push(c);
  }
  return out;
}

function mapBlockId(id, renameFrom) {
  if (typeof id !== "string") return id;
  return renameFrom[id] ?? id;
}

function walkReplaceIds(value, renameFrom, skipDelete) {
  if (typeof value === "string") {
    if (skipDelete?.(value)) return value;
    return mapBlockId(value, renameFrom);
  }
  if (Array.isArray(value)) {
    const out = [];
    for (const item of value) {
      if (typeof item === "string") {
        if (skipDelete?.(item)) continue;
        out.push(mapBlockId(item, renameFrom));
      } else {
        out.push(walkReplaceIds(item, renameFrom, skipDelete));
      }
    }
    return out;
  }
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = walkReplaceIds(v, renameFrom, skipDelete);
    }
    return out;
  }
  return value;
}

function migrateGridCells(template, job) {
  const host = template.blocks[job.hostId];
  if (!host) throw new Error(`缺少宿主 ${job.hostId}`);

  const proto = job.prototypeCellId;
  const extraCells = (host.children ?? []).filter((id) => {
    const m = id.match(job.cellPattern);
    return m && Number(m[1]) > 1;
  });

  if (
    host.repeat?.slotId === job.slotId &&
    extraCells.length === 0 &&
    host.children?.length === 1 &&
    host.children[0] === proto
  ) {
    return { changed: false, reason: `${job.hostId} 已为 repeat + 单原型格` };
  }

  const meta =
    extractCollectionMeta(template, job.slotId) ??
    (job.itemFields
      ? {
          itemFields: job.itemFields,
          minItems: extraCells.length + 1,
          maxItems: extraCells.length + 1,
        }
      : null);
  if (!meta?.itemFields?.length) {
    throw new Error(`未找到 slotId=${job.slotId} 的 itemFields`);
  }

  const next = structuredClone(template);
  const toDelete = new Set();
  for (const cellId of extraCells) {
    toDelete.add(cellId);
    for (const d of collectDescendantIds(next, cellId)) toDelete.add(d);
  }
  for (const id of toDelete) {
    delete next.blocks[id];
    delete next.blockMeta?.[id];
  }

  const nextHost = next.blocks[job.hostId];
  nextHost.children = [proto];
  nextHost.repeat = {
    mode: "collection",
    slotId: job.slotId,
    prototypeChildIds: [proto],
    fallbackChildIds: [proto],
    itemFields: meta.itemFields,
    minItems: meta.minItems ?? extraCells.length + 1,
    maxItems: meta.maxItems ?? extraCells.length + 1,
    label: meta.label,
    description: meta.description,
  };

  return { changed: true, next, deleted: [...toDelete] };
}

function migrateVerticalRows(template, job) {
  const list = template.blocks[job.listId];
  if (list?.repeat?.slotId === job.slotId) {
    return { changed: false, reason: `已存在 ${job.listId}.repeat` };
  }

  const mod = template.blocks[job.modId];
  if (!mod) throw new Error(`缺少 ${job.modId}`);

  const meta =
    extractCollectionMeta(template, job.slotId) ??
    (job.itemFields
      ? { itemFields: job.itemFields, minItems: 5, maxItems: 5 }
      : null);
  if (!meta?.itemFields?.length) {
    throw new Error(`未找到 slotId=${job.slotId} 的 itemFields`);
  }

  const next = structuredClone(template);

  for (const id of Object.keys(next.blocks)) {
    if (job.deletePattern.test(id)) {
      delete next.blocks[id];
      delete next.blockMeta?.[id];
    }
  }

  const renamedBlocks = {};
  for (const [id, block] of Object.entries(next.blocks)) {
    const newId = mapBlockId(id, job.renameFrom);
    const blockCopy = walkReplaceIds(block, job.renameFrom);
    blockCopy.id = newId;
    renamedBlocks[newId] = blockCopy;
  }
  next.blocks = renamedBlocks;

  if (next.blockMeta) {
    const metaMap = {};
    for (const [id, entry] of Object.entries(next.blockMeta)) {
      const newId = mapBlockId(id, job.renameFrom);
      if (!next.blocks[newId]) continue;
      metaMap[newId] = { ...entry };
    }
    metaMap[job.listId] = {
      blockType: "layout.container",
      name: job.listMetaName ?? "列表（重复）",
    };
    next.blockMeta = metaMap;
  }

  const nextMod = next.blocks[job.modId];
  nextMod.children = [job.titleId, job.listId];

  const row = next.blocks[job.rowId];
  if (!row) throw new Error(`缺少行模板 ${job.rowId}`);
  row.parentId = job.listId;

  next.blocks[job.listId] = {
    id: job.listId,
    type: "layout",
    parentId: job.modId,
    children: [job.rowId],
    repeat: {
      mode: "collection",
      slotId: job.slotId,
      prototypeChildIds: [job.rowId],
      fallbackChildIds: [job.rowId],
      itemFields: meta.itemFields,
      minItems: meta.minItems ?? 5,
      maxItems: meta.maxItems ?? 5,
      label: meta.label ?? "会员权益列表",
      description: meta.description ?? "权益项：图标、标题与说明文案。",
    },
    wrapperStyle: {
      contentAlign: { horizontal: "left", vertical: "top" },
      widthMode: "fill",
      heightMode: "hug",
      border: {
        mode: "unified",
        width: "0",
        style: "solid",
        color: "rgba(0,0,0,0)",
      },
      borderRadius: { mode: "unified", radius: "0" },
    },
    props: {
      direction: "vertical",
      gapMode: "fixed",
      gap: { $themeRef: "tokens.spacing.gap" },
    },
    bindings: {
      "props.gap": {
        slotId: "tokens.spacing.gap",
        mode: "theme",
        tokenPath: "tokens.spacing.gap",
        fieldKind: "style",
      },
    },
  };

  return { changed: true, next };
}

function migrateModCards(template, job) {
  const mod = template.blocks[job.modId];
  if (!mod) throw new Error(`缺少 ${job.modId}`);

  const proto = job.renameFrom[job.prototypeCardId] ?? job.prototypeCardId;
  if (
    mod.repeat?.slotId === job.slotId &&
    mod.children?.length === 1 &&
    mod.children[0] === proto
  ) {
    return { changed: false, reason: `${job.modId} 已为 repeat + 单卡原型` };
  }

  const meta = extractCollectionMeta(template, job.slotId);
  if (!meta?.itemFields?.length) {
    throw new Error(`未找到 slotId=${job.slotId} 的 itemFields`);
  }

  const next = structuredClone(template);

  for (const id of Object.keys(next.blocks)) {
    if (job.deletePattern.test(id)) {
      delete next.blocks[id];
      delete next.blockMeta?.[id];
    }
  }

  const renamedBlocks = {};
  for (const [id, block] of Object.entries(next.blocks)) {
    const newId = mapBlockId(id, job.renameFrom);
    const blockCopy = walkReplaceIds(block, job.renameFrom);
    blockCopy.id = newId;
    renamedBlocks[newId] = blockCopy;
  }
  next.blocks = renamedBlocks;

  if (next.blockMeta) {
    const metaMap = {};
    for (const [id, entry] of Object.entries(next.blockMeta)) {
      const newId = mapBlockId(id, job.renameFrom);
      if (!next.blocks[newId]) continue;
      metaMap[newId] = { ...entry };
    }
    next.blockMeta = metaMap;
  }

  const nextMod = next.blocks[job.modId];
  nextMod.children = [proto];
  nextMod.repeat = {
    mode: "collection",
    slotId: job.slotId,
    prototypeChildIds: [proto],
    fallbackChildIds: [proto],
    itemFields: meta.itemFields,
    minItems: meta.minItems ?? 4,
    maxItems: meta.maxItems ?? 4,
    label: meta.label,
    description: meta.description,
  };

  const card = next.blocks[proto];
  if (card) card.parentId = job.modId;

  return { changed: true, next };
}

function runJob(job) {
  const abs = join(ROOT, job.path);
  const { graph, ctx } = readTemplateDisk(abs);
  let result;
  if (job.kind === "grid-cells") result = migrateGridCells(graph, job);
  else if (job.kind === "vertical-rows") result = migrateVerticalRows(graph, job);
  else if (job.kind === "mod-cards") result = migrateModCards(graph, job);
  else throw new Error(`未知 kind: ${job.kind}`);

  if (!result.changed) {
    console.log(`[skip] ${job.id}: ${result.reason}`);
    return;
  }

  console.log(`[${WRITE ? "write" : "dry"}] ${job.id} (${job.path})`);
  if (result.deleted?.length) {
    console.log(`  删除 ${result.deleted.length} 个区块`);
  }

  if (WRITE) {
    writeTemplateDisk(abs, result.next, ctx);
  }
}

const jobs = ONLY ? JOBS.filter((j) => j.id === ONLY || j.path.includes(ONLY)) : JOBS;

if (jobs.length === 0) {
  console.error(`无匹配任务：--only=${ONLY}`);
  process.exit(1);
}

for (const job of jobs) {
  runJob(job);
}

console.log(WRITE ? "完成（已写入）" : "预览完成，加 --write 落盘");
