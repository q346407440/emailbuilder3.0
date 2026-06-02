import type { InspectorMainTab } from "../components/AdminInspectorTabs";

export const INSPECTOR_TAB_FALLBACK: InspectorMainTab = "style";

export type InspectorTabAvailability = Record<InspectorMainTab, boolean>;

/** 与 Inspector 中 listPane / visibilityPane 是否挂载的规则一致 */
export function buildInspectorTabAvailability(
  canvasMode: boolean,
  blockType: string,
  showRepeatRegionPanel: boolean
): InspectorTabAvailability {
  return {
    content: true,
    style: true,
    layout: true,
    list: showRepeatRegionPanel,
    visibility: !canvasMode && blockType !== "emailRoot",
  };
}

export function resolveInspectorTabForContext(
  preferred: InspectorMainTab,
  availability: InspectorTabAvailability
): InspectorMainTab {
  return availability[preferred] ? preferred : INSPECTOR_TAB_FALLBACK;
}
