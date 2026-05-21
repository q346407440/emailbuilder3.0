#!/usr/bin/env node
/**
 * 统一 member-welcome 多版式 template 中 allowExternal 变量槽的 label/description，
 * 避免切换版式后「变量赋值」侧栏名称不一致（payload.json 仍为场景级一份）。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

/** 场景级共用展示名（与版式结构无关） */
const CANON = {
  storeLogoSrc: {
    label: "店铺 Logo 地址",
    description: "店铺图形标识图片地址。",
  },
  storeLogoAlt: {
    label: "店铺 Logo 替代文字",
  },
  storeName: {
    label: "店铺名称",
    description: "品牌区与页脚联系说明中的店铺名称。",
  },
  heroWelcomeImageSrc: {
    label: "欢迎主图地址",
    description: "欢迎主视觉区背景图；换图后请自测叠字可读性。",
  },
  heroWelcomeImageAlt: {
    label: "欢迎主图替代文字",
  },
  heroSubtitle: {
    label: "欢迎副标题",
  },
  memberName: {
    label: "会员姓名",
    description: "问候语中插入的会员姓名。",
  },
  memberBenefits: {
    label: "会员权益列表",
    description: "权益项：图标、标题与说明文案。",
  },
  createAccountUrl: { label: "注册账户链接" },
  resetPasswordUrl: { label: "重置密码链接" },
  storeUrl: { label: "店铺链接" },
  supportEmail: { label: "客服邮箱" },
  supportEmailMailto: { label: "客服邮箱 mailto 链接" },
};

function applyCanon(meta, slotId) {
  const c = CANON[slotId];
  if (!c) return;
  if (c.label) meta.label = c.label;
  if (c.description !== undefined) meta.description = c.description;
  else if ("description" in meta && !c.description) delete meta.description;
}

function normalizeTemplate(template) {
  for (const block of Object.values(template.blocks)) {
    if (block.repeat?.slotId && CANON[block.repeat.slotId]) {
      applyCanon(block.repeat, block.repeat.slotId);
    }
    if (!block.bindings) continue;
    for (const spec of Object.values(block.bindings)) {
      if (spec.mode === "variable" && spec.allowExternal === true) {
        applyCanon(spec, spec.slotId);
      }
      if (spec.mode === "interpolate") {
        for (const slot of spec.interpolationSlots ?? []) {
          if (slot.allowExternal === true) applyCanon(slot, slot.slotId);
        }
      }
    }
  }
  return template;
}

const paths = [
  "data/emails/member-welcome/layouts/card/template.json",
  "data/emails/member-welcome/layouts/centered/template.json",
];

for (const rel of paths) {
  const abs = join(ROOT, rel);
  const raw = readFileSync(abs, "utf8");
  const template = JSON.parse(raw);
  normalizeTemplate(template);
  writeFileSync(abs, `${JSON.stringify(template, null, 2)}\n`);
  console.log(`Normalized payload slot labels: ${rel}`);
}
