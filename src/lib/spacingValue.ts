import type { SpacingValue, SpacingValueFlat } from "../types/email";
import {
  ensureFlatSpacing,
  normalizeSpacingValueForStorage,
} from "./boxModelFlat";

export { normalizeSpacingValueForStorage };

/** bindPath 子路径是否落在 padding 字段上（props.padding / wrapperStyle.padding）。 */
export function isPaddingFieldSubPath(sub: string): boolean {
  return sub === "padding" || sub.startsWith("padding.");
}

export function coercePaddingOnContainer(container: Record<string, unknown> | undefined): void {
  if (!container) return;
  const pad = container.padding;
  if (pad === undefined || pad === null) return;
  container.padding = normalizeSpacingValueForStorage(pad);
}

/** 若 padding 非四边平铺则归一；返回是否发生变更。 */
export function coercePaddingOnContainerIfChanged(
  container: Record<string, unknown> | undefined
): boolean {
  if (!container?.padding) return false;
  const before = JSON.stringify(container.padding);
  coercePaddingOnContainer(container);
  return JSON.stringify(container.padding) !== before;
}

/** 读取侧：仅四边平铺。 */
export function readSpacingValue(value: SpacingValue | undefined): SpacingValueFlat {
  return ensureFlatSpacing(value);
}
