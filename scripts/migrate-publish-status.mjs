#!/usr/bin/env node
/**
 * 为全量 data/emails 写入 publishStatus: published（模板 meta + 各版式 variants）。
 * 用法：node scripts/migrate-publish-status.mjs [--write]
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const EMAILS_DIR = join(ROOT, "data", "emails");
const PUBLISHED = "published";
const write = process.argv.includes("--write");

function listEmailDirs() {
  return readdirSync(EMAILS_DIR)
    .map((name) => join(EMAILS_DIR, name))
    .filter((p) => statSync(p, { throwIfNoEntry: false })?.isDirectory());
}

let metaChanged = 0;
let manifestChanged = 0;

for (const base of listEmailDirs()) {
  const metaPath = join(base, "meta.json");
  if (statSync(metaPath, { throwIfNoEntry: false })?.isFile()) {
    const raw = JSON.parse(readFileSync(metaPath, "utf8"));
    if (raw.publishStatus !== PUBLISHED) {
      const next = { ...raw, publishStatus: PUBLISHED };
      metaChanged += 1;
      if (write) {
        writeFileSync(metaPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
        console.log(`[write] ${metaPath}`);
      } else {
        console.log(`[dry-run] ${metaPath}`);
      }
    }
  }

  const manifestPath = join(base, "layout-manifest.json");
  if (statSync(manifestPath, { throwIfNoEntry: false })?.isFile()) {
    const raw = JSON.parse(readFileSync(manifestPath, "utf8"));
    if (!Array.isArray(raw.variants)) continue;
    let touched = false;
    const variants = raw.variants.map((v) => {
      if (!v || typeof v !== "object") return v;
      if (v.publishStatus === PUBLISHED) return v;
      touched = true;
      return { ...v, publishStatus: PUBLISHED };
    });
    if (touched) {
      manifestChanged += 1;
      const next = { ...raw, variants };
      if (write) {
        writeFileSync(manifestPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
        console.log(`[write] ${manifestPath}`);
      } else {
        console.log(`[dry-run] ${manifestPath}`);
      }
    }
  }
}

console.log(
  write
    ? `已写入 meta ${metaChanged} 个、layout-manifest ${manifestChanged} 个`
    : `[dry-run] 将变更 meta ${metaChanged} 个、layout-manifest ${manifestChanged} 个`
);
