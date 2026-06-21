import type { RestoreAstDocument } from "../../../restore-ast-contract/types";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** 豆包偶发把 icon 写成 { icon:"query", pack } 而非 { t:"icon", query, pack }。 */
function normalizeTreeNode(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.map(normalizeTreeNode);
  }
  if (!isRecord(node)) return node;

  let normalized: Record<string, unknown> = node;
  if (!normalized.t && typeof normalized.icon === "string") {
    const { icon, ...rest } = normalized;
    normalized = { ...rest, t: "icon", query: icon };
  }

  if (Array.isArray(normalized.children)) {
    normalized = {
      ...normalized,
      children: normalized.children.map(normalizeTreeNode),
    };
  }

  return normalized;
}

/** 对 LLM 输出的 RestoreAst 做常见形态归一（不改变已通过契约校验的合法输入）。 */
export function normalizeRestoreAstFromLlm(doc: RestoreAstDocument): RestoreAstDocument {
  return {
    ...doc,
    tree: normalizeTreeNode(doc.tree) as RestoreAstDocument["tree"],
  };
}
