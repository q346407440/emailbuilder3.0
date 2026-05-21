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
};
