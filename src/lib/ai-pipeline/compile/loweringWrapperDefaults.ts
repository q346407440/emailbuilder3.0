import type { CompactBlockKind } from "../compactTypes";
import type { CompactNode } from "../types";

type BoxMode = "hug" | "fill" | "fixed";

const DEFAULT_BY_KIND: Record<
  CompactBlockKind,
  { widthMode: BoxMode; heightMode: BoxMode }
> = {
  "layout.container": { widthMode: "fill", heightMode: "hug" },
  "layout.grid": { widthMode: "fill", heightMode: "hug" },
  "content.text": { widthMode: "fill", heightMode: "hug" },
  "content.image": { widthMode: "fill", heightMode: "fixed" },
  "action.button": { widthMode: "hug", heightMode: "hug" },
  "content.icon": { widthMode: "hug", heightMode: "hug" },
  "content.divider": { widthMode: "fill", heightMode: "hug" },
};

function coerceMode(raw: unknown, fallback: BoxMode): BoxMode {
  if (raw === "hug" || raw === "fill" || raw === "fixed") return raw;
  return fallback;
}

/** E-MAP-1：lowering 时保证 wrapperStyle 宽高模式必有合法值（compact 已在 D 闭合）。 */
export function completeLoweringWrapperDimensions(
  kind: CompactBlockKind,
  wrapper: CompactNode["wrapper"] | undefined
): { widthMode: BoxMode; heightMode: BoxMode; width?: string; height?: string } {
  const defaults = DEFAULT_BY_KIND[kind];
  const widthMode = coerceMode(wrapper?.widthMode, defaults.widthMode);
  const heightMode = coerceMode(wrapper?.heightMode, defaults.heightMode);
  return {
    widthMode,
    heightMode,
    ...(typeof wrapper?.width === "string" && wrapper.width.trim()
      ? { width: wrapper.width.trim() }
      : {}),
    ...(typeof wrapper?.height === "string" && wrapper.height.trim()
      ? { height: wrapper.height.trim() }
      : {}),
  };
}
