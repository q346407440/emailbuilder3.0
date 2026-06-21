import type { RestoreNode } from "./types";

export type DisplayNameHints = {
  /** email 的直接子 stack */
  isEmailDirectStack?: boolean;
};

const MAX_SNIPPET = 28;

/** 无 title 时 stack / row / grid 的固定兜底名 */
export const STACK_DISPLAY_NAME_FALLBACK = "垂直布局";
export const ROW_DISPLAY_NAME_FALLBACK = "横向布局";
export const GRID_DISPLAY_NAME_FALLBACK = "栅格";

function truncate(text: string, max = MAX_SNIPPET): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function shortenQuery(query: string, max = 24): string {
  const words = query.trim().split(/\s+/).slice(0, 3).join(" ");
  if (words.length <= max) return words;
  return `${words.slice(0, max)}…`;
}

function formatIconQuery(query: string): string {
  return query.replace(/^brand-/i, "");
}

/**
 * 由 AST 节点生成编辑器 blockMeta.name。
 *
 * 容器有 `title` 用 title；无 title 用固定兜底（垂直/横向/栅格）。
 * 叶子用 `content` / `label` / `query`。
 */
export function deriveBlockDisplayName(
  node: RestoreNode,
  hints: DisplayNameHints
): string {
  switch (node.t) {
    case "email":
      return "邮件根";
    case "stack": {
      if (node.title?.trim()) {
        return hints.isEmailDirectStack ? `${node.title.trim()}模块` : node.title.trim();
      }
      return hints.isEmailDirectStack ? `${STACK_DISPLAY_NAME_FALLBACK}模块` : STACK_DISPLAY_NAME_FALLBACK;
    }
    case "row":
      return node.title?.trim() || ROW_DISPLAY_NAME_FALLBACK;
    case "grid":
      return node.title?.trim() || GRID_DISPLAY_NAME_FALLBACK;
    case "text":
      return truncate(node.content);
    case "button":
      return truncate(node.label, 32);
    case "image":
      return shortenQuery(node.query);
    case "icon":
      return shortenQuery(formatIconQuery(node.query));
    case "divider":
      return "分隔线";
    case "progress":
      return "进度条";
    default: {
      const _exhaustive: never = node;
      return String(_exhaustive);
    }
  }
}
