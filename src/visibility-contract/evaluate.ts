import type { EmailPayload } from "../types/email";
import { getVisibilityOperatorSpec } from "./operators";
import type { VisibilityRule } from "./types";

function readPayloadValue(payload: EmailPayload | null, rule: VisibilityRule): unknown {
  const raw = payload?.values?.[rule.slotId];
  const objectFieldKey = rule.objectFieldKey?.trim();
  if (!objectFieldKey) return raw;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  return (raw as Record<string, unknown>)[objectFieldKey];
}

function isEmptyStringLike(value: unknown): boolean {
  return value === undefined || value === null || (typeof value === "string" && value.trim() === "");
}

/** 数值槽：未赋值或非法类型视为空（兼容对接方漏传、传错类型） */
function isNumberValueEmpty(value: unknown): boolean {
  return value === undefined || value === null || typeof value !== "number" || !Number.isFinite(value);
}

/** 布尔槽：未赋值或非法类型视为空 */
function isBooleanValueEmpty(value: unknown): boolean {
  return value === undefined || value === null || typeof value !== "boolean";
}

function isCollectionEmpty(value: unknown): boolean {
  return !Array.isArray(value) || value.length === 0;
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
  const value = readPayloadValue(payload, rule);

  switch (rule.operator) {
    case "isEmpty":
      switch (rule.valueType) {
        case "collection":
          return isCollectionEmpty(value);
        case "number":
          return isNumberValueEmpty(value);
        case "boolean":
          return isBooleanValueEmpty(value);
        default:
          return isEmptyStringLike(value);
      }
    case "isNotEmpty":
      switch (rule.valueType) {
        case "collection":
          return !isCollectionEmpty(value);
        case "number":
          return !isNumberValueEmpty(value);
        case "boolean":
          return !isBooleanValueEmpty(value);
        default:
          return !isEmptyStringLike(value);
      }
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
