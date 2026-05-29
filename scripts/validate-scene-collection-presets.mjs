#!/usr/bin/env node
/**
 * 校验 data/scene-collection-presets/<scene>/*.json
 */
import { join, resolve } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSceneCollectionPresetsFromDisk } from "../src/payload-contract/scene-collection-presets/loadFromDisk.ts";
import { validatePayloadAgainstTemplate } from "../src/lib/validate.ts";
import { createCollectionPayloadSlotFromPreset } from "../src/lib/createPayloadSlot.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const PRESETS_ROOT = join(ROOT, "data", "scene-collection-presets");

const emptyTemplate = { blocks: {} };

function main() {
  const { presets, errors } = loadSceneCollectionPresetsFromDisk(PRESETS_ROOT);
  let failed = false;

  if (errors.length > 0) {
    failed = true;
    for (const err of errors) {
      console.error(`[fail] ${err}`);
    }
  }

  const seenPresetIds = new Set();
  const seenSlotIds = new Set();

  let payload = { schemaVersion: "1.0.0", slots: {}, values: {} };

  for (const preset of presets) {
    const key = `${preset.scene}:${preset.presetId}`;
    if (seenPresetIds.has(key)) {
      failed = true;
      console.error(`[fail] 重复 presetId：${key}`);
    }
    seenPresetIds.add(key);

    if (seenSlotIds.has(preset.slotId)) {
      failed = true;
      console.error(`[fail] 重复 slotId：${preset.slotId}`);
    }
    seenSlotIds.add(preset.slotId);

    const result = createCollectionPayloadSlotFromPreset(payload, preset);
    if ("error" in result) {
      failed = true;
      console.error(`[fail] ${preset.scene}/${preset.presetId}: ${result.error}`);
      continue;
    }
    payload = result.payload;

    const issues = validatePayloadAgainstTemplate(emptyTemplate, payload);
    if (issues.length > 0) {
      failed = true;
      for (const issue of issues) {
        console.error(`[fail] ${preset.presetId} ${issue.path}: ${issue.reason}`);
      }
    } else {
      console.log(`[ok]   ${preset.scene}/${preset.presetId} (${preset.label})`);
    }
  }

  if (presets.length === 0) {
    console.log("[warn] 未找到任何场景列表预设 JSON");
  }

  if (failed) process.exit(1);
}

main();
