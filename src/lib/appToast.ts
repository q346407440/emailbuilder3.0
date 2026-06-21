import { message } from "antd";

const DEFAULT_DURATION = 2.5;

/** 全站 Toast 全局配置（如 top、maxCount），在 App 挂载时调用一次即可 */
export function configureAppToast(options: Parameters<typeof message.config>[0]): void {
  message.config(options);
}

export function toastSuccess(text: string, duration = DEFAULT_DURATION): void {
  message.success(text, duration);
}

export function toastError(text: string, duration = DEFAULT_DURATION): void {
  message.error(text, duration);
}

export function toastWarning(text: string, duration = DEFAULT_DURATION): void {
  message.warning(text, duration);
}

export function toastInfo(text: string, duration = DEFAULT_DURATION): void {
  message.info(text, duration);
}

/** 进行中的 loading toast；返回关闭函数，操作结束后须调用 */
export function toastLoading(text: string): () => void {
  return message.loading(text, 0);
}

export async function withToastLoading<T>(text: string, fn: () => Promise<T>): Promise<T> {
  const dismiss = toastLoading(text);
  try {
    return await fn();
  } finally {
    dismiss();
  }
}
