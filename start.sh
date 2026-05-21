#!/usr/bin/env bash
# Easy-Email 一键启动：先释放约定端口，再启动 Vite(5180) + 本地 API(8787)。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

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

echo "[start] 启动 Vite http://127.0.0.1:5180 与 API http://127.0.0.1:8787 …"
exec npm run dev:all
