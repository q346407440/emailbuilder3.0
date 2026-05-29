import type { BindingCollectionField } from "../../types/email";
import type { PayloadVariableScene } from "../../lib/payloadVariableScene";
import type { BuiltinAlbumListConfig, BuiltinProductListConfig } from "../collection-builtin-catalog-config";
import type { BuiltinCollectionCatalogId } from "../collection-data-source";
import type { BuiltinCollectionExtract } from "../collection-builtin-extract";
import type { BuiltinCollectionSortId } from "../collection-builtin-sort";
import type { CollectionDisplayRulePreset } from "../types";

export type SceneCollectionPresetDataSourceKind = "custom" | "builtin";

/**
 * data/scene-collection-presets/<scene>/<name>.json 文件形态（不含 scene，由目录名推导）
 */
export type SceneCollectionPresetFile = {
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
  extract?: BuiltinCollectionExtract;
  /** 列表固定展示条数（builtin 解析预览用；未写时创建变量默认 4） */
  fixedLength?: number;
  itemFields: BindingCollectionField[];
  minItems?: number;
  maxItems?: number;
  /** 展示规则预设：仅一份，供内置变量的匹配字段和白名单默认值使用 */
  displayRulePreset?: CollectionDisplayRulePreset;
  seedValues: Record<string, unknown>[];
};

/** 场景内置列表变量预设（加载后写入 payload.slots + payload.values） */
export type SceneCollectionPreset = SceneCollectionPresetFile & {
  scene: PayloadVariableScene;
};
