import {
  BUILTIN_ALBUM_SORT_IDS,
  BUILTIN_PRODUCT_SORT_IDS,
  DEFAULT_BUILTIN_COLLECTION_SORT,
  builtinCollectionSortLabel,
  isBuiltinCollectionSortId,
  normalizeBuiltinCollectionSortId,
  type BuiltinCollectionSortId,
} from "./collection-builtin-sort";

/** 派生列表策略：相似品 / 搭配品（须声明 targetSlotId） */
export const BUILTIN_DERIVED_SORT_STRATEGIES = ["similarTo", "complement"] as const;

export type BuiltinDerivedSortStrategy = (typeof BUILTIN_DERIVED_SORT_STRATEGIES)[number];

/** 持久化形态：常规排序为字符串；派生排序为对象 */
export type BuiltinCollectionSortPolicyInput =
  | BuiltinCollectionSortId
  | {
      strategy: BuiltinCollectionSortId | BuiltinDerivedSortStrategy;
      targetSlotId?: string;
    };

export type NormalizedBuiltinSortPolicy =
  | { kind: "regular"; sort: BuiltinCollectionSortId }
  | { kind: "derived"; strategy: BuiltinDerivedSortStrategy; targetSlotId: string };

export function isBuiltinDerivedSortStrategy(value: string): value is BuiltinDerivedSortStrategy {
  return (BUILTIN_DERIVED_SORT_STRATEGIES as readonly string[]).includes(value);
}

export function isSortPolicyObject(
  value: unknown
): value is { strategy: string; targetSlotId?: string } {
  return typeof value === "object" && value !== null && !Array.isArray(value) && "strategy" in value;
}

/** 从 dataSource.sort 归一化为统一策略（读取真源） */
export function normalizeBuiltinSortPolicy(sort: unknown): NormalizedBuiltinSortPolicy {
  if (isSortPolicyObject(sort)) {
    const strategy = String(sort.strategy ?? "");
    if (isBuiltinDerivedSortStrategy(strategy)) {
      const targetSlotId = typeof sort.targetSlotId === "string" ? sort.targetSlotId.trim() : "";
      if (targetSlotId) {
        return { kind: "derived", strategy, targetSlotId };
      }
      return { kind: "derived", strategy, targetSlotId: "" };
    }
    if (isBuiltinCollectionSortId(strategy)) {
      return { kind: "regular", sort: normalizeBuiltinCollectionSortId(strategy) };
    }
  }

  if (typeof sort === "string" && isBuiltinCollectionSortId(sort)) {
    return { kind: "regular", sort: normalizeBuiltinCollectionSortId(sort) };
  }

  return { kind: "regular", sort: DEFAULT_BUILTIN_COLLECTION_SORT };
}

/** 写入 payload.slots dataSource 的 sort 字段（不含 extract） */
export function writeSortPolicyToDataSource(
  policy: NormalizedBuiltinSortPolicy
): BuiltinCollectionSortPolicyInput {
  if (policy.kind === "derived") {
    return { strategy: policy.strategy, targetSlotId: policy.targetSlotId };
  }
  return policy.sort;
}

export function sortPolicyTargetSlotId(policy: NormalizedBuiltinSortPolicy): string | undefined {
  return policy.kind === "derived" ? policy.targetSlotId : undefined;
}

export function isDerivedSortPolicy(
  policy: NormalizedBuiltinSortPolicy
): policy is Extract<NormalizedBuiltinSortPolicy, { kind: "derived" }> {
  return policy.kind === "derived";
}

/** UI 下拉：常规 + 派生策略 id */
export type BuiltinSortUiOptionId = BuiltinCollectionSortId | BuiltinDerivedSortStrategy;

/** 商品列表 UI 排序下拉：仅常规策略（不含相似品/搭配品） */
export function builtinProductSortUiOptionIds(): BuiltinCollectionSortId[] {
  return [...BUILTIN_PRODUCT_SORT_IDS];
}

export function builtinAlbumSortUiOptionIds(): BuiltinSortUiOptionId[] {
  return [...BUILTIN_ALBUM_SORT_IDS];
}

export function builtinSortUiOptionLabel(
  optionId: BuiltinSortUiOptionId,
  catalog?: "products" | "albums"
): string {
  if (isBuiltinDerivedSortStrategy(optionId)) {
    return optionId === "similarTo" ? "相似品" : "搭配品";
  }
  return builtinCollectionSortLabel(optionId, catalog);
}

export function sortPolicySummaryLabel(
  policy: NormalizedBuiltinSortPolicy,
  payload?: { slots?: Record<string, { label?: string }> }
): string {
  if (policy.kind === "regular") {
    return builtinCollectionSortLabel(policy.sort);
  }
  const targetLabel = payload?.slots?.[policy.targetSlotId]?.label ?? policy.targetSlotId;
  const strategyLabel = policy.strategy === "similarTo" ? "相似品" : "搭配品";
  return policy.targetSlotId
    ? `${strategyLabel}（目标：${targetLabel}）`
    : `${strategyLabel}（须选择目标列表）`;
}

export function sortUiOptionIdFromPolicy(policy: NormalizedBuiltinSortPolicy): BuiltinSortUiOptionId {
  if (policy.kind === "derived") return policy.strategy;
  return policy.sort;
}

export function policyFromSortUiOption(
  optionId: BuiltinSortUiOptionId,
  targetSlotId?: string
): NormalizedBuiltinSortPolicy {
  if (isBuiltinDerivedSortStrategy(optionId)) {
    return { kind: "derived", strategy: optionId, targetSlotId: targetSlotId?.trim() ?? "" };
  }
  return { kind: "regular", sort: normalizeBuiltinCollectionSortId(optionId) };
}

export function regularSortFromPolicy(policy: NormalizedBuiltinSortPolicy): BuiltinCollectionSortId {
  return policy.kind === "regular" ? policy.sort : DEFAULT_BUILTIN_COLLECTION_SORT;
}

export function readSortPolicyFromBuiltinDataSource(ds: {
  sort?: unknown;
}): NormalizedBuiltinSortPolicy {
  return normalizeBuiltinSortPolicy(ds.sort);
}
