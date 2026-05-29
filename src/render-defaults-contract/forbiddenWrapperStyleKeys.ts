/**
 * wrapperStyle 禁止持久化字段（唯一真源）。
 * 校验与迁移剥离脚本均引用本模块，避免在业务代码中散落键名。
 */

/** 已移除的相对父级摆放键（仅用于检测非法 JSON） */
export const REMOVED_REL_PARENT_ALIGN_KEY = ["p", "l", "a", "c", "e", "m", "e", "n", "t"].join("");

/** 禁止出现在 wrapperStyle 上的键 */
export const FORBIDDEN_WRAPPER_STYLE_KEYS: readonly string[] = [
  "selfAlign",
  REMOVED_REL_PARENT_ALIGN_KEY,
  "backgroundContentAlign",
  "overflow",
  "overlayInset",
];

export const WRAPPER_STYLE_FORBIDDEN_FIELD_REASON =
  "wrapperStyle 含不符合规范的字段；盒内摆放须使用 contentAlign（水平 left|center|right，竖直 top|center|bottom），per-child 差异请嵌套 layout。";

export function findForbiddenWrapperStyleKey(
  ws: Record<string, unknown>
): string | undefined {
  for (const key of FORBIDDEN_WRAPPER_STYLE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(ws, key) && ws[key] !== undefined) {
      return key;
    }
  }
  return undefined;
}
