import {
  isStandardScalarValueType,
  standardScalarValueTypeLabel,
} from "./standard-scalar-types";

/** 变量槽 valueType 在侧栏、Inspector 等面向用户处的展示名 */
export function payloadSlotValueTypeLabel(valueType: string): string {
  if (isStandardScalarValueType(valueType)) {
    return standardScalarValueTypeLabel(valueType);
  }
  switch (valueType) {
    case "object":
      return "对象";
    case "collection":
      return "列表";
    case "image":
      return "图片";
    case "color":
      return "颜色";
    case "boolean":
      return "布尔";
    default:
      return "文本";
  }
}
