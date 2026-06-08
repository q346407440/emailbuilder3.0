import { getApiBase } from "../api/apiBase";

/** 运营上传图标：仅 SVG。 */
export const PROJECT_ICON_UPLOAD_MAX_BYTES = 512 * 1024;

/** 运营上传图片：与版式 AI 设计图上限一致。 */
export const PROJECT_IMAGE_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

export const PROJECT_IMAGE_UPLOAD_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

const IMAGE_EXT_RE = /\.(jpe?g|png|webp|gif)$/i;

export function isProjectImageUploadFile(file: { name?: string; type?: string }): boolean {
  const type = (file.type ?? "").toLowerCase();
  if ((PROJECT_IMAGE_UPLOAD_MIME_TYPES as readonly string[]).includes(type)) return true;
  const name = file.name?.toLowerCase() ?? "";
  return IMAGE_EXT_RE.test(name);
}

export function isProjectIconUploadFile(file: { name?: string; type?: string }): boolean {
  const name = file.name?.toLowerCase() ?? "";
  const type = (file.type ?? "").toLowerCase();
  return name.endsWith(".svg") || type === "image/svg+xml";
}

/**
 * 将服务端返回的相对资源路径转为可在画布/预览中加载的绝对 URL。
 * 已是 http(s) 的地址原样返回。
 */
export function toAbsoluteProjectAssetUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/api/v1/")) {
    const base = getApiBase().replace(/\/$/, "");
    const origin = base.replace(/\/api\/v1$/i, "");
    return `${origin}${trimmed}`;
  }
  return trimmed;
}
