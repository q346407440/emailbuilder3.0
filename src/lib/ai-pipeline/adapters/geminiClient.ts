import type { LlmMessage, LlmResponseFormat } from "../ports/LlmClient";
import { parseLlmJson } from "../parseLlmJson";
import type { GeminiThinkingLevel } from "../../../layout-variant-ai-contract/llmProfileCatalog";
import type { LlmGenerationParams } from "../../../layout-variant-ai-contract/llmGenerationParams";
import { geminiGenerateContentUrl, readGeminiEnvConfig } from "../llmVendorConfig";
import { toGeminiGenerationFields } from "../llmGenerationParamsApply";
import { appendLlmExchangeLog } from "../llmExchangeFileLog";

const GEMINI_VENDOR_LABEL = "Gemini";

export type GeminiClientRuntimeConfig = {
  model: string;
  thinkingLevel: GeminiThinkingLevel;
};

export class GeminiApiError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "GeminiApiError";
    this.status = status;
  }
}

type GeminiContentPart = { text?: string; inline_data?: { mime_type: string; data: string } };
type GeminiContent = { role?: string; parts: GeminiContentPart[] };

function readMessageText(message: LlmMessage): string {
  if (typeof message.content === "string") return message.content;
  return message.content
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n");
}

function imageUrlToInlineData(url: string): GeminiContentPart | null {
  const dataUrl = /^data:([^;]+);base64,(.+)$/i.exec(url.trim());
  if (dataUrl) {
    return { inline_data: { mime_type: dataUrl[1], data: dataUrl[2] } };
  }
  return null;
}

function llmMessageToGeminiParts(message: LlmMessage): GeminiContentPart[] {
  if (typeof message.content === "string") {
    return [{ text: message.content }];
  }
  const parts: GeminiContentPart[] = [];
  for (const part of message.content) {
    if (part.type === "text") {
      parts.push({ text: part.text });
      continue;
    }
    const inline = imageUrlToInlineData(part.image_url.url);
    if (inline) parts.push(inline);
  }
  return parts;
}

export function convertLlmMessagesToGeminiRequest(messages: LlmMessage[]): {
  systemInstruction?: { parts: Array<{ text: string }> };
  contents: GeminiContent[];
} {
  let systemInstruction: { parts: Array<{ text: string }> } | undefined;
  const contents: GeminiContent[] = [];

  for (const message of messages) {
    if (message.role === "system") {
      const text = readMessageText(message);
      if (text) {
        systemInstruction = { parts: [{ text }] };
      }
      continue;
    }
    const role = message.role === "assistant" ? "model" : "user";
    contents.push({ role, parts: llmMessageToGeminiParts(message) });
  }

  return { systemInstruction, contents };
}

function extractGeminiText(data: unknown): string {
  const parts = (
    data as { candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> } }> }
  ).candidates?.[0]?.content?.parts;
  if (!parts?.length) {
    throw new GeminiApiError(`${GEMINI_VENDOR_LABEL} 返回空 content`);
  }
  const text = parts
    .filter((part) => part.text && !part.thought)
    .map((part) => part.text)
    .join("");
  if (!text) {
    throw new GeminiApiError(`${GEMINI_VENDOR_LABEL} 返回空 text`);
  }
  return text;
}

function buildGenerationConfig(
  runtime: GeminiClientRuntimeConfig,
  generationParams: LlmGenerationParams,
  responseFormat?: LlmResponseFormat
): Record<string, unknown> {
  const generationConfig: Record<string, unknown> = {
    ...toGeminiGenerationFields(generationParams),
    thinkingConfig: {
      thinkingLevel: runtime.thinkingLevel,
    },
  };
  if (responseFormat) {
    generationConfig.responseMimeType = "application/json";
    generationConfig.responseSchema = responseFormat.json_schema.schema;
  }
  return generationConfig;
}

async function postGeminiGenerateContent(
  runtime: GeminiClientRuntimeConfig,
  generationParams: LlmGenerationParams,
  messages: LlmMessage[],
  timeoutMs: number,
  responseFormat?: LlmResponseFormat
): Promise<string> {
  const { apiKey } = readGeminiEnvConfig(runtime.model);
  const url = geminiGenerateContentUrl(runtime.model);
  const { systemInstruction, contents } = convertLlmMessagesToGeminiRequest(messages);
  const body: Record<string, unknown> = {
    contents,
    generationConfig: buildGenerationConfig(runtime, generationParams, responseFormat),
  };
  if (systemInstruction) {
    body.systemInstruction = systemInstruction;
  }

  appendLlmExchangeLog({
    type: "request",
    httpAttempt: 1,
    url,
    body,
  });

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    appendLlmExchangeLog({
      type: "error",
      httpAttempt: 1,
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
    // 保留原文
  }

  if (!res.ok) {
    appendLlmExchangeLog({
      type: "error",
      httpAttempt: 1,
      url,
      status: res.status,
      message: `${GEMINI_VENDOR_LABEL} API ${res.status}`,
      body: responseBody,
    });
    throw new GeminiApiError(
      `${GEMINI_VENDOR_LABEL} API ${res.status}: ${responseText.slice(0, 400)}`,
      res.status
    );
  }

  appendLlmExchangeLog({
    type: "response",
    httpAttempt: 1,
    url,
    status: res.status,
    body: responseBody,
  });

  return extractGeminiText(responseBody);
}

export type CreateGeminiClientOptions = {
  timeoutMs: number;
  runtime: GeminiClientRuntimeConfig;
  generationParams: LlmGenerationParams;
  /** JSON 预检（RestoreAst 等） */
  validateJson?: boolean;
};

export function createGeminiClient(options: CreateGeminiClientOptions) {
  const { timeoutMs, runtime, generationParams, validateJson = true } = options;
  return {
    async complete(messages: LlmMessage[], responseFormat?: LlmResponseFormat): Promise<string> {
      const content = await postGeminiGenerateContent(
        runtime,
        generationParams,
        messages,
        timeoutMs,
        responseFormat
      );
      if (validateJson) {
        parseLlmJson(content);
      }
      return content;
    },
  };
}

export function createGeminiRawClient(options: CreateGeminiClientOptions) {
  return createGeminiClient({ ...options, validateJson: false });
}
