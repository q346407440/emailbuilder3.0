import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { SceneCollectionPreset } from "./types";
import { parseSceneCollectionPresetFile } from "./parsePreset";

export const SCENE_COLLECTION_PRESETS_ROOT = join(process.cwd(), "data", "scene-collection-presets");

/** 从 data/scene-collection-presets/<scene>/*.json 加载全部内置列表变量 */
export function loadSceneCollectionPresetsFromDisk(
  rootDir = SCENE_COLLECTION_PRESETS_ROOT
): { presets: SceneCollectionPreset[]; errors: string[] } {
  const presets: SceneCollectionPreset[] = [];
  const errors: string[] = [];

  let sceneDirs: string[];
  try {
    sceneDirs = readdirSync(rootDir).filter((name) => {
      const full = join(rootDir, name);
      return statSync(full).isDirectory();
    });
  } catch {
    return { presets: [], errors: [`无法读取目录：${rootDir}`] };
  }

  for (const scene of sceneDirs.sort()) {
    const sceneDir = join(rootDir, scene);
    const files = readdirSync(sceneDir)
      .filter((f) => f.endsWith(".json"))
      .sort();
    for (const file of files) {
      const filePath = join(sceneDir, file);
      let raw: unknown;
      try {
        raw = JSON.parse(readFileSync(filePath, "utf8"));
      } catch (e) {
        errors.push(`${filePath}：JSON 解析失败 — ${e instanceof Error ? e.message : String(e)}`);
        continue;
      }
      const result = parseSceneCollectionPresetFile(scene, filePath, raw);
      if ("error" in result) {
        errors.push(result.error);
        continue;
      }
      presets.push(result.preset);
    }
  }

  return { presets, errors };
}
