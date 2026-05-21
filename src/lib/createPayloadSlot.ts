import type { EmailPayload, PayloadSlotDefinition } from "../types/email";
import { isPayloadSlotIdTaken, registerPayloadSlot } from "./payloadSlotRegister";
import { SLOT_ID_PATTERN } from "../payload-contract/value-types";
import {
  parseScalarInitialValue,
  type StandardScalarValueType,
} from "../payload-contract/standard-scalar-types";

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
    itemFields: [],
    dataSource: { type: "custom" },
  };

  return {
    payload: registerPayloadSlot(payload, slotId, def, []),
  };
}
