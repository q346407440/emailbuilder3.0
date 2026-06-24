import type { AlignMain, RestoreNode } from "./types";

/** 横排直接子块的父级上下文（仅 widthMode 决策所需字段）。 */
export type RowChildWidthParentContext = {
  inDirectRow?: boolean;
  rowAlign?: AlignMain;
  /** 直接父为 hug 宽的纵排 stack（徽章列等）。 */
  parentWidthHug?: boolean;
  /** 横排兄弟节点（仅 inDirectRow 时由组装器传入）。 */
  rowSiblings?: readonly RestoreNode[];
  /** 当前节点在 rowSiblings 中的下标。 */
  rowSiblingIndex?: number;
};

/**
 * 横排直接子块 wrapper widthMode。
 * `align:between` → gapMode auto（space-between），子级须 hug 才能插入缝隙列；
 * 其余横排直子默认 fill（栏内换行等）。
 */
export function resolveDirectRowChildWrapperWidthMode(
  parent: RowChildWidthParentContext,
  opts?: { forceFill?: boolean }
): "fill" | "hug" {
  if (opts?.forceFill) return "fill";
  if (parent.inDirectRow && parent.rowAlign === "between") return "hug";
  return "fill";
}

type StackNode = Extract<RestoreNode, { t: "stack" }>;

/**
 * AST 节点是否具固有宽度上限（可不依赖父级 fill 即确定最大宽）。
 * 用于 row 直子 stack：全子树有上限 → hug，否则 fill（左图右文栏等）。
 */
export function nodeHasIntrinsicWidthCap(node: RestoreNode): boolean {
  switch (node.t) {
    case "image":
      return node.aspect !== undefined || typeof node.height?.px === "number";
    case "icon":
      return true;
    case "button":
      return node.width !== "fill";
    case "stack":
      return stackHasIntrinsicWidthCap(node);
    case "text":
    case "row":
    case "grid":
    case "divider":
    case "progress":
    case "email":
      return false;
    default: {
      const _exhaustive: never = node;
      return _exhaustive;
    }
  }
}

/** stack 子树是否全部具固有宽度上限。 */
export function stackHasIntrinsicWidthCap(node: StackNode): boolean {
  const kids = node.children ?? [];
  if (kids.length === 0) return false;
  return kids.every((child) => nodeHasIntrinsicWidthCap(child));
}

/** 子树是否含可独立锚定宽度的节点（图 / icon / 全非 fill 按钮，或全有界的 row/grid/stack）。 */
export function restoreNodeHasWidthAnchor(node: RestoreNode): boolean {
  if (nodeHasIntrinsicWidthCap(node)) return true;
  switch (node.t) {
    case "stack":
    case "row":
      return (node.children ?? []).some((child) => restoreNodeHasWidthAnchor(child));
    case "grid": {
      const kids = node.children ?? [];
      return kids.length > 0 && kids.every((child) => restoreNodeHasWidthAnchor(child));
    }
    default:
      return false;
  }
}

/** 横排兄弟中是否存在具宽度锚点的节点（不含自身）。 */
export function rowPeerHasIntrinsicWidthCap(
  siblings: readonly RestoreNode[] | undefined,
  selfIndex: number | undefined
): boolean {
  if (!siblings || siblings.length < 2 || selfIndex === undefined) return false;
  return siblings.some(
    (sibling, index) => index !== selfIndex && restoreNodeHasWidthAnchor(sibling)
  );
}

/** stack 是否含 ≥2 个直接 text 子节点（文案栏，非短标签）。 */
export function stackHasMultipleDirectTextChildren(node: StackNode): boolean {
  const kids = node.children ?? [];
  return kids.filter((child) => child.t === "text").length >= 2;
}

/**
 * between 横排中无固有宽上限的 stack：同排有固定宽锚点 → fill；多段文案栏 → fill；否则 hug。
 */
export function resolveBetweenRowFlexibleStackWidthMode(
  node: StackNode,
  siblings: readonly RestoreNode[] | undefined,
  selfIndex: number | undefined
): "fill" | "hug" {
  if (rowPeerHasIntrinsicWidthCap(siblings, selfIndex)) return "fill";
  if (stackHasMultipleDirectTextChildren(node)) return "fill";
  return "hug";
}

function stackHasSingleTextChild(node: StackNode): boolean {
  const kids = node.children ?? [];
  return kids.length === 1 && kids[0]?.t === "text";
}

/**
 * 装饰性 box stack（色块 pill / 描边圆标）：须 hug 宽，由父级 contentAlign 居中。
 * 与 promptsRestoreAst 示例 B 色块、示例 D 圆标一致。
 */
export function isDecorativeBoxStack(node: StackNode): boolean {
  const box = node.box;
  if (!box || !stackHasSingleTextChild(node)) return false;
  if (box.tone !== undefined && box.radius !== undefined) return true;
  if (box.border !== undefined && box.radius !== undefined) return true;
  return false;
}

function stackHasTextDescendant(node: StackNode): boolean {
  for (const child of node.children ?? []) {
    if (child.t === "text") return true;
    if (child.t === "stack" && stackHasTextDescendant(child)) return true;
    if (child.t === "row") {
      for (const rowChild of child.children ?? []) {
        if (rowChild.t === "text") return true;
      }
    }
  }
  return false;
}

/**
 * 内容面板 stack（卡片壳：圆角 + 底色/内边距，内有多段内容或文案）。
 * 与 isDecorativeBoxStack（单行 pill）相对；横排中须占栏宽并在壳内换行。
 */
export function isContentPanelStack(node: StackNode): boolean {
  if (isDecorativeBoxStack(node)) return false;
  const box = node.box;
  if (!box?.radius) return false;
  if (box.tone === undefined && box.pad === undefined) return false;
  const kids = node.children ?? [];
  if (kids.length === 0) return false;
  return stackHasTextDescendant(node) || kids.length > 1;
}

/** stack 组装 wrapper widthMode（横排直子 / 自含媒体栏 / 格内色块 / 默认纵排 fill）。 */
export function resolveStackWrapperWidthMode(
  node: StackNode,
  parent: RowChildWidthParentContext & { inDirectRow?: boolean }
): "fill" | "hug" {
  if (isDecorativeBoxStack(node)) return "hug";
  if (parent.inDirectRow) {
    if (isContentPanelStack(node)) return "fill";
    if (stackHasIntrinsicWidthCap(node)) return "hug";
    if (parent.rowAlign === "between") {
      return resolveBetweenRowFlexibleStackWidthMode(
        node,
        parent.rowSiblings,
        parent.rowSiblingIndex
      );
    }
    return resolveDirectRowChildWrapperWidthMode({
      inDirectRow: parent.inDirectRow,
      rowAlign: parent.rowAlign,
    });
  }
  if (parent.parentWidthHug) return "hug";
  return "fill";
}

/**
 * 纵排 hug 父 stack 下的横排 layout（row）wrapper widthMode。
 * 默认 fill 会在画布上与 hug 父级形成「父随子、子吃满父」循环，须改为 hug 并由 fixed 子级锚定宽。
 */
export function resolveVerticalStackChildLayoutWidthMode(
  parent: Pick<RowChildWidthParentContext, "parentWidthHug">
): "fill" | "hug" {
  if (parent.parentWidthHug) return "hug";
  return "fill";
}

/** 叶子块（text 等）wrapper widthMode：hug 宽父 stack 下子级须 hug。 */
export function resolveLeafWrapperWidthMode(
  parent: RowChildWidthParentContext & {
    parentWidthHug?: boolean;
    inContentPanelStack?: boolean;
  }
): "fill" | "hug" {
  if (parent.inContentPanelStack) return "fill";
  if (parent.parentWidthHug) return "hug";
  return resolveDirectRowChildWrapperWidthMode(parent);
}
