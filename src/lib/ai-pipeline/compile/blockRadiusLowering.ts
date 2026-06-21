import type { BorderRadiusValueFlat } from "../../../types/email";
import type { ImageSlotRole } from "../../../layout-variant-ai-contract/compactIr";
import { borderRadiusUniform, borderRadiusZeroFlat } from "../../boxModelFlat";
import { parsePxValue } from "../b1StyleTierPresets";
import type { CompactNode, GroundingSection } from "../types";

export function zeroBorderRadius(): BorderRadiusValueFlat {
  return borderRadiusZeroFlat();
}

/** B1 panel 档位 > 0 时返回圆角对象，否则 null（保持直角）。 */
export function panelBorderRadius(panel: string): BorderRadiusValueFlat | null {
  if (parsePxValue(panel) <= 0) return null;
  return borderRadiusUniform(panel);
}

export function ctaBorderRadius(cta: string): BorderRadiusValueFlat {
  return borderRadiusUniform(cta);
}

function expandHex(hex: string): string {
  if (hex.length === 4 && hex.startsWith("#")) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  return hex;
}

function normalizeColorKey(raw: string): string {
  const s = raw.trim().toLowerCase();
  if (!s || s === "transparent") return "transparent";
  if (s.startsWith("rgba(") || s.startsWith("rgb(")) {
    const m = /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/.exec(
      s
    );
    if (m) {
      const a = m[4] !== undefined ? Number(m[4]) : 1;
      if (a <= 0) return "transparent";
      const r = Math.round(Number(m[1]));
      const g = Math.round(Number(m[2]));
      const b = Math.round(Number(m[3]));
      return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    }
  }
  if (s.startsWith("#")) return expandHex(s);
  if (s === "white") return "#ffffff";
  return s;
}

/** 非白 / 非透明 / 非 contentSurface 的容器背景视为「有色壳」，可套 panel 圆角。 */
export function isColoredWrapperBackground(
  backgroundColor: unknown,
  contentSurface: string,
  surfaceToken: string
): boolean {
  if (typeof backgroundColor !== "string" || !backgroundColor.trim()) return false;
  const bg = normalizeColorKey(backgroundColor);
  if (bg === "transparent") return false;
  if (bg === normalizeColorKey(contentSurface)) return false;
  if (bg === normalizeColorKey(surfaceToken)) return false;
  if (bg === "#ffffff") return false;
  return true;
}

export function resolveImageBorderRadiusFromB1(
  panel: string,
  input: {
    role?: ImageSlotRole;
    section?: GroundingSection;
  }
): BorderRadiusValueFlat {
  const rounded = panelBorderRadius(panel);
  if (!rounded) return zeroBorderRadius();

  const { role, section } = input;
  const fullWidth = section?.layoutHints?.fullWidth === true;

  if (role === "logo") return zeroBorderRadius();
  if (role === "card" || role === "background") return rounded;
  if (role === "hero" && fullWidth) return zeroBorderRadius();
  if (role === "hero" && !fullWidth) return rounded;

  if (fullWidth && (section?.hasOverlay || role === undefined)) {
    return zeroBorderRadius();
  }
  if (fullWidth) return zeroBorderRadius();

  return rounded;
}

/** D：剥离 Stage C 误写的 wrapper.borderRadius（圆角由 E + B1 编译）。 */
export function stripCompactBorderRadius(node: CompactNode): CompactNode {
  const children = node.children?.map((child) => stripCompactBorderRadius(child));
  let wrapper = node.wrapper;
  if (wrapper && "borderRadius" in wrapper) {
    const { borderRadius: _br, ...rest } = wrapper;
    wrapper = Object.keys(rest).length > 0 ? rest : undefined;
  }
  const next: CompactNode = {
    ...node,
    ...(children?.length ? { children } : {}),
  };
  if (wrapper !== undefined) {
    next.wrapper = wrapper;
  } else if (node.wrapper && "borderRadius" in node.wrapper) {
    delete next.wrapper;
  }
  return next;
}

export function stripCompactBorderRadiusTree(root: CompactNode): CompactNode {
  return stripCompactBorderRadius(root);
}
