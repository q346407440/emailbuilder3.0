/** LLM 阶段重试：上一轮输出 + 校验错误，追加到 user 文本供模型订正。 */

export type LlmRetryFeedback = {
  /** 上一轮 LLM 原文或 JSON.stringify(parsed)（已截断） */
  previousOutput: string;
  /** 人类可读错误列表 */
  errors: string[];
};

/** 重试 prompt 中上一轮输出的最大字符数。 */
export const LLM_RETRY_OUTPUT_MAX_CHARS = 6_000;

export class LlmStageFailure extends Error {
  readonly feedback: LlmRetryFeedback;

  constructor(feedback: LlmRetryFeedback, message?: string) {
    super(message ?? feedback.errors[0] ?? "LLM 阶段校验失败");
    this.name = "LlmStageFailure";
    this.feedback = feedback;
  }
}

export function isLlmStageFailure(error: unknown): error is LlmStageFailure {
  return error instanceof LlmStageFailure;
}

export function truncateRetryOutput(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= LLM_RETRY_OUTPUT_MAX_CHARS) return trimmed;
  return `${trimmed.slice(0, LLM_RETRY_OUTPUT_MAX_CHARS)}\n…（已截断，仅保留开头 ${LLM_RETRY_OUTPUT_MAX_CHARS} 字符）`;
}

export function feedbackFromLlmAttempt(
  rawContent: string,
  parsed: unknown | null,
  errorMessage: string,
  extraErrors: string[] = []
): LlmRetryFeedback {
  const previousOutput =
    parsed != null
      ? truncateRetryOutput(JSON.stringify(parsed, null, 2))
      : truncateRetryOutput(rawContent);
  const errors = [errorMessage, ...extraErrors].filter(Boolean);
  return { previousOutput, errors };
}

export function buildRetryUserAppendix(feedback: LlmRetryFeedback): string {
  const errorLines = feedback.errors.map((e, i) => `${i + 1}. ${e}`).join("\n");
  return `

---
## 上一轮输出（校验未通过，请在此基础上修正）
\`\`\`json
${feedback.previousOutput}
\`\`\`

## 校验错误（必须全部消除）
${errorLines}

请按 system 规则重新输出**完整、合法**的结果；只输出 JSON，不要 markdown 代码块包裹，不要解释文字。`;
}

/** 将重试反馈追加到 user 文本末尾（首次 attempt 无 feedback 则原样返回）。 */
export function appendRetryToUserText(baseUserText: string, feedback?: LlmRetryFeedback): string {
  if (!feedback) return baseUserText;
  return `${baseUserText}${buildRetryUserAppendix(feedback)}`;
}
