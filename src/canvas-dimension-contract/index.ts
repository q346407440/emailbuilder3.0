export type { CanvasDimensionRule, CanvasDimensionRuleKind, WrapperDimensionMode } from "./types";
export { CANVAS_DIMENSION_RULES, CANVAS_DIMENSION_RULE_IDS } from "./rules";

import { CANVAS_DIMENSION_RULES } from "./rules";

export function getCanvasDimensionRule(id: string): (typeof CANVAS_DIMENSION_RULES)[number] | undefined {
  return CANVAS_DIMENSION_RULES.find((r) => r.id === id);
}
