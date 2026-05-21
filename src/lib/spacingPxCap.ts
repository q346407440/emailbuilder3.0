/**
 * 邮件容器间距上限（模块壳 padding、spacing 标准键）。
 * 与还原技能 email-template-restore-check §19 一致。
 */
export const EMAIL_CONTAINER_SPACING_MAX_PX = 24;

const PX_RE = /^(\d+(?:\.\d+)?)\s*px$/i;
const PX_LOOSE_RE = /^(\d+(?:\.\d+)?)(?:\s*px)?$/i;

export function parseSpacingPx(raw: unknown): number | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const m = s.match(PX_RE) ?? s.match(PX_LOOSE_RE);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

export function formatSpacingPx(px: number): string {
  const n = Math.round(px);
  return `${n}px`;
}

/** 将间距字符串压到不超过 maxPx；无法解析时原样返回 */
export function clampSpacingPxString(
  raw: unknown,
  maxPx: number = EMAIL_CONTAINER_SPACING_MAX_PX
): string | undefined {
  if (raw == null) return undefined;
  const s = String(raw).trim();
  if (!s) return s;
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return s;
  const clamped = parts.map((part) => {
    const n = parseSpacingPx(part);
    if (n == null) return part;
    return formatSpacingPx(Math.min(n, maxPx));
  });
  return clamped.join(" ");
}

export function spacingPxExceedsMax(
  raw: unknown,
  maxPx: number = EMAIL_CONTAINER_SPACING_MAX_PX
): boolean {
  const s = String(raw ?? "").trim();
  if (!s) return false;
  for (const part of s.split(/\s+/).filter(Boolean)) {
    const n = parseSpacingPx(part);
    if (n != null && n > maxPx) return true;
  }
  return false;
}
