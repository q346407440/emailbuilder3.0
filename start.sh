#!/usr/bin/env bash
# Easy-Email 一键启动：先释放约定端口，再启动 Vite(5180) + 本地 API(8787)。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  echo "[start] 加载 .env 环境变量"
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [[ -z "${PEXELS_API_KEY:-}" || "${PEXELS_API_KEY}" =~ ^[[:space:]]*$ ]]; then
  echo "[start] 警告: PEXELS_API_KEY 未配置，AI 以图生成将全部使用占位图"
else
  echo "[start] PEXELS_API_KEY 已加载（AI 配图可用）"
fi

kill_port() {
  local port="$1"
  local pids
  pids="$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null || true)"
  if [[ -n "${pids}" ]]; then
    echo "[start] 端口 ${port} 已被占用，结束进程: ${pids}"
    kill -9 ${pids} 2>/dev/null || true
    sleep 0.2
  fi
}

# 前端开发服务器（与 vite.config 一致）
kill_port 5180
# 本仓库 Hono API 默认端口（见 server/index.ts / EMAIL_API_PORT）
kill_port 8787

AI_LLM_LOG="$ROOT/logs/ai-pipeline-llm.jsonl"
mkdir -p "$ROOT/logs"
: > "$AI_LLM_LOG"
echo "[start] 已清空 AI LLM 交换日志: logs/ai-pipeline-llm.jsonl"

VITE_CACHE="$ROOT/node_modules/.vite"
LOCK_FILE="$ROOT/package-lock.json"
LOCK_STAMP="$VITE_CACHE/.package-lock.sha256"
if [[ -f "$LOCK_FILE" ]]; then
  CURRENT_LOCK_SHA="$(shasum -a 256 "$LOCK_FILE" | awk '{print $1}')"
  NEED_VITE_PURGE=0
  if [[ ! -d "$VITE_CACHE" ]]; then
    NEED_VITE_PURGE=0
  elif [[ ! -f "$LOCK_STAMP" ]] || [[ "$(cat "$LOCK_STAMP" 2>/dev/null || true)" != "$CURRENT_LOCK_SHA" ]]; then
    NEED_VITE_PURGE=1
  fi
  if [[ "$NEED_VITE_PURGE" -eq 1 ]]; then
    echo "[start] 检测到 package-lock 变更，清理 Vite 预构建缓存（避免 504 Outdated Optimize Dep）…"
    rm -rf "$VITE_CACHE"
    mkdir -p "$VITE_CACHE"
    echo "$CURRENT_LOCK_SHA" > "$LOCK_STAMP"
  fi
fi

echo "[start] 启动 Vite http://127.0.0.1:5180 与 API http://127.0.0.1:8787 …"
exec npm run dev:all
