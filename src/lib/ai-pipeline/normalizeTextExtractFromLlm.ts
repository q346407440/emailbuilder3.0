import type { TextExtractRole } from "./compactTypes";
import type { TextExtractPayloadParsed } from "./schemas/b3-text-extract";

/** LLM Stage B3 输出的单条区域文案（JSON 数组元素）。 */
type LlmRegionText = {
  regionId?: string;
  texts?: unknown;
};

/** 将 LLM 输出的 JSON 数组 `[{ regionId, texts[] }]` 规范化为管线内部 TextExtractPayload。 */
export function normalizeTextExtractFromLlm(parsed: unknown): TextExtractPayloadParsed {
  if (!Array.isArray(parsed)) return { regions: [] };
  return { regions: normalizeTextExtractArray(parsed) };
}

function normalizeTextExtractArray(items: LlmRegionText[]): TextExtractPayloadParsed["regions"] {
  return items
    .map((item) => {
      const regionId = typeof item.regionId === "string" ? item.regionId.trim() : "";
      if (!regionId) return null;

      const texts = Array.isArray(item.texts)
        ? item.texts.filter((t): t is string => typeof t === "string" && t.trim().length > 0)
        : [];
      if (texts.length === 0) return null;

      return {
        regionId,
        paragraphs: texts.map((text, index) => textStringToParagraph(regionId, text, index, texts.length)),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r != null);
}

function textStringToParagraph(
  regionId: string,
  text: string,
  index: number,
  total: number
) {
  const role = inferTextRole(text, index, total);
  return {
    textId: `${regionId}-t${index}`,
    role,
    textBody: {
      paragraphs: [{ runs: [{ text: text.trim() }] }],
    },
  };
}

function inferTextRole(text: string, index: number, total: number): TextExtractRole {
  const t = text.trim();
  if (!t) return "body";

  if (/test ride|book a test ride/i.test(t) && t.length <= 48) {
    return "body";
  }

  if (
    /^(shop|buy|checkout|order|subscribe|sign up|copy|get started|learn more|立即|购买|结算|订阅|去结算|shop now|don't miss)/i.test(
      t
    ) ||
    (t.length <= 28 && total > 1 && index === total - 1 && /^(shop|buy|checkout)/i.test(t))
  ) {
    return "button";
  }

  if (index === 0 && t.length <= 80) return "heading";

  const upper = t.toUpperCase();
  if (t.length <= 48 && upper === t && /[A-Z]/.test(t)) return "heading";

  if (/©|copyright|unsubscribe|退订|版权/i.test(t)) return "footer";
  if (t.length <= 60 && index > 0 && total > 2) return "caption";

  return "body";
}
