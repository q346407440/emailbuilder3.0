import type { EmailBlock } from "../types/email";

export type ButtonContentAlignHorizontal = "left" | "center" | "right";

/** fill 宽按钮上误写在 placement 的水平意图 → contentAlign.horizontal */
export function inferButtonContentAlignFromMisplacedPlacement(
  block: EmailBlock
): ButtonContentAlignHorizontal {
  const ph = block.wrapperStyle?.placement?.horizontal;
  if (ph === "center") return "center";
  if (ph === "end") return "right";
  return "left";
}

/**
 * 补齐 button.contentAlign，并将 fill 宽按钮上误用 placement 表达胶囊对齐的存量迁移到 contentAlign。
 */
export function normalizeButtonContentAlign(block: EmailBlock): boolean {
  if (block.type !== "button") return false;
  let changed = false;
  const ws = (block.wrapperStyle ?? {}) as NonNullable<EmailBlock["wrapperStyle"]>;
  block.wrapperStyle = ws;

  const wm = ws.widthMode ?? "fill";
  const placement = ws.placement ?? { horizontal: "start", vertical: "start" };

  if (wm === "fill" && placement.horizontal !== "start") {
    const inferred = inferButtonContentAlignFromMisplacedPlacement(block);
    const existing = ws.contentAlign?.horizontal;
    const horizontal =
      existing === "left" || existing === "center" || existing === "right"
        ? existing
        : inferred;
    if (!ws.contentAlign || ws.contentAlign.horizontal !== horizontal) {
      ws.contentAlign = { ...ws.contentAlign, horizontal };
      changed = true;
    }
    ws.placement = { ...placement, horizontal: "start" };
    changed = true;
    return changed;
  }

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
