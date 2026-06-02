import { NESTED_BLOCK_SHELL_KEYS } from "./shell-keys";
import type { NestedDiskValidationIssue } from "./types";

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

export function validateNestedBlockNode(
  node: unknown,
  path: string,
  seenIds: Map<string, string>
): NestedDiskValidationIssue[] {
  const issues: NestedDiskValidationIssue[] = [];
  if (!isRecord(node)) {
    issues.push({ path, reason: "节点必须为对象" });
    return issues;
  }
  pushUnknownKeys(issues, node, NESTED_BLOCK_SHELL_KEYS, path);

  const id = node.id;
  if (typeof id !== "string" || !id.trim()) {
    issues.push({ path: `${path}.id`, reason: "id 为必填字符串" });
  } else if (seenIds.has(id)) {
    issues.push({
      path: `${path}.id`,
      reason: `block id 重复（已在 ${seenIds.get(id)} 出现）`,
    });
  } else {
    seenIds.set(id, `${path}.id`);
  }

  const blockMeta = node.blockMeta;
  if (!isRecord(blockMeta)) {
    issues.push({ path: `${path}.blockMeta`, reason: "blockMeta 为必填对象" });
  } else {
    if (typeof blockMeta.blockType !== "string" || !blockMeta.blockType.trim()) {
      issues.push({ path: `${path}.blockMeta.blockType`, reason: "blockType 为必填字符串" });
    }
    if (typeof blockMeta.name !== "string" || !blockMeta.name.trim()) {
      issues.push({ path: `${path}.blockMeta.name`, reason: "name 为必填字符串" });
    }
  }

  if (typeof node.type !== "string" || !node.type.trim()) {
    issues.push({ path: `${path}.type`, reason: "type 为必填字符串" });
  }

  if (node.props !== undefined && !isRecord(node.props)) {
    issues.push({ path: `${path}.props`, reason: "props 必须为对象" });
  }

  if (node.children !== undefined) {
    if (!Array.isArray(node.children)) {
      issues.push({ path: `${path}.children`, reason: "children 必须为数组" });
    } else {
      for (let i = 0; i < node.children.length; i++) {
        issues.push(
          ...validateNestedBlockNode(node.children[i], `${path}.children[${i}]`, seenIds)
        );
      }
    }
  }

  return issues;
}
