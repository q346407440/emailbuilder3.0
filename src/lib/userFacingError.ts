/**
 * 将异常转换为可面向用户展示的提示文案。
 *
 * 规则：服务端返回的中文业务提示原样展示；
 * 其余（英文异常原文、堆栈、空消息等）一律替换为调用方提供的兜底文案，
 * 避免把开发期错误细节直接暴露给用户。
 */
export function toUserFacingErrorMessage(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  const msg = raw.trim();
  if (!msg) return fallback;
  return /[一-鿿]/.test(msg) ? msg : fallback;
}
