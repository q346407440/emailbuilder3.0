import type { BindingCollectionField, BindingSpec } from "../types/email";
import type { PayloadContractIssue, SlotValueType } from "../payload-contract/types";
import { isSlotValueType } from "../payload-contract/value-types";
import { validateExternalVariableBindingSpec } from "../payload-contract/validate";
import { getVisibilityOperatorSpec, isVisibilityConditionValueType } from "./operators";
import type { VisibilityRule } from "./types";

function issue(path: string, reason: string): PayloadContractIssue {
  return { path, reason };
}

function visibilityToBindingSpec(visibility: VisibilityRule): BindingSpec {
  return {
    slotId: visibility.slotId,
    mode: "variable",
    valueType: visibility.objectFieldKey?.trim() ? "object" : visibility.valueType,
    allowExternal: true,
    itemFields: visibility.itemFields as BindingCollectionField[] | undefined,
    objectFields: visibility.objectFields as BindingCollectionField[] | undefined,
    minItems: visibility.minItems,
    maxItems: visibility.maxItems,
    label: visibility.label,
    description: visibility.description,
  };
}

function validateCompareValue(
  path: string,
  visibility: VisibilityRule,
  valueType: SlotValueType,
  issues: PayloadContractIssue[]
): void {
  const operatorSpec = getVisibilityOperatorSpec(valueType, visibility.operator);
  if (!operatorSpec) {
    issues.push({
      path: `${path}.operator`,
      reason: `${valueType} 槽不支持可见性运算符「${String(visibility.operator)}」`,
    });
    return;
  }

  if (!operatorSpec.requiresCompareValue) {
    if (visibility.compareValue !== undefined) {
      issues.push({
        path: `${path}.compareValue`,
        reason: `运算符「${operatorSpec.operator}」不需要比较值`,
      });
    }
    return;
  }

  if (operatorSpec.compareValueType === "number") {
    if (typeof visibility.compareValue !== "number" || !Number.isFinite(visibility.compareValue)) {
      issues.push({ path: `${path}.compareValue`, reason: "比较值必须为有限数值" });
      return;
    }
    if (
      operatorSpec.operator.startsWith("length") &&
      (!Number.isInteger(visibility.compareValue) || visibility.compareValue < 0)
    ) {
      issues.push({ path: `${path}.compareValue`, reason: "长度比较值必须为非负整数" });
    }
    return;
  }

  if (operatorSpec.compareValueType === "boolean") {
    if (typeof visibility.compareValue !== "boolean") {
      issues.push({ path: `${path}.compareValue`, reason: "比较值必须为布尔值" });
    }
    return;
  }

  if (typeof visibility.compareValue !== "string") {
    issues.push({ path: `${path}.compareValue`, reason: "比较值必须为字符串" });
  }
}

export function validateVisibilityRule(path: string, visibility: unknown): PayloadContractIssue[] {
  const issues: PayloadContractIssue[] = [];
  if (!visibility || typeof visibility !== "object" || Array.isArray(visibility)) {
    return [issue(path, "visibility 必须为对象")];
  }

  const rule = visibility as VisibilityRule;
  if (!isSlotValueType(rule.valueType)) {
    issues.push({
      path: `${path}.valueType`,
      reason: "visibility 必须声明合法 valueType",
    });
    return issues;
  }

  if (!isVisibilityConditionValueType(rule.valueType)) {
    issues.push({
      path: `${path}.valueType`,
      reason:
        "显隐条件变量不支持颜色型槽；请选用文本、链接、图片、数值、布尔、列表型业务变量，或对象变量的标量字段",
    });
    return issues;
  }

  const objectFieldKey = rule.objectFieldKey?.trim();
  if (objectFieldKey) {
    const objectFields = rule.objectFields ?? [];
    const field = objectFields.find((item) => item.key === objectFieldKey);
    if (!field) {
      issues.push({
        path: `${path}.objectFieldKey`,
        reason: `objectFieldKey「${objectFieldKey}」未在 visibility.objectFields 中声明`,
      });
    } else if (field.valueType !== rule.valueType) {
      issues.push({
        path: `${path}.valueType`,
        reason: `显隐 valueType 须与对象字段「${objectFieldKey}」的类型「${field.valueType}」一致`,
      });
    }
  }

  issues.push(...validateExternalVariableBindingSpec(path, visibilityToBindingSpec(rule)));
  validateCompareValue(path, rule, rule.valueType, issues);
  return issues;
}

export function visibilityToExternalVariableBindingSpec(
  visibility: VisibilityRule
): BindingSpec {
  return visibilityToBindingSpec(visibility);
}
