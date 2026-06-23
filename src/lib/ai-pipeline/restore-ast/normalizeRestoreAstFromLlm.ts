import type { RestoreAstDocument } from "../../../restore-ast-contract/types";
import { isButtonHeightToken } from "../../../restore-ast-contract/tokens";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isVisualBox(box: Record<string, unknown>): boolean {
  return box.tone !== undefined || box.border !== undefined;
}

/**
 * email 直子 stack 同时带 tone/border 时，拆为外缩进壳 + 内层视觉块。
 * pageInline 视为通栏贴边，不拆层。
 */
function wrapEmailDirectVisualInset(stack: Record<string, unknown>): Record<string, unknown> {
  if (stack.t !== "stack" || !isRecord(stack.box) || !isVisualBox(stack.box)) {
    return stack;
  }
  const box = stack.box;
  if (box.pad === "pageInline") {
    return stack;
  }

  const { box: _box, children, title, align, gap, t: _t, ...rest } = stack;
  const outerPad = box.pad ?? "section";
  const innerTitle = typeof title === "string" ? title : "视觉块";
  const outerTitle = innerTitle.length > 10 ? `${innerTitle.slice(0, 10)}外缘` : `${innerTitle}外缘`;

  const innerStack: Record<string, unknown> = {
    t: "stack",
    title: innerTitle,
    box,
    children: children ?? [],
    ...(align !== undefined ? { align } : {}),
    ...(gap !== undefined ? { gap } : {}),
  };

  return {
    ...rest,
    t: "stack",
    title: outerTitle,
    box: { pad: outerPad },
    ...(align !== undefined ? { align } : {}),
    children: [innerStack],
  };
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

  if (normalized.t === "button" && normalized.height !== undefined) {
    const h = normalized.height;
    if (typeof h !== "string" || !isButtonHeightToken(h)) {
      const { height: _drop, ...rest } = normalized;
      normalized = rest;
    }
  }

  if (normalized.t === "icon" && "required" in normalized) {
    const { required: _drop, ...rest } = normalized;
    normalized = rest;
  }

  if (normalized.t === "text" && isRecord(normalized.box)) {
    const { box, content, ...textRest } = normalized;
    const label = typeof content === "string" ? content.trim() : "文案";
    const title = label.length > 12 ? label.slice(0, 12) : label || "圆标";
    normalized = {
      t: "stack",
      title,
      align: "center",
      box,
      children: [{ t: "text", content, ...textRest }],
    };
  }

  if (normalized.t === "image" && "required" in normalized) {
    const { required: _drop, ...rest } = normalized;
    normalized = rest;
  }

  if (Array.isArray(normalized.children)) {
    normalized = {
      ...normalized,
      children: normalized.children.map(normalizeTreeNode),
    };
  }

  if (normalized.t === "email" && Array.isArray(normalized.children)) {
    normalized = {
      ...normalized,
      children: normalized.children.map((child) =>
        isRecord(child) && child.t === "stack" ? wrapEmailDirectVisualInset(child) : child
      ),
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
