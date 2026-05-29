import type { PayloadVariableScene } from "../src/lib/payloadVariableScene";
import { parseSceneQuery } from "./sceneCollectionPresetsStore";

/** 场景内置标准变量目录项（预留；当前无落盘数据时返回空列表） */
export type SceneScalarPresetSummary = {
  presetId: string;
  slotId: string;
  label: string;
  description?: string;
  valueType: string;
};

export function listSceneScalarPresetSummaries(
  scene: PayloadVariableScene
): SceneScalarPresetSummary[] {
  void scene;
  // 后续：从 data/scene-scalar-presets/<scene>/*.json 加载
  return [];
}

export { parseSceneQuery };
