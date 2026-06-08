import type { BlockTypeContract } from "../block-contract/types";
import { classifyField } from "./blockFieldClassification";
import { isInsertDefaultFieldKind } from "../block-insert-default-contract";

/**
 * 列出某 blockType 插入默认应持久化的 bindPath（内容 / 样式 / 布局 Tab）。
 * 以 block-contract `allowedPrefixes` 为全集，再按 fieldKind 过滤。
 */
export function listInsertDefaultBindPaths(contract: BlockTypeContract): string[] {
  const runtimeType = contract.runtimeType;
  return contract.allowedPrefixes.filter((prefix) => {
    const fromContract = contract.bindingKinds?.[prefix];
    const kind = fromContract ?? classifyField(runtimeType, prefix);
    return isInsertDefaultFieldKind(kind);
  });
}

/** 若已有更短前缀覆盖该路径，则跳过（避免重复写入子路径）。 */
export function filterBindPathsByPrefixCoverage(paths: string[]): string[] {
  const sorted = [...paths].sort((a, b) => a.length - b.length);
  const kept: string[] = [];
  for (const path of sorted) {
    if (kept.some((p) => path === p || path.startsWith(`${p}.`))) continue;
    kept.push(path);
  }
  return kept;
}
