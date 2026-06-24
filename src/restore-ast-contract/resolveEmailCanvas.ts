import type { EmailNode, RestoreTheme, Tone } from "./types";
import { isHexValue, isToneToken } from "./tokens";
import { resolveTone } from "./resolveValue";

/** 未写 canvas 时 emailRoot 默认画布底色（字面量，不绑 theme）。 */
export const DEFAULT_EMAIL_CANVAS_LITERAL = "#FFFFFF";

/** 解析 email.canvas → emailRoot 背景（hex 字面量或绑 theme 档位；不写入 tokenPresets 新增键）。 */
export function resolveEmailCanvasBackground(
  emailNode: EmailNode,
  fieldPath = "props.backgroundColor"
): ReturnType<typeof resolveTone> {
  return resolveTone(fieldPath, emailNode.canvas, DEFAULT_EMAIL_CANVAS_LITERAL);
}

/** 将 email.canvas 解析为字面量 hex/rgb 字符串（seam 折叠等需比较底色时使用）。 */
export function resolveEmailCanvasLiteral(emailNode: EmailNode, theme: RestoreTheme): string {
  const canvas = emailNode.canvas;
  if (canvas === undefined) {
    return DEFAULT_EMAIL_CANVAS_LITERAL;
  }
  if (isHexValue(canvas)) {
    return canvas.hex;
  }
  if (isToneToken(canvas)) {
    return theme.colors[canvas] ?? DEFAULT_EMAIL_CANVAS_LITERAL;
  }
  return DEFAULT_EMAIL_CANVAS_LITERAL;
}

/** parseRestoreAstDocument：校验可选 canvas 形态。 */
export function isValidEmailCanvas(value: unknown): value is Tone {
  if (value === undefined) return true;
  if (isHexValue(value)) return true;
  return typeof value === "string" && isToneToken(value);
}
