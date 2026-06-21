import type { LlmResponseFormat } from "../ports/LlmClient";

/** 豆包 400 且与 response_format / json_schema 相关 → 尝试降级。 */
export function isDoubaoResponseFormatUnsupported(status: number, responseText: string): boolean {
  if (status !== 400) return false;
  const lower = responseText.toLowerCase();
  return (
    lower.includes("response_format") ||
    lower.includes("json_schema") ||
    lower.includes("json schema") ||
    lower.includes("structured output")
  );
}

export type DoubaoResponseFormatBody =
  | { response_format: LlmResponseFormat }
  | { response_format: { type: "json_object" } }
  | Record<string, never>;

/** 仅当调用方显式传入 responseFormat 时才有回退链；否则单次无 format 请求。 */
export function buildDoubaoResponseFormatBodies(
  responseFormat?: LlmResponseFormat
): DoubaoResponseFormatBody[] {
  if (!responseFormat) return [{}];
  return [
    { response_format: responseFormat },
    { response_format: { type: "json_object" } },
    {},
  ];
}
