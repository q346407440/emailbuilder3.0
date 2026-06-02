import type { BindingCollectionField } from "../../types/email";
import {
  PAYLOAD_VARIABLE_SCENE_OPTIONS,
  type PayloadVariableScene,
} from "../../lib/payloadVariableScene";
import {
  BUILTIN_ALBUM_ITEM_FIELDS,
  BUILTIN_PRODUCT_SPU_ITEM_FIELDS,
} from "../builtin-collection-item-fields";
import { isBuiltinCollectionCatalogId } from "../collection-data-source";
import {
  normalizeBuiltinAlbumListConfig,
  normalizeBuiltinProductListConfig,
} from "../collection-builtin-catalog-config";
import { isBuiltinCollectionSortId, normalizeBuiltinCollectionSortId } from "../collection-builtin-sort";
import { SLOT_ID_PATTERN } from "../value-types";
import type { SceneCollectionPreset, SceneCollectionPresetFile } from "./types";
import { SCENE_COLLECTION_PRESET_SCHEMA_VERSION, validateSceneCollectionPresetFile } from "./types";

const SCENE_IDS = new Set(PAYLOAD_VARIABLE_SCENE_OPTIONS.map((o) => o.value));

export function isPayloadVariableScene(value: string): value is PayloadVariableScene {
  return SCENE_IDS.has(value as PayloadVariableScene);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseItemField(raw: unknown, path: string): BindingCollectionField | null {
  if (!isRecord(raw) || typeof raw.key !== "string" || typeof raw.label !== "string") {
    return null;
  }
  if (raw.valueType === "collection") {
    if (!Array.isArray(raw.itemFields)) return null;
    const nested = raw.itemFields
      .map((f, i) => parseItemField(f, `${path}.itemFields[${i}]`))
      .filter((f): f is BindingCollectionField => f !== null);
    if (nested.length === 0) return null;
    return {
      key: raw.key,
      label: raw.label,
      valueType: "collection",
      required: raw.required === true,
      itemFields: nested,
      minItems: typeof raw.minItems === "number" ? raw.minItems : undefined,
      maxItems: typeof raw.maxItems === "number" ? raw.maxItems : undefined,
    };
  }
  const valueType = raw.valueType;
  if (valueType !== "string" && valueType !== "number" && valueType !== "url" && valueType !== "image") {
    return null;
  }
  return {
    key: raw.key,
    label: raw.label,
    valueType,
    required: raw.required === true,
    placeholder: typeof raw.placeholder === "string" ? raw.placeholder : undefined,
  };
}

/** 将磁盘 JSON 解析为场景内置列表预设；失败返回错误信息 */
export function parseSceneCollectionPresetFile(
  scene: string,
  filePath: string,
  raw: unknown
): { preset: SceneCollectionPreset } | { error: string } {
  if (!isPayloadVariableScene(scene)) {
    return { error: `${filePath}：未知场景目录「${scene}」` };
  }
  if (!isRecord(raw)) {
    return { error: `${filePath}：根节点须为对象` };
  }

  const shapeIssues = validateSceneCollectionPresetFile(raw);
  if (shapeIssues.length > 0) {
    return { error: `${filePath}：${shapeIssues[0]!.path}: ${shapeIssues[0]!.reason}` };
  }

  const presetId = typeof raw.presetId === "string" ? raw.presetId.trim() : "";
  const slotId = typeof raw.slotId === "string" ? raw.slotId.trim() : "";
  const label = typeof raw.label === "string" ? raw.label.trim() : "";

  if (!presetId) return { error: `${filePath}：缺少 presetId` };
  if (!slotId || !SLOT_ID_PATTERN.test(slotId)) {
    return { error: `${filePath}：slotId 非法或缺失` };
  }
  if (!label) return { error: `${filePath}：缺少 label` };

  const dataSourceKind = raw.dataSourceKind === "builtin" ? "builtin" : "custom";
  const builtinCatalog =
    typeof raw.builtinCatalog === "string" && isBuiltinCollectionCatalogId(raw.builtinCatalog)
      ? raw.builtinCatalog
      : undefined;

  if (dataSourceKind === "builtin") {
    if (!builtinCatalog) {
      return { error: `${filePath}：dataSourceKind=builtin 时须声明 builtinCatalog（products | albums）` };
    }
  } else if (raw.builtinCatalog !== undefined) {
    return { error: `${filePath}：builtinCatalog 仅可与 dataSourceKind=builtin 同时使用` };
  }

  let itemFields: BindingCollectionField[] = [];
  if (Array.isArray(raw.itemFields) && raw.itemFields.length > 0) {
    for (let i = 0; i < raw.itemFields.length; i++) {
      const field = parseItemField(raw.itemFields[i], `${filePath}.itemFields[${i}]`);
      if (!field) {
        return { error: `${filePath}：itemFields[${i}] 格式非法` };
      }
      itemFields.push(field);
    }
  } else if (dataSourceKind === "builtin" && builtinCatalog === "products") {
    itemFields = structuredClone(BUILTIN_PRODUCT_SPU_ITEM_FIELDS);
  } else if (dataSourceKind === "builtin" && builtinCatalog === "albums") {
    itemFields = structuredClone(BUILTIN_ALBUM_ITEM_FIELDS);
  } else {
    return { error: `${filePath}：itemFields 须为非空数组（builtin 商品/专辑可省略并由契约注入）` };
  }

  if (!Array.isArray(raw.seedValues)) {
    return { error: `${filePath}：seedValues 须为数组` };
  }

  const seedValues = raw.seedValues.filter((row) => isRecord(row)) as Record<string, unknown>[];
  if (raw.displayRulePreset !== undefined) {
    return {
      error: `${filePath}：displayRulePreset 已废弃，请删除；列表显隐改由 payload.slots.itemVisibility 配置`,
    };
  }

  const file: SceneCollectionPresetFile = {
    schemaVersion: SCENE_COLLECTION_PRESET_SCHEMA_VERSION,
    presetId,
    slotId,
    label,
    description: typeof raw.description === "string" ? raw.description : undefined,
    dataSourceKind,
    builtinCatalog,
    productConfig:
      dataSourceKind === "builtin" && builtinCatalog === "products"
        ? normalizeBuiltinProductListConfig(
            isRecord(raw.productConfig)
              ? (raw.productConfig as SceneCollectionPresetFile["productConfig"])
              : undefined
          )
        : undefined,
    albumConfig:
      dataSourceKind === "builtin" && builtinCatalog === "albums"
        ? normalizeBuiltinAlbumListConfig(
            isRecord(raw.albumConfig)
              ? (raw.albumConfig as SceneCollectionPresetFile["albumConfig"])
              : undefined
          )
        : undefined,
    sort:
      typeof raw.sort === "string" && isBuiltinCollectionSortId(raw.sort)
        ? normalizeBuiltinCollectionSortId(raw.sort)
        : undefined,
    fixedLength: typeof raw.fixedLength === "number" ? raw.fixedLength : undefined,
    itemFields,
    minItems: typeof raw.minItems === "number" ? raw.minItems : undefined,
    maxItems: typeof raw.maxItems === "number" ? raw.maxItems : undefined,
    seedValues,
  };

  return {
    preset: {
      ...file,
      scene,
    },
  };
}
