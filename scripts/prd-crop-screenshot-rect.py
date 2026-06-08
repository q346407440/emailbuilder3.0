#!/usr/bin/env python3
"""按页面 getBoundingClientRect 裁切视口截图（自动对齐截图与 innerWidth 比例）。"""
from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

from PIL import Image


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--src", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument(
        "--rect",
        required=True,
        help='JSON: {"x","y","width","height","viewportWidth","viewportHeight"}',
    )
    args = parser.parse_args()

    rect = json.loads(args.rect)
    im = Image.open(args.src)
    vw = float(rect.get("viewportWidth") or im.width)
    vh = float(rect.get("viewportHeight") or im.height)
    sx = im.width / vw
    sy = im.height / vh

    x = int(math.floor(rect["x"] * sx))
    y = int(math.floor(rect["y"] * sy))
    w = int(math.ceil(rect["width"] * sx))
    h = int(math.ceil(rect["height"] * sy))

    box = (
        max(0, x),
        max(0, y),
        min(im.width, x + w),
        min(im.height, y + h),
    )
    if box[2] <= box[0] or box[3] <= box[1]:
        print(f"无效裁切区域 {box}，原图 {im.size}，rect={rect}", file=sys.stderr)
        sys.exit(1)

    cropped = im.crop(box)
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    cropped.save(out)
    print(f"{out}: {cropped.size[0]}x{cropped.size[1]}")


if __name__ == "__main__":
    main()
