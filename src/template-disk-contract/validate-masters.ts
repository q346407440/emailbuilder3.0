import {
  NESTED_BLOCK_MASTER_ENVELOPE_KEYS,
  NESTED_SECTION_MASTER_ENVELOPE_KEYS,
} from "./shell-keys";
import type { NestedMaster } from "./masters";
import {
  NESTED_TEMPLATE_SCHEMA_VERSION,
  type NestedDiskValidationIssue,
} from "./types";
import { isForbiddenFlatDiskWire } from "./validate";
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
      issues.push({ path: `${path}.${key}`, reason: "nested 母版不允许该字段" });
    }
  }
}

export function validateNestedMasterDisk(value: unknown): NestedDiskValidationIssue[] {
  const issues: NestedDiskValidationIssue[] = [];
  if (!isRecord(value)) {
    return [{ path: "", reason: "母版必须为对象" }];
  }

  if (isForbiddenFlatDiskWire(value)) {
    issues.push({ path: "blocks", reason: "禁止 flat wire，须为 nested root" });
    return issues;
  }

  const isSection = typeof value.rootBlockId === "string";
  const envelopeKeys = isSection
    ? NESTED_SECTION_MASTER_ENVELOPE_KEYS
    : NESTED_BLOCK_MASTER_ENVELOPE_KEYS;

  pushUnknownKeys(issues, value, envelopeKeys, "");

  if (value.schemaVersion !== NESTED_TEMPLATE_SCHEMA_VERSION) {
    issues.push({
      path: "schemaVersion",
      reason: `schemaVersion 必须为 ${NESTED_TEMPLATE_SCHEMA_VERSION}`,
    });
  }

  if (typeof value.masterId !== "string" || !value.masterId.trim()) {
    issues.push({ path: "masterId", reason: "masterId 为必填" });
  }

  if (typeof value.catalogRootBlockId !== "string" || !value.catalogRootBlockId.trim()) {
    issues.push({ path: "catalogRootBlockId", reason: "catalogRootBlockId 为必填" });
  }

  if (isSection) {
    if (typeof value.rootBlockId !== "string" || !value.rootBlockId.trim()) {
      issues.push({ path: "rootBlockId", reason: "rootBlockId 为必填" });
    }
  } else {
    if (typeof value.sampleBlockId !== "string" || !value.sampleBlockId.trim()) {
      issues.push({ path: "sampleBlockId", reason: "sampleBlockId 为必填" });
    }
    if (typeof value.runtimeType !== "string" || !value.runtimeType.trim()) {
      issues.push({ path: "runtimeType", reason: "runtimeType 为必填" });
    }
    if (typeof value.blockType !== "string" || !value.blockType.trim()) {
      issues.push({ path: "blockType", reason: "blockType 为必填" });
    }
  }

  if (!isRecord(value.root)) {
    issues.push({ path: "root", reason: "root 为必填嵌套节点" });
  } else {
    const seenIds = new Map<string, string>();
    issues.push(...validateNestedBlockNode(value.root, "root", seenIds));
    const rootId = (value.root as Record<string, unknown>).id;
    if (
      typeof value.catalogRootBlockId === "string" &&
      typeof rootId === "string" &&
      rootId !== value.catalogRootBlockId
    ) {
      issues.push({
        path: "root.id",
        reason: "root.id 须与 catalogRootBlockId 一致",
      });
    }
  }

  return issues;
}

export function assertNestedMasterDisk(value: unknown): NestedMaster {
  const issues = validateNestedMasterDisk(value);
  if (issues.length > 0) {
    const msg = issues.map((i) => `${i.path}：${i.reason}`).join("；");
    throw new Error(msg);
  }
  return value as NestedMaster;
}
