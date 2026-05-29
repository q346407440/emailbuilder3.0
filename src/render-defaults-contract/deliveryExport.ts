import type { WrapperStyle } from "../types/email";

/** 发信导出：从 template wrapperStyle 派生的 heightMode（仅 DOM 标记，禁止写入 template.json） */
export const DELIVERY_EXPORT_HEIGHT_MODE_ATTR = "data-ee-height-mode";

/** 发信导出：从 template wrapperStyle 派生的 widthMode（仅 DOM 标记，禁止写入 template.json） */
export const DELIVERY_EXPORT_WIDTH_MODE_ATTR = "data-ee-width-mode";

export type DeliveryExportBoxMode = "hug" | "fill" | "fixed";

const BOX_MODES: ReadonlySet<string> = new Set(["hug", "fill", "fixed"]);

function normalizeBoxMode(raw: unknown): DeliveryExportBoxMode | undefined {
  return typeof raw === "string" && BOX_MODES.has(raw) ? (raw as DeliveryExportBoxMode) : undefined;
}

/**
 * 画布预览块外壳上的发信导出标记（由 EmailPreview 写入，SMTP 抓取时读取）。
 * 真源仍是 template.wrapperStyle.*Mode；此处仅为导出阶段可测量的 DOM 投影。
 */
export function deliveryExportBoxModeDataAttrs(
  wrapperStyle?: Pick<WrapperStyle, "heightMode" | "widthMode"> | null
): Record<string, string> {
  const attrs: Record<string, string> = {};
  const heightMode = normalizeBoxMode(wrapperStyle?.heightMode);
  const widthMode = normalizeBoxMode(wrapperStyle?.widthMode);
  if (heightMode) attrs[DELIVERY_EXPORT_HEIGHT_MODE_ATTR] = heightMode;
  if (widthMode) attrs[DELIVERY_EXPORT_WIDTH_MODE_ATTR] = widthMode;
  return attrs;
}

/** 发信导出时需剥离的画布专用属性（不含业务 slot 绑定类 data-ee-text-*） */
export const DELIVERY_EXPORT_STRIP_ATTRS = [
  DELIVERY_EXPORT_HEIGHT_MODE_ATTR,
  DELIVERY_EXPORT_WIDTH_MODE_ATTR,
  "data-email-preview-block",
] as const;

/** 发信导出时需剥离的画布专用 class */
export const DELIVERY_EXPORT_STRIP_CLASSES = ["email-preview-selected"] as const;
