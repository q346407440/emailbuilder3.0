export type {
  SceneCollectionPreset,
  SceneCollectionPresetFile,
  SceneCollectionPresetValidationIssue,
} from "./types";
export {
  SCENE_COLLECTION_PRESET_SCHEMA_VERSION,
  validateSceneCollectionPresetFile,
} from "./types";
/** Node 专用：请从 `./loadFromDisk` 导入，勿经本入口（避免 Vite 客户端打入 node:fs） */
export { parseSceneCollectionPresetFile, isPayloadVariableScene } from "./parsePreset";
export {
  buildPayloadSlotDefFromScenePreset,
  buildCollectionDataSourceFromScenePreset,
  resolveScenePresetCollectionValues,
  resolveScenePresetFixedLength,
  scenePresetDataSourceKind,
  SCENE_BUILTIN_PRESET_DEFAULT_FIXED_LENGTH,
} from "./buildPresetCollection";

/**
 * 浏览器侧请使用 `src/api/sceneCollectionPresets.ts`（HTTP）读取内置变量；
 * 真源文件仍在 data/scene-collection-presets/<scene>/*.json，由服务端 API 暴露。
 */
