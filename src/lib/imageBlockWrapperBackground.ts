import type { EmailBlock, ImageBlockProps, WrapperBackgroundImage, WrapperStyle } from "../types/email";
import { remapBindingPaths } from "./bindingTransforms";
import { normalizeCssLengthPx } from "./wrapperBackgroundImage";

/** 历史 `image.props.viewport` 形态（迁移与脚本用） */
export type LegacyImageViewport = {
  mode?: string;
  width?: string;
  height?: string;
};

/** 由历史图片 viewport 推导容器背景图所需的 wrapperStyle 宽高语义（与 layout 容器背景图一致） */
export function imageViewportToLayoutBackgroundDimensions(
  rootWidth: string,
  viewport: LegacyImageViewport | undefined
): { width?: string; height?: string; widthMode: WrapperStyle["widthMode"]; heightMode: WrapperStyle["heightMode"] } {
  if (!viewport || typeof viewport !== "object") {
    return { widthMode: "fill", heightMode: "hug" };
  }
  const vwRaw =
    typeof viewport.width === "string" && viewport.width.trim() ? viewport.width.trim() : "";
  const vhRaw =
    typeof viewport.height === "string" && viewport.height.trim() ? viewport.height.trim() : "";
  const mode = viewport.mode;

  if (mode === "fixed") {
    const vw = vwRaw === "auto" ? "" : vwRaw;
    const vh = vhRaw === "auto" ? "" : vhRaw;
    if (vw && vh) {
      return {
        widthMode: "fixed",
        heightMode: "fixed",
        width: vw,
        height: normalizeCssLengthPx(vh) ?? vh,
      };
    }
  }

  if (vwRaw && vwRaw !== "auto") {
    const hm =
      vhRaw && vhRaw !== "auto"
        ? ("fixed" as const)
        : vhRaw === "auto"
          ? ("hug" as const)
          : ("hug" as const);
    return {
      widthMode: vwRaw === "100%" ? "fill" : "fixed",
      width: vwRaw === "100%" ? undefined : vwRaw,
      heightMode: hm,
      height:
        hm === "fixed" && vhRaw && vhRaw !== "auto"
          ? normalizeCssLengthPx(vhRaw) ?? vhRaw
          : undefined,
    };
  }

  if (mode === "intrinsic") {
    return {
      widthMode: "fill",
      heightMode: vhRaw && vhRaw !== "auto" ? "fixed" : "hug",
      height:
        vhRaw && vhRaw !== "auto" ? normalizeCssLengthPx(vhRaw) ?? vhRaw : undefined,
    };
  }

  return {
    widthMode: "fixed",
    width: rootWidth,
    heightMode: vhRaw && vhRaw !== "auto" ? "fixed" : "hug",
    height: vhRaw && vhRaw !== "auto" ? normalizeCssLengthPx(vhRaw) ?? vhRaw : undefined,
  };
}

const LEGACY_IMAGE_PROP_KEYS = new Set([
  "src",
  "alt",
  "link",
  "viewport",
  "fit",
  "position",
  "borderRadius",
  "border",
]);

function hasLegacyImagePayload(props: Record<string, unknown>): boolean {
  for (const k of LEGACY_IMAGE_PROP_KEYS) {
    if (k in props && props[k] !== undefined) return true;
  }
  return false;
}

export function pickImageOverlayStackProps(raw: Record<string, unknown>): ImageBlockProps {
  const next: Record<string, unknown> = {};
  if (raw.direction === "vertical" || raw.direction === "horizontal") {
    next.direction = raw.direction;
  }
  if (raw.gapMode === "fixed" || raw.gapMode === "auto") {
    next.gapMode = raw.gapMode;
  }
  if (typeof raw.gap === "string" && raw.gap.trim()) {
    next.gap = raw.gap;
  }
  return next as ImageBlockProps;
}

/**
 * 将历史 `image.props.*` 形态合并为 `wrapperStyle.backgroundImage` + 宽高语义；
 * props 仅保留与带底图 layout 对齐的叠放栈布局字段。
 * 已为新形态的块原样返回。
 */
export function normalizeImageBlockToWrapperBackgroundShape(
  block: EmailBlock & { type: "image" },
  rootWidth: string
): EmailBlock & { type: "image" } {
  const props = (block.props ?? {}) as Record<string, unknown>;
  if (!hasLegacyImagePayload(props)) {
    return block;
  }

  const viewport = props.viewport as LegacyImageViewport | undefined;
  const dim = imageViewportToLayoutBackgroundDimensions(rootWidth, viewport);
  const fit: "cover" | "contain" = props.fit === "contain" ? "contain" : "cover";
  const position =
    typeof props.position === "string" && props.position.trim() ? props.position : "center";

  const backgroundImage: WrapperBackgroundImage = {
    src: typeof props.src === "string" ? props.src : "",
    alt: typeof props.alt === "string" ? props.alt : "",
    link: typeof props.link === "string" ? props.link : "",
    fit,
    position,
    borderRadius: props.borderRadius as WrapperBackgroundImage["borderRadius"],
    border: props.border as WrapperBackgroundImage["border"],
  };

  const nextWs: WrapperStyle = {
    ...block.wrapperStyle,
    widthMode: dim.widthMode ?? block.wrapperStyle?.widthMode ?? "fill",
    heightMode: dim.heightMode ?? block.wrapperStyle?.heightMode ?? "hug",
    ...(dim.width !== undefined ? { width: dim.width } : {}),
    ...(dim.height !== undefined ? { height: dim.height } : {}),
    backgroundImage,
  };

  const nextBindings = remapBindingPaths(block.bindings, {
    "props.src": "wrapperStyle.backgroundImage.src",
    "props.alt": "wrapperStyle.backgroundImage.alt",
    "props.link": "wrapperStyle.backgroundImage.link",
    "props.borderRadius": "wrapperStyle.backgroundImage.borderRadius",
    "props.border": "wrapperStyle.backgroundImage.border",
    "props.position": "wrapperStyle.backgroundImage.position",
    "props.fit": "wrapperStyle.backgroundImage.fit",
    "props.viewport.width": "wrapperStyle.width",
    "props.viewport.height": "wrapperStyle.height",
  });

  return {
    ...block,
    wrapperStyle: nextWs,
    props: pickImageOverlayStackProps(props),
    bindings: nextBindings,
  };
}
