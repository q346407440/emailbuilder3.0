import type { EmailPayload } from "../types/email";
import { getVisibilityOperatorSpec } from "./operators";
import type { VisibilityRule } from "./types";

function readPayloadValue(payload: EmailPayload | null, slotId: string): unknown {
  return payload?.values?.[slotId];
}

function isEmptyStringLike(value: unknown): boolean {
  return value === undefined || value === null || (typeof value === "string" && value.trim() === "");
}

function collectionLength(value: unknown): number | null {
  return Array.isArray(value) ? value.length : null;
}

function numberCompare(
  value: unknown,
  compareValue: unknown,
  predicate: (left: number, right: number) => boolean
): boolean {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    typeof compareValue === "number" &&
    Number.isFinite(compareValue) &&
    predicate(value, compareValue)
  );
}

function lengthCompare(
  value: unknown,
  compareValue: unknown,
  predicate: (left: number, right: number) => boolean
): boolean {
  const length = collectionLength(value);
  return (
    length !== null &&
    typeof compareValue === "number" &&
    Number.isInteger(compareValue) &&
    compareValue >= 0 &&
    predicate(length, compareValue)
  );
}

export function evaluateVisibilityRule(rule: VisibilityRule, payload: EmailPayload | null): boolean {
  if (getVisibilityOperatorSpec(rule.valueType, rule.operator) === null) return false;
  const value = readPayloadValue(payload, rule.slotId);

  switch (rule.operator) {
    case "isEmpty":
      return rule.valueType === "collection"
        ? collectionLength(value) === 0
        : isEmptyStringLike(value);
    case "isNotEmpty":
      return rule.valueType === "collection"
        ? (collectionLength(value) ?? 0) > 0
        : !isEmptyStringLike(value);
    case "equals":
      return value === rule.compareValue;
    case "notEquals":
      return value !== rule.compareValue;
    case "greaterThan":
      return numberCompare(value, rule.compareValue, (left, right) => left > right);
    case "greaterThanOrEqual":
      return numberCompare(value, rule.compareValue, (left, right) => left >= right);
    case "lessThan":
      return numberCompare(value, rule.compareValue, (left, right) => left < right);
    case "lessThanOrEqual":
      return numberCompare(value, rule.compareValue, (left, right) => left <= right);
    case "isTrue":
      return value === true;
    case "isFalse":
      return value === false;
    case "lengthEquals":
      return lengthCompare(value, rule.compareValue, (left, right) => left === right);
    case "lengthGreaterThan":
      return lengthCompare(value, rule.compareValue, (left, right) => left > right);
    case "lengthGreaterThanOrEqual":
      return lengthCompare(value, rule.compareValue, (left, right) => left >= right);
    case "lengthLessThan":
      return lengthCompare(value, rule.compareValue, (left, right) => left < right);
    case "lengthLessThanOrEqual":
      return lengthCompare(value, rule.compareValue, (left, right) => left <= right);
  }
}

export function blockIsVisible(visibility: VisibilityRule | undefined, payload: EmailPayload | null): boolean {
  if (!visibility) return true;
  return evaluateVisibilityRule(visibility, payload);
}
