#!/bin/bash
# 将 MCP 视口截图按页面返回的 rect JSON 裁切为 PRD 配图
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${1:?src png}"
OUT="${2:?out png}"
RECT="${3:?rect json}"
python3 "$ROOT/scripts/prd-crop-screenshot-rect.py" --src "$SRC" --out "$OUT" --rect "$RECT"
