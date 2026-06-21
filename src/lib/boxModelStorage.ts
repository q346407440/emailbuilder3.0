import {
  normalizeBorderRadiusValueForStorage,
  normalizeBorderValueForStorage,
} from "./boxModelFlat";
import {
  coercePaddingOnContainer,
  isPaddingFieldSubPath,
} from "./spacingValue";

/** bindPath 子路径是否落在 border 字段上。 */
export function isBorderFieldSubPath(sub: string): boolean {
  if (sub === "border" || sub.startsWith("border.")) return true;
  const idx = sub.indexOf(".border");
  return idx >= 0 && (sub.length === idx + 7 || sub[idx + 7] === ".");
}

/** bindPath 子路径是否落在 borderRadius / barBorderRadius 字段上。 */
export function isBorderRadiusFieldSubPath(sub: string): boolean {
  if (
    sub === "borderRadius" ||
    sub.startsWith("borderRadius.") ||
    sub === "barBorderRadius" ||
    sub.startsWith("barBorderRadius.")
  ) {
    return true;
  }
  const br = sub.indexOf(".borderRadius");
  if (br >= 0 && (sub.length === br + 13 || sub[br + 13] === ".")) return true;
  const bar = sub.indexOf(".barBorderRadius");
  return bar >= 0 && (sub.length === bar + 16 || sub[bar + 16] === ".");
}

export function coerceBorderOnContainer(
  container: Record<string, unknown> | undefined,
  key = "border"
): void {
  if (!container) return;
  const raw = container[key];
  if (raw === undefined || raw === null) return;
  container[key] = normalizeBorderValueForStorage(raw);
}

export function coerceBorderRadiusOnContainer(
  container: Record<string, unknown> | undefined,
  key = "borderRadius"
): void {
  if (!container) return;
  const raw = container[key];
  if (raw === undefined || raw === null) return;
  container[key] = normalizeBorderRadiusValueForStorage(raw);
}

function coerceButtonStyleBoxModel(buttonStyle: Record<string, unknown>): void {
  coerceBorderOnContainer(buttonStyle);
  coerceBorderRadiusOnContainer(buttonStyle);
}

/**
 * 编辑落盘前将 padding / border / borderRadius 归一为四边/四角平铺。
 * @param touchedSubPath applyBlockField 的 sub（props.* / wrapperStyle.* 后缀）
 */
export function coerceBoxModelOnContainer(
  container: Record<string, unknown> | undefined,
  touchedSubPath?: string
): void {
  if (!container) return;

  const touchesPadding =
    !touchedSubPath || isPaddingFieldSubPath(touchedSubPath) || container.padding !== undefined;
  const touchesBorder =
    !touchedSubPath || isBorderFieldSubPath(touchedSubPath) || container.border !== undefined;
  const touchesBorderRadius =
    !touchedSubPath ||
    isBorderRadiusFieldSubPath(touchedSubPath) ||
    container.borderRadius !== undefined ||
    container.barBorderRadius !== undefined;
  const touchesButtonStyle =
    !touchedSubPath ||
    touchedSubPath === "buttonStyle" ||
    touchedSubPath.startsWith("buttonStyle.");

  if (touchesPadding) coercePaddingOnContainer(container);
  if (touchesBorder) coerceBorderOnContainer(container);
  if (touchesBorderRadius) {
    coerceBorderRadiusOnContainer(container);
    coerceBorderRadiusOnContainer(container, "barBorderRadius");
  }
  if (touchesButtonStyle) {
    const bs = container.buttonStyle;
    if (bs && typeof bs === "object" && !Array.isArray(bs)) {
      coerceButtonStyleBoxModel(bs as Record<string, unknown>);
    }
  }
}
