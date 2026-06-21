import type { PreviewBlockNode, RepeatPreviewModel } from "../repeat-binding-contract";
import type { EmailTemplate } from "../types/email";
import type { CollisionDetection } from "@dnd-kit/core";
import { escapePreviewBlockIdForSelector } from "./canvasBlockActionLayout";
import {
  encodeCanvasDropSlotId,
  findPreviewNodeByBlockId,
  isCanvasInsertParentBlock,
  listPreviewInsertSlotTargets,
  canShowCanvasDropSlotForMove,
} from "./canvasDragInsert";

export type PreviewInsertSlotDescriptor = {
  parentPreviewBlockId: string;
  insertIndex: number;
  variant: "bar" | "column";
};

export type CanvasLocalRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const ACTIVE_BAR_HEIGHT = 44;
const ACTIVE_COLUMN_WIDTH = 48;
const HIT_PAD = 12;

function layoutDirectionIsRow(direction: unknown): boolean {
  const d = typeof direction === "string" ? direction : "vertical";
  return d === "horizontal" || d === "row";
}

/** 预览父节点在 EmailPreview 中应走的插入槽形态（纵排横条 / 横排竖条）。 */
export function resolvePreviewInsertSlotVariant(
  sourceTemplate: EmailTemplate,
  previewParentId: string,
  previewModel: RepeatPreviewModel
): "bar" | "column" {
  const node = findPreviewNodeByBlockId(previewModel, previewParentId);
  if (!node) return "bar";
  const physicalParentId =
    node.ref.kind === "repeat-item" ? node.ref.prototypeRootId : node.ref.blockId;
  const physicalParent = sourceTemplate.blocks[physicalParentId];
  if (!physicalParent) return "bar";
  if (physicalParent.type === "layout" && layoutDirectionIsRow(physicalParent.props?.direction)) {
    return "column";
  }
  return "bar";
}

function walkPreviewNodes(node: PreviewBlockNode, visit: (node: PreviewBlockNode) => void): void {
  visit(node);
  for (const child of node.children) walkPreviewNodes(child, visit);
}

function findPreviewBlockDepth(previewModel: RepeatPreviewModel, blockId: string): number {
  let found = -1;
  const walk = (node: PreviewBlockNode, depth: number) => {
    if (node.block.id === blockId) {
      found = depth;
      return;
    }
    for (const child of node.children) walk(child, depth + 1);
  };
  walk(previewModel.root, 0);
  return found;
}

function queryPreviewBlockRect(blockId: string): DOMRect | null {
  if (typeof document === "undefined") return null;
  const el = document.querySelector(
    `[data-email-preview-block="${escapePreviewBlockIdForSelector(blockId)}"]`
  );
  return el?.getBoundingClientRect() ?? null;
}

/** 收集预览树上所有可插入槽（与 EmailPreview 落点规则对齐）。 */
export function collectPreviewInsertSlotDescriptors(
  sourceTemplate: EmailTemplate,
  previewModel: RepeatPreviewModel
): PreviewInsertSlotDescriptor[] {
  const out: PreviewInsertSlotDescriptor[] = [];

  walkPreviewNodes(previewModel.root, (node) => {
    const previewParentId = node.block.id;
    const physicalParentId =
      node.ref.kind === "repeat-item" ? node.ref.prototypeRootId : node.ref.blockId;
    const physicalParent = sourceTemplate.blocks[physicalParentId];
    if (!physicalParent || !isCanvasInsertParentBlock(physicalParent)) return;

    const targets = listPreviewInsertSlotTargets(sourceTemplate, node);

    if (physicalParent.type === "grid") {
      if (node.children.length === 0) {
        if (targets[0]) {
          out.push({ parentPreviewBlockId: previewParentId, insertIndex: 0, variant: "bar" });
        }
        return;
      }
      for (let i = 0; i < node.children.length; i++) {
        if (targets[i]) {
          out.push({ parentPreviewBlockId: previewParentId, insertIndex: i, variant: "bar" });
        }
      }
      if (targets[node.children.length]) {
        out.push({
          parentPreviewBlockId: previewParentId,
          insertIndex: node.children.length,
          variant: "bar",
        });
      }
      return;
    }

    const variant =
      physicalParent.type === "layout" && layoutDirectionIsRow(physicalParent.props?.direction)
        ? "column"
        : "bar";

    targets.forEach((target, insertIndex) => {
      if (target) {
        out.push({ parentPreviewBlockId: previewParentId, insertIndex, variant });
      }
    });
  });

  return out;
}

export function measureInsertSlotRect(
  descriptor: PreviewInsertSlotDescriptor,
  sourceTemplate: EmailTemplate,
  previewModel: RepeatPreviewModel,
  canvasRect: DOMRect
): CanvasLocalRect | null {
  const { parentPreviewBlockId, insertIndex, variant } = descriptor;
  const parentNode = findPreviewNodeByBlockId(previewModel, parentPreviewBlockId);
  if (!parentNode) return null;

  const physicalParentId =
    parentNode.ref.kind === "repeat-item" ? parentNode.ref.prototypeRootId : parentNode.ref.blockId;
  const physicalParent = sourceTemplate.blocks[physicalParentId];
  if (!physicalParent) return null;

  const childIds = parentNode.children.map((child) => child.block.id);
  const parentRect = queryPreviewBlockRect(parentPreviewBlockId);
  if (!parentRect) return null;

  if (physicalParent.type === "grid") {
    if (childIds.length === 0 && insertIndex === 0) {
      return {
        top: parentRect.top - canvasRect.top,
        left: parentRect.left - canvasRect.left,
        width: parentRect.width,
        height: ACTIVE_BAR_HEIGHT,
      };
    }
    if (insertIndex >= childIds.length) {
      const lastRect = queryPreviewBlockRect(childIds[childIds.length - 1]!);
      if (!lastRect) return null;
      return {
        top: lastRect.bottom - canvasRect.top + 4,
        left: parentRect.left - canvasRect.left,
        width: parentRect.width,
        height: ACTIVE_BAR_HEIGHT,
      };
    }
    const childRect = queryPreviewBlockRect(childIds[insertIndex]!);
    if (!childRect) return null;
    const hitHeight = Math.min(ACTIVE_BAR_HEIGHT, Math.max(28, childRect.height * 0.35 + HIT_PAD));
    return {
      top: childRect.top - canvasRect.top,
      left: childRect.left - canvasRect.left,
      width: childRect.width,
      height: hitHeight,
    };
  }

  const childRects = childIds
    .map((id) => queryPreviewBlockRect(id))
    .filter((rect): rect is DOMRect => rect != null);

  if (variant === "bar") {
    if (childIds.length === 0) {
      // 空容器：命中区覆盖整块，避免仅 44px 顶条与父级「子节点后」槽重叠且随内联占位布局抖动
      return {
        top: parentRect.top - canvasRect.top,
        left: parentRect.left - canvasRect.left,
        width: parentRect.width,
        height: Math.max(ACTIVE_BAR_HEIGHT, parentRect.height),
      };
    }
    if (insertIndex === 0) {
      const first = childRects[0]!;
      const top = parentRect.top - canvasRect.top;
      const height = Math.max(ACTIVE_BAR_HEIGHT, first.top - parentRect.top + HIT_PAD);
      return { top, left: parentRect.left - canvasRect.left, width: parentRect.width, height };
    }
    if (insertIndex >= childIds.length) {
      const last = childRects[childIds.length - 1]!;
      const top = last.bottom - canvasRect.top - HIT_PAD;
      // 根容器末尾槽：命中区延伸到画布工作区底部，覆盖内容下方的空白区，
      // 让「拖到画布最底部」也能命中「追加到末尾」（可见占位条仍画在内容底）。
      const isPreviewRoot = parentPreviewBlockId === previewModel.root.block.id;
      const bottom = isPreviewRoot
        ? canvasRect.bottom - canvasRect.top
        : parentRect.bottom - canvasRect.top;
      return {
        top,
        left: parentRect.left - canvasRect.left,
        width: parentRect.width,
        height: Math.max(ACTIVE_BAR_HEIGHT, bottom - top),
      };
    }
    const above = childRects[insertIndex - 1]!;
    const below = childRects[insertIndex]!;
    const gap = below.top - above.bottom;
    const height = Math.max(ACTIVE_BAR_HEIGHT, gap + HIT_PAD * 2);
    const mid = (above.bottom + below.top) / 2 - canvasRect.top;
    return {
      top: mid - height / 2,
      left: parentRect.left - canvasRect.left,
      width: parentRect.width,
      height,
    };
  }

  if (childIds.length === 0) {
    return {
      top: parentRect.top - canvasRect.top,
      left: parentRect.left - canvasRect.left,
      width: ACTIVE_COLUMN_WIDTH,
      height: parentRect.height,
    };
  }
  if (insertIndex === 0) {
    const first = childRects[0]!;
    const left = parentRect.left - canvasRect.left;
    const width = Math.max(ACTIVE_COLUMN_WIDTH, first.left - parentRect.left + HIT_PAD);
    return { top: parentRect.top - canvasRect.top, left, width, height: parentRect.height };
  }
  if (insertIndex >= childIds.length) {
    const last = childRects[childIds.length - 1]!;
    const left = last.right - canvasRect.left - HIT_PAD;
    const right = parentRect.right - canvasRect.left;
    return {
      top: parentRect.top - canvasRect.top,
      left,
      width: Math.max(ACTIVE_COLUMN_WIDTH, right - left),
      height: parentRect.height,
    };
  }
  const leftChild = childRects[insertIndex - 1]!;
  const rightChild = childRects[insertIndex]!;
  const gap = rightChild.left - leftChild.right;
  const width = Math.max(ACTIVE_COLUMN_WIDTH, gap + HIT_PAD * 2);
  const mid = (leftChild.right + rightChild.left) / 2 - canvasRect.left;
  return {
    top: parentRect.top - canvasRect.top,
    left: mid - width / 2,
    width,
    height: parentRect.height,
  };
}

export function pickCanvasInsertSlotAtPointer(
  clientX: number,
  clientY: number,
  sourceTemplate: EmailTemplate,
  previewModel: RepeatPreviewModel,
  moveBlockId?: string | null
): string | null {
  if (typeof document === "undefined") return null;
  const canvas = document.querySelector(".email-preview-canvas-workspace");
  if (!canvas) return null;
  const canvasRect = canvas.getBoundingClientRect();
  if (
    clientX < canvasRect.left ||
    clientX > canvasRect.right ||
    clientY < canvasRect.top ||
    clientY > canvasRect.bottom
  ) {
    return null;
  }

  const descriptors = collectPreviewInsertSlotDescriptors(sourceTemplate, previewModel);
  let best: { id: string; depth: number; area: number } | null = null;

  for (const descriptor of descriptors) {
    if (
      moveBlockId &&
      !canShowCanvasDropSlotForMove(
        sourceTemplate,
        previewModel,
        moveBlockId,
        descriptor.parentPreviewBlockId,
        descriptor.insertIndex
      )
    ) {
      continue;
    }
    const rect = measureInsertSlotRect(descriptor, sourceTemplate, previewModel, canvasRect);
    if (!rect) continue;
    const absLeft = canvasRect.left + rect.left;
    const absTop = canvasRect.top + rect.top;
    const absRight = absLeft + rect.width;
    const absBottom = absTop + rect.height;
    if (
      clientX < absLeft ||
      clientX > absRight ||
      clientY < absTop ||
      clientY > absBottom
    ) {
      continue;
    }
    const area = rect.width * rect.height;
    const depth = findPreviewBlockDepth(previewModel, descriptor.parentPreviewBlockId);
    const id = encodeCanvasDropSlotId(descriptor.parentPreviewBlockId, descriptor.insertIndex);
    if (
      !best ||
      depth > best.depth ||
      (depth === best.depth && area < best.area)
    ) {
      best = { id, depth, area };
    }
  }

  return best?.id ?? null;
}

/** 画布插入：指针下优先最内层槽位，避免父子命中区重叠时 dnd-kit 来回切换。 */
export function createCanvasInsertCollisionDetection(
  sourceTemplate: EmailTemplate,
  previewModel: RepeatPreviewModel,
  moveBlockId?: string | null
): CollisionDetection {
  return ({ pointerCoordinates }) => {
    if (!pointerCoordinates) return [];
    const slotId = pickCanvasInsertSlotAtPointer(
      pointerCoordinates.x,
      pointerCoordinates.y,
      sourceTemplate,
      previewModel,
      moveBlockId
    );
    if (!slotId) return [];
    return [{ id: slotId }];
  };
}
