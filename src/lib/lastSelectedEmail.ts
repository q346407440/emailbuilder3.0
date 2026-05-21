const LAST_SELECTED_EMAIL_KEY = "easy-email:last-selected-email-key";

/** 读取上次选中的邮件模板 key；异常时返回 null。 */
export function getLastSelectedEmailKey(): string | null {
  try {
    const value = window.localStorage.getItem(LAST_SELECTED_EMAIL_KEY);
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  } catch {
    return null;
  }
}

/** 持久化上次选中的邮件模板 key；异常时静默忽略。 */
export function setLastSelectedEmailKey(emailKey: string): void {
  try {
    window.localStorage.setItem(LAST_SELECTED_EMAIL_KEY, emailKey);
  } catch {
    // 某些隐私模式或受限环境下可能禁止 localStorage，忽略即可。
  }
}
