import type {
  BindingCollectionField,
  BindingSpec,
  EmailPayload,
  EmailTemplate,
  PayloadSlotDefinition,
} from "../types/email";
import { buildPayloadSlotRegistry } from "./slot-registry";
import type { ExternalSlotDefinition } from "./types";
import { getBuiltinStructureDefinition } from "./builtin-structure-catalog";
import type { PayloadContractIssue, SlotValueType } from "./types";
import {
  BUILTIN_COLLECTION_CATALOG_IDS,
  isBuiltinCollectionCatalogId,
} from "./collection-data-source";
import type { CollectionDataSource } from "./collection-data-source";
import {
  canDeclareCollectionItemFieldType,
  COLLECTION_ITEM_FIELDS_NESTING_ERROR,
  findCollectionFieldByPath,
} from "./collection-item-fields";
import { isVisibilityConditionValueType } from "../visibility-contract";
import {
  isBuiltinDerivedSortStrategy,
  isSortPolicyObject,
  normalizeBuiltinSortPolicy,
  sortPolicyTargetSlotId,
} from "./collection-builtin-sort-policy";
import { isBuiltinCollectionSortId } from "./collection-builtin-sort";
import { isBuiltinProductRangeMode } from "./collection-builtin-catalog-config";
import { PAYLOAD_SCHEMA_VERSION } from "./types";
import {
  COLLECTION_ITEM_FIELD_TYPE_SET,
  isCollectionItemFieldType,
  SLOT_ID_PATTERN,
  SLOT_VALUE_TYPE_SET,
} from "./value-types";
import { isObjectFieldScalarType, OBJECT_FIELD_SCALAR_TYPES } from "./object-fields";

const COLLECTION_FIXED_LENGTH_MIN = 1;
const COLLECTION_FIXED_LENGTH_MAX = 10;

function issue(path: string, reason: string): PayloadContractIssue {
  return { path, reason };
}

function validateObjectFieldDefinitions(
  path: string,
  fields: unknown
): PayloadContractIssue[] {
  const issues: PayloadContractIssue[] = [];
  if (!Array.isArray(fields) || fields.length === 0) {
    issues.push(issue(path, "object 槽须声明非空 objectFields"));
    return issues;
  }
  const seen = new Set<string>();
  for (let i = 0; i < fields.length; i++) {
    const fieldPath = `${path}.${i}`;
    const raw = fields[i];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      issues.push(issue(fieldPath, "objectFields 项必须为对象"));
      continue;
    }
    const field = raw as BindingCollectionField;
    if (!field.key || typeof field.key !== "string" || !field.key.trim()) {
      issues.push(issue(`${fieldPath}.key`, "key 必须为非空字符串"));
    } else if (seen.has(field.key)) {
      issues.push(issue(`${fieldPath}.key`, `objectFields 中 key「${field.key}」重复`));
    } else {
      seen.add(field.key);
    }
    if (!field.label || typeof field.label !== "string" || !field.label.trim()) {
      issues.push(issue(`${fieldPath}.label`, "label 必须为非空字符串"));
    }
    const vt = field.valueType;
    if (!isObjectFieldScalarType(vt)) {
      issues.push(
        issue(
          `${fieldPath}.valueType`,
          `object 字段 valueType 仅支持 ${OBJECT_FIELD_SCALAR_TYPES.join("/")}，收到「${String(vt)}」`
        )
      );
    }
    if ("itemFields" in field && field.itemFields !== undefined) {
      issues.push(issue(`${fieldPath}.itemFields`, "object 字段不可嵌套 itemFields"));
    }
  }
  return issues;
}

function validateObjectFieldValue(
  field: BindingCollectionField,
  value: unknown,
  path: string
): PayloadContractIssue[] {
  return validateCollectionItemFieldValue(field, value, path);
}

function validateObjectValue(
  spec: { objectFields?: BindingCollectionField[] },
  value: unknown,
  path: string
): PayloadContractIssue[] {
  const issues: PayloadContractIssue[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    issues.push(issue(path, "object 槽的值必须为对象（非数组）"));
    return issues;
  }
  const objectFields = spec.objectFields;
  if (!objectFields || objectFields.length === 0) {
    issues.push(issue(path, "object 槽在 payload.slots 中未声明 objectFields，无法校验取值"));
    return issues;
  }
  const record = value as Record<string, unknown>;
  for (const field of objectFields) {
    issues.push(...validateObjectFieldValue(field, record[field.key], `${path}.${field.key}`));
  }
  return issues;
}

function validateCollectionDataSource(
  path: string,
  dataSource: unknown
): PayloadContractIssue[] {
  const issues: PayloadContractIssue[] = [];
  if (dataSource === undefined) return issues;
  if (!dataSource || typeof dataSource !== "object") {
    issues.push(issue(path, "dataSource 必须为对象"));
    return issues;
  }
  const ds = dataSource as CollectionDataSource;
  if (ds.type === "custom") {
    return issues;
  }
  if (ds.type !== "remote") {
    issues.push(issue(`${path}.type`, "dataSource.type 仅支持 custom 或 remote"));
    return issues;
  }
  const provider = (ds as { provider?: string }).provider;
  if (provider === "http") {
    issues.push(
      issue(
        `${path}.provider`,
        "provider「http」已废弃，请改为 type: custom 或 remote + provider: builtin"
      )
    );
    return issues;
  }
  if (ds.provider === "builtin") {
    if (!isBuiltinCollectionCatalogId(ds.catalog)) {
      issues.push(
        issue(
          `${path}.catalog`,
          `catalog 仅支持 ${BUILTIN_COLLECTION_CATALOG_IDS.join(" / ")}`
        )
      );
    }
    if (ds.sort !== undefined) {
      if (typeof ds.sort === "string") {
        if (!isBuiltinCollectionSortId(ds.sort)) {
          issues.push(
            issue(
              `${path}.sort`,
              "sort 须为合法常规策略字符串，或 { strategy } 对象"
            )
          );
        }
      } else if (isSortPolicyObject(ds.sort)) {
        const strategy = String(ds.sort.strategy ?? "");
        if (isBuiltinDerivedSortStrategy(strategy)) {
          issues.push(
            issue(
              `${path}.sort.strategy`,
              "相似品/搭配品排序已移除，请改用常规排序（如 catalogOrder、nameAsc 等）"
            )
          );
        } else if (!isBuiltinCollectionSortId(strategy)) {
          issues.push(
            issue(
              `${path}.sort.strategy`,
              "sort.strategy 须为常规排序 id"
            )
          );
        }
      } else {
        issues.push(issue(`${path}.sort`, "sort 须为字符串或策略对象"));
      }
    }
    if ((ds as { listSource?: unknown }).listSource !== undefined) {
      issues.push(
        issue(
          `${path}.listSource`,
          "listSource 已废弃，请删除；子列表请用 itemFields 嵌套，并在列表绑定中选择子列表路径"
        )
      );
    }

    if ((ds as { extract?: unknown }).extract !== undefined) {
      issues.push(
        issue(
          `${path}.extract`,
          "extract 已废弃并禁止持久化；请删除该字段，改用 sort: { strategy, targetSlotId }"
        )
      );
    }

    if (ds.catalog === "products" && (ds as { productConfig?: unknown }).productConfig !== undefined) {
      const pc = (ds as { productConfig?: Record<string, unknown> }).productConfig;
      if (!pc || typeof pc !== "object") {
        issues.push(issue(`${path}.productConfig`, "productConfig 须为对象"));
      } else {
        const rowGranularity = String(pc.rowGranularity ?? "spu");
        if (rowGranularity === "sku") {
          issues.push(
            issue(
              `${path}.productConfig.rowGranularity`,
              "列表行粒度 sku 已废弃；商品列表固定为 SPU，SKU 由模板嵌套 repeat 控制"
            )
          );
        } else if (pc.rowGranularity !== undefined && rowGranularity !== "spu") {
          issues.push(
            issue(`${path}.productConfig.rowGranularity`, "rowGranularity 仅支持 spu（可省略，默认 spu）")
          );
        }
        if ((pc.productSelectionScope as unknown) !== undefined) {
          const scope = String(pc.productSelectionScope);
          if (scope !== "full" && scope !== "spuOnly") {
            issues.push(
              issue(`${path}.productConfig.productSelectionScope`, "productSelectionScope 仅支持 full / spuOnly")
            );
          }
        }
        if ((pc.skuSelection as unknown) !== undefined) {
          const skuSel = pc.skuSelection;
          if (
            !Array.isArray(skuSel) ||
            skuSel.some((k) => typeof k !== "string" || !String(k).includes("::"))
          ) {
            issues.push(
              issue(`${path}.productConfig.skuSelection`, "skuSelection 须为 spuId::skuId 格式的字符串数组")
            );
          }
        }
        if (!isBuiltinProductRangeMode(String(pc.rangeMode ?? ""))) {
          issues.push(
            issue(`${path}.productConfig.rangeMode`, "rangeMode 仅支持 freeSelect / allProducts / byCollection")
          );
        }
      }
    }

    if (ds.catalog === "albums" && (ds as { albumConfig?: unknown }).albumConfig !== undefined) {
      const ac = (ds as { albumConfig?: { selectedAlbumIds?: unknown } }).albumConfig;
      if (!ac || typeof ac !== "object") {
        issues.push(issue(`${path}.albumConfig`, "albumConfig 须为对象"));
      } else if (
        ac.selectedAlbumIds !== undefined &&
        (!Array.isArray(ac.selectedAlbumIds) ||
          ac.selectedAlbumIds.some((id) => typeof id !== "string"))
      ) {
        issues.push(issue(`${path}.albumConfig.selectedAlbumIds`, "selectedAlbumIds 须为字符串数组"));
      }
    }

    return issues;
  }
  issues.push(issue(`${path}.provider`, "remote.provider 仅支持 builtin"));
  return issues;
}

function validateCollectionItemVisibility(path: string, raw: unknown): PayloadContractIssue[] {
  const issues: PayloadContractIssue[] = [];
  if (raw === undefined) return issues;
  if (!Array.isArray(raw)) {
    issues.push(issue(path, "itemVisibility 须为布尔数组"));
    return issues;
  }
  for (let i = 0; i < raw.length; i++) {
    if (typeof raw[i] !== "boolean") {
      issues.push(issue(`${path}[${i}]`, "itemVisibility 每项须为 boolean"));
    }
  }
  return issues;
}

function validateDeprecatedCollectionDisplayFields(
  path: string,
  slot: PayloadSlotDefinition
): PayloadContractIssue[] {
  const issues: PayloadContractIssue[] = [];
  const legacy = slot as PayloadSlotDefinition & {
    displayRule?: unknown;
    displayRulePreset?: unknown;
  };
  if (legacy.displayRule !== undefined) {
    issues.push(
      issue(`${path}.displayRule`, "displayRule 已废弃，请改用 itemVisibility（按行下标控制是否展示）")
    );
  }
  if (legacy.displayRulePreset !== undefined) {
    issues.push(
      issue(
        `${path}.displayRulePreset`,
        "displayRulePreset 已废弃，请改用 payload.slots 上的 itemVisibility"
      )
    );
  }
  return issues;
}

function validateScalarSlotValue(
  valueType: Exclude<SlotValueType, "collection">,
  value: unknown,
  path: string
): PayloadContractIssue[] {
  if (valueType === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return [issue(path, "number 槽的值必须为有限数值（JSON 数字，非字符串）")];
    }
    return [];
  }
  if (valueType === "boolean") {
    if (typeof value !== "boolean") {
      return [issue(path, "boolean 槽的值必须为布尔值 true/false")];
    }
    return [];
  }
  if (typeof value !== "string") {
    return [issue(path, `${valueType} 槽的值必须为字符串`)];
  }
  return [];
}

function validateCollectionItemFieldDefinitions(
  path: string,
  itemFields: BindingCollectionField[] | undefined,
  collectionTypeDepth = 0
): PayloadContractIssue[] {
  const issues: PayloadContractIssue[] = [];
  if (!Array.isArray(itemFields) || itemFields.length === 0) {
    issues.push(issue(path, "itemFields 若声明必须为非空数组"));
    return issues;
  }
  const keys = new Set<string>();
  itemFields.forEach((field, fieldIndex) => {
    const fieldPath = `${path}.${fieldIndex}`;
    if (!field.key || typeof field.key !== "string" || !SLOT_ID_PATTERN.test(field.key)) {
      issues.push(issue(`${fieldPath}.key`, "数组项字段 key 必须为字母开头的标识符"));
    } else if (keys.has(field.key)) {
      issues.push(issue(`${fieldPath}.key`, "数组项字段 key 必须唯一"));
    } else {
      keys.add(field.key);
    }
    if (!field.label || typeof field.label !== "string") {
      issues.push(issue(`${fieldPath}.label`, "数组项字段 label 必须为非空字符串"));
    }
    if (!isCollectionItemFieldType(field.valueType)) {
      issues.push(
        issue(
          `${fieldPath}.valueType`,
          `数组项字段类型仅支持 ${[...COLLECTION_ITEM_FIELD_TYPE_SET].join("/")}`
        )
      );
      return;
    }
    if (field.valueType === "collection") {
      if (!canDeclareCollectionItemFieldType(collectionTypeDepth)) {
        issues.push(issue(`${fieldPath}.valueType`, COLLECTION_ITEM_FIELDS_NESTING_ERROR));
        return;
      }
      issues.push(
        ...validateCollectionItemFieldDefinitions(
          `${fieldPath}.itemFields`,
          field.itemFields,
          collectionTypeDepth + 1
        )
      );
      if (
        field.minItems !== undefined &&
        (!Number.isInteger(field.minItems) || field.minItems < 0)
      ) {
        issues.push(issue(`${fieldPath}.minItems`, "minItems 必须为非负整数"));
      }
      if (
        field.maxItems !== undefined &&
        (!Number.isInteger(field.maxItems) || field.maxItems < 1)
      ) {
        issues.push(issue(`${fieldPath}.maxItems`, "maxItems 必须为正整数"));
      }
      if (
        field.minItems !== undefined &&
        field.maxItems !== undefined &&
        field.minItems > field.maxItems
      ) {
        issues.push(issue(`${fieldPath}.maxItems`, "maxItems 不能小于 minItems"));
      }
      issues.push(...validateCollectionDataSource(`${fieldPath}.dataSource`, field.dataSource));
    }
  });
  return issues;
}

function validateCollectionItemFieldValue(
  field: BindingCollectionField,
  value: unknown,
  path: string
): PayloadContractIssue[] {
  const issues: PayloadContractIssue[] = [];
  if (field.required && (value === undefined || value === null || value === "")) {
    issues.push(issue(path, `必填字段「${field.key}」不能为空`));
    return issues;
  }
  if (field.valueType === "collection") {
    if (
      field.required &&
      (!Array.isArray(value) || value.length === 0)
    ) {
      issues.push(issue(path, `必填字段「${field.key}」不能为空`));
      return issues;
    }
    if (value === undefined || value === null) return issues;
    return validateCollectionValue(
      {
        itemFields: field.itemFields,
        minItems: field.minItems,
        maxItems: field.maxItems,
      },
      value,
      path
    );
  }
  if (value === undefined || value === null || value === "") return issues;
  if (field.valueType === "string") {
    if (typeof value !== "string") {
      issues.push(issue(path, `字段「${field.key}」须为字符串`));
    }
  } else if (field.valueType === "url" || field.valueType === "image") {
    if (typeof value !== "string") {
      issues.push(issue(path, `字段「${field.key}」须为 URL 字符串`));
    }
  } else if (field.valueType === "number") {
    if (typeof value === "number") {
      if (!Number.isFinite(value)) {
        issues.push(issue(path, `字段「${field.key}」须为有效数值`));
      }
    } else if (typeof value === "string" && value.trim() !== "") {
      const n = Number(value);
      if (!Number.isFinite(n)) {
        issues.push(issue(path, `字段「${field.key}」须为有效数值`));
      }
    } else {
      issues.push(issue(path, `字段「${field.key}」须为数值`));
    }
  }
  return issues;
}

function validateCollectionValue(
  spec: { itemFields?: BindingCollectionField[]; minItems?: number; maxItems?: number },
  value: unknown,
  path: string
): PayloadContractIssue[] {
  const issues: PayloadContractIssue[] = [];
  if (!Array.isArray(value)) {
    issues.push(issue(path, "collection 槽的值必须为数组"));
    return issues;
  }
  const itemFields = spec.itemFields;
  if (!itemFields || itemFields.length === 0) {
    issues.push(issue(path, "collection 槽在 payload.slots 中未声明 itemFields，无法校验列表项"));
    return issues;
  }
  if (spec.minItems !== undefined && value.length < spec.minItems) {
    issues.push(issue(path, `列表项数量不能少于 minItems（${spec.minItems}）`));
  }
  if (spec.maxItems !== undefined && value.length > spec.maxItems) {
    issues.push(issue(path, `列表项数量不能多于 maxItems（${spec.maxItems}）`));
  }
  value.forEach((row, index) => {
    const rowPath = `${path}[${index}]`;
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      issues.push(issue(rowPath, "列表项必须为对象"));
      return;
    }
    const record = row as Record<string, unknown>;
    for (const field of itemFields) {
      issues.push(...validateCollectionItemFieldValue(field, record[field.key], `${rowPath}.${field.key}`));
    }
  });
  return issues;
}

function validateSlotValue(
  slot: {
    valueType: SlotValueType;
    objectFields?: BindingCollectionField[];
    itemFields?: BindingCollectionField[];
    minItems?: number;
    maxItems?: number;
  },
  value: unknown,
  path: string
): PayloadContractIssue[] {
  if (slot.valueType === "collection") {
    return validateCollectionValue(slot, value, path);
  }
  if (slot.valueType === "object") {
    return validateObjectValue(slot, value, path);
  }
  return validateScalarSlotValue(slot.valueType, value, path);
}

/** 校验 payload.json 顶层形态 */
export function validatePayloadShape(payload: unknown): PayloadContractIssue[] {
  const issues: PayloadContractIssue[] = [];
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return [issue("payload", "payload 必须为对象")];
  }
  const p = payload as Record<string, unknown>;
  if (p.schemaVersion !== PAYLOAD_SCHEMA_VERSION) {
    issues.push(
      issue("schemaVersion", `payload.schemaVersion 必须为 ${PAYLOAD_SCHEMA_VERSION}`)
    );
  }
  if (!p.slots || typeof p.slots !== "object" || Array.isArray(p.slots)) {
    issues.push(issue("slots", "payload.slots 必须为对象"));
  } else {
    for (const [slotId, def] of Object.entries(p.slots)) {
      issues.push(...validateSlotId(`slots.${slotId}`, slotId));
      issues.push(...validatePayloadSlotDefinition(`slots.${slotId}`, def));
    }
  }
  if (!p.values || typeof p.values !== "object" || Array.isArray(p.values)) {
    issues.push(issue("values", "payload.values 必须为对象"));
  }
  if (p.slotOrder !== undefined) {
    if (!Array.isArray(p.slotOrder)) {
      issues.push(issue("slotOrder", "slotOrder 必须为字符串数组"));
    } else {
      const slotKeys =
        p.slots && typeof p.slots === "object" && !Array.isArray(p.slots)
          ? (p.slots as Record<string, unknown>)
          : {};
      const seen = new Set<string>();
      p.slotOrder.forEach((id, i) => {
        if (typeof id !== "string" || !id.trim()) {
          issues.push(issue(`slotOrder[${i}]`, "须为非空字符串"));
          return;
        }
        if (seen.has(id)) {
          issues.push(issue(`slotOrder[${i}]`, `slotId「${id}」在 slotOrder 中重复`));
        }
        seen.add(id);
        if (!Object.prototype.hasOwnProperty.call(slotKeys, id)) {
          issues.push(issue(`slotOrder[${i}]`, `slotId「${id}」不在 payload.slots 中`));
        }
      });
    }
  }
  if (p.detachedVariableSlotIds !== undefined) {
    if (!Array.isArray(p.detachedVariableSlotIds)) {
      issues.push(issue("detachedVariableSlotIds", "detachedVariableSlotIds 必须为字符串数组"));
    } else {
      p.detachedVariableSlotIds.forEach((id, i) => {
        if (typeof id !== "string" || !id.trim()) {
          issues.push(issue(`detachedVariableSlotIds[${i}]`, "须为非空字符串"));
        }
      });
    }
  }
  if (p.slots && typeof p.slots === "object" && !Array.isArray(p.slots)) {
    issues.push(
      ...validatePayloadBuiltinSortDependencies(p.slots as Record<string, PayloadSlotDefinition>)
    );
  }
  return issues;
}

/** 内置列表 sort 派生策略跨槽引用与依赖环 */
function validatePayloadBuiltinSortDependencies(
  slots: Record<string, PayloadSlotDefinition>
): PayloadContractIssue[] {
  const issues: PayloadContractIssue[] = [];
  const edges = new Map<string, string>();

  for (const [slotId, def] of Object.entries(slots)) {
    if (def.valueType !== "collection") continue;
    const ds = def.dataSource;
    if (ds?.type !== "remote" || ds.provider !== "builtin") continue;

    const policy = normalizeBuiltinSortPolicy(ds.sort);
    const fromId = sortPolicyTargetSlotId(policy);
    const fromPath = `slots.${slotId}.dataSource.sort.targetSlotId`;

    if (!fromId) continue;

    if (fromId === slotId) {
      issues.push(issue(fromPath, "不能依赖自身"));
      continue;
    }
    const fromDef = slots[fromId];
    if (!fromDef) {
      issues.push(issue(fromPath, `targetSlotId「${fromId}」在 payload.slots 中不存在`));
      continue;
    }
    if (fromDef.valueType !== "collection") {
      issues.push(issue(fromPath, `targetSlotId「${fromId}」须为 collection 槽`));
      continue;
    }
    const fromDs = fromDef.dataSource;
    if (
      fromDs?.type !== "remote" ||
      fromDs.provider !== "builtin" ||
      fromDs.catalog !== "products"
    ) {
      issues.push(issue(fromPath, `targetSlotId「${fromId}」须为内置商品列表槽`));
    }
    edges.set(slotId, fromId);
  }

  for (const start of edges.keys()) {
    const seen = new Set<string>();
    let cur: string | undefined = start;
    while (cur && edges.has(cur)) {
      if (seen.has(cur)) {
        issues.push(issue(`slots.${start}.dataSource`, "派生列表依赖链存在环"));
        break;
      }
      seen.add(cur);
      cur = edges.get(cur);
    }
  }

  return issues;
}

function validateSlotId(path: string, slotId: unknown): PayloadContractIssue[] {
  if (typeof slotId !== "string" || !SLOT_ID_PATTERN.test(slotId)) {
    return [issue(path, "slotId 必须为字母开头的标识符")];
  }
  return [];
}

/** 校验 payload.slots 中单条目录项 */
export function validatePayloadSlotDefinition(
  path: string,
  def: unknown
): PayloadContractIssue[] {
  const issues: PayloadContractIssue[] = [];
  if (!def || typeof def !== "object" || Array.isArray(def)) {
    return [issue(path, "槽目录项必须为对象")];
  }
  const slot = def as PayloadSlotDefinition;
  if (!slot.label || typeof slot.label !== "string" || !slot.label.trim()) {
    issues.push(issue(`${path}.label`, "label 必须为非空字符串"));
  }
  const valueType = slot.valueType;
  if (valueType === undefined) {
    issues.push(issue(`${path}.valueType`, "必须声明 valueType"));
    return issues;
  }
  if (!SLOT_VALUE_TYPE_SET.has(valueType)) {
    issues.push(
      issue(
        `${path}.valueType`,
        `valueType 仅支持 ${[...SLOT_VALUE_TYPE_SET].join("/")}，收到「${valueType}」`
      )
    );
    return issues;
  }
  if (valueType === "collection") {
    if (slot.itemFields !== undefined) {
      issues.push(...validateCollectionItemFieldDefinitions(`${path}.itemFields`, slot.itemFields));
    }
    if (slot.objectFields !== undefined) {
      issues.push(issue(`${path}.objectFields`, "collection 槽不可声明 objectFields"));
    }
    if (slot.minItems !== undefined && (!Number.isInteger(slot.minItems) || slot.minItems < 0)) {
      issues.push(issue(`${path}.minItems`, "minItems 必须为非负整数"));
    }
    if (slot.maxItems !== undefined && (!Number.isInteger(slot.maxItems) || slot.maxItems < 1)) {
      issues.push(issue(`${path}.maxItems`, "maxItems 必须为正整数"));
    }
    if (
      slot.minItems !== undefined &&
      slot.maxItems !== undefined &&
      slot.minItems > slot.maxItems
    ) {
      issues.push(issue(`${path}.maxItems`, "maxItems 不能小于 minItems"));
    }
    if (
      slot.minItems !== undefined &&
      (slot.minItems < COLLECTION_FIXED_LENGTH_MIN || slot.minItems > COLLECTION_FIXED_LENGTH_MAX)
    ) {
      issues.push(
        issue(
          `${path}.minItems`,
          `列表固定长度须在 ${COLLECTION_FIXED_LENGTH_MIN}–${COLLECTION_FIXED_LENGTH_MAX} 之间`
        )
      );
    }
    if (
      slot.maxItems !== undefined &&
      (slot.maxItems < COLLECTION_FIXED_LENGTH_MIN || slot.maxItems > COLLECTION_FIXED_LENGTH_MAX)
    ) {
      issues.push(
        issue(
          `${path}.maxItems`,
          `列表固定长度须在 ${COLLECTION_FIXED_LENGTH_MIN}–${COLLECTION_FIXED_LENGTH_MAX} 之间`
        )
      );
    }
    issues.push(...validateCollectionDataSource(`${path}.dataSource`, slot.dataSource));
    issues.push(...validateCollectionItemVisibility(`${path}.itemVisibility`, slot.itemVisibility));
    issues.push(...validateDeprecatedCollectionDisplayFields(path, slot));
  } else if (valueType === "object") {
    if (slot.itemFields !== undefined) {
      issues.push(issue(`${path}.itemFields`, "object 槽不可声明 itemFields"));
    }
    if (slot.minItems !== undefined || slot.maxItems !== undefined) {
      issues.push(issue(path, "object 槽不可声明 minItems/maxItems"));
    }
    if (slot.itemVisibility !== undefined) {
      issues.push(issue(`${path}.itemVisibility`, "object 槽不可声明 itemVisibility"));
    }
    if (slot.dataSource !== undefined) {
      issues.push(issue(`${path}.dataSource`, "object 槽不可声明 dataSource"));
    }
    if (slot.objectFields !== undefined) {
      issues.push(...validateObjectFieldDefinitions(`${path}.objectFields`, slot.objectFields));
    }
  } else if (slot.dataSource !== undefined) {
    issues.push(issue(`${path}.dataSource`, "仅 collection 槽可声明 dataSource"));
  } else if (slot.itemVisibility !== undefined) {
    issues.push(issue(`${path}.itemVisibility`, "仅 collection 槽可声明 itemVisibility"));
  } else if (slot.objectFields !== undefined) {
    issues.push(issue(`${path}.objectFields`, "仅 object 槽可声明 objectFields"));
  }
  if (slot.description !== undefined && typeof slot.description !== "string") {
    issues.push(issue(`${path}.description`, "description 若声明必须为字符串"));
  }
  if (slot.sceneCollectionPresetId !== undefined) {
    if (typeof slot.sceneCollectionPresetId !== "string" || !slot.sceneCollectionPresetId.trim()) {
      issues.push(issue(`${path}.sceneCollectionPresetId`, "sceneCollectionPresetId 若声明须为非空字符串"));
    }
  }
  if (slot.scene !== undefined) {
    const allowed = new Set(["loyalty-internal-admin", "loyalty-merchant-admin"]);
    if (typeof slot.scene !== "string" || !allowed.has(slot.scene)) {
      issues.push(
        issue(`${path}.scene`, "scene 仅支持 loyalty-internal-admin / loyalty-merchant-admin")
      );
    }
  }
  if (slot.sceneCollectionPresetId && !slot.scene) {
    issues.push(
      issue(`${path}.scene`, "声明 sceneCollectionPresetId 时须同时声明 scene")
    );
  }
  if (slot.builtinStructureId !== undefined) {
    if (typeof slot.builtinStructureId !== "string" || !slot.builtinStructureId.trim()) {
      issues.push(issue(`${path}.builtinStructureId`, "builtinStructureId 若声明须为非空字符串"));
    } else {
      const structure = getBuiltinStructureDefinition(slot.builtinStructureId);
      if (!structure) {
        issues.push(issue(`${path}.builtinStructureId`, `未知内置变量结构：${slot.builtinStructureId}`));
      } else {
        if (slot.valueType !== structure.valueType) {
          issues.push(issue(`${path}.valueType`, "valueType 必须与内置变量结构一致"));
        }
        if (structure.valueType === "collection" && structure.lengthPolicy?.kind === "locked") {
          const fixed = structure.lengthPolicy.fixedLength;
          if (slot.minItems !== fixed || slot.maxItems !== fixed) {
            issues.push(issue(`${path}.minItems`, `该专用列表变量长度固定为 ${fixed} 项`));
          }
        }
      }
    }
  }
  return issues;
}

/** 校验单条 variable 绑定上的槽定义（供 validateTemplateBindings 调用） */
export function validateExternalVariableBindingSpec(
  bindPath: string,
  spec: BindingSpec
): PayloadContractIssue[] {
  const issues: PayloadContractIssue[] = [];
  const path = bindPath;

  issues.push(...validateSlotId(`${path}.slotId`, spec.slotId));
  const valueType = spec.valueType;
  if (valueType === undefined) {
    issues.push(issue(`${path}.valueType`, "variable 绑定必须声明 valueType"));
    return issues;
  }
  if (!SLOT_VALUE_TYPE_SET.has(valueType)) {
    issues.push(
      issue(
        `${path}.valueType`,
        `valueType 仅支持 ${[...SLOT_VALUE_TYPE_SET].join("/")}，收到「${valueType}」`
      )
    );
    return issues;
  }
  if (spec.slotPath !== undefined) {
    if (typeof spec.slotPath !== "string" || !spec.slotPath.trim() || spec.slotPath.includes("..")) {
      issues.push(issue(`${path}.slotPath`, "slotPath 必须为非空点路径，且不能包含连续点"));
    }
  }
  if (valueType === "collection") {
    if (spec.itemFields !== undefined) {
      issues.push(...validateCollectionItemFieldDefinitions(`${path}.itemFields`, spec.itemFields));
    }
    if (spec.minItems !== undefined && (!Number.isInteger(spec.minItems) || spec.minItems < 0)) {
      issues.push(issue(`${path}.minItems`, "minItems 必须为非负整数"));
    }
    if (spec.maxItems !== undefined && (!Number.isInteger(spec.maxItems) || spec.maxItems < 1)) {
      issues.push(issue(`${path}.maxItems`, "maxItems 必须为正整数"));
    }
    if (
      spec.minItems !== undefined &&
      spec.maxItems !== undefined &&
      spec.minItems > spec.maxItems
    ) {
      issues.push(issue(`${path}.maxItems`, "maxItems 不能小于 minItems"));
    }
  }
  if (valueType === "object" && spec.objectFields !== undefined) {
    issues.push(...validateObjectFieldDefinitions(`${path}.objectFields`, spec.objectFields));
  }
  return issues;
}

/** 校验单条 interpolate 绑定上的原子槽定义（供 validateTemplateBindings 调用） */
export function validateExternalInterpolateBindingSpec(
  bindPath: string,
  spec: BindingSpec
): PayloadContractIssue[] {
  const issues: PayloadContractIssue[] = [];
  const path = bindPath;

  issues.push(...validateSlotId(`${path}.slotId`, spec.slotId));

  if (!Array.isArray(spec.interpolationSlots) || spec.interpolationSlots.length === 0) {
    issues.push(issue(`${path}.interpolationSlots`, "interpolate 绑定必须声明 interpolationSlots（非空数组）"));
    return issues;
  }

  const seen = new Set<string>();
  spec.interpolationSlots.forEach((slot, slotIndex) => {
    const slotPath = `${path}.interpolationSlots.${slotIndex}`;
    issues.push(...validateSlotId(`${slotPath}.slotId`, slot.slotId));
    if (seen.has(slot.slotId)) {
      issues.push(issue(`${slotPath}.slotId`, "interpolationSlots 中 slotId 必须唯一"));
    } else {
      seen.add(slot.slotId);
    }
    const valueType = slot.valueType as string;
    if (valueType === "collection") {
      issues.push(issue(`${slotPath}.valueType`, "interpolate 原子槽不支持 collection"));
    } else if (valueType === "object") {
      issues.push(issue(`${slotPath}.valueType`, "interpolate 原子槽不支持 object"));
    } else if (valueType === "number" || valueType === "boolean") {
      issues.push(
        issue(
          `${slotPath}.valueType`,
          "interpolate 原子槽不支持 number/boolean（独立数值或布尔值请使用 variable 绑定）"
        )
      );
    } else if (!SLOT_VALUE_TYPE_SET.has(valueType)) {
      issues.push(
        issue(
          `${slotPath}.valueType`,
          `valueType 仅支持 string/url/image/color，收到「${valueType}」`
        )
      );
    }
    if (slot.allowExternal !== true) {
      issues.push(issue(`${slotPath}.allowExternal`, "interpolate 原子槽必须声明 allowExternal: true"));
    }
    if (slot.defaultValue !== undefined && typeof slot.defaultValue !== "string") {
      issues.push(issue(`${slotPath}.defaultValue`, "interpolate 原子槽 defaultValue 必须为字符串"));
    }
    if (slot.label !== undefined && (typeof slot.label !== "string" || !slot.label.trim())) {
      issues.push(issue(`${slotPath}.label`, "label 若声明必须为非空字符串"));
    }
    if (slot.description !== undefined && typeof slot.description !== "string") {
      issues.push(issue(`${slotPath}.description`, "description 若声明必须为字符串"));
    }
  });

  return issues;
}

function validatePayloadValuesAgainstRegistry(
  registry: Map<string, ExternalSlotDefinition>,
  payload: EmailPayload
): PayloadContractIssue[] {
  const issues: PayloadContractIssue[] = [];
  const allowed = new Set(registry.keys());

  for (const slotId of Object.keys(payload.values)) {
    const path = `values.${slotId}`;
    const slot = registry.get(slotId);
    if (!slot) {
      issues.push(issue(path, "无对应 payload.slots 目录项"));
      continue;
    }
    issues.push(...validateSlotValue(slot, payload.values[slotId], path));
  }

  for (const slotId of payload.detachedVariableSlotIds ?? []) {
    if (!allowed.has(slotId)) {
      issues.push(
        issue(`detachedVariableSlotIds.${slotId}`, "该槽位不在 payload.slots 中，无法标记为已解除跟随")
      );
    }
  }

  return issues;
}

function collectTemplateExternalSlotRefs(template: EmailTemplate): Array<{
  path: string;
  slotId: string;
  valueType?: string;
  objectFields?: BindingCollectionField[];
  objectFieldKey?: string;
  itemFields?: BindingCollectionField[];
  itemPath?: string;
}> {
  const refs: Array<{
    path: string;
    slotId: string;
    valueType?: string;
    objectFields?: BindingCollectionField[];
    objectFieldKey?: string;
    itemFields?: BindingCollectionField[];
    itemPath?: string;
  }> = [];
  for (const [blockId, block] of Object.entries(template.blocks)) {
    if (block.repeat?.mode === "collection") {
      refs.push({
        path: `blocks.${blockId}.repeat`,
        slotId: block.repeat.slotId,
        valueType: "collection",
        itemFields: block.repeat.itemFields,
        itemPath: block.repeat.itemPath,
      });
    }
    if (block.objectBind?.mode === "object") {
      refs.push({
        path: `blocks.${blockId}.objectBind`,
        slotId: block.objectBind.slotId,
        valueType: "object",
        objectFields: block.objectBind.objectFields,
      });
    }
    if (block.visibility) {
      refs.push({
        path: `blocks.${blockId}.visibility`,
        slotId: block.visibility.slotId,
        valueType: block.visibility.valueType,
        objectFields: block.visibility.objectFields,
        objectFieldKey: block.visibility.objectFieldKey,
      });
    }
    if (!block.bindings) continue;
    for (const [bindPath, spec] of Object.entries(block.bindings)) {
      if (spec.mode === "variable" && spec.allowExternal === true) {
        refs.push({
          path: `blocks.${blockId}.bindings.${bindPath}`,
          slotId: spec.slotId,
          valueType: spec.valueType,
          itemFields: spec.itemFields,
        });
        continue;
      }
      if (spec.mode === "interpolate") {
        for (const [index, slot] of (spec.interpolationSlots ?? []).entries()) {
          if (slot.allowExternal !== true) continue;
          refs.push({
            path: `blocks.${blockId}.bindings.${bindPath}.interpolationSlots.${index}`,
            slotId: slot.slotId,
            valueType: slot.valueType,
          });
        }
      }
    }
  }
  return refs;
}

/** template 引用的 slotId 须在 payload.slots 中声明，且 valueType 与目录一致 */
function validateTemplateReferencesPayloadSlots(
  template: EmailTemplate,
  payload: EmailPayload
): PayloadContractIssue[] {
  const issues: PayloadContractIssue[] = [];
  const catalog = payload.slots ?? {};
  for (const ref of collectTemplateExternalSlotRefs(template)) {
    const catalogEntry = catalog[ref.slotId];
    if (!catalogEntry) {
      issues.push(
        issue(
          ref.path,
          `slotId「${ref.slotId}」未在 payload.slots 中声明（请先在变量目录中登记）`
        )
      );
      continue;
    }
    if (ref.valueType && catalogEntry.valueType !== ref.valueType) {
      const objectFieldKey = ref.objectFieldKey?.trim();
      const objectFieldAllowed =
        catalogEntry.valueType === "object" &&
        objectFieldKey &&
        isVisibilityConditionValueType(ref.valueType);
      if (!objectFieldAllowed) {
        issues.push(
          issue(
            ref.path,
            `valueType「${ref.valueType}」与 payload.slots.${ref.slotId}.valueType「${catalogEntry.valueType}」不一致`
          )
        );
      }
    }
    if (
      catalogEntry.valueType === "object" &&
      ref.objectFieldKey?.trim()
    ) {
      const fieldKey = ref.objectFieldKey.trim();
      const catalogField = catalogEntry.objectFields?.find((field) => field.key === fieldKey);
      if (!catalogField) {
        issues.push(
          issue(
            ref.path,
            `objectFieldKey「${fieldKey}」未在 payload.slots.${ref.slotId}.objectFields 中声明`
          )
        );
      } else if (ref.valueType && catalogField.valueType !== ref.valueType) {
        issues.push(
          issue(
            ref.path,
            `valueType「${ref.valueType}」与对象字段「${fieldKey}」的类型「${catalogField.valueType}」不一致`
          )
        );
      }
    }
    if (
      catalogEntry.valueType === "collection" &&
      ref.itemFields &&
      catalogEntry.itemFields &&
      ref.itemFields.length > 0 &&
      catalogEntry.itemFields.length > 0
    ) {
      const nestedField = ref.itemPath?.trim()
        ? findCollectionFieldByPath(catalogEntry.itemFields, ref.itemPath)
        : undefined;
      const catalogItemFields =
        ref.itemPath?.trim()
          ? nestedField?.valueType === "collection"
            ? nestedField.itemFields
            : undefined
          : catalogEntry.itemFields;
      if (!catalogItemFields?.length) {
        issues.push(
          issue(
            ref.path,
            ref.itemPath?.trim()
              ? `itemPath「${ref.itemPath}」未在 payload.slots.${ref.slotId}.itemFields 中声明为子列表`
              : `payload.slots.${ref.slotId}.itemFields 缺失，无法校验模板 itemFields`
          )
        );
        continue;
      }
      const catalogKeys = new Set(catalogItemFields.map((field: BindingCollectionField) => field.key));
      for (const field of ref.itemFields) {
        if (!catalogKeys.has(field.key)) {
          issues.push(
            issue(
              ref.path,
              `itemFields 含 payload.slots 未声明的字段「${field.key}」`
            )
          );
        }
      }
    }
    if (
      catalogEntry.valueType === "object" &&
      ref.objectFields &&
      catalogEntry.objectFields &&
      ref.objectFields.length > 0 &&
      catalogEntry.objectFields.length > 0
    ) {
      const catalogKeys = new Set(
        catalogEntry.objectFields.map((field: BindingCollectionField) => field.key)
      );
      for (const field of ref.objectFields) {
        if (!catalogKeys.has(field.key)) {
          issues.push(
            issue(
              ref.path,
              `objectFields 含 payload.slots 未声明的字段「${field.key}」`
            )
          );
        }
      }
    }
  }
  return issues;
}

function validatePayloadAgainstTemplateCore(
  template: EmailTemplate,
  payload: EmailPayload
): PayloadContractIssue[] {
  const issues = validatePayloadShape(payload);
  if (issues.some((i) => i.path === "payload" || i.path === "values" || i.path === "slots")) {
    return issues;
  }
  issues.push(...validatePayloadValuesAgainstRegistry(buildPayloadSlotRegistry(payload), payload));
  issues.push(...validateTemplateReferencesPayloadSlots(template, payload));
  return issues;
}

/** 校验 payload 目录与赋值，并核对 template 引用均在 payload.slots 中 */
export function validatePayloadAgainstTemplate(
  template: EmailTemplate,
  payload: EmailPayload
): PayloadContractIssue[] {
  return validatePayloadAgainstTemplateCore(template, payload);
}

/**
 * 场景级 payload：values 以 payload.slots 为准；各版式 template 引用的 slotId 均须在目录中。
 */
export function validatePayloadAgainstTemplateUnion(
  templates: EmailTemplate[],
  payload: EmailPayload
): PayloadContractIssue[] {
  const issues = validatePayloadShape(payload);
  if (issues.some((i) => i.path === "payload" || i.path === "values" || i.path === "slots")) {
    return issues;
  }
  issues.push(...validatePayloadValuesAgainstRegistry(buildPayloadSlotRegistry(payload), payload));
  for (const template of templates) {
    issues.push(...validateTemplateReferencesPayloadSlots(template, payload));
  }
  return issues;
}

/** collection 槽在 template 上是否至少有一处声明了 itemFields */
export function collectionSlotMissingItemFields(
  template: EmailTemplate
): PayloadContractIssue[] {
  const issues: PayloadContractIssue[] = [];
  const collectionPaths = new Map<string, string>();
  const hasItemFields = new Map<string, boolean>();

  for (const [blockId, block] of Object.entries(template.blocks)) {
    if (block.repeat?.mode === "collection") {
      const fullPath = `blocks.${blockId}.repeat`;
      collectionPaths.set(block.repeat.slotId, collectionPaths.get(block.repeat.slotId) ?? fullPath);
      if (Array.isArray(block.repeat.itemFields) && block.repeat.itemFields.length > 0) {
        hasItemFields.set(block.repeat.slotId, true);
      }
    }
    if (block.visibility?.valueType === "collection") {
      const fullPath = `blocks.${blockId}.visibility`;
      collectionPaths.set(
        block.visibility.slotId,
        collectionPaths.get(block.visibility.slotId) ?? fullPath
      );
      if (Array.isArray(block.visibility.itemFields) && block.visibility.itemFields.length > 0) {
        hasItemFields.set(block.visibility.slotId, true);
      }
    }
    if (!block.bindings) continue;
    for (const [bindPath, spec] of Object.entries(block.bindings)) {
      if (spec.mode !== "variable" || spec.allowExternal !== true) continue;
      if (spec.valueType !== "collection") continue;
      const fullPath = `blocks.${blockId}.bindings.${bindPath}`;
      collectionPaths.set(spec.slotId, collectionPaths.get(spec.slotId) ?? fullPath);
      if (Array.isArray(spec.itemFields) && spec.itemFields.length > 0) {
        hasItemFields.set(spec.slotId, true);
      }
    }
  }

  for (const [slotId, firstPath] of collectionPaths) {
    if (!hasItemFields.get(slotId)) {
      issues.push(
        issue(`${firstPath}.itemFields`, "collection 变量至少需要在同一 slotId 的一处绑定声明 itemFields")
      );
    }
  }
  return issues;
}
