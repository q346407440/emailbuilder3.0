import type { BindingCollectionField, EmailPayload, EmailTemplate } from "../types/email";
import { findCollectionFieldByPath, scalarCollectionFields } from "../payload-contract/collection-item-fields";
import { resolveRepeatContextForBlock, type ResolvedRepeatContext } from "./repeatRegion";

export { collectionItemFieldValueTypeLabel } from "../payload-contract/collection-item-fields";

/** 数组变量表格「首项示例」：项数 + 首字段第 1 项预览 */
export function formatCollectionSlotListSummary(
  payload: EmailPayload | null,
  slotId: string,
  itemFields: BindingCollectionField[]
): string {
  const raw = payload?.values?.[slotId];
  const count = Array.isArray(raw) ? raw.length : 0;
  if (count === 0) return "—";
  const scalarFields = scalarCollectionFields(itemFields);
  const primaryKey = scalarFields.find((f) => f.valueType === "string")?.key ?? scalarFields[0]?.key;
  if (!primaryKey) return `${count} 项`;
  const example = formatCollectionFirstItemFieldExample(payload, slotId, primaryKey);
  if (example === "—") return `${count} 项`;
  return `${count} 项 · ${example}`;
}

/** 取 collection 第 1 项某字段的值，用于弹窗「首项示例」展示 */
export function formatCollectionFirstItemFieldExample(
  payload: EmailPayload | null,
  slotId: string,
  fieldKey: string
): string {
  const raw = payload?.values?.[slotId];
  if (!Array.isArray(raw) || raw.length === 0) return "—";
  const first = raw[0];
  if (!first || typeof first !== "object" || Array.isArray(first)) return "—";
  const value = (first as Record<string, unknown>)[fieldKey];
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    const t = value.trim();
    if (!t) return "—";
    return t.length > 160 ? `${t.slice(0, 157)}…` : t;
  }
  try {
    const s = JSON.stringify(value);
    return s.length > 160 ? `${s.slice(0, 157)}…` : s;
  } catch {
    return String(value);
  }
}

/** 用户尝试将列表行内字段改为字面量时的提示（须先解除 repeat 宿主绑定） */
export const REPEAT_LIST_ITEM_LITERAL_BLOCKED_MESSAGE =
  "该字段由列表重复按数组项展开，不能直接改为字面量。请先在「列表」Tab 选中列表重复宿主并解除「列表重复」绑定，再编辑单项内容。";

export type RepeatListItemFieldContext = ResolvedRepeatContext & {
  itemFieldKey: string;
  itemFieldLabel: string;
  collectionLabel: string;
};

function stripLeadingCollectionIndex(slotPath: string): string {
  const parts = slotPath.split(".");
  if (/^\d+$/.test(parts[0] ?? "")) {
    return parts.slice(1).join(".");
  }
  return slotPath;
}

function leadingCollectionIndex(slotPath: string): string {
  const head = slotPath.split(".")[0] ?? "";
  return /^\d+$/.test(head) ? head : "0";
}

/**
 * 当前 bindPath 是否为「列表重复行模板内」的 collection 项字段映射。
 * 不含 repeat 宿主自身（宿主在「列表」Tab 配置）。
 */
export function resolveRepeatListItemFieldBinding(
  template: EmailTemplate,
  blockId: string,
  bindPath: string
): RepeatListItemFieldContext | null {
  const block = template.blocks[blockId];
  const spec = block?.bindings?.[bindPath];
  if (
    !spec ||
    spec.mode !== "variable" ||
    spec.allowExternal !== true ||
    spec.valueType !== "collection" ||
    typeof spec.slotPath !== "string" ||
    !spec.slotPath.trim()
  ) {
    return null;
  }

  const ctx = resolveRepeatContextForBlock(template, blockId);
  if (!ctx || ctx.relation === "host") return null;
  if (spec.slotId !== ctx.repeat.slotId) return null;

  const itemFieldKey = stripLeadingCollectionIndex(spec.slotPath);
  if (!itemFieldKey) return null;

  const fieldMeta = findCollectionFieldByPath(ctx.repeat.itemFields, itemFieldKey);
  if (!fieldMeta) return null;

  return {
    ...ctx,
    itemFieldKey,
    itemFieldLabel: fieldMeta.label?.trim() || itemFieldKey,
    collectionLabel: ctx.repeat.label?.trim() || ctx.repeat.slotId,
  };
}

/** 行模板字段切换映射到同一 collection 的另一 itemField（不改数组槽 slotId） */
export function applyRepeatListItemFieldKey(
  template: EmailTemplate,
  blockId: string,
  bindPath: string,
  nextFieldKey: string
): EmailTemplate {
  const ctx = resolveRepeatListItemFieldBinding(template, blockId, bindPath);
  if (!ctx) return template;
  if (!findCollectionFieldByPath(ctx.repeat.itemFields, nextFieldKey)) return template;

  const block = template.blocks[blockId];
  const spec = block?.bindings?.[bindPath];
  if (!spec) return template;

  const t = structuredClone(template);
  const prevPath = spec.slotPath ?? "";
  const index = leadingCollectionIndex(prevPath);
  t.blocks[blockId] = {
    ...t.blocks[blockId]!,
    bindings: {
      ...t.blocks[blockId]!.bindings,
      [bindPath]: {
        ...spec,
        slotPath: `${index}.${nextFieldKey}`,
      },
    },
  };
  return t;
}

/** 按目标字段路径筛选可绑定的 itemFields（类型须与 bindPath 语义一致） */
export function filterRepeatItemFieldsForBindPath(
  itemFields: BindingCollectionField[] | undefined,
  bindPath: string
): BindingCollectionField[] {
  if (!itemFields?.length) return [];
  const lower = bindPath.toLowerCase();
  const wantsImage =
    lower.endsWith(".src") ||
    lower.includes("imagesrc") ||
    lower.includes("iconsrc") ||
    lower.includes("backgroundimage.src");
  const wantsUrl = lower.endsWith(".link") || lower.endsWith(".href") || lower.includes("url");
  const scalarFields = scalarCollectionFields(itemFields);
  if (wantsImage) return scalarFields.filter((f) => f.valueType === "image");
  if (wantsUrl) return scalarFields.filter((f) => f.valueType === "url");
  return scalarFields.filter((f) => f.valueType === "string" || f.valueType === "color");
}
