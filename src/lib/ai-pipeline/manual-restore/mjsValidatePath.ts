/** 从 validate 报错行 `blocks.<id>.<fieldPath>: reason` 提取 block id（id 可含连字符）。 */

export function blockIdFromValidateIssueLine(errorLine: string): string | null {
  const path = errorLine.split(":")[0]?.trim() ?? "";
  const nested = /^blocks\.(.+?)\.(?:props|wrapperStyle|children|blockMeta|type)(?:\.|$)/.exec(path);
  if (nested?.[1]) return nested[1];
  const bare = /^blocks\.([^\s/]+)$/.exec(path);
  return bare?.[1] ?? null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * 壳层校验（template-disk-contract）报 `root.children[i]...` 索引路径，
 * 文本层寻址（slot 归属、JSON autofix）只认 `blocks.<id>` 形态——
 * 在 validate 边界对照产物 template 树把可解析的索引路径改写为 `blocks.<id>.<余段>`；
 * 节点缺 id 或路径不可达时原样保留（id 缺失本身是独立错误，不可机械寻址）。
 */
export function rewriteNestedIssuePathToBlockPath(issuePath: string, template: unknown): string {
  const m = /^root((?:\.children\[\d+\])*)((?:\.[^[\]]+)?)$/.exec(issuePath.trim());
  if (!m) return issuePath;

  let node: unknown = isRecord(template) ? template.root : null;
  for (const idx of m[1]!.matchAll(/\.children\[(\d+)\]/g)) {
    if (!isRecord(node) || !Array.isArray(node.children)) return issuePath;
    node = node.children[Number(idx[1])];
  }
  if (!isRecord(node) || typeof node.id !== "string" || !node.id.trim()) return issuePath;
  return `blocks.${node.id}${m[2] ?? ""}`;
}
