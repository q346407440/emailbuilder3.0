import type { CSSProperties } from "react";

type IconGlyphProps = {
  src: string;
  size: string;
  color?: string;
  alt?: string;
};

/**
 * icon 区块预览：有 color 时对单色 SVG 用 mask 着色；否则回退为 <img>。
 */
export function IconGlyph({ src, size, color, alt = "" }: IconGlyphProps) {
  const box: CSSProperties = {
    width: size,
    height: size,
    display: "inline-block",
    verticalAlign: "middle",
    flexShrink: 0,
  };

  if (color) {
    return (
      <span
        role="img"
        aria-label={alt || undefined}
        style={{
          ...box,
          backgroundColor: color,
          WebkitMaskImage: `url("${src.replace(/"/g, '\\"')}")`,
          maskImage: `url("${src.replace(/"/g, '\\"')}")`,
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

  return <img src={src} alt={alt} style={{ ...box, objectFit: "contain" }} />;
}
