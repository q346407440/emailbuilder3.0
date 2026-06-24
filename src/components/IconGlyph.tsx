import type { CSSProperties } from "react";
import {
  ICON_EMPTY_GLYPH,
  ICON_EMPTY_GLYPH_COLOR,
  isIconPlaceholderSrc,
} from "../lib/imagePlaceholder";

type IconGlyphProps = {
  src: string;
  size: string;
  color?: string;
  alt?: string;
};

/** 与有 src 时一致的外层盒，避免叶壳 hug + td anti-strut 下占位符撑出选中框。 */
function iconPreviewBoxStyle(size: string): CSSProperties {
  return {
    width: size,
    height: size,
    display: "inline-block",
    verticalAlign: "middle",
    flexShrink: 0,
    boxSizing: "border-box",
  };
}

/** 留空或占位 URL：空心菱形字元 ◇（与历史预览一致）。 */
function IconEmptyGlyph({ size, color }: { size: string; color?: string }) {
  const glyphColor = color?.trim() || ICON_EMPTY_GLYPH_COLOR;
  return (
    <span
      aria-hidden
      style={{
        ...iconPreviewBoxStyle(size),
        overflow: "hidden",
        lineHeight: size,
        textAlign: "center",
        fontSize: size,
        color: glyphColor,
      }}
    >
      {ICON_EMPTY_GLYPH}
    </span>
  );
}

/**
 * icon 区块预览：有 color 时对单色 SVG 用 mask 着色；否则回退为 <img>。
 * 留空或占位 URL 时显示 ◇（props.size 方盒，可选 props.color 着色）。
 */
export function IconGlyph({ src, size, color, alt = "" }: IconGlyphProps) {
  const box = iconPreviewBoxStyle(size);
  const normalizedSrc = src.trim();

  if (isIconPlaceholderSrc(normalizedSrc)) {
    return <IconEmptyGlyph size={size} color={color} />;
  }

  if (color) {
    return (
      <span
        role="img"
        aria-label={alt || undefined}
        style={{
          ...box,
          backgroundColor: color,
          WebkitMaskImage: `url("${normalizedSrc.replace(/"/g, '\\"')}")`,
          maskImage: `url("${normalizedSrc.replace(/"/g, '\\"')}")`,
          WebkitMaskSize: "contain",
          maskSize: "contain",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
        }}
      />
    );
  }

  return <img src={normalizedSrc} alt={alt} style={{ ...box, objectFit: "contain" }} />;
}
