import type { EmailBlock } from "../types/email";

/** 补齐 button 水平 contentAlign（胶囊文案对齐）。 */
export function normalizeButtonContentAlign(block: EmailBlock): boolean {
  if (block.type !== "button") return false;
  let changed = false;
  const ws = (block.wrapperStyle ?? {}) as NonNullable<EmailBlock["wrapperStyle"]>;
  block.wrapperStyle = ws;

  if (
    !ws.contentAlign ||
    typeof ws.contentAlign !== "object" ||
    (ws.contentAlign.horizontal !== "left" &&
      ws.contentAlign.horizontal !== "center" &&
      ws.contentAlign.horizontal !== "right")
  ) {
    ws.contentAlign = { ...ws.contentAlign, horizontal: "left" };
    changed = true;
  }

  return changed;
}
