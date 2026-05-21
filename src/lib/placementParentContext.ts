import type { EmailTemplate } from "../types/email";
import { layoutHasBackgroundImage } from "./wrapperBackgroundImage";
import type { PlacementParentKind } from "./resolvePlacement";

/**
 * 与 EmailPreview 中表格槽位（td）上下文一致：用于 placement resolver、迁移与 Inspector 降级提示。
 */
export function placementParentKindForBlock(
  template: EmailTemplate,
  blockId: string
): PlacementParentKind {
  const block = template.blocks[blockId];
  if (!block?.parentId) return "none";
  const parent = template.blocks[block.parentId];
  if (!parent) return "none";
  if (parent.type === "emailRoot") return "tableStackCell";
  if (parent.type === "layout") {
    if (layoutHasBackgroundImage(parent)) return "tableStackCell";
    const dir = (parent.props as { direction?: string } | undefined)?.direction;
    return dir === "horizontal" ? "tableRowCell" : "tableStackCell";
  }
  if (parent.type === "grid") return "tableMatrixCell";
  if (parent.type === "image") return "tableStackCell";
  return "none";
}
