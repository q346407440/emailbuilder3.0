import type { CompactNode, GroundingSection } from "./types";
import { compileCompactSectionRoot } from "./compile/compileCompactSection";

/** @deprecated 使用 compileCompactSectionRoot */
export function normalizeCompactSectionTree(
  root: CompactNode,
  section: GroundingSection
): CompactNode | null {
  return compileCompactSectionRoot(root, section);
}

export { compileCompactSectionRoot } from "./compile/compileCompactSection";
