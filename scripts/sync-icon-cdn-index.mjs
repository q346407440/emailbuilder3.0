#!/usr/bin/env node
/**
 * 从 npm 包生成 Tabler / Lucide 图标 slug 索引（data/icon-cdn/*-icons-index.json）。
 * 用法：node scripts/sync-icon-cdn-index.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import os from "node:os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const outDir = path.join(repoRoot, "data/icon-cdn");

const PACKS = [
  {
    name: "tabler",
    npm: "@tabler/icons@3.31.0",
    cdnBase: "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline",
    iconsGlob: "icons/outline/*.svg",
    fallbackSlug: "photo",
    aliases: {
      "package-2": "package",
      packages: "package",
      shipping: "truck",
      delivery: "truck",
      returns: "arrow-back-up",
      return: "arrow-back-up",
      "brand-alo": "square-letter-a",
      alo: "square-letter-a",
      app: "device-mobile",
      mobile: "device-mobile",
      smartphone: "device-mobile",
      store: "building-store",
      shop: "building-store",
      location: "map-pin",
      pin: "map-pin",
      mail: "mail",
      email: "mail",
      phone: "phone",
      check: "check",
      star: "star",
      heart: "heart",
    },
  },
  {
    name: "lucide",
    npm: "lucide-static@0.469.0",
    cdnBase: "https://cdn.jsdelivr.net/npm/lucide-static@0.469.0/icons",
    iconsGlob: "icons/*.svg",
    fallbackSlug: "image",
    aliases: {
      "package-2": "package",
      shipping: "truck",
      returns: "undo-2",
      store: "store",
      location: "map-pin",
      mail: "mail",
      phone: "phone",
    },
  },
];

function readSlugsFromTarball(npmSpec, iconsGlob) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "icon-index-"));
  try {
    execSync(`npm pack ${npmSpec}`, { cwd: tmp, stdio: "pipe" });
    const tgz = fs.readdirSync(tmp).find((f) => f.endsWith(".tgz"));
    if (!tgz) throw new Error(`npm pack ${npmSpec} 未产出 tgz`);
    execSync(`tar -xf ${JSON.stringify(tgz)}`, { cwd: tmp });
    const pkgDir = path.join(tmp, "package");
    const globDir = path.dirname(iconsGlob);
    const iconDir = path.join(pkgDir, globDir);
    if (!fs.existsSync(iconDir)) {
      throw new Error(`图标目录不存在: ${iconDir}`);
    }
    return fs
      .readdirSync(iconDir)
      .filter((f) => f.endsWith(".svg"))
      .map((f) => f.replace(/\.svg$/i, ""))
      .sort();
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function main() {
  fs.mkdirSync(outDir, { recursive: true });
  for (const pack of PACKS) {
    console.log(`[sync-icon-cdn] 读取 ${pack.npm} …`);
    const slugs = readSlugsFromTarball(pack.npm, pack.iconsGlob);
    const out = {
      pack: pack.name,
      version: pack.npm.split("@").pop(),
      cdnBase: pack.cdnBase,
      fallbackSlug: pack.fallbackSlug,
      slugs,
      aliases: pack.aliases,
    };
    const outPath = path.join(outDir, `${pack.name}-icons-index.json`);
    fs.writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`, "utf8");
    console.log(`[sync-icon-cdn] 写入 ${outPath}（${slugs.length} slugs）`);
  }
}

main();
