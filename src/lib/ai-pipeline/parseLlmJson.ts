import { AiPipelineError } from "../../layout-variant-ai-contract/errors";
import { extractFirstJsonSubstring } from "./extractFirstJsonSubstring";

const FENCE_RE = /^```(?:json)?\s*([\s\S]*?)```\s*$/i;

/** strip markdown fence 后 JSON.parse（§15.5 兜底；尾部多余字符时截取首段完整 JSON）。 */
export function parseLlmJson<T = unknown>(raw: string): T {
  let text = raw.trim();
  const fenced = FENCE_RE.exec(text);
  if (fenced) text = fenced[1]!.trim();
  try {
    return JSON.parse(text) as T;
  } catch {
    const extracted = extractFirstJsonSubstring(text);
    if (extracted) {
      try {
        return JSON.parse(extracted) as T;
      } catch {
        /* 截取后仍非法，走统一报错 */
      }
    }
    throw new AiPipelineError("LLM_PARSE_FAILED", "LLM 返回内容不是合法 JSON");
  }
}
