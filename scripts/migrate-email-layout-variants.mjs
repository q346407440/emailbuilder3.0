#!/usr/bin/env node
/**
 * 将 legacy 单文件模板迁移为「场景 + layouts/<id>/」版式包结构。
 *
 * 用法：
 *   node scripts/migrate-email-layout-variants.mjs              # 预览
 *   node scripts/migrate-email-layout-variants.mjs --write    # 迁移全部 legacy 场景（单版式 id=default）
 *   node scripts/migrate-email-layout-variants.mjs --write --email=member-welcome
 *
 * 已存在 layout-manifest.json 的场景会跳过（如 member-welcome 多版式）。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, "..");
const EMAILS = path.join(REPO, "data", "emails");

const DEFAULT_VARIANT_ID = "default";

const write = process.argv.includes("--write");
const emailArg = process.argv.find((a) => a.startsWith("--email="));
const onlyEmail = emailArg ? emailArg.split("=")[1] : null;

/** 多版式场景的手动计划（仅用于首次从 legacy 拆多版式；已迁移则跳过） */
const MULTI_VARIANT_PLANS = {
  "member-welcome": [
    {
      id: "card",
      label: "卡片分段版",
      description: "顶栏品牌 + 圆角头图 + 白卡片分段（问候 / 权益 / 账户）",
    },
    {
      id: "centered",
      label: "居中流式版",
      description: "珊瑚促销横幅 + 白卡片 WELCOME；问候与权益区居中；纵向权益列表",
    },
  ],
};

function readDisplayName(emailKey) {
  try {
    const meta = JSON.parse(fs.readFileSync(path.join(EMAILS, emailKey, "meta.json"), "utf8"));
    if (typeof meta?.displayName === "string" && meta.displayName.trim()) {
      return meta.displayName.trim();
    }
  } catch {
    /* 无 meta */
  }
  return emailKey;
}

function defaultSingleVariantPlan(emailKey) {
  const label = readDisplayName(emailKey);
  return [
    {
      id: DEFAULT_VARIANT_ID,
      label,
      description: "默认版式（自单文件结构迁移）",
    },
  ];
}

function discoverLegacyEmailKeys() {
  if (!fs.existsSync(EMAILS)) return [];
  return fs.readdirSync(EMAILS).filter((name) => {
    if (name.startsWith("_")) return false;
    const base = path.join(EMAILS, name);
    try {
      if (!fs.statSync(base).isDirectory()) return false;
    } catch {
      return false;
    }
    if (fs.existsSync(path.join(base, "layout-manifest.json"))) return false;
    return fs.existsSync(path.join(base, "template.json"));
  });
}

function moveIfExists(from, to) {
  if (!fs.existsSync(from)) return false;
  fs.mkdirSync(path.dirname(to), { recursive: true });
  if (write) fs.renameSync(from, to);
  return true;
}

function copyDirFiles(srcDir, destDir, names) {
  for (const name of names) {
    const from = path.join(srcDir, name);
    const to = path.join(destDir, name);
    if (!fs.existsSync(from)) continue;
    fs.mkdirSync(destDir, { recursive: true });
    if (write) fs.copyFileSync(from, to);
  }
}

function migrateOne(emailKey, variantPlan) {
  const base = path.join(EMAILS, emailKey);
  if (!fs.existsSync(base)) {
    console.log(`[skip] ${emailKey}: 目录不存在`);
    return;
  }
  const manifestPath = path.join(base, "layout-manifest.json");
  if (fs.existsSync(manifestPath)) {
    console.log(`[skip] ${emailKey}: 已有 layout-manifest.json`);
    return;
  }
  const rootTpl = path.join(base, "template.json");
  if (!fs.existsSync(rootTpl)) {
    console.log(`[skip] ${emailKey}: 无根 template.json`);
    return;
  }

  const primary = variantPlan[0];
  const primaryDir = path.join(base, "layouts", primary.id);
  const moved = [
    moveIfExists(path.join(base, "template.json"), path.join(primaryDir, "template.json")),
    moveIfExists(path.join(base, "tokenPresets.json"), path.join(primaryDir, "tokenPresets.json")),
  ];
  if (!moved[0]) {
    console.log(`[skip] ${emailKey}: 迁移失败`);
    return;
  }

  for (const variant of variantPlan.slice(1)) {
    const dest = path.join(base, "layouts", variant.id);
    copyDirFiles(primaryDir, dest, ["template.json", "tokenPresets.json"]);
  }

  const manifest = {
    schemaVersion: "1.0.0",
    activeLayoutVariantId: primary.id,
    variants: variantPlan.map((v) => ({
      id: v.id,
      label: v.label,
      description: v.description,
    })),
  };

  if (write) {
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  }

  console.log(
    `${write ? "[write]" : "[dry]"} ${emailKey} → layouts/${variantPlan.map((v) => v.id).join(", ")}`
  );
}

const legacyKeys = discoverLegacyEmailKeys();
const planKeys = Object.keys(MULTI_VARIANT_PLANS);
const keys = onlyEmail
  ? [onlyEmail]
  : [...new Set([...legacyKeys, ...planKeys])].sort();

let migrated = 0;
let skipped = 0;
for (const key of keys) {
  const before = fs.existsSync(path.join(EMAILS, key, "layout-manifest.json"));
  const plan =
    MULTI_VARIANT_PLANS[key] ??
    (legacyKeys.includes(key) ? defaultSingleVariantPlan(key) : null);
  if (!plan) {
    console.log(`[skip] ${key}: 无迁移计划且非 legacy`);
    skipped += 1;
    continue;
  }
  migrateOne(key, plan);
  const after = fs.existsSync(path.join(EMAILS, key, "layout-manifest.json"));
  if (write && !before && after) migrated += 1;
}

console.log(
  `\n${write ? "完成" : "预览"}：待迁移 legacy ${legacyKeys.length} 个；${write ? `本次写入 ${migrated} 个` : "加 --write 落盘"}`
);
if (!write) {
  console.log("示例：npm run migrate:layout-variants:write");
}
