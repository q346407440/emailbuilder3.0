import { watch, type FSWatcher } from "node:fs";
import type { PayloadVariableScene } from "../src/lib/payloadVariableScene";
import {
  buildPayloadSlotDefFromScenePreset,
  resolveScenePresetCollectionValues,
} from "../src/payload-contract/scene-collection-presets/buildPresetCollection";
import {
  loadSceneCollectionPresetsFromDisk,
  SCENE_COLLECTION_PRESETS_ROOT,
} from "../src/payload-contract/scene-collection-presets/loadFromDisk";
import { isPayloadVariableScene } from "../src/payload-contract/scene-collection-presets/parsePreset";
import type { SceneCollectionPreset } from "../src/payload-contract/scene-collection-presets/types";
import type { EmailPayload } from "../src/types/email";

export type SceneCollectionPresetSummary = {
  presetId: string;
  slotId: string;
  label: string;
  description?: string;
  dataSourceKind: "custom" | "builtin";
  seedRowCount: number;
  builtinCatalog?: string;
};

let cachedPresets: SceneCollectionPreset[] | null = null;
let presetsWatcher: FSWatcher | null = null;

export function invalidateSceneCollectionPresetsCache(): void {
  cachedPresets = null;
}

function loadPresets(): SceneCollectionPreset[] {
  if (cachedPresets) return cachedPresets;
  const { presets, errors } = loadSceneCollectionPresetsFromDisk();
  if (errors.length) {
    console.warn("[scene-collection-presets] 加载存在跳过项:\n", errors.join("\n"));
  }
  cachedPresets = presets;
  return cachedPresets;
}

export function ensureSceneCollectionPresetsWatcher(): void {
  if (presetsWatcher) return;
  try {
    presetsWatcher = watch(SCENE_COLLECTION_PRESETS_ROOT, { recursive: true }, () => {
      invalidateSceneCollectionPresetsCache();
    });
    presetsWatcher.on("error", () => {
      presetsWatcher?.close();
      presetsWatcher = null;
    });
  } catch {
    presetsWatcher = null;
  }
}

export function parseSceneQuery(
  scene: string | undefined
): { ok: true; scene: PayloadVariableScene } | { ok: false; message: string } {
  const raw = (scene ?? "").trim();
  if (!raw) return { ok: false, message: "缺少 query 参数 scene" };
  if (!isPayloadVariableScene(raw)) return { ok: false, message: `未知场景 scene=${raw}` };
  return { ok: true, scene: raw };
}

export function listSceneCollectionPresetSummaries(
  scene: PayloadVariableScene
): SceneCollectionPresetSummary[] {
  return loadPresets()
    .filter((p) => p.scene === scene)
    .map((p) => ({
      presetId: p.presetId,
      slotId: p.slotId,
      label: p.label,
      description: p.description,
      dataSourceKind: p.dataSourceKind === "builtin" ? "builtin" : "custom",
      seedRowCount: p.seedValues.length,
      builtinCatalog: p.builtinCatalog,
    }));
}

export function findSceneCollectionPresetById(
  scene: PayloadVariableScene,
  presetId: string
): SceneCollectionPreset | null {
  const id = presetId.trim();
  return loadPresets().find((p) => p.scene === scene && p.presetId === id) ?? null;
}

/** 按契约 slotId 解析当次列表取值（与线上一致：values[slotId] 为行数组） */
export function resolveSceneCollectionPresetRuntimeValues(
  preset: SceneCollectionPreset
): { slotId: string; values: Record<string, unknown> } {
  const def = buildPayloadSlotDefFromScenePreset(preset);
  const payload: EmailPayload = {
    schemaVersion: "1.0.0",
    slots: { [preset.slotId]: def },
    values: {},
  };
  const rows = resolveScenePresetCollectionValues(preset, payload, preset.slotId);
  return {
    slotId: preset.slotId,
    values: { [preset.slotId]: rows },
  };
}
