import type { BindingCollectionField, EmailPayload, EmailTemplate } from "../types/email";
import { findCollectionFieldByPath, scalarCollectionFields } from "../payload-contract/collection-item-fields";
import { resolveRepeatContextForRef } from "../repeat-runtime/repeatVirtualResolver";
import type { ResolvedRepeatContext } from "./repeatRegion";

export { collectionItemFieldValueTypeLabel } from "../payload-contract/collection-item-fields";

function formatScalarPreviewValue(value: unknown): string {
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
  return formatScalarPreviewValue(value);
}

/** 父项第 1 行内子列表（itemPath）的首项示例：子数组项数 + 子列表首字段预览 */
export function formatRepeatNestedItemPathListSummary(
  payload: EmailPayload | null,
  slotId: string,
  itemPath: string,
  itemFields: BindingCollectionField[]
): string {
  const raw = payload?.values?.[slotId];
  if (!Array.isArray(raw) || raw.length === 0) return "—";
  const firstParent = raw[0];
  if (!firstParent || typeof firstParent !== "object" || Array.isArray(firstParent)) return "—";
  const nested = (firstParent as Record<string, unknown>)[itemPath];
  if (!Array.isArray(nested)) return "—";
  const rows = nested.filter(
    (item) => item && typeof item === "object" && !Array.isArray(item)
  ) as Record<string, unknown>[];
  const count = rows.length;
  if (count === 0) return "0 项";
  const scalarFields = scalarCollectionFields(itemFields);
  const primaryKey =
    scalarFields.find((f) => f.valueType === "string")?.key ?? scalarFields[0]?.key;
  if (!primaryKey) return `${count} 项`;
  const preview = formatScalarPreviewValue(rows[0]?.[primaryKey]);
  if (preview === "—") return `${count} 项`;
  return `${count} 项 · ${preview}`;
}

/** 列表绑定向导：按顶层槽或父项子列表（itemPath）生成「首项示例」 */
export function formatRepeatCollectionCandidateListSummary(
  payload: EmailPayload | null,
  candidate: {
    slotId: string;
    itemPath?: string;
    itemFields: BindingCollectionField[];
  }
): string {
  const itemPath = candidate.itemPath?.trim();
  if (itemPath) {
    return formatRepeatNestedItemPathListSummary(
      payload,
      candidate.slotId,
      itemPath,
      candidate.itemFields
    );
  }
  return formatCollectionSlotListSummary(payload, candidate.slotId, candidate.itemFields);
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

function buildRepeatListItemFieldContext(
  ctx: ResolvedRepeatContext,
  itemFieldKey: string
): RepeatListItemFieldContext | null {
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

function resolveRepeatListItemFieldBindingFromBlockBinding(
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

  const ctx = resolveRepeatContextForRef(template, { kind: "physical", blockId });
  if (!ctx || ctx.relation === "host") return null;
  if (spec.slotId !== ctx.repeat.slotId) return null;

  return buildRepeatListItemFieldContext(ctx, stripLeadingCollectionIndex(spec.slotPath));
}

/** 列表绑定向导 fieldMappings：行模板块上无 bindings，映射写在 repeat 宿主 */
function resolveRepeatListItemFieldBindingFromFieldMappings(
  template: EmailTemplate,
  blockId: string,
  bindPath: string
): RepeatListItemFieldContext | null {
  const ctx = resolveRepeatContextForRef(template, { kind: "physical", blockId });
  if (!ctx || ctx.relation === "host") return null;

  const mapping = ctx.repeat.fieldMappings?.find(
    (m) => m.targetBlockId === blockId && m.targetBindPath === bindPath
  );
  if (!mapping) return null;

  return buildRepeatListItemFieldContext(ctx, stripLeadingCollectionIndex(mapping.sourcePath));
}

/**
 * 当前 bindPath 是否为「列表重复行模板内」的 collection 项字段映射。
 * 含：行模板 block.bindings（旧式/展开写入）与 repeat.fieldMappings（合一绑定向导）。
 * 不含 repeat 宿主自身（宿主在「列表」Tab 配置）。
 */
export function resolveRepeatListItemFieldBinding(
  template: EmailTemplate,
  blockId: string,
  bindPath: string
): RepeatListItemFieldContext | null {
  return (
    resolveRepeatListItemFieldBindingFromBlockBinding(template, blockId, bindPath) ??
    resolveRepeatListItemFieldBindingFromFieldMappings(template, blockId, bindPath)
  );
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
  if (spec) {
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

  const mapping = ctx.repeat.fieldMappings?.find(
    (m) => m.targetBlockId === blockId && m.targetBindPath === bindPath
  );
  if (!mapping) return template;

  const t = structuredClone(template);
  const host = t.blocks[ctx.hostId];
  if (!host?.repeat?.fieldMappings?.length) return template;
  host.repeat = {
    ...host.repeat,
    fieldMappings: host.repeat.fieldMappings.map((m) =>
      m.targetBlockId === blockId && m.targetBindPath === bindPath
        ? { ...m, sourcePath: nextFieldKey, label: findCollectionFieldByPath(ctx.repeat.itemFields, nextFieldKey)?.label ?? m.label }
        : m
    ),
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
  return scalarFields.filter((f) => f.valueType === "string");
}
