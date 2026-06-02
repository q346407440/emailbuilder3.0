export type {
  PreviewBlockNode,
  RepeatBindingRule,
  RepeatBindingRuleKind,
  RepeatPreviewModel,
  RepeatRuntimeContext,
  VirtualBlockRef,
} from "./types";
export { REPEAT_BINDING_RULES, REPEAT_BINDING_RULE_IDS } from "./rules";
export {
  REPEAT_BIND_WIZARD_STEP_IDS,
  REPEAT_HOST_BLOCK_TYPES,
  REPEAT_NESTING_DEPTH_MAX,
  type RepeatHostBlockType,
} from "./values";

import { REPEAT_BINDING_RULES } from "./rules";
import type { RepeatBindingRuleKind } from "./types";

export function listRepeatBindingRulesByKind(
  kind: RepeatBindingRuleKind
): readonly import("./types").RepeatBindingRule[] {
  return REPEAT_BINDING_RULES.filter((r) => r.kind === kind);
}

export function getRepeatBindingRule(id: string): import("./types").RepeatBindingRule | undefined {
  return REPEAT_BINDING_RULES.find((r) => r.id === id);
}
