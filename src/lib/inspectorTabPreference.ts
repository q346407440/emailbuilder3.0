import type { InspectorMainTab } from "../components/AdminInspectorTabs";
import type { EmailBlock } from "../types/email";
import { isRepeatHostBlock } from "./repeatHostBlock";

export const INSPECTOR_TAB_FALLBACK: InspectorMainTab = "component";

export type InspectorTabAvailability = Record<InspectorMainTab, boolean>;

/** 仅 layout / grid / image 宿主展示 Inspector「数据组」Tab（与 repeat / object 绑定能力一致） */
export function shouldShowInspectorRepeatRegionPanel(
  block: EmailBlock | undefined,
  hasBlockSelection: boolean
): boolean {
  return hasBlockSelection && isRepeatHostBlock(block);
}

/** 与 Inspector 中 listPane / visibilityPane 是否挂载的规则一致 */
export function buildInspectorTabAvailability(
  emailRootPanel: boolean,
  blockType: string,
  showRepeatRegionPanel: boolean
): InspectorTabAvailability {
  return {
    component: true,
    wrapper: true,
    list: showRepeatRegionPanel,
    visibility: !emailRootPanel && blockType !== "emailRoot",
  };
}

export function resolveInspectorTabForContext(
  preferred: InspectorMainTab,
  availability: InspectorTabAvailability
): InspectorMainTab {
  return availability[preferred] ? preferred : INSPECTOR_TAB_FALLBACK;
}
