import type { CollectionDataSource } from "../collection-data-source";
import {
  DEFAULT_BUILTIN_ALBUM_LIST_CONFIG,
  DEFAULT_BUILTIN_PRODUCT_LIST_CONFIG,
  normalizeBuiltinAlbumListConfig,
  normalizeBuiltinProductListConfig,
} from "../collection-builtin-catalog-config";
import {
  DEFAULT_BUILTIN_COLLECTION_EXTRACT,
  normalizeBuiltinCollectionExtract,
} from "../collection-builtin-extract";
import {
  DEFAULT_BUILTIN_COLLECTION_SORT,
  normalizeBuiltinCollectionSortId,
} from "../collection-builtin-sort";
import type { EmailPayload, PayloadSlotDefinition } from "../../types/email";
import { padOrTrimCollectionValues, resolveCollectionFixedLength } from "../../lib/collectionDataSource";
import { resolveBuiltinCollectionItems } from "../../lib/resolveBuiltinCollectionItems";
import type { SceneCollectionPreset } from "./types";

export const SCENE_BUILTIN_PRESET_DEFAULT_FIXED_LENGTH = 4;

export function scenePresetDataSourceKind(
  preset: SceneCollectionPreset
): SceneCollectionPreset["dataSourceKind"] {
  return preset.dataSourceKind === "builtin" ? "builtin" : "custom";
}

export function buildCollectionDataSourceFromScenePreset(
  preset: SceneCollectionPreset
): CollectionDataSource {
  if (scenePresetDataSourceKind(preset) !== "builtin" || !preset.builtinCatalog) {
    return { type: "custom" };
  }
  const catalog = preset.builtinCatalog;
  const sort = normalizeBuiltinCollectionSortId(preset.sort);
  const extract = normalizeBuiltinCollectionExtract(preset.extract);
  const base = { type: "remote" as const, provider: "builtin" as const, catalog, sort };
  const withExtract =
    extract.kind === "similarTo" || extract.kind === "complement"
      ? { ...base, extract }
      : base;
  if (catalog === "products") {
    return {
      ...withExtract,
      productConfig: normalizeBuiltinProductListConfig(
        preset.productConfig ?? DEFAULT_BUILTIN_PRODUCT_LIST_CONFIG
      ),
    };
  }
  return {
    ...withExtract,
    albumConfig: normalizeBuiltinAlbumListConfig(
      preset.albumConfig ?? DEFAULT_BUILTIN_ALBUM_LIST_CONFIG
    ),
  };
}

export function resolveScenePresetFixedLength(preset: SceneCollectionPreset): number {
  if (preset.minItems !== undefined && preset.maxItems !== undefined && preset.minItems === preset.maxItems) {
    return preset.minItems;
  }
  if (preset.fixedLength !== undefined) return preset.fixedLength;
  if (scenePresetDataSourceKind(preset) === "builtin") {
    return SCENE_BUILTIN_PRESET_DEFAULT_FIXED_LENGTH;
  }
  return resolveCollectionFixedLength(preset.minItems, preset.maxItems);
}

export function buildPayloadSlotDefFromScenePreset(preset: SceneCollectionPreset): PayloadSlotDefinition {
  const def: PayloadSlotDefinition = {
    label: preset.label,
    valueType: "collection",
    description: preset.description,
    itemFields: preset.itemFields,
    dataSource: buildCollectionDataSourceFromScenePreset(preset),
    displayRulePreset: preset.displayRulePreset,
    displayRule: preset.displayRulePreset
      ? {
          keyField: preset.displayRulePreset.keyField,
          includeValues: preset.displayRulePreset.includeValues,
        }
      : undefined,
    sceneCollectionPresetId: preset.presetId,
    scene: preset.scene,
  };
  if (scenePresetDataSourceKind(preset) === "builtin") {
    const fixedLength = resolveScenePresetFixedLength(preset);
    def.minItems = fixedLength;
    def.maxItems = fixedLength;
  } else {
    if (preset.minItems !== undefined) def.minItems = preset.minItems;
    if (preset.maxItems !== undefined) def.maxItems = preset.maxItems;
  }
  return def;
}

/** 登记槽后解析 builtin 预览行，或直接使用 custom seedValues */
export function resolveScenePresetCollectionValues(
  preset: SceneCollectionPreset,
  payload: EmailPayload,
  slotId: string
): Record<string, unknown>[] {
  if (scenePresetDataSourceKind(preset) !== "builtin" || !preset.builtinCatalog) {
    return preset.seedValues.map((row) => ({ ...row }));
  }
  const fixedLength = resolveScenePresetFixedLength(preset);
  const dataSource = buildCollectionDataSourceFromScenePreset(preset);
  const ds =
    dataSource.type === "remote" && dataSource.provider === "builtin" ? dataSource : null;
  const result = resolveBuiltinCollectionItems({
    catalog: preset.builtinCatalog,
    itemFields: preset.itemFields,
    fixedLength,
    sort: ds?.sort,
    extract: ds?.extract,
    productConfig: ds?.productConfig,
    albumConfig: ds?.albumConfig,
    payload,
    slotId,
  });
  if (result.ok) return result.items;
  return padOrTrimCollectionValues([], fixedLength, preset.itemFields);
}
