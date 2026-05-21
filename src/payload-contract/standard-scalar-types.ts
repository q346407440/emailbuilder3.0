/** 用户可创建/维护的「标准标量」变量类型（不含 image/color 等专用类型） */
export const STANDARD_SCALAR_VALUE_TYPES = ["string", "number", "url"] as const;

export type StandardScalarValueType = (typeof STANDARD_SCALAR_VALUE_TYPES)[number];

export function isStandardScalarValueType(valueType: string): valueType is StandardScalarValueType {
  return (STANDARD_SCALAR_VALUE_TYPES as readonly string[]).includes(valueType);
}

export function standardScalarValueTypeLabel(valueType: StandardScalarValueType): string {
  switch (valueType) {
    case "string":
      return "文本";
    case "number":
      return "数值";
    case "url":
      return "链接";
    default:
      return valueType;
  }
}

/** 将 payload.values 中的初值按目标类型规范化 */
export function coerceScalarPayloadValue(
  raw: unknown,
  valueType: StandardScalarValueType
): unknown | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (valueType === "number") {
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
    if (typeof raw === "string") {
      const trimmed = raw.trim();
      if (trimmed === "") return undefined;
      const n = Number(trimmed);
      return Number.isFinite(n) ? n : undefined;
    }
    return undefined;
  }
  if (typeof raw === "number" && Number.isFinite(raw)) return String(raw);
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    return trimmed === "" ? undefined : trimmed;
  }
  return String(raw);
}

/** 从创建弹窗的初值字符串解析为 payload.values 写入值 */
export function parseScalarInitialValue(
  raw: string,
  valueType: StandardScalarValueType
): unknown | undefined {
  return coerceScalarPayloadValue(raw, valueType);
}
