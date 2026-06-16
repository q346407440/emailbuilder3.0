import type { EmailPayload, PayloadSlotDefinition } from "../types/email";
import {
  getBuiltinStructureDefinition,
  type BuiltinStructureDefinition,
} from "../payload-contract/builtin-structure-catalog";
import type { SceneCollectionPreset } from "../payload-contract/scene-collection-presets";
import {
  buildPayloadSlotDefFromScenePreset,
  resolveScenePresetCollectionValues,
} from "../payload-contract/scene-collection-presets/buildPresetCollection";
import { isPayloadSlotIdTaken, registerPayloadSlot } from "./payloadSlotRegister";
import {
  proposeScenePresetInstanceSlotId,
  scenePresetInstanceLabel,
} from "./scenePresetInstanceSlot";
import { SLOT_ID_PATTERN } from "../payload-contract/value-types";
import {
  parseScalarInitialValue,
  type StandardScalarValueType,
} from "../payload-contract/standard-scalar-types";
import { padOrTrimCollectionValues } from "./collectionDataSource";

export type CreatePayloadSlotFieldErrors = {
  label?: string;
  slotId?: string;
};

export function validateNewPayloadSlotFields(
  payload: EmailPayload,
  slotId: string,
  label: string
): CreatePayloadSlotFieldErrors {
  const errors: CreatePayloadSlotFieldErrors = {};
  const labelTrimmed = label.trim();
  const slotIdTrimmed = slotId.trim();

  if (!labelTrimmed) {
    errors.label = "请输入变量名称。";
  }
  if (!slotIdTrimmed) {
    errors.slotId = "请输入变量标识（key）。";
  } else if (!SLOT_ID_PATTERN.test(slotIdTrimmed)) {
    errors.slotId = "变量标识须以字母开头，且只能包含字母、数字和下划线。";
  } else if (isPayloadSlotIdTaken(payload, slotIdTrimmed)) {
    errors.slotId = "该变量标识已存在，请使用其他 key。";
  }
  return errors;
}

/** 在 payload.slots 登记标量变量；初值允许为空 */
export function createScalarPayloadSlot(
  payload: EmailPayload,
  args: {
    slotId: string;
    label: string;
    valueType: StandardScalarValueType;
    initialValue?: string;
  }
): { payload: EmailPayload } | { error: string; fieldErrors?: CreatePayloadSlotFieldErrors } {
  const fieldErrors = validateNewPayloadSlotFields(payload, args.slotId, args.label);
  if (fieldErrors.label || fieldErrors.slotId) {
    return { error: fieldErrors.label ?? fieldErrors.slotId ?? "请检查表单。", fieldErrors };
  }

  const slotId = args.slotId.trim();
  const label = args.label.trim();
  const valueType = args.valueType;
  const def: PayloadSlotDefinition = { label, valueType };
  const seedValue = parseScalarInitialValue(args.initialValue ?? "", valueType);

  return {
    payload: registerPayloadSlot(payload, slotId, def, seedValue),
  };
}

/** 在 payload.slots 登记列表变量；字段与数据在创建后于变量详情中配置 */
export function createCollectionPayloadSlot(
  payload: EmailPayload,
  args: { slotId: string; label: string }
): { payload: EmailPayload } | { error: string; fieldErrors?: CreatePayloadSlotFieldErrors } {
  const fieldErrors = validateNewPayloadSlotFields(payload, args.slotId, args.label);
  if (fieldErrors.label || fieldErrors.slotId) {
    return { error: fieldErrors.label ?? fieldErrors.slotId ?? "请检查表单。", fieldErrors };
  }

  const slotId = args.slotId.trim();
  const label = args.label.trim();
  const def: PayloadSlotDefinition = {
    label,
    valueType: "collection",
    dataSource: { type: "custom" },
  };

  return {
    payload: registerPayloadSlot(payload, slotId, def),
  };
}

/** 从场景内置列表预设登记 collection 槽，并写入预览/mock 行数据（同 preset 可多次实例化） */
export function createCollectionPayloadSlotFromPreset(
  payload: EmailPayload,
  preset: SceneCollectionPreset
): { payload: EmailPayload; slotId: string } | { error: string } {
  const slotId = proposeScenePresetInstanceSlotId(payload, preset.slotId);
  if (!slotId) {
    return {
      error: `无法为「${preset.label}」分配变量标识，请删除部分同名场景变量后重试。`,
    };
  }

  const def = buildPayloadSlotDefFromScenePreset(preset);
  def.label = scenePresetInstanceLabel(preset.label, preset.slotId, slotId);

  let next = registerPayloadSlot(payload, slotId, def, []);
  const values = resolveScenePresetCollectionValues(preset, next, slotId);
  next = {
    ...next,
    values: { ...next.values, [slotId]: values },
  };

  return {
    slotId,
    payload: next,
  };
}

function fixedLengthFromBuiltinStructure(definition: BuiltinStructureDefinition): number | undefined {
  if (definition.valueType !== "collection") return undefined;
  if (definition.lengthPolicy?.kind === "locked") return definition.lengthPolicy.fixedLength;
  return definition.lengthPolicy?.defaultLength ?? definition.seedValues?.length ?? 3;
}

export function createPayloadSlotFromBuiltinStructure(
  payload: EmailPayload,
  structureId: string
): { payload: EmailPayload; slotId: string } | { error: string } {
  const definition = getBuiltinStructureDefinition(structureId);
  if (!definition) {
    return { error: "内置变量结构不存在。" };
  }

  const slotId = proposeScenePresetInstanceSlotId(payload, definition.defaultSlotId);
  if (!slotId) {
    return {
      error: `无法为「${definition.label}」分配变量标识，请删除部分同名变量后重试。`,
    };
  }

  const label = scenePresetInstanceLabel(definition.label, definition.defaultSlotId, slotId);
  const def: PayloadSlotDefinition = {
    label,
    valueType: definition.valueType,
    description: definition.description,
    builtinStructureId: definition.structureId,
    builtinScope: definition.scope,
    lengthPolicy: definition.lengthPolicy,
  };

  if (definition.valueType === "collection") {
    const fixedLength = fixedLengthFromBuiltinStructure(definition);
    def.itemFields = definition.itemFields ?? [];
    if (fixedLength !== undefined) {
      def.minItems = fixedLength;
      def.maxItems = fixedLength;
    }
    if (definition.scope === "dedicated" && definition.dedicatedFor) {
      def.scene = definition.dedicatedFor;
      def.sceneCollectionPresetId = definition.structureId;
    }
  } else if (definition.valueType === "object") {
    def.objectFields = definition.objectFields ?? [];
    if (definition.scope === "dedicated" && definition.dedicatedFor) {
      def.scene = definition.dedicatedFor;
    }
  }

  const seedValue =
    definition.valueType === "collection"
      ? padOrTrimCollectionValues(
          definition.seedValues ?? [],
          fixedLengthFromBuiltinStructure(definition) ?? 0,
          definition.itemFields ?? []
        )
      : definition.seedValue;

  return {
    slotId,
    payload: registerPayloadSlot(payload, slotId, def, seedValue),
  };
}
