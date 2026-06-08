/** Stage A 配图容器高度（px 字符串）；D/E 校验与 clamp 真源。 */

export const IMAGE_CONTAINER_HEIGHT_MIN_PX = 32;
export const IMAGE_CONTAINER_HEIGHT_MAX_PX = 480;

/** 将 LLM 输出的容器高规范为 `NNpx`；非法则 undefined。 */
export function normalizeImageContainerHeightPx(raw: unknown): string | undefined {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    const clamped = Math.min(
      IMAGE_CONTAINER_HEIGHT_MAX_PX,
      Math.max(IMAGE_CONTAINER_HEIGHT_MIN_PX, Math.round(raw))
    );
    return `${clamped}px`;
  }
  if (typeof raw === "string" && raw.trim()) {
    const m = /^(\d+(?:\.\d+)?)\s*px?$/i.exec(raw.trim());
    if (!m) return undefined;
    const n = Number(m[1]) || 0;
    if (n <= 0) return undefined;
    const clamped = Math.min(
      IMAGE_CONTAINER_HEIGHT_MAX_PX,
      Math.max(IMAGE_CONTAINER_HEIGHT_MIN_PX, Math.round(n))
    );
    return `${clamped}px`;
  }
  return undefined;
}
