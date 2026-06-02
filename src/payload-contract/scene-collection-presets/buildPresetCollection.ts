import type { CollectionDataSource } from "../collection-data-source";
import {
  DEFAULT_BUILTIN_ALBUM_LIST_CONFIG,
  DEFAULT_BUILTIN_PRODUCT_LIST_CONFIG,
  normalizeBuiltinAlbumListConfig,
  normalizeBuiltinProductListConfig,
} from "../collection-builtin-catalog-config";
import {
  normalizeBuiltinSortPolicy,
  writeSortPolicyToDataSource,
} from "../collection-builtin-sort-policy";
import type { EmailPayload, PayloadSlotDefinition } from "../../types/email";
import { padOrTrimCollectionValues, resolveCollectionFixedLength } from "../../lib/collectionDataSource";
import { resolveBuiltinCollectionItemsForAnchor } from "../../lib/resolveBuiltinCollectionItems";
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
  const sortPolicy = normalizeBuiltinSortPolicy(preset.sort);
  const base = {
    type: "remote" as const,
    provider: "builtin" as const,
    catalog,
    sort: writeSortPolicyToDataSource(sortPolicy),
  };
  if (catalog === "products") {
    return {
      ...base,
      productConfig: normalizeBuiltinProductListConfig(
        preset.productConfig ?? DEFAULT_BUILTIN_PRODUCT_LIST_CONFIG
      ),
    };
  }
  return {
    ...base,
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
  const sortPolicy = normalizeBuiltinSortPolicy(preset.sort);
  const result = resolveBuiltinCollectionItemsForAnchor({
    catalog: preset.builtinCatalog,
    itemFields: preset.itemFields,
    fixedLength,
    sortPolicy,
    productConfig: ds?.productConfig,
    albumConfig: ds?.albumConfig,
    payload,
    slotId,
  });
  if (result.ok) return result.items;
  return padOrTrimCollectionValues([], fixedLength, preset.itemFields);
}
