import type { BindingCollectionField } from "../../types/email";
import type { PayloadVariableScene } from "../../lib/payloadVariableScene";
import type { BuiltinAlbumListConfig, BuiltinProductListConfig } from "../collection-builtin-catalog-config";
import type { BuiltinCollectionCatalogId } from "../collection-data-source";
import type { BuiltinCollectionSortId } from "../collection-builtin-sort";

export const SCENE_COLLECTION_PRESET_SCHEMA_VERSION = "1.0.0" as const;

export type SceneCollectionPresetDataSourceKind = "custom" | "builtin";

export type SceneCollectionPresetValidationIssue = {
  path: string;
  reason: string;
};

/**
 * data/scene-collection-presets/<scene>/<name>.json 文件形态（不含 scene，由目录名推导）
 */
export type SceneCollectionPresetFile = {
  schemaVersion: typeof SCENE_COLLECTION_PRESET_SCHEMA_VERSION;
  presetId: string;
  slotId: string;
  label: string;
  description?: string;
  /** 默认 custom；商家端商品/专辑为 builtin */
  dataSourceKind?: SceneCollectionPresetDataSourceKind;
  /** dataSourceKind=builtin 时必填 */
  builtinCatalog?: BuiltinCollectionCatalogId;
  productConfig?: BuiltinProductListConfig;
  albumConfig?: BuiltinAlbumListConfig;
  sort?: BuiltinCollectionSortId;
  /** 列表固定展示条数（builtin 解析预览用；未写时创建变量默认 4） */
  fixedLength?: number;
  itemFields: BindingCollectionField[];
  minItems?: number;
  maxItems?: number;
  seedValues: Record<string, unknown>[];
};

/** 场景内置列表变量预设（加载后写入 payload.slots + payload.values） */
export type SceneCollectionPreset = SceneCollectionPresetFile & {
  scene: PayloadVariableScene;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** 校验单个 scene-collection-presets JSON 文件 */
export function validateSceneCollectionPresetFile(raw: unknown): SceneCollectionPresetValidationIssue[] {
  const issues: SceneCollectionPresetValidationIssue[] = [];
  if (!isRecord(raw)) {
    return [{ path: "", reason: "必须为对象" }];
  }
  if (raw.schemaVersion !== SCENE_COLLECTION_PRESET_SCHEMA_VERSION) {
    issues.push({
      path: "schemaVersion",
      reason: `schemaVersion 必须为 ${SCENE_COLLECTION_PRESET_SCHEMA_VERSION}`,
    });
  }
  if (typeof raw.presetId !== "string" || !raw.presetId.trim()) {
    issues.push({ path: "presetId", reason: "presetId 为必填字符串" });
  }
  if (typeof raw.slotId !== "string" || !raw.slotId.trim()) {
    issues.push({ path: "slotId", reason: "slotId 为必填字符串" });
  }
  if (typeof raw.label !== "string" || !raw.label.trim()) {
    issues.push({ path: "label", reason: "label 为必填字符串" });
  }
  const dataSourceKind = raw.dataSourceKind === "builtin" ? "builtin" : "custom";
  const hasBuiltinCatalog = typeof raw.builtinCatalog === "string" && raw.builtinCatalog.trim();
  if (!Array.isArray(raw.itemFields)) {
    if (dataSourceKind !== "builtin" || !hasBuiltinCatalog) {
      issues.push({ path: "itemFields", reason: "itemFields 必须为数组（builtin 商品/专辑可省略并由契约注入）" });
    }
  }
  if (!Array.isArray(raw.seedValues)) {
    issues.push({ path: "seedValues", reason: "seedValues 必须为数组" });
  }
  if (raw.extract !== undefined) {
    issues.push({
      path: "extract",
      reason: "extract 已废弃并禁止持久化；请删除该字段，改用 sort: { strategy, targetSlotId }",
    });
  }
  return issues;
}
