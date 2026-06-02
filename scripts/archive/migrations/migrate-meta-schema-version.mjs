#!/usr/bin/env node
/**
 * 一次性为全量 data/emails 下 meta.json 写入 schemaVersion: 1.0.0
 * 用法：node scripts/migrate-meta-schema-version.mjs [--write]
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { META_SCHEMA_VERSION } from "../../../src/meta-contract/index.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");
const EMAILS_DIR = join(ROOT, "data", "emails");
const write = process.argv.includes("--write");

function listMetaPaths() {
  return readdirSync(EMAILS_DIR)
    .map((name) => join(EMAILS_DIR, name, "meta.json"))
    .filter((p) => statSync(p, { throwIfNoEntry: false })?.isFile());
}

let changed = 0;
for (const path of listMetaPaths()) {
  const raw = JSON.parse(readFileSync(path, "utf8"));
  if (raw.schemaVersion === META_SCHEMA_VERSION) continue;
  if (raw.schemaVersion !== undefined) {
    console.error(`[fail] ${path} 已有非预期 schemaVersion：${raw.schemaVersion}`);
    process.exit(1);
  }
  const next = { schemaVersion: META_SCHEMA_VERSION, ...raw };
  changed += 1;
  if (write) {
    writeFileSync(path, `${JSON.stringify(next, null, 2)}\n`, "utf8");
    console.log(`[write] ${path}`);
  } else {
    console.log(`[dry-run] ${path}`);
  }
}
console.log(write ? `已写入 ${changed} 个 meta.json` : `[dry-run] 将变更 ${changed} 个 meta.json`);
