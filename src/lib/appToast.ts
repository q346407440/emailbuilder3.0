import { message } from "@shoplazza/sds";

const DEFAULT_DURATION = 2.5;

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
