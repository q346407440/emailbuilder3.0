export type { CanvasPreviewViewportMode, EditorCanvasRule } from "./types";
export { EDITOR_CANVAS_RULES, EDITOR_CANVAS_RULE_IDS } from "./rules";
export {
  EDITOR_CANVAS_VALUES,
  EMAIL_CANVAS_AUTO_SCROLL_ON_BLOCK_SELECT,
  EMAIL_CANVAS_SCROLL_OVERFLOW_X,
  EMAIL_CANVAS_SCROLL_OVERFLOW_Y,
  EMAIL_CANVAS_VIEWPORT_DESKTOP_PX,
  EMAIL_CANVAS_VIEWPORT_MOBILE_PX,
  resolveCanvasPreviewViewportWidth,
} from "./values";

import { EDITOR_CANVAS_RULES } from "./rules";

export function getEditorCanvasRule(id: string): (typeof EDITOR_CANVAS_RULES)[number] | undefined {
  return EDITOR_CANVAS_RULES.find((r) => r.id === id);
}
