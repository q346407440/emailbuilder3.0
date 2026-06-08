import { applySectionContentAlign } from "../applySectionContentAlign";
import type { CompactNode, GroundingSection } from "../types";
import { applyCompactBoxModesToSection } from "./compactBoxModes";
import { applyCompactLayoutConstraints } from "./compactLayoutConstraints";
import { sanitizeCompactIrTree } from "./sanitizeCompactIr";
import { stripCompactBorderRadiusTree } from "./blockRadiusLowering";
import { stripSectionRootSpacingPadding } from "./sectionRootSpacing";

/**
 * 阶段 D：单区 compact IR 语义编译（顺序即 PIPELINE_COMPILE_INVARIANTS 落地顺序）。
 *
 * 1. sanitizeCompactIrTree — D-REF-2
 * 2. applySectionContentAlign — D-LAYOUT-1
 * 3. applyCompactBoxModesToSection — D-BOX-1 / D-BOX-2
 * 4. applyCompactLayoutConstraints — D-LAYOUT-2/3 / D-ALIGN-1
 * 5. stripSectionRootSpacingPadding — D-LAYOUT-4（区段留白由 E 区段壳写入）
 * 6. stripCompactBorderRadiusTree — D-RADIUS-1（圆角由 E + B1 编译）
 */
export function compileCompactSectionRoot(
  root: CompactNode,
  section: GroundingSection
): CompactNode | null {
  if (!root?.kind) return null;

  const sanitized = sanitizeCompactIrTree(root);
  const aligned = applySectionContentAlign(sanitized, section);
  const withBoxModes = applyCompactBoxModesToSection(aligned, section);
  if (!withBoxModes) return null;
  const constrained = applyCompactLayoutConstraints(withBoxModes, section);
  const withoutSectionPadding = stripSectionRootSpacingPadding(constrained, section);
  return stripCompactBorderRadiusTree(withoutSectionPadding);
}
