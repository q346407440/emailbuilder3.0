import type { SceneCollectionPreset } from "./types";
import { parseSceneCollectionPresetFile } from "./parsePreset";

/** Vite 构建时打包 data/scene-collection-presets/<scene>/*.json */
const presetModules = import.meta.glob("../../../data/scene-collection-presets/*/*.json", {
  eager: true,
  import: "default",
}) as Record<string, unknown>;

function loadPresetsFromCatalog(): SceneCollectionPreset[] {
  const presets: SceneCollectionPreset[] = [];
  const paths = Object.keys(presetModules).sort();
  for (const path of paths) {
    const raw = presetModules[path];
    const scene = path.match(/scene-collection-presets\/([^/]+)\//)?.[1];
    if (!scene) continue;
    const result = parseSceneCollectionPresetFile(scene, path, raw);
    if ("error" in result) {
      console.warn(`[scene-collection-presets] 跳过无效预设 ${path}: ${result.error}`);
      continue;
    }
    presets.push(result.preset);
  }
  return presets;
}

/**
 * @deprecated 浏览器请走 GET /api/v1/scene-collection-presets；仅保留给尚未迁移的构建期引用。
 */
export const SCENE_COLLECTION_PRESETS: SceneCollectionPreset[] = loadPresetsFromCatalog();
