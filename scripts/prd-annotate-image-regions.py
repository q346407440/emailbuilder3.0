#!/usr/bin/env python3
"""在 PRD / 文档截图上按视口 CSS 坐标绘制红框（圆角矩形）。"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw
except ImportError as exc:  # pragma: no cover
    print(
        "缺少 Pillow：请执行 pip3 install pillow",
        file=sys.stderr,
    )
    raise SystemExit(1) from exc

DEFAULT_RED = (229, 57, 53, 255)
DEFAULT_PAD = 6
DEFAULT_STROKE = 5
DEFAULT_RADIUS = 12


def parse_viewport(raw: str) -> tuple[float, float]:
    parts = raw.replace("x", ",").split(",")
    if len(parts) != 2:
        raise ValueError(f"viewport 须为 WIDTH,HEIGHT 或 WIDTHxHEIGHT，收到: {raw!r}")
    return float(parts[0]), float(parts[1])


def load_regions(path: Path | None, inline: str | None) -> dict[str, dict[str, float]]:
    if inline:
        data = json.loads(inline)
    elif path:
        data = json.loads(path.read_text(encoding="utf-8"))
    else:
        raise ValueError("须指定 --regions-json 或 --regions-file")

    if "regions" in data and isinstance(data["regions"], dict):
        data = data["regions"]
    if not isinstance(data, dict) or not data:
        raise ValueError("regions 须为非空对象，键为区域名，值为 {x,y,w,h}")

    out: dict[str, dict[str, float]] = {}
    for name, rect in data.items():
        if rect is None:
            continue
        for key in ("x", "y", "w", "h"):
            if key not in rect:
                raise ValueError(f"区域 {name!r} 缺少字段 {key!r}")
        out[name] = {k: float(rect[k]) for k in ("x", "y", "w", "h")}
    return out


def css_rect_to_pixels(
    rect: dict[str, float],
    sx: float,
    sy: float,
    pad: int,
) -> list[int]:
    x0 = int(rect["x"] * sx) + pad
    y0 = int(rect["y"] * sy) + pad
    x1 = int((rect["x"] + rect["w"]) * sx) - pad
    y1 = int((rect["y"] + rect["h"]) * sy) - pad
    return [x0, y0, x1, y1]


def annotate(
    input_path: Path,
    output_path: Path,
    regions: dict[str, dict[str, float]],
    viewport_w: float,
    viewport_h: float,
    *,
    pad: int = DEFAULT_PAD,
    stroke: int = DEFAULT_STROKE,
    radius: int = DEFAULT_RADIUS,
    color: tuple[int, int, int, int] = DEFAULT_RED,
) -> None:
    im = Image.open(input_path)
    sw, sh = im.size
    sx = sw / viewport_w
    sy = sh / viewport_h

    layer = im.convert("RGBA")
    draw = ImageDraw.Draw(layer)
    for rect in regions.values():
        box = css_rect_to_pixels(rect, sx, sy, pad)
        draw.rounded_rectangle(box, radius=radius, outline=color, width=stroke)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    layer.convert("RGB").save(output_path, quality=92)


def main() -> None:
    parser = argparse.ArgumentParser(description="在截图上绘制红框区域标注")
    parser.add_argument("--input", "-i", type=Path, required=True, help="原始 PNG/JPEG")
    parser.add_argument("--output", "-o", type=Path, required=True, help="输出 PNG")
    parser.add_argument(
        "--viewport",
        required=True,
        help="截图时 CSS 视口宽高，如 1920,1080 或 2560x1440",
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--regions-json", help="区域 JSON 字符串")
    group.add_argument("--regions-file", type=Path, help="区域 JSON 文件")
    parser.add_argument("--pad", type=int, default=DEFAULT_PAD)
    parser.add_argument("--stroke", type=int, default=DEFAULT_STROKE)
    parser.add_argument("--radius", type=int, default=DEFAULT_RADIUS)
    args = parser.parse_args()

    vw, vh = parse_viewport(args.viewport)
    regions = load_regions(args.regions_file, args.regions_json)
    annotate(
        args.input,
        args.output,
        regions,
        vw,
        vh,
        pad=args.pad,
        stroke=args.stroke,
        radius=args.radius,
    )
    print(f"已写入 {args.output}（{len(regions)} 个区域）")


if __name__ == "__main__":
    main()
