#!/usr/bin/env python3
"""
生成「画面位置」测试用 PNG（白底 + 九宫格数字 1–9），输出到 public/image-test-position/。

编号与 imageObjectPosition 预设一致（先行后列）：
  1 左上  2 上中  3 右上
  4 左中  5 正中  6 右中
  7 左下  8 下中  9 右下

- position-markers-square.png：正方形，9 个数字标出裁切焦点
- position-markers-span-lr.png：2:1 全宽三列数字（2A 水平 position 肉眼验收）
- position-markers-span-tb.png：1:2 全高三行数字（2B 垂直 position 肉眼验收）

用法：python3 scripts/generate-image-test-position-assets.py
"""
from __future__ import annotations

import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

REPO = Path(__file__).resolve().parents[1]
OUT_DIR = REPO / "public" / "image-test-position"
SIZE = 900  # 中心正方形边长（px）
TEXT_FILL = (0, 0, 0, 255)
BG = (255, 255, 255, 255)

# 九宫格归一化坐标（与 imageObjectPosition 预设一致）
GRID_FRACS = (
    (0.15, 0.15),  # 1 左上
    (0.50, 0.15),  # 2 上中
    (0.85, 0.15),  # 3 右上
    (0.15, 0.50),  # 4 左中
    (0.50, 0.50),  # 5 正中
    (0.85, 0.50),  # 6 右中
    (0.15, 0.85),  # 7 左下
    (0.50, 0.85),  # 8 下中
    (0.85, 0.85),  # 9 右下
)

# 全宽/全高九宫：列或行落在画布 1/6、1/2、5/6（与 object-position 左/中/右、上/中/下对齐）
_SPAN_THIRD_FRACS = (1 / 6, 0.5, 5 / 6)
_SPAN_ROW_FRACS = (0.15, 0.50, 0.85)
_SPAN_COL_FRACS = (0.15, 0.50, 0.85)

_FONT_CANDIDATES = (
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/Library/Fonts/Arial Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
)


def _load_number_font(side: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    """按画布边长缩放字号，保证 1–9 在裁切视窗内仍可读。"""
    size = max(36, int(side * 0.11))
    for path in _FONT_CANDIDATES:
        if os.path.isfile(path):
            try:
                return ImageFont.truetype(path, size)
            except OSError:
                continue
    return ImageFont.load_default()


def _draw_number_at(
    draw: ImageDraw.ImageDraw,
    cx: int,
    cy: int,
    label: str,
    font: ImageFont.FreeTypeFont | ImageFont.ImageFont,
) -> None:
    bbox = draw.textbbox((0, 0), label, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    draw.text((cx - tw / 2, cy - th / 2 - bbox[1]), label, fill=TEXT_FILL, font=font)


def draw_nine_numbers(draw: ImageDraw.ImageDraw, x0: int, y0: int, side: int) -> None:
    font = _load_number_font(side)
    for idx, (fx, fy) in enumerate(GRID_FRACS, start=1):
        cx = x0 + int(fx * side)
        cy = y0 + int(fy * side)
        _draw_number_at(draw, cx, cy, str(idx), font)


def save_square() -> Path:
    img = Image.new("RGBA", (SIZE, SIZE), BG)
    draw = ImageDraw.Draw(img)
    draw_nine_numbers(draw, 0, 0, SIZE)
    path = OUT_DIR / "position-markers-square.png"
    img.convert("RGB").save(path, format="PNG", optimize=True)
    return path


def _draw_span_grid(
    draw: ImageDraw.ImageDraw, w: int, h: int, col_fracs: tuple[float, ...], row_fracs: tuple[float, ...]
) -> None:
    font = _load_number_font(min(w, h))
    n = 1
    for fy in row_fracs:
        for fx in col_fracs:
            cx = int(fx * w)
            cy = int(fy * h)
            _draw_number_at(draw, cx, cy, str(n), font)
            n += 1


def save_span_lr() -> Path:
    """2:1 画布，数字三列分布于全宽（左/中/右列 position 均可看见对应数字）。"""
    w, h = SIZE * 2, SIZE
    img = Image.new("RGBA", (w, h), BG)
    draw = ImageDraw.Draw(img)
    _draw_span_grid(draw, w, h, _SPAN_THIRD_FRACS, _SPAN_ROW_FRACS)
    path = OUT_DIR / "position-markers-span-lr.png"
    img.convert("RGB").save(path, format="PNG", optimize=True)
    return path


def save_span_tb() -> Path:
    """1:2 画布，数字三行分布于全高（上/中/下排 position 均可看见对应数字）。"""
    w, h = SIZE, SIZE * 2
    img = Image.new("RGBA", (w, h), BG)
    draw = ImageDraw.Draw(img)
    _draw_span_grid(draw, w, h, _SPAN_COL_FRACS, _SPAN_THIRD_FRACS)
    path = OUT_DIR / "position-markers-span-tb.png"
    img.convert("RGB").save(path, format="PNG", optimize=True)
    return path


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    paths = [save_square(), save_span_lr(), save_span_tb()]
    print("已生成（九宫格数字 1–9，1=左上 … 9=右下）：")
    for p in paths:
        with Image.open(p) as im:
            print(f"  {p.relative_to(REPO)}  {im.size[0]}×{im.size[1]}")
    print("\n本地预览 URL（需 npm run dev:all）：")
    base = os.environ.get("IMAGE_TEST_ASSET_BASE", "http://127.0.0.1:5180")
    for p in paths:
        print(f"  {base}/image-test-position/{p.name}")


if __name__ == "__main__":
    main()
