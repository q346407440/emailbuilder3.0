import { AiPipelineError } from "../../layout-variant-ai-contract/errors";

const FENCE_RE = /^```(?:json)?\s*([\s\S]*?)```\s*$/i;

/** strip markdown fence 后 JSON.parse（§15.5 兜底）。 */
export function parseLlmJson<T = unknown>(raw: string): T {
  let text = raw.trim();
  const fenced = FENCE_RE.exec(text);
  if (fenced) text = fenced[1]!.trim();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new AiPipelineError("LLM_PARSE_FAILED", "LLM 返回内容不是合法 JSON");
  }
}
