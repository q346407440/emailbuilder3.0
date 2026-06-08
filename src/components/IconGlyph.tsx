import type { CSSProperties } from "react";

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

/**
 * icon 区块预览：有 color 时对单色 SVG 用 mask 着色；否则回退为 <img>。
 * src 为空时仍占 props.size 方盒并显示占位符（与有图时选中框一致）。
 */
export function IconGlyph({ src, size, color, alt = "" }: IconGlyphProps) {
  const box = iconPreviewBoxStyle(size);
  const normalizedSrc = src.trim();

  if (!normalizedSrc) {
    return (
      <span
        aria-hidden
        style={{
          ...box,
          overflow: "hidden",
          lineHeight: size,
          textAlign: "center",
          fontSize: size,
          color: "#94a3b8",
        }}
      >
        ◇
      </span>
    );
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
