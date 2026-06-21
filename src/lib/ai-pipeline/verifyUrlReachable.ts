const REACHABLE_TIMEOUT_MS = 6_000;

/**
 * 探测远程资源是否可访问：HEAD 优先，遇 405/501（不支持 HEAD）时回退 GET。
 * 2xx（或重定向后落到 2xx）视为可访问；网络错误 / 超时 / 4xx / 5xx 视为不可访问。
 * 不抛错，便于在候选回退循环里逐个试探。
 */
export async function verifyUrlReachable(
  url: string,
  timeoutMs = REACHABLE_TIMEOUT_MS
): Promise<boolean> {
  const probe = async (method: "HEAD" | "GET"): Promise<Response | null> => {
    try {
      return await fetch(url, {
        method,
        redirect: "follow",
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      return null;
    }
  };

  let res = await probe("HEAD");
  if (res && (res.status === 405 || res.status === 501)) {
    res = await probe("GET");
  }
  if (!res) return false;
  return res.ok;
}
