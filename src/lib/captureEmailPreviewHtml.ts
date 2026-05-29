import { EMAIL_ROOT_FIXED_WIDTH } from "../render-defaults-contract/values";
import { prepareEmailPreviewInnerHtmlForDelivery } from "./emailDeliveryExport";

/** 从当前画布 DOM 抓取预览 HTML，并包成可投递的简易邮件文档。 */
export function captureEmailPreviewHtmlFromDom(options?: {
  subject?: string;
  preheader?: string;
}): string | null {
  if (typeof document === "undefined") return null;
  const scope = document.querySelector(".email-preview-scope");
  if (!scope) return null;
  const inner = prepareEmailPreviewInnerHtmlForDelivery(scope);
  if (!inner) return null;
  return wrapEmailPreviewDocument(inner, options);
}

export function wrapEmailPreviewDocument(
  previewInnerHtml: string,
  options?: { subject?: string; preheader?: string }
): string {
  const subject = escapeHtml((options?.subject ?? "Easy-Email 测试邮件").trim() || "Easy-Email 测试邮件");
  const preheader = (options?.preheader ?? "").trim();
  const preheaderBlock = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f1f1;">
${preheaderBlock}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background-color:#f1f1f1;">
<tr>
<td align="center" style="padding:0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${EMAIL_ROOT_FIXED_WIDTH}" style="border-collapse:collapse;width:${EMAIL_ROOT_FIXED_WIDTH};max-width:100%;">
<tr>
<td style="padding:0;">
${previewInnerHtml}
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
