import type { BindingCollectionField, BindingInterpolationSlotValueType } from "../types/email";
import type { CollectionDataSource } from "./collection-data-source";
import type {
  BuiltinVariableLengthPolicy,
  BuiltinVariableScope,
} from "./builtin-structure-catalog";

/** payload.json 顶层契约版本 */
export const PAYLOAD_SCHEMA_VERSION = "1.0.0" as const;

/** template.bindings / visibility 上 variable 槽的 valueType（interpolate 原子槽不支持 number/boolean，见 validate） */
export type SlotValueType =
  | "string"
  | "url"
  | "image"
  | "color"
  | "number"
  | "boolean"
  | "object"
  | "collection";

/** collection 槽 itemFields[].valueType（标量与 STANDARD_SCALAR 一致 + 子列表） */
export type CollectionItemFieldValueType = "string" | "number" | "url" | "collection";

/** interpolate 槽只允许标量值，避免列表对象被拼进文本字段。 */
export type InterpolationSlotValueType = BindingInterpolationSlotValueType;

export type PayloadContractIssue = { path: string; reason: string };

/**
 * payload.json `slots` 中单条变量目录项（唯一真源：名称、类型、collection 字段等）。
 * template.bindings 仅通过 slotId 引用，不再重复维护 label 作为真源。
 */
export type PayloadSlotDefinition = {
  label: string;
  valueType: SlotValueType;
  description?: string;
  /** object 槽字段目录（仅标量列；values 为单个对象，非数组） */
  objectFields?: BindingCollectionField[];
  itemFields?: BindingCollectionField[];
  minItems?: number;
  maxItems?: number;
  /** collection 专用：数据来源（自定义 / 内置 catalog + 可选 sort） */
  dataSource?: CollectionDataSource;
  /**
   * collection 专用：按行下标控制是否参与 repeat/画布（true=展示，false=不展示；缺省为展示）
   */
  itemVisibility?: boolean[];
  /**
   * 来自场景内置列表 API（data/scene-collection-presets）的槽；
   * 预览数据由接口/runtime-values 提供，不走「粘贴 JSON + 字段关联」。
   */
  sceneCollectionPresetId?: string;
  /** 与 sceneCollectionPresetId 配套的场景标识 */
  scene?: "loyalty-internal-admin" | "loyalty-merchant-admin";
  /** 内置数据结构目录 id；新建变量统一从 src/payload-contract/builtin-structure-catalog 派生。 */
  builtinStructureId?: string;
  /** 内置结构范围冗余快照，便于 UI 展示；真源仍为 builtinStructureId 对应目录项。 */
  builtinScope?: BuiltinVariableScope;
  /** 列表长度策略快照：专用结构可声明 locked，通用列表通常 editable。 */
  lengthPolicy?: BuiltinVariableLengthPolicy;
};

/** 运行期槽定义视图（由 payload.slots 或历史 template 扫描派生） */
export type ExternalSlotDefinition = {
  slotId: string;
  valueType: SlotValueType;
  objectFields?: BindingCollectionField[];
  itemFields?: BindingCollectionField[];
  minItems?: number;
  maxItems?: number;
  label?: string;
  description?: string;
  dataSource?: CollectionDataSource;
  itemVisibility?: boolean[];
};
