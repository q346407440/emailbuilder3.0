import type {
  BindingCollectionField,
  BindingSpec,
  EmailPayload,
  EmailTemplate,
  PayloadSlotDefinition,
} from "../types/email";
import { buildPayloadSlotRegistry } from "./slot-registry";
import type { ExternalSlotDefinition } from "./types";
import type { PayloadContractIssue, SlotValueType } from "./types";
import {
  BUILTIN_COLLECTION_CATALOG_IDS,
  isBuiltinCollectionCatalogId,
} from "./collection-data-source";
import type { CollectionDataSource } from "./collection-data-source";
import {
  isBuiltinCollectionExtractKind,
  isBuiltinCollectionExtractMatchField,
} from "./collection-builtin-extract";
import {
  canDeclareCollectionItemFieldType,
  COLLECTION_ITEM_FIELDS_NESTING_ERROR,
  findCollectionFieldByPath,
} from "./collection-item-fields";
import { isBuiltinCollectionSortId } from "./collection-builtin-sort";
import {
  isBuiltinProductRangeMode,
  isBuiltinProductRowGranularity,
} from "./collection-builtin-catalog-config";
import { PAYLOAD_SCHEMA_VERSION } from "./types";
import {
  COLLECTION_ITEM_FIELD_TYPE_SET,
  isCollectionItemFieldType,
  SLOT_ID_PATTERN,
  SLOT_VALUE_TYPE_SET,
} from "./value-types";

const COLLECTION_FIXED_LENGTH_MIN = 1;
const COLLECTION_FIXED_LENGTH_MAX = 10;

function issue(path: string, reason: string): PayloadContractIssue {
  return { path, reason };
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
    if (ds.sort !== undefined && !isBuiltinCollectionSortId(ds.sort)) {
      issues.push(
        issue(
          `${path}.sort`,
          `sort 仅支持 catalogOrder / nameAsc / nameDesc / salesVolumeDesc / conversionDesc / priceDesc / priceAsc（兼容 salesDesc / salesAsc）`
        )
      );
    }
    if ((ds as { listSource?: unknown }).listSource !== undefined) {
      issues.push(
        issue(
          `${path}.listSource`,
          "listSource 已废弃，请删除；子列表请用 itemFields 嵌套，并在列表绑定中选择子列表路径"
        )
      );
    }

    const extract = (ds as { extract?: unknown }).extract;
    if (extract !== undefined) {
      if (!extract || typeof extract !== "object") {
        issues.push(issue(`${path}.extract`, "extract 必须为对象"));
      } else {
        const ex = extract as { kind?: string; fromSlotId?: string; matchField?: string };
        if (ex.kind === "productSkus") {
          issues.push(
            issue(
              `${path}.extract.kind`,
              "productSkus 已废弃；子列表请用 itemFields 嵌套，并在列表绑定中选择子列表路径"
            )
          );
        } else if (!ex.kind || !isBuiltinCollectionExtractKind(ex.kind)) {
          issues.push(
            issue(`${path}.extract.kind`, "extract.kind 仅支持 none / similarTo / complement")
          );
        } else if (ex.kind === "similarTo" || ex.kind === "complement") {
          if (typeof ex.fromSlotId !== "string" || !SLOT_ID_PATTERN.test(ex.fromSlotId)) {
            issues.push(
              issue(`${path}.extract.fromSlotId`, `${ex.kind} 须声明合法 fromSlotId`)
            );
          }
          const anchorIdx = (ex as { anchorItemIndex?: unknown }).anchorItemIndex;
          if (
            anchorIdx !== undefined &&
            (typeof anchorIdx !== "number" || !Number.isFinite(anchorIdx) || anchorIdx < 1)
          ) {
            issues.push(
              issue(`${path}.extract.anchorItemIndex`, "anchorItemIndex 须为 ≥1 的整数")
            );
          }
          if (
            ex.matchField !== undefined &&
            !isBuiltinCollectionExtractMatchField(ex.matchField)
          ) {
            issues.push(
              issue(`${path}.extract.matchField`, "matchField 仅支持 href / name")
            );
          }
        } else if (ex.kind === "none" && Object.keys(extract as object).length > 1) {
          issues.push(issue(`${path}.extract`, "kind 为 none 时不应携带其它字段"));
        }
      }
    }

    if (ds.catalog === "products" && (ds as { productConfig?: unknown }).productConfig !== undefined) {
      const pc = (ds as { productConfig?: Record<string, unknown> }).productConfig;
      if (!pc || typeof pc !== "object") {
        issues.push(issue(`${path}.productConfig`, "productConfig 须为对象"));
      } else {
        if (!isBuiltinProductRowGranularity(String(pc.rowGranularity ?? ""))) {
          issues.push(
            issue(`${path}.productConfig.rowGranularity`, "rowGranularity 仅支持 spu / sku")
          );
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

function validateCollectionDisplayRule(path: string, rawRule: unknown): PayloadContractIssue[] {
  const issues: PayloadContractIssue[] = [];
  if (rawRule === undefined) return issues;
  if (!rawRule || typeof rawRule !== "object" || Array.isArray(rawRule)) {
    issues.push(issue(path, "displayRule 必须为对象"));
    return issues;
  }
  const rule = rawRule as {
    keyField?: unknown;
    includeValues?: unknown;
    excludeValues?: unknown;
  };
  if (rule.keyField !== undefined) {
    if (typeof rule.keyField !== "string" || !SLOT_ID_PATTERN.test(rule.keyField.trim())) {
      issues.push(issue(`${path}.keyField`, "keyField 须为字母开头的字段标识符"));
    }
  }
  if (rule.includeValues !== undefined) {
    if (
      !Array.isArray(rule.includeValues) ||
      rule.includeValues.some((v) => typeof v !== "string" || !v.trim())
    ) {
      issues.push(issue(`${path}.includeValues`, "includeValues 须为非空字符串数组"));
    }
  }
  if (rule.excludeValues !== undefined) {
    if (
      !Array.isArray(rule.excludeValues) ||
      rule.excludeValues.some((v) => typeof v !== "string" || !v.trim())
    ) {
      issues.push(issue(`${path}.excludeValues`, "excludeValues 须为非空字符串数组"));
    }
  }
  const hasAnyRule =
    (typeof rule.keyField === "string" && rule.keyField.trim()) ||
    (Array.isArray(rule.includeValues) && rule.includeValues.length > 0) ||
    (Array.isArray(rule.excludeValues) && rule.excludeValues.length > 0);
  if (!hasAnyRule) {
    issues.push(issue(path, "displayRule 至少配置一项（keyField/include/exclude）"));
  }
  return issues;
}

function validateCollectionDisplayRulePreset(path: string, rawPreset: unknown): PayloadContractIssue[] {
  const issues: PayloadContractIssue[] = [];
  if (rawPreset === undefined) return issues;
  if (!rawPreset || typeof rawPreset !== "object" || Array.isArray(rawPreset)) {
    issues.push(issue(path, "displayRulePreset 必须为对象"));
    return issues;
  }
  const preset = rawPreset as {
    keyField?: unknown;
    includeValues?: unknown;
    options?: unknown;
  };
  if (typeof preset.keyField !== "string" || !SLOT_ID_PATTERN.test(preset.keyField.trim())) {
    issues.push(issue(`${path}.keyField`, "keyField 须为字母开头的字段标识符"));
  }
  if (
    !Array.isArray(preset.includeValues) ||
    preset.includeValues.length === 0 ||
    preset.includeValues.some((v) => typeof v !== "string" || !v.trim())
  ) {
    issues.push(issue(`${path}.includeValues`, "includeValues 须为非空字符串数组"));
  }
  if (preset.options !== undefined) {
    if (!Array.isArray(preset.options) || preset.options.length === 0) {
      issues.push(issue(`${path}.options`, "options 若声明须为非空数组"));
    } else {
      const seen = new Set<string>();
      for (let i = 0; i < preset.options.length; i++) {
        const opt = preset.options[i] as { value?: unknown; label?: unknown };
        if (!opt || typeof opt !== "object") {
          issues.push(issue(`${path}.options[${i}]`, "选项须为对象"));
          continue;
        }
        const value = typeof opt.value === "string" ? opt.value.trim() : "";
        const label = typeof opt.label === "string" ? opt.label.trim() : "";
        if (!value) issues.push(issue(`${path}.options[${i}].value`, "value 须为非空字符串"));
        if (!label) issues.push(issue(`${path}.options[${i}].label`, "label 须为非空字符串"));
        if (value) {
          if (seen.has(value)) {
            issues.push(issue(`${path}.options[${i}].value`, "value 不可重复"));
          } else {
            seen.add(value);
          }
        }
      }
    }
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
  slot: { valueType: SlotValueType; itemFields?: BindingCollectionField[]; minItems?: number; maxItems?: number },
  value: unknown,
  path: string
): PayloadContractIssue[] {
  if (slot.valueType === "collection") {
    return validateCollectionValue(slot, value, path);
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
      ...validatePayloadBuiltinExtractDependencies(p.slots as Record<string, PayloadSlotDefinition>)
    );
  }
  return issues;
}

/** 内置列表 extract 跨槽引用与依赖环 */
function validatePayloadBuiltinExtractDependencies(
  slots: Record<string, PayloadSlotDefinition>
): PayloadContractIssue[] {
  const issues: PayloadContractIssue[] = [];
  const edges = new Map<string, string>();

  for (const [slotId, def] of Object.entries(slots)) {
    if (def.valueType !== "collection") continue;
    const ds = def.dataSource;
    if (ds?.type !== "remote" || ds.provider !== "builtin") continue;

    let fromId: string | undefined;
    let fromPath: string | undefined;

    if (ds.extract?.kind === "similarTo") {
      fromId = ds.extract.fromSlotId;
      fromPath = `slots.${slotId}.dataSource.extract.fromSlotId`;
    } else {
      continue;
    }

    if (fromId === slotId) {
      issues.push(issue(fromPath!, "不能依赖自身"));
      continue;
    }
    const fromDef = slots[fromId];
    if (!fromDef) {
      issues.push(issue(fromPath!, `fromSlotId「${fromId}」在 payload.slots 中不存在`));
      continue;
    }
    if (fromDef.valueType !== "collection") {
      issues.push(issue(fromPath!, `fromSlotId「${fromId}」须为 collection 槽`));
    }
    edges.set(slotId, fromId);
  }

  for (const start of edges.keys()) {
    const seen = new Set<string>();
    let cur: string | undefined = start;
    while (cur && edges.has(cur)) {
      if (seen.has(cur)) {
        issues.push(
          issue(
            `slots.${start}.dataSource`,
            "extract 依赖链存在环"
          )
        );
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
    issues.push(...validateCollectionDisplayRule(`${path}.displayRule`, slot.displayRule));
    issues.push(
      ...validateCollectionDisplayRulePreset(`${path}.displayRulePreset`, slot.displayRulePreset)
    );
    if (slot.displayRule !== undefined && !slot.sceneCollectionPresetId) {
      issues.push(
        issue(`${path}.displayRule`, "displayRule 仅内置场景变量可声明（需 sceneCollectionPresetId）")
      );
    }
    if (slot.displayRulePreset !== undefined && !slot.sceneCollectionPresetId) {
      issues.push(
        issue(
          `${path}.displayRulePreset`,
          "displayRulePreset 仅内置场景变量可声明（需 sceneCollectionPresetId）"
        )
      );
    }
  } else if (slot.dataSource !== undefined) {
    issues.push(issue(`${path}.dataSource`, "仅 collection 槽可声明 dataSource"));
  } else if (slot.displayRule !== undefined) {
    issues.push(issue(`${path}.displayRule`, "仅 collection 槽可声明 displayRule"));
  } else if (slot.displayRulePreset !== undefined) {
    issues.push(issue(`${path}.displayRulePreset`, "仅 collection 槽可声明 displayRulePreset"));
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
  itemFields?: BindingCollectionField[];
  itemPath?: string;
}> {
  const refs: Array<{
    path: string;
    slotId: string;
    valueType?: string;
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
    if (block.visibility) {
      refs.push({
        path: `blocks.${blockId}.visibility`,
        slotId: block.visibility.slotId,
        valueType: block.visibility.valueType,
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
      issues.push(
        issue(
          ref.path,
          `valueType「${ref.valueType}」与 payload.slots.${ref.slotId}.valueType「${catalogEntry.valueType}」不一致`
        )
      );
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
