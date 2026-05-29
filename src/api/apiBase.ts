/**
 * API 根路径：生产走同源 `/api/v1`；开发默认直连 Hono(8787)，避免多标签页时
 * 多条 SSE 占满 Vite 反向代理连接池导致其它标签页 fetch 永久挂起。
 */
export function getApiBase(): string {
  if (import.meta.env.DEV) {
    const direct = (import.meta.env.VITE_API_DIRECT_URL as string | undefined)?.trim();
    const origin = direct?.replace(/\/$/, "") || "http://127.0.0.1:8787";
    return `${origin}/api/v1`;
  }
  return "/api/v1";
}
