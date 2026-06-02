import {
  SCENE_COLLECTION_PRESET_SCHEMA_VERSION,
  validateSceneCollectionPresetFile,
} from "../../payload-contract/scene-collection-presets";
import type { SchemaArtifactDef } from "../types";

export const sceneCollectionPresetArtifact: SchemaArtifactDef = {
  id: "sceneCollectionPreset",
  label: "scene-collection-presets JSON",
  currentVersion: SCENE_COLLECTION_PRESET_SCHEMA_VERSION,
  diskPatterns: ["data/scene-collection-presets/*/*.json"],
  validate: (raw) => validateSceneCollectionPresetFile(raw),
  migrateScripts: {
    preview: "migrate:scene-collection-preset-schema-version",
    write: "migrate:scene-collection-preset-schema-version:write",
  },
};
