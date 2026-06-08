import type { LlmClient, LlmMessage, LlmResponseFormat } from "../ports/LlmClient";
import { parseLlmJson } from "../parseLlmJson";
import { AI_PIPELINE_STEP_TIMEOUT_MS } from "../../../layout-variant-ai-contract/constants";
import { appendLlmExchangeLog } from "../llmExchangeFileLog";

type DoubaoConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

function readDoubaoConfig(): DoubaoConfig {
  const apiKey = (process.env.DOUBAO_API_KEY ?? "").trim();
  const baseUrl = (process.env.DOUBAO_BASE_URL ?? "https://ark.cn-beijing.volces.com/api/v3").trim();
  const model = (process.env.LLM_PIPELINE_MODEL ?? "").trim();
  if (!apiKey || !model) {
    throw new Error("未配置 DOUBAO_API_KEY 或 LLM_PIPELINE_MODEL");
  }
  return {
    apiKey,
    baseUrl,
    model,
  };
}

/** 火山方舟 chat/completions 适配（不传 response_format / json_schema，由 prompt + Zod 校验约束输出）。 */
export function createDoubaoClient(timeoutMs = AI_PIPELINE_STEP_TIMEOUT_MS): LlmClient {
  return {
    async complete(messages: LlmMessage[], _responseFormat?: LlmResponseFormat): Promise<string> {
      const config = readDoubaoConfig();
      const body: Record<string, unknown> = {
        model: config.model,
        messages,
        thinking: { type: "disabled" },
      };
      const content = await postChatWithTimeout(config, body, 1, timeoutMs);
      parseLlmJson(content);
      return content;
    },
  };
}

async function postChatWithTimeout(
  config: DoubaoConfig,
  body: Record<string, unknown>,
  doubaoAttempt: number,
  timeoutMs: number
): Promise<string> {
  const url = `${config.baseUrl}/chat/completions`;
  appendLlmExchangeLog({
    type: "request",
    doubaoAttempt,
    url,
    body,
  });

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    appendLlmExchangeLog({
      type: "error",
      doubaoAttempt,
      url,
      message: e instanceof Error ? e.message : String(e),
    });
    throw e;
  }

  const responseText = await res.text();
  let responseBody: unknown = responseText;
  try {
    responseBody = JSON.parse(responseText) as unknown;
  } catch {
    // 非 JSON 时保留原文
  }

  if (!res.ok) {
    appendLlmExchangeLog({
      type: "error",
      doubaoAttempt,
      url,
      status: res.status,
      message: `豆包 API ${res.status}`,
      body: responseBody,
    });
    const err = new Error(`豆包 API ${res.status}: ${responseText.slice(0, 400)}`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }

  appendLlmExchangeLog({
    type: "response",
    doubaoAttempt,
    url,
    status: res.status,
    body: responseBody,
  });

  const data = responseBody as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("豆包返回空 content");
  return content;
}

export type DoubaoRawClientOptions = {
  /** 长文本输出（如完整 mjs）需提高上限，避免截断 */
  maxTokens?: number;
};

/** 文本/MJS 等非 JSON 输出：不做 parseLlmJson 预检。 */
export function createDoubaoRawClient(
  timeoutMs = AI_PIPELINE_STEP_TIMEOUT_MS,
  options?: DoubaoRawClientOptions
): LlmClient {
  return {
    async complete(messages: LlmMessage[], _responseFormat?: LlmResponseFormat): Promise<string> {
      const config = readDoubaoConfig();
      const body: Record<string, unknown> = {
        model: config.model,
        messages,
        thinking: { type: "disabled" },
      };
      if (options?.maxTokens != null) {
        body.max_tokens = options.maxTokens;
      }
      return postChatWithTimeout(config, body, 1, timeoutMs);
    },
  };
}

export function createDoubaoClientOrNull(): LlmClient | null {
  const apiKey = (process.env.DOUBAO_API_KEY ?? "").trim();
  const model = (process.env.LLM_PIPELINE_MODEL ?? "").trim();
  if (!apiKey || !model) return null;
  return createDoubaoClient();
}
