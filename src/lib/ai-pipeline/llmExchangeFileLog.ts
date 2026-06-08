import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { resolveAiPipelineLlmExchangeLogPath } from "./constants";
import { getLlmExchangeContext } from "./llmCallContext";

export type LlmExchangeLogEntry =
  | {
      type: "request";
      ts: string;
      pipelineRunId?: string;
      emailKey?: string;
      layoutVariantId?: string;
      stage?: string;
      sectionId?: string;
      attempt?: number;
      /** 豆包 response_format 回退链中的第几次 HTTP 请求（从 1 起） */
      doubaoAttempt: number;
      url: string;
      body: Record<string, unknown>;
    }
  | {
      type: "response";
      ts: string;
      pipelineRunId?: string;
      emailKey?: string;
      layoutVariantId?: string;
      stage?: string;
      sectionId?: string;
      attempt?: number;
      doubaoAttempt: number;
      url: string;
      status: number;
      body: unknown;
    }
  | {
      type: "error";
      ts: string;
      pipelineRunId?: string;
      emailKey?: string;
      layoutVariantId?: string;
      stage?: string;
      sectionId?: string;
      attempt?: number;
      doubaoAttempt: number;
      url: string;
      status?: number;
      message: string;
      body?: unknown;
    }
  | {
      type: "pipeline";
      ts: string;
      pipelineRunId?: string;
      emailKey?: string;
      layoutVariantId?: string;
      stage: string;
      message: string;
      detail?: unknown;
    };

function isExchangeLogEnabled(): boolean {
  const flag = (process.env.AI_PIPELINE_LLM_EXCHANGE_LOG ?? "1").trim().toLowerCase();
  return flag !== "0" && flag !== "false" && flag !== "off";
}

function ensureLogDir(): void {
  mkdirSync(dirname(resolveAiPipelineLlmExchangeLogPath()), { recursive: true });
}

function redactDataUrl(value: string): string {
  const match = /^data:([^;,]+)(?:;[^,]*)*;base64,(.*)$/is.exec(value);
  if (!match) return value;
  const mime = match[1];
  const payload = match[2].replace(/\s/g, "");
  const approxBytes = Math.max(0, Math.floor((payload.length * 3) / 4));
  return `<data-url:${mime};base64, ${payload.length} chars (~${approxBytes} bytes) omitted>`;
}

/** 日志落盘前脱敏：data URL 图片 base64 替换为占位符，保留其余 JSON 结构。 */
export function sanitizeLlmExchangeBodyForLog(value: unknown): unknown {
  if (typeof value === "string") {
    if (value.startsWith("data:") && /;base64,/i.test(value)) {
      return redactDataUrl(value);
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeLlmExchangeBodyForLog);
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      out[key] = sanitizeLlmExchangeBodyForLog(nested);
    }
    return out;
  }
  return value;
}

function sanitizeLogEntry(entry: LlmExchangeLogEntry): LlmExchangeLogEntry {
  if (!("body" in entry) || entry.body === undefined) return entry;
  return { ...entry, body: sanitizeLlmExchangeBodyForLog(entry.body) };
}

function appendPipelineJsonlLine(entry: LlmExchangeLogEntry): void {
  if (!isExchangeLogEnabled()) return;
  try {
    ensureLogDir();
    appendFileSync(
      resolveAiPipelineLlmExchangeLogPath(),
      `${JSON.stringify(entry)}\n`,
      "utf8"
    );
  } catch (e) {
    console.warn(
      "[ai-pipeline] 写入管线日志失败:",
      e instanceof Error ? e.message : String(e)
    );
  }
}

/** 追加一条 LLM 请求/响应交换记录（JSON Lines，供本地测试排查）。 */
export function appendLlmExchangeLog(
  partial: Omit<LlmExchangeLogEntry, "ts"> & Partial<Pick<LlmExchangeLogEntry, "ts">>
): void {
  const ctx = getLlmExchangeContext();
  const entry = sanitizeLogEntry({
    ts: partial.ts ?? new Date().toISOString(),
    pipelineRunId: partial.pipelineRunId ?? ctx.pipelineRunId,
    emailKey: partial.emailKey ?? ctx.emailKey,
    layoutVariantId: partial.layoutVariantId ?? ctx.layoutVariantId,
    stage: partial.stage ?? ctx.stage,
    sectionId: partial.sectionId ?? ctx.sectionId,
    attempt: partial.attempt ?? ctx.attempt,
    ...partial,
  } as LlmExchangeLogEntry);
  appendPipelineJsonlLine(entry);
}

/** 追加一条非 LLM 管线事件（如 B4 Pexels 全失败）。 */
export function appendPipelineLog(input: {
  stage: string;
  message: string;
  detail?: unknown;
  pipelineRunId?: string;
  emailKey?: string;
  layoutVariantId?: string;
}): void {
  const ctx = getLlmExchangeContext();
  appendPipelineJsonlLine({
    type: "pipeline",
    ts: new Date().toISOString(),
    pipelineRunId: input.pipelineRunId ?? ctx.pipelineRunId,
    emailKey: input.emailKey ?? ctx.emailKey,
    layoutVariantId: input.layoutVariantId ?? ctx.layoutVariantId,
    stage: input.stage,
    message: input.message,
    detail: input.detail,
  });
}
