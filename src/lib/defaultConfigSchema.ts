import type { EmailTemplate } from "../types/email";
import type { ConfigField, ConfigSchema } from "../types/configSchema";

function controlFromValueType(valueType: string | undefined): ConfigField["control"] {
  if (valueType === "url" || valueType === "image") return "url";
  if (valueType === "color") return "color";
  if (valueType === "number") return "number";
  return "text";
}

function labelFromSpec(slotId: string, fallback: string): string {
  return fallback || slotId.replaceAll("_", " ");
}

function tokenFamilyFromPath(tokenPath: string | undefined): string | undefined {
  if (!tokenPath) return undefined;
  const parts = tokenPath.split(".");
  return parts[0] === "tokens" ? parts[1] : parts[0];
}

function defaultScaleFromPath(tokenPath: string | undefined): string | undefined {
  if (!tokenPath) return undefined;
  const parts = tokenPath.split(".");
  return parts[parts.length - 1];
}

function fieldKeyFromBindPath(bindPath: string, suffix = ""): string {
  const base = bindPath.replaceAll(".", "_");
  return suffix ? `${base}_${suffix}` : base;
}

export function createDefaultConfigSchema(template: EmailTemplate): ConfigSchema {
  const templateFields: ConfigField[] = [];
  const blockScopes: ConfigSchema["scopes"] = [];

  for (const [blockId, block] of Object.entries(template.blocks)) {
    const fields: ConfigField[] = [];
    const fieldKeys = new Set<string>();
    for (const [bindPath, spec] of Object.entries(block.bindings ?? {})) {
      if (spec.mode === "variable" && spec.allowExternal === true) {
        const key = fieldKeyFromBindPath(bindPath);
        if (fieldKeys.has(key)) continue;
        fieldKeys.add(key);
        fields.push({
          key,
          label: labelFromSpec(spec.slotId, spec.label ?? ""),
          description: spec.description,
          control: controlFromValueType(spec.valueType),
          target: { kind: "payload", slotId: spec.slotId },
          required: spec.required,
          group: spec.groupTag,
        });
      }
      if (spec.mode === "theme" && spec.tokenPath) {
        const key = fieldKeyFromBindPath(bindPath, "token");
        if (fieldKeys.has(key)) continue;
        fieldKeys.add(key);
        const tokenFamily = tokenFamilyFromPath(spec.tokenPath);
        fields.push({
          key,
          label: spec.label ?? `${bindPath} 样式档位`,
          description: spec.description,
          control: tokenFamily ? "tokenScale" : "text",
          tokenFamily,
          defaultScale: defaultScaleFromPath(spec.tokenPath),
          allowCustom: true,
          target: { kind: "blockPath", blockId, path: bindPath },
          group: spec.groupTag,
        });
      }
    }
    if (fields.length > 0) {
      blockScopes.push({
        scopeId: `block:${blockId}`,
        kind: "block",
        label: template.blockMeta?.[blockId]?.name ?? blockId,
        blockIds: [blockId],
        fields,
      });
    }
  }

  if (templateFields.length === 0) {
    templateFields.push({
      key: "templateWidth",
      label: "邮件宽度",
      control: "text",
      target: { kind: "templatePath", path: `blocks.${template.rootBlockId}.props.width` },
    });
  }

  return {
    schemaVersion: "1.0.0",
    scopes: [
      {
        scopeId: "template",
        kind: "template",
        label: "整封邮件",
        fields: templateFields,
      },
      ...blockScopes,
    ],
  };
}
