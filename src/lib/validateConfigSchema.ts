import type { EmailTemplate } from "../types/email";
import type { ConfigSchema } from "../types/configSchema";
import type { TokenPresets } from "../types/tokenPreset";
import type { ValidationIssue } from "./validate";
import { getAtPath } from "./paths";
import { isConfigTargetPathSafe } from "./configSchemaTargets";
import { validateTokenPresets as validateTokenPresetsContract } from "../token-preset-contract/validate";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function validateConfigSchema(
  schema: ConfigSchema | null | undefined,
  template: EmailTemplate
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!schema) return issues;
  if (!isPlainObject(schema)) {
    return [{ path: "configSchema", reason: "配置面必须为对象" }];
  }
  if (schema.schemaVersion !== "1.0.0") {
    issues.push({ path: "configSchema.schemaVersion", reason: "配置面版本必须为 1.0.0" });
  }
  if (!Array.isArray(schema.scopes)) {
    issues.push({ path: "configSchema.scopes", reason: "scopes 必须为数组" });
    return issues;
  }
  const scopeIds = new Set<string>();
  schema.scopes.forEach((scope, scopeIndex) => {
    const scopePath = `configSchema.scopes.${scopeIndex}`;
    if (!scope.scopeId || scopeIds.has(scope.scopeId)) {
      issues.push({ path: `${scopePath}.scopeId`, reason: "scopeId 必须非空且唯一" });
    } else {
      scopeIds.add(scope.scopeId);
    }
    if (scope.kind !== "template" && scope.kind !== "section" && scope.kind !== "block") {
      issues.push({ path: `${scopePath}.kind`, reason: "kind 仅允许 template / section / block" });
    }
    if (!Array.isArray(scope.fields)) {
      issues.push({ path: `${scopePath}.fields`, reason: "fields 必须为数组" });
      return;
    }
    const fieldKeys = new Set<string>();
    scope.fields.forEach((field, fieldIndex) => {
      const fieldPath = `${scopePath}.fields.${fieldIndex}`;
      if (!field.key || fieldKeys.has(field.key)) {
        issues.push({ path: `${fieldPath}.key`, reason: "字段 key 必须在当前 scope 内非空且唯一" });
      } else {
        fieldKeys.add(field.key);
      }
      if (!field.label || typeof field.label !== "string") {
        issues.push({ path: `${fieldPath}.label`, reason: "字段 label 必须为非空字符串" });
      }
      if (!field.target || !isConfigTargetPathSafe(field.target)) {
        issues.push({ path: `${fieldPath}.target`, reason: "target 不合法或指向危险结构字段" });
        return;
      }
      if (field.target.kind === "blockPath") {
        const block = template.blocks[field.target.blockId];
        if (!block) {
          issues.push({ path: `${fieldPath}.target.blockId`, reason: "目标 block 不存在" });
        } else if (getAtPath(block as unknown as Record<string, unknown>, field.target.path) === undefined) {
          issues.push({ path: `${fieldPath}.target.path`, reason: "目标 block 字段不存在" });
        }
      }
      if (field.target.kind === "templatePath") {
        const value = getAtPath(template as unknown as Record<string, unknown>, field.target.path);
        if (value === undefined) {
          issues.push({ path: `${fieldPath}.target.path`, reason: "目标 template 字段不存在" });
        }
      }
      if (field.control === "tokenScale" && !field.tokenFamily) {
        issues.push({ path: `${fieldPath}.tokenFamily`, reason: "tokenScale 字段必须声明 tokenFamily" });
      }
    });
  });
  return issues;
}

/** @see `src/token-preset-contract/validate.ts` */
export function validateTokenPresets(tokenPresets: TokenPresets | null | undefined): ValidationIssue[] {
  return validateTokenPresetsContract(tokenPresets);
}
