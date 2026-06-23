import { TOKEN_PRESET_SCALE_ORDER } from "../token-preset-contract";
import type { HexValue, IconPack, PxValue } from "./types";
import { BUTTON_HEIGHT_TOKENS } from "./buttonHeight";

/**
 * AST 令牌的**运行时值数组**——从 token-preset-contract 派生（单一真源，禁止双写）。
 * types.ts 里的字面量类型与这里同源，由 tokens.test.ts 守卫防漂移。
 */

/** 字号档值（= typography scales）。 */
export const ROLE_TOKENS: readonly string[] = TOKEN_PRESET_SCALE_ORDER.typography;
/** 颜色档值（= colors scales）。 */
export const TONE_TOKENS: readonly string[] = TOKEN_PRESET_SCALE_ORDER.colors;
/** 间距档值（= spacing scales）。 */
export const SPACE_TOKENS: readonly string[] = TOKEN_PRESET_SCALE_ORDER.spacing;
/** 圆角档值（= radius scales）。 */
export const RADIUS_TOKENS: readonly string[] = TOKEN_PRESET_SCALE_ORDER.radius;

/** 图标包枚举。 */
export const ICON_PACKS = ["tabler", "simple-icons", "lucide"] as const;

// ── 逃生口判别 ──────────────────────────────────────────────────────────────────

/** 是否为像素值逃生口 `{ px: number }`。 */
export function isPxValue(value: unknown): value is PxValue {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { px?: unknown }).px === "number"
  );
}

/** 是否为颜色值逃生口 `{ hex: string }`。 */
export function isHexValue(value: unknown): value is HexValue {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { hex?: unknown }).hex === "string"
  );
}

// ── 档位成员判别 ────────────────────────────────────────────────────────────────

export function isRoleToken(value: string): boolean {
  return ROLE_TOKENS.includes(value);
}
export function isToneToken(value: string): boolean {
  return TONE_TOKENS.includes(value);
}
export function isSpaceToken(value: string): boolean {
  return SPACE_TOKENS.includes(value);
}
export function isRadiusToken(value: string): boolean {
  return RADIUS_TOKENS.includes(value);
}
export function isIconPack(value: string): value is IconPack {
  return (ICON_PACKS as readonly string[]).includes(value);
}

export function isButtonHeightToken(value: string): value is (typeof BUTTON_HEIGHT_TOKENS)[number] {
  return (BUTTON_HEIGHT_TOKENS as readonly string[]).includes(value);
}
