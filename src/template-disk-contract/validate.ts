import {
  NESTED_TEMPLATE_ENVELOPE_KEYS,
} from "./shell-keys";
import {
  NESTED_TEMPLATE_SCHEMA_VERSION,
  type NestedDiskValidationIssue,
  type NestedEmailTemplate,
} from "./types";
import { validateNestedBlockNode } from "./validate-masters-shared";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function pushUnknownKeys(
  issues: NestedDiskValidationIssue[],
  obj: Record<string, unknown>,
  allowed: Set<string>,
  path: string
): void {
  for (const key of Object.keys(obj)) {
    if (!allowed.has(key)) {
      issues.push({ path: `${path}.${key}`, reason: "nested 落盘不允许该字段" });
    }
  }
}

/** 是否为禁止的 flat wire（顶层 blocks map 或 schemaVersion 3.0.0） */
export function isForbiddenFlatDiskWire(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (value.schemaVersion === "3.0.0") return true;
  if ("blocks" in value && isRecord(value.blocks)) return true;
  return false;
}

export function isNestedDiskTemplate(value: unknown): value is NestedEmailTemplate {
  if (!isRecord(value)) return false;
  return (
    value.schemaVersion === NESTED_TEMPLATE_SCHEMA_VERSION &&
    isRecord(value.root) &&
    !("blocks" in value)
  );
}

export function validateNestedDisk(value: unknown): NestedDiskValidationIssue[] {
  const issues: NestedDiskValidationIssue[] = [];
  if (!isRecord(value)) {
    return [{ path: "", reason: "template 必须为对象" }];
  }

  if (isForbiddenFlatDiskWire(value)) {
    issues.push({
      path: "schemaVersion",
      reason: "禁止 flat wire（顶层 blocks 或 schemaVersion 3.0.0），须为 nested 4.0.0",
    });
    return issues;
  }

  pushUnknownKeys(issues, value, NESTED_TEMPLATE_ENVELOPE_KEYS, "");

  if (value.schemaVersion !== NESTED_TEMPLATE_SCHEMA_VERSION) {
    issues.push({
      path: "schemaVersion",
      reason: `schemaVersion 必须为 ${NESTED_TEMPLATE_SCHEMA_VERSION}`,
    });
  }

  if (typeof value.templateId !== "string" || !value.templateId.trim()) {
    issues.push({ path: "templateId", reason: "templateId 为必填字符串" });
  }

  if (typeof value.templateVersion !== "number" || !Number.isFinite(value.templateVersion)) {
    issues.push({ path: "templateVersion", reason: "templateVersion 为必填数字" });
  }

  if (value.meta !== undefined && !isRecord(value.meta)) {
    issues.push({ path: "meta", reason: "meta 必须为对象" });
  }

  if (!isRecord(value.root)) {
    issues.push({ path: "root", reason: "root 为必填嵌套节点" });
  } else {
    const seenIds = new Map<string, string>();
    issues.push(...validateNestedBlockNode(value.root, "root", seenIds));
    const rootType = (value.root as Record<string, unknown>).type;
    if (rootType !== "emailRoot") {
      issues.push({ path: "root.type", reason: "根节点 type 必须为 emailRoot" });
    }
  }

  return issues;
}

export function assertNestedDiskTemplate(value: unknown): NestedEmailTemplate {
  const issues = validateNestedDisk(value);
  if (issues.length > 0) {
    const msg = issues.map((i) => `${i.path}：${i.reason}`).join("；");
    throw new Error(msg);
  }
  return value as NestedEmailTemplate;
}
