#!/usr/bin/env node
/**
 * 一次性为全量 data/scene-collection-presets 下 JSON 写入 schemaVersion: 1.0.0
 * 用法：node scripts/migrate-scene-collection-preset-schema-version.mjs [--write]
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SCENE_COLLECTION_PRESET_SCHEMA_VERSION } from "../../../src/payload-contract/scene-collection-presets/types.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");
const PRESETS_ROOT = join(ROOT, "data", "scene-collection-presets");
const write = process.argv.includes("--write");

function listPresetPaths() {
  const paths = [];
  if (!statSync(PRESETS_ROOT, { throwIfNoEntry: false })?.isDirectory()) return paths;
  for (const scene of readdirSync(PRESETS_ROOT)) {
    const sceneDir = join(PRESETS_ROOT, scene);
    if (!statSync(sceneDir).isDirectory()) continue;
    for (const name of readdirSync(sceneDir).filter((n) => n.endsWith(".json"))) {
      paths.push(join(sceneDir, name));
    }
  }
  return paths;
}

let changed = 0;
for (const path of listPresetPaths()) {
  const raw = JSON.parse(readFileSync(path, "utf8"));
  if (raw.schemaVersion === SCENE_COLLECTION_PRESET_SCHEMA_VERSION) continue;
  if (raw.schemaVersion !== undefined) {
    console.error(`[fail] ${path} 已有非预期 schemaVersion：${raw.schemaVersion}`);
    process.exit(1);
  }
  const next = { schemaVersion: SCENE_COLLECTION_PRESET_SCHEMA_VERSION, ...raw };
  changed += 1;
  if (write) {
    writeFileSync(path, `${JSON.stringify(next, null, 2)}\n`, "utf8");
    console.log(`[write] ${path}`);
  } else {
    console.log(`[dry-run] ${path}`);
  }
}
console.log(
  write
    ? `已写入 ${changed} 个 scene-collection-presets JSON`
    : `[dry-run] 将变更 ${changed} 个 scene-collection-presets JSON`
);
