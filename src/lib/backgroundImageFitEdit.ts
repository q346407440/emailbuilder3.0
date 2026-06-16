import type { EmailPayload, EmailTemplate } from "../types/email";
import { applyBlockField } from "./applyEdit";
import { backgroundImageFitUsesPosition } from "../render-defaults-contract/backgroundImageFitSemantics";
import { getAtPath } from "./paths";

const FIT_PATH = "wrapperStyle.backgroundImage.fit";
const POSITION_PATH = "wrapperStyle.backgroundImage.position";

/** 切换填充策略时同步 position：contain 剥离字段；cover 缺省时补 center */
export function applyBackgroundImageFitChange(
  template: EmailTemplate,
  payload: EmailPayload,
  blockId: string,
  nextFit: string
): { template: EmailTemplate; payload: EmailPayload } {
  let state = applyBlockField(template, payload, blockId, FIT_PATH, nextFit);
  if (!backgroundImageFitUsesPosition(nextFit)) {
    return applyBlockField(state.template, state.payload, blockId, POSITION_PATH, null);
  }
  const block = state.template.blocks[blockId];
  const currentPos = block
    ? getAtPath(block.wrapperStyle as Record<string, unknown>, "backgroundImage.position")
    : undefined;
  if (typeof currentPos !== "string" || !currentPos.trim()) {
    state = applyBlockField(state.template, state.payload, blockId, POSITION_PATH, "center");
  }
  return state;
}
