/** 内置 catalog 列表的提取/衍生策略（仅 provider=builtin 时生效；算法粒度为 SPU） */
export const BUILTIN_COLLECTION_EXTRACT_KINDS = ["none", "similarTo", "complement"] as const;

export type BuiltinCollectionExtractKind = (typeof BUILTIN_COLLECTION_EXTRACT_KINDS)[number];

/** 锚点行与 catalog 行比对时优先使用的字段 */
export const BUILTIN_COLLECTION_EXTRACT_MATCH_FIELDS = ["href", "name"] as const;

export type BuiltinCollectionExtractMatchField =
  (typeof BUILTIN_COLLECTION_EXTRACT_MATCH_FIELDS)[number];

type BuiltinCollectionExtractAnchor = {
  /** 锚点列表槽（须为内置商品列表） */
  fromSlotId: string;
  /** 锚定列表第几条（从 1 起计），取该条 SPU */
  anchorItemIndex?: number;
  matchField?: BuiltinCollectionExtractMatchField;
};

export type BuiltinCollectionExtract =
  | { kind: "none" }
  | ({ kind: "similarTo" } & BuiltinCollectionExtractAnchor)
  | ({ kind: "complement" } & BuiltinCollectionExtractAnchor);

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

export function builtinCollectionExtractAnchorIndex(
  extract: BuiltinCollectionExtractAnchor
): number {
  const n = extract.anchorItemIndex ?? 1;
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

export function builtinCollectionExtractKindUiLabel(kind: BuiltinCollectionExtractKind): string {
  switch (kind) {
    case "none":
      return "无";
    case "similarTo":
      return "相似品";
    case "complement":
      return "搭配品";
  }
}

export function builtinCollectionExtractLabel(extract: BuiltinCollectionExtract): string {
  if (extract.kind === "none") return "无（可配置排序）";
  if (extract.kind === "similarTo" || extract.kind === "complement") {
    const label = extract.kind === "similarTo" ? "相似品" : "搭配品";
    const idx = builtinCollectionExtractAnchorIndex(extract);
    return `${label}（锚点：${extract.fromSlotId} 第 ${idx} 条 SPU）`;
  }
  return extract.kind;
}

export function builtinCollectionExtractNeedsAnchorSlot(
  extract: BuiltinCollectionExtract | undefined
): extract is Extract<BuiltinCollectionExtract, { kind: "similarTo" | "complement" }> {
  const normalized = normalizeBuiltinCollectionExtract(extract);
  return normalized.kind === "similarTo" || normalized.kind === "complement";
}
