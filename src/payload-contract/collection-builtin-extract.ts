/** 内置 catalog 列表的提取/衍生策略（仅 provider=builtin 时生效） */
export const BUILTIN_COLLECTION_EXTRACT_KINDS = ["none", "similarTo"] as const;

export type BuiltinCollectionExtractKind = (typeof BUILTIN_COLLECTION_EXTRACT_KINDS)[number];

/** 锚点行与 catalog 行比对时优先使用的字段 */
export const BUILTIN_COLLECTION_EXTRACT_MATCH_FIELDS = ["href", "name"] as const;

export type BuiltinCollectionExtractMatchField =
  (typeof BUILTIN_COLLECTION_EXTRACT_MATCH_FIELDS)[number];

export type BuiltinCollectionExtract =
  | { kind: "none" }
  | {
      kind: "similarTo";
      /**
       * 锚点列表槽（如主推单品）；读取 payload.values[fromSlotId] 首项。
       * 匹配粒度为 **SPU（商品）**：用该行的 href/name 等在目录中排除整款商品；
       * 不按 SKU 规格比对，槽内多 SKU 展示字段不参与相似品计算。
       */
      fromSlotId: string;
      matchField?: BuiltinCollectionExtractMatchField;
    };

export const DEFAULT_BUILTIN_COLLECTION_EXTRACT: BuiltinCollectionExtract = { kind: "none" };

export function isBuiltinCollectionExtractKind(
  value: string
): value is BuiltinCollectionExtractKind {
  return (BUILTIN_COLLECTION_EXTRACT_KINDS as readonly string[]).includes(value);
}

export function isBuiltinCollectionExtractMatchField(
  value: string
): value is BuiltinCollectionExtractMatchField {
  return (BUILTIN_COLLECTION_EXTRACT_MATCH_FIELDS as readonly string[]).includes(value);
}

export function normalizeBuiltinCollectionExtract(
  extract: BuiltinCollectionExtract | undefined
): BuiltinCollectionExtract {
  if (!extract || extract.kind === "none") return { kind: "none" };
  return extract;
}

export function builtinCollectionExtractKindUiLabel(kind: BuiltinCollectionExtractKind): string {
  switch (kind) {
    case "none":
      return "无（仅目录 + 排序）";
    case "similarTo":
      return "相似品（排除锚点商品）";
  }
}

export function builtinCollectionExtractLabel(extract: BuiltinCollectionExtract): string {
  if (extract.kind === "none") return "无（仅目录 + 排序）";
  if (extract.kind === "similarTo") {
    return `相似品（来自「${extract.fromSlotId}」）`;
  }
  return extract.kind;
}

export function builtinCollectionExtractNeedsAnchorSlot(
  extract: BuiltinCollectionExtract | undefined
): extract is Extract<BuiltinCollectionExtract, { kind: "similarTo" }> {
  const normalized = normalizeBuiltinCollectionExtract(extract);
  return normalized.kind === "similarTo";
}
