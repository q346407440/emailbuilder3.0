/** 以图 AI 生成版式：错误码真源（server 映射 HTTP 状态）。 */

export const AI_PIPELINE_ERROR_CODES = [
  "AI_GENERATION_FAILED",
  "AI_GENERATION_TIMEOUT",
  "AI_PIPELINE_ALL_SECTIONS_FAILED",
  "LLM_PARSE_FAILED",
  "VALIDATE_TEMPLATE_FAILED",
  "VALIDATION_FAILED",
] as const;

export type AiPipelineErrorCode = (typeof AI_PIPELINE_ERROR_CODES)[number];

export class AiPipelineError extends Error {
  readonly code: AiPipelineErrorCode;

  constructor(code: AiPipelineErrorCode, message: string) {
    super(message);
    this.name = "AiPipelineError";
    this.code = code;
  }
}

export function isAiPipelineError(e: unknown): e is AiPipelineError {
  return e instanceof AiPipelineError;
}
