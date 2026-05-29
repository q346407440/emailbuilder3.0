import type { BindingCollectionField, BindingInterpolationSlotValueType } from "../types/email";
import type { CollectionDataSource } from "./collection-data-source";

/** payload.json 顶层契约版本 */
export const PAYLOAD_SCHEMA_VERSION = "1.0.0" as const;

/** template.bindings / visibility 上 variable 槽的 valueType（interpolate 原子槽不支持 number/boolean，见 validate） */
export type SlotValueType = "string" | "url" | "image" | "color" | "number" | "boolean" | "collection";

/** collection 槽 itemFields[].valueType（标量与 STANDARD_SCALAR 一致 + 子列表） */
export type CollectionItemFieldValueType = "string" | "number" | "url" | "collection";

/** interpolate 槽只允许标量值，避免列表对象被拼进文本字段。 */
export type InterpolationSlotValueType = BindingInterpolationSlotValueType;

export type PayloadContractIssue = { path: string; reason: string };

/** collection 槽展示规则（运行时按规则从外部全量数据投影可展示子集） */
export type CollectionDisplayRule = {
  /** 列表项中用于匹配的字段名（默认 type） */
  keyField?: string;
  /** 白名单：仅保留命中的字段值 */
  includeValues?: string[];
  /** 黑名单：移除命中的字段值 */
  excludeValues?: string[];
};

/** collection 展示规则预设（用于场景内置变量的默认配置与候选值） */
export type CollectionDisplayRulePreset = {
  keyField: string;
  includeValues: string[];
  /** 可选：白名单值的显示名映射（用于前端多选展示） */
  options?: Array<{ value: string; label: string }>;
};

/**
 * payload.json `slots` 中单条变量目录项（唯一真源：名称、类型、collection 字段等）。
 * template.bindings 仅通过 slotId 引用，不再重复维护 label 作为真源。
 */
export type PayloadSlotDefinition = {
  label: string;
  valueType: SlotValueType;
  description?: string;
  itemFields?: BindingCollectionField[];
  minItems?: number;
  maxItems?: number;
  /** collection 专用：数据来源（自定义 / 内置 catalog + 可选 sort） */
  dataSource?: CollectionDataSource;
  /** collection 专用：展示规则（按字段白/黑名单过滤并限制上限） */
  displayRule?: CollectionDisplayRule;
  /** collection 专用：展示规则预设（内置变量默认字段与白名单候选） */
  displayRulePreset?: CollectionDisplayRulePreset;
  /**
   * 来自场景内置列表 API（data/scene-collection-presets）的槽；
   * 预览数据由接口/runtime-values 提供，不走「粘贴 JSON + 字段关联」。
   */
  sceneCollectionPresetId?: string;
  /** 与 sceneCollectionPresetId 配套的场景标识 */
  scene?: "loyalty-internal-admin" | "loyalty-merchant-admin";
};

/** 运行期槽定义视图（由 payload.slots 或历史 template 扫描派生） */
export type ExternalSlotDefinition = {
  slotId: string;
  valueType: SlotValueType;
  itemFields?: BindingCollectionField[];
  minItems?: number;
  maxItems?: number;
  label?: string;
  description?: string;
  dataSource?: CollectionDataSource;
  displayRule?: CollectionDisplayRule;
  displayRulePreset?: CollectionDisplayRulePreset;
};
