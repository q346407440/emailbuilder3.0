import type { EmailListItem, EmailMeta, EmailPayload, EmailTemplate } from "../types/email";
import type { NestedEmailTemplate } from "../template-disk-contract";
import { nestedToEditorGraph, editorGraphToNested } from "../lib/templateTreeAdapter";
import type { TokenPresets } from "../types/tokenPreset";
import type { ProjectIconManifest } from "../types/iconAsset";
import type { LayoutManifest } from "../layout-variant-contract/types";
import type { BlockInsertPrototype } from "../block-insert-default-contract";
import type { BlockMaster, SectionMaster } from "../types/master";
import { getApiBase } from "./apiBase";
import { LAYOUT_VARIANT_AI_FROM_IMAGE_STREAM_IDLE_TIMEOUT_MS } from "../layout-variant-ai-contract/constants";
import type { AiPipelineProgressPayload } from "../layout-variant-ai-contract/progress";
import type { MjsGenerateMode } from "../layout-variant-ai-contract/mjsGenerateMode";

const FETCH_TIMEOUT_MS = 60_000;

function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBase()}${normalized}`;
}

/** 带超时的 fetch，避免代理/连接池占满时无限挂起；timeoutMs 为 null 时不设超时。 */
async function fetchApi(
  input: string,
  init?: RequestInit,
  options?: { timeoutMs?: number | null; timeoutMessage?: string }
): Promise<Response> {
  const timeoutMs = options?.timeoutMs;
  if (timeoutMs == null) {
    return fetch(input, init);
  }
  const effectiveTimeout = timeoutMs > 0 ? timeoutMs : FETCH_TIMEOUT_MS;
  const timeoutMessage =
    options?.timeoutMessage ?? "请求超时，请确认已运行 npm run dev:all（API 端口 8787）";
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), effectiveTimeout);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error(timeoutMessage);
    }
    throw e;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function layoutQuery(layoutVariantId: string | null | undefined): string {
  const id = (layoutVariantId ?? "").trim();
  return id ? `?layout=${encodeURIComponent(id)}` : "";
}

/** 将服务端 JSON 错误解析为人类可读的中文说明 */
async function errorMessageFromResponse(r: Response, bodyText: string): Promise<string> {
  try {
    const j = JSON.parse(bodyText) as {
      error?: { message?: string; details?: Array<{ path?: string; reason?: string }> };
    };
    const msg = j?.error?.message;
    if (msg) {
      const details = j.error?.details;
      if (Array.isArray(details) && details.length > 0) {
        const detailStr = details
          .map((d) => `${d.path ?? ""}：${d.reason ?? ""}`)
          .join("；");
        return `${msg}（${detailStr}）`;
      }
      return msg;
    }
  } catch {
    /* 非 JSON，沿用原文 */
  }
  const t = bodyText.trim();
  if (t) return t;
  return `请求失败（HTTP ${r.status}）`;
}

export async function listEmails(): Promise<{ items: EmailListItem[] }> {
  const r = await fetchApi(apiUrl("/emails"));
  if (!r.ok) throw new Error(await errorMessageFromResponse(r, await r.text()));
  return r.json() as Promise<{ items: EmailListItem[] }>;
}

export type CreateEmailResult = {
  emailKey: string;
  displayName: string;
};

export async function createEmail(body: {
  displayName: string;
  emailKey?: string;
  /** 复制源场景 emailKey：深拷贝全部未删除版式、payload、meta（发布状态重置为未发布） */
  copyFromEmailKey?: string;
}): Promise<CreateEmailResult> {
  const r = await fetchApi(apiUrl("/emails"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(await errorMessageFromResponse(r, t));
  }
  return r.json() as Promise<CreateEmailResult>;
}

export type EmailListChangedEvent = {
  reason?: string;
  at?: string;
  emailKey?: string;
};

export type TokenPresetChangedEvent = {
  reason?: string;
  at?: string;
  presetId?: string;
};

export type GlobalTokenPresetListItem = {
  presetId: string;
  name?: string;
  tokenPresets: TokenPresets;
};

function parseEmailListChangedEvent(raw: string): EmailListChangedEvent {
  try {
    const parsed = JSON.parse(raw) as EmailListChangedEvent;
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    /* 非 JSON 场景兜底 */
  }
  return {};
}

type EmailDataChangedHandler = {
  emailKey: string;
  onChanged: (event: EmailListChangedEvent) => void;
};

/**
 * 单标签页内复用一条 `/emails/events` SSE，避免多订阅各占连接导致
 * 第二个标签页或 StrictMode 下 `fetch` 排队挂死（浏览器同源连接数有限）。
 */
const emailEventsHub = (() => {
  let source: EventSource | null = null;
  let retainCount = 0;
  let visibilityBound = false;
  const listHandlers = new Set<(event: EmailListChangedEvent) => void>();
  const emailHandlers = new Set<EmailDataChangedHandler>();
  const tokenPresetHandlers = new Set<(event: TokenPresetChangedEvent) => void>();

  const closeSource = (): void => {
    source?.close();
    source = null;
  };

  const bindVisibility = (): void => {
    if (visibilityBound || typeof document === "undefined") return;
    visibilityBound = true;
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        closeSource();
        return;
      }
      if (retainCount > 0 && !source) ensureSource();
    });
  };

  const ensureSource = (): void => {
    if (source) return;
    bindVisibility();
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
    source = new EventSource(apiUrl("/emails/events"));
    source.addEventListener("list_changed", (event: Event) => {
      const messageEvent = event as MessageEvent<string>;
      const parsed = parseEmailListChangedEvent(messageEvent.data ?? "");
      for (const handler of listHandlers) handler(parsed);
    });
    source.addEventListener("email_changed", (event: Event) => {
      const messageEvent = event as MessageEvent<string>;
      const parsed = parseEmailListChangedEvent(messageEvent.data ?? "");
      for (const handler of emailHandlers) {
        if (parsed.emailKey !== handler.emailKey) continue;
        handler.onChanged(parsed);
      }
    });
    source.addEventListener("token_preset_changed", (event: Event) => {
      const messageEvent = event as MessageEvent<string>;
      try {
        const parsed = JSON.parse(messageEvent.data ?? "{}") as TokenPresetChangedEvent;
        for (const handler of tokenPresetHandlers) handler(parsed);
      } catch {
        for (const handler of tokenPresetHandlers) handler({});
      }
    });
  };

  const retain = (): (() => void) => {
    retainCount += 1;
    ensureSource();
    return () => {
      retainCount = Math.max(0, retainCount - 1);
      if (retainCount > 0) return;
      closeSource();
    };
  };

  return { retain, listHandlers, emailHandlers, tokenPresetHandlers };
})();

export function subscribeEmailListChanges(
  onChanged: (event: EmailListChangedEvent) => void
): () => void {
  const release = emailEventsHub.retain();
  emailEventsHub.listHandlers.add(onChanged);
  return () => {
    emailEventsHub.listHandlers.delete(onChanged);
    release();
  };
}

export function subscribeEmailDataChanges(
  emailKey: string,
  onChanged: (event: EmailListChangedEvent) => void
): () => void {
  const release = emailEventsHub.retain();
  const handler: EmailDataChangedHandler = { emailKey, onChanged };
  emailEventsHub.emailHandlers.add(handler);
  return () => {
    emailEventsHub.emailHandlers.delete(handler);
    release();
  };
}

export function subscribeTokenPresetChanges(onChanged: (event: TokenPresetChangedEvent) => void): () => void {
  const release = emailEventsHub.retain();
  emailEventsHub.tokenPresetHandlers.add(onChanged);
  return () => {
    emailEventsHub.tokenPresetHandlers.delete(onChanged);
    release();
  };
}

export async function getEmailDataRevision(
  emailKey: string,
  layoutVariantId?: string | null
): Promise<{ revision: string }> {
  const r = await fetchApi(
    apiUrl(`/emails/${encodeURIComponent(emailKey)}/data-revision${layoutQuery(layoutVariantId)}`)
  );
  if (!r.ok) throw new Error(await errorMessageFromResponse(r, await r.text()));
  return r.json() as Promise<{ revision: string }>;
}

export async function getLayoutManifest(emailKey: string): Promise<LayoutManifest | null> {
  const r = await fetchApi(apiUrl(`/emails/${encodeURIComponent(emailKey)}/layout-manifest`));
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(await errorMessageFromResponse(r, await r.text()));
  return r.json() as Promise<LayoutManifest>;
}

export async function putActiveLayoutVariant(
  emailKey: string,
  activeLayoutVariantId: string
): Promise<void> {
  const r = await fetchApi(apiUrl(`/emails/${encodeURIComponent(emailKey)}/layout-manifest`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ activeLayoutVariantId }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(await errorMessageFromResponse(r, t));
  }
}

export type CreateLayoutVariantResult = {
  layoutVariantId: string;
  label: string;
  activeLayoutVariantId: string;
  manifest: LayoutManifest;
  /** 豆包 mjs 管线落盘的 scripts/generate-doubao-*.mjs（可选） */
  mjsPath?: string;
};

export async function createLayoutVariant(
  emailKey: string,
  body: { label: string; layoutVariantId?: string; copyFromLayoutVariantId?: string | null }
): Promise<CreateLayoutVariantResult> {
  const r = await fetchApi(apiUrl(`/emails/${encodeURIComponent(emailKey)}/layout-variants`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(await errorMessageFromResponse(r, t));
  }
  return r.json() as Promise<CreateLayoutVariantResult>;
}

async function readAiFromImageSseResponse(
  response: Response,
  onProgress?: (payload: AiPipelineProgressPayload) => void
): Promise<CreateLayoutVariantResult> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("无法读取生成进度流");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let result: CreateLayoutVariantResult | null = null;
  let lastEventAt = Date.now();

  const idleTimer = window.setInterval(() => {
    if (Date.now() - lastEventAt > LAYOUT_VARIANT_AI_FROM_IMAGE_STREAM_IDLE_TIMEOUT_MS) {
      void reader.cancel("idle timeout");
    }
  }, 5000);

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      lastEventAt = Date.now();
      buffer += decoder.decode(value, { stream: true });

      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() ?? "";

      for (const chunk of chunks) {
        if (!chunk.trim()) continue;
        const lines = chunk.split("\n");
        let eventName = "";
        const dataLines: string[] = [];
        for (const line of lines) {
          if (line.startsWith("event:")) {
            eventName = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            dataLines.push(line.slice(5).trimStart());
          }
        }
        const data = dataLines.join("\n");
        if (!eventName || !data) continue;

        if (eventName === "progress") {
          onProgress?.(JSON.parse(data) as AiPipelineProgressPayload);
        } else if (eventName === "done") {
          result = JSON.parse(data) as CreateLayoutVariantResult;
        } else if (eventName === "error") {
          const errBody = JSON.parse(data) as { message?: string };
          throw new Error(errBody.message ?? "生成失败，请稍后重试");
        }
      }
    }
  } finally {
    window.clearInterval(idleTimer);
  }

  if (!result) {
    throw new Error("生成未完成，请重试");
  }
  return result;
}

/** 以设计图 AI 创建版式（SSE 分步进度 + 落盘）。 */
export async function createLayoutVariantFromDesignImage(
  emailKey: string,
  label: string,
  imageFile: File,
  options?: {
    mjsGenerateMode?: MjsGenerateMode;
    onProgress?: (payload: AiPipelineProgressPayload) => void;
  }
): Promise<CreateLayoutVariantResult> {
  const form = new FormData();
  form.append("label", label.trim());
  form.append("image", imageFile, imageFile.name || "design.png");
  if (options?.mjsGenerateMode) {
    form.append("mjsGenerateMode", options.mjsGenerateMode);
  }
  const r = await fetchApi(
    apiUrl(`/emails/${encodeURIComponent(emailKey)}/layout-variants/ai-from-image`),
    {
      method: "POST",
      body: form,
      headers: { Accept: "text/event-stream" },
    },
    { timeoutMs: null }
  );
  if (!r.ok) {
    const t = await r.text();
    throw new Error(await errorMessageFromResponse(r, t));
  }
  const contentType = r.headers.get("content-type") ?? "";
  if (contentType.includes("text/event-stream")) {
    return readAiFromImageSseResponse(r, options?.onProgress);
  }
  return r.json() as Promise<CreateLayoutVariantResult>;
}

export type PatchLayoutVariantResult = {
  layoutVariantId: string;
  label: string;
  manifest: LayoutManifest;
};

export async function patchLayoutVariant(
  emailKey: string,
  layoutVariantId: string,
  body: { label?: string; description?: string; publishStatus?: EmailMeta["publishStatus"] }
): Promise<PatchLayoutVariantResult> {
  const r = await fetchApi(
    apiUrl(
      `/emails/${encodeURIComponent(emailKey)}/layout-variants/${encodeURIComponent(layoutVariantId)}`
    ),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  if (!r.ok) {
    const t = await r.text();
    throw new Error(await errorMessageFromResponse(r, t));
  }
  return r.json() as Promise<PatchLayoutVariantResult>;
}

export type DeleteLayoutVariantResult = {
  layoutVariantId: string;
  activeLayoutVariantId: string;
  manifest: LayoutManifest;
};

export async function deleteLayoutVariant(
  emailKey: string,
  layoutVariantId: string
): Promise<DeleteLayoutVariantResult> {
  const r = await fetchApi(
    apiUrl(
      `/emails/${encodeURIComponent(emailKey)}/layout-variants/${encodeURIComponent(layoutVariantId)}`
    ),
    { method: "DELETE" }
  );
  if (!r.ok) {
    const t = await r.text();
    throw new Error(await errorMessageFromResponse(r, t));
  }
  return r.json() as Promise<DeleteLayoutVariantResult>;
}

export async function deleteEmail(emailKey: string): Promise<void> {
  const r = await fetchApi(apiUrl(`/emails/${encodeURIComponent(emailKey)}`), { method: "DELETE" });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(await errorMessageFromResponse(r, t));
  }
}

export async function deleteGlobalTokenPreset(presetId: string): Promise<void> {
  const r = await fetchApi(apiUrl(`/token-presets/${encodeURIComponent(presetId)}`), {
    method: "DELETE",
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(await errorMessageFromResponse(r, t));
  }
}

export async function getTemplate(
  emailKey: string,
  layoutVariantId?: string | null
): Promise<EmailTemplate> {
  const r = await fetchApi(
    apiUrl(`/emails/${encodeURIComponent(emailKey)}/template${layoutQuery(layoutVariantId)}`)
  );
  if (!r.ok) throw new Error(await errorMessageFromResponse(r, await r.text()));
  const nested = (await r.json()) as NestedEmailTemplate;
  return nestedToEditorGraph(nested);
}

export async function getTemplateNested(
  emailKey: string,
  layoutVariantId?: string | null
): Promise<NestedEmailTemplate> {
  const r = await fetchApi(
    apiUrl(`/emails/${encodeURIComponent(emailKey)}/template${layoutQuery(layoutVariantId)}`)
  );
  if (!r.ok) throw new Error(await errorMessageFromResponse(r, await r.text()));
  return r.json() as Promise<NestedEmailTemplate>;
}

export async function getPayload(emailKey: string): Promise<EmailPayload | null> {
  const r = await fetchApi(apiUrl(`/emails/${encodeURIComponent(emailKey)}/payload`));
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(await errorMessageFromResponse(r, await r.text()));
  return r.json() as Promise<EmailPayload>;
}

export async function getPayloadByPreset(
  emailKey: string,
  preset: string
): Promise<EmailPayload | null> {
  const qs = preset && preset !== "default" ? `?preset=${encodeURIComponent(preset)}` : "";
  const r = await fetchApi(apiUrl(`/emails/${encodeURIComponent(emailKey)}/payload${qs}`));
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(await errorMessageFromResponse(r, await r.text()));
  return r.json() as Promise<EmailPayload>;
}

export async function listPayloadPresets(emailKey: string): Promise<string[]> {
  const r = await fetchApi(apiUrl(`/emails/${encodeURIComponent(emailKey)}/payload-presets`));
  if (!r.ok) throw new Error(await errorMessageFromResponse(r, await r.text()));
  const body = (await r.json()) as { presets: string[] };
  return body.presets ?? ["default"];
}

export async function getTokenPresets(
  emailKey: string,
  layoutVariantId?: string | null
): Promise<TokenPresets | null> {
  const r = await fetchApi(
    apiUrl(`/emails/${encodeURIComponent(emailKey)}/token-presets${layoutQuery(layoutVariantId)}`)
  );
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(await errorMessageFromResponse(r, await r.text()));
  return r.json() as Promise<TokenPresets>;
}

export async function listGlobalTokenPresets(): Promise<{ items: GlobalTokenPresetListItem[] }> {
  const r = await fetchApi(apiUrl(`/token-presets`));
  if (!r.ok) throw new Error(await errorMessageFromResponse(r, await r.text()));
  return r.json() as Promise<{ items: GlobalTokenPresetListItem[] }>;
}

export async function getGlobalTokenPreset(presetId: string): Promise<TokenPresets> {
  const r = await fetchApi(apiUrl(`/token-presets/${encodeURIComponent(presetId)}`));
  if (!r.ok) throw new Error(await errorMessageFromResponse(r, await r.text()));
  return r.json() as Promise<TokenPresets>;
}

export async function putGlobalTokenPreset(presetId: string, body: TokenPresets): Promise<void> {
  const r = await fetchApi(apiUrl(`/token-presets/${encodeURIComponent(presetId)}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(await errorMessageFromResponse(r, t));
  }
}

export async function putTemplate(
  emailKey: string,
  body: EmailTemplate,
  layoutVariantId?: string | null
): Promise<void> {
  const nested = editorGraphToNested(body);
  const r = await fetchApi(apiUrl(`/emails/${encodeURIComponent(emailKey)}/template${layoutQuery(layoutVariantId)}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(nested),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(await errorMessageFromResponse(r, t));
  }
}

export async function putPayload(emailKey: string, body: EmailPayload): Promise<void> {
  const r = await fetchApi(apiUrl(`/emails/${encodeURIComponent(emailKey)}/payload`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(await errorMessageFromResponse(r, t));
  }
}

export async function putTokenPresets(
  emailKey: string,
  body: TokenPresets,
  layoutVariantId?: string | null
): Promise<void> {
  const r = await fetchApi(
    apiUrl(`/emails/${encodeURIComponent(emailKey)}/token-presets${layoutQuery(layoutVariantId)}`),
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  if (!r.ok) {
    const t = await r.text();
    throw new Error(await errorMessageFromResponse(r, t));
  }
}

export async function putEmailMeta(emailKey: string, body: Partial<EmailMeta>): Promise<void> {
  const r = await fetchApi(apiUrl(`/emails/${encodeURIComponent(emailKey)}/meta`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(await errorMessageFromResponse(r, t));
  }
}

export async function getEmailMeta(emailKey: string): Promise<EmailMeta | null> {
  const r = await fetchApi(apiUrl(`/emails/${encodeURIComponent(emailKey)}/meta`));
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(await errorMessageFromResponse(r, await r.text()));
  return r.json() as Promise<EmailMeta>;
}

export async function listProjectIconAssets(): Promise<ProjectIconManifest> {
  const r = await fetchApi(apiUrl(`/project-assets/icons`));
  if (!r.ok) throw new Error(await errorMessageFromResponse(r, await r.text()));
  return r.json() as Promise<ProjectIconManifest>;
}

export type ProjectAssetUploadResult = {
  assetId: string;
  url: string;
  filename: string;
};

async function uploadProjectAsset(
  endpoint: string,
  file: File
): Promise<ProjectAssetUploadResult> {
  const form = new FormData();
  form.append("file", file);
  const r = await fetchApi(apiUrl(endpoint), { method: "POST", body: form });
  if (!r.ok) throw new Error(await errorMessageFromResponse(r, await r.text()));
  return r.json() as Promise<ProjectAssetUploadResult>;
}

/** 上传 SVG 图标，返回可写入 props.src 的 URL。 */
export function uploadProjectIconAsset(file: File): Promise<ProjectAssetUploadResult> {
  return uploadProjectAsset("/project-assets/icons/upload", file);
}

/** 上传位图，返回可写入图片/背景 src 的 URL。 */
export function uploadProjectImageAsset(file: File): Promise<ProjectAssetUploadResult> {
  return uploadProjectAsset("/project-assets/images/upload", file);
}

export async function fetchBuiltinCollectionCatalog(
  catalogId: "products" | "albums"
): Promise<{ catalogId: string; items: Record<string, unknown>[] }> {
  const r = await fetchApi(apiUrl(`/collection-catalogs/${encodeURIComponent(catalogId)}`));
  if (!r.ok) throw new Error(await errorMessageFromResponse(r, await r.text()));
  return r.json() as Promise<{ catalogId: string; items: Record<string, unknown>[] }>;
}

export type SmtpTestStatus = {
  configured: boolean;
  fromEmail?: string;
  fromName?: string;
  host?: string;
  port?: number;
};

export async function getSmtpTestStatus(): Promise<SmtpTestStatus> {
  const r = await fetchApi(apiUrl(`/smtp-test/status`));
  if (!r.ok) throw new Error(await errorMessageFromResponse(r, await r.text()));
  return r.json() as Promise<SmtpTestStatus>;
}

export type SendTestEmailResult = {
  ok: true;
  to: string;
  subject: string;
  preheader?: string;
  messageId?: string;
};

export async function sendTestEmail(
  emailKey: string,
  body: {
    to: string;
    html: string;
    subject?: string;
    preheader?: string;
  }
): Promise<SendTestEmailResult> {
  const r = await fetchApi(apiUrl(`/emails/${encodeURIComponent(emailKey)}/send-test-email`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(await errorMessageFromResponse(r, t));
  }
  return r.json() as Promise<SendTestEmailResult>;
}

export type CampaignV2TemplateListItem = {
  emailKey: string;
  displayName: string;
};

export type CampaignV2LayoutListItem = {
  layoutVariantId: string;
  label: string;
};

/** 活动 V2：已发布邮件模板列表（Mock CRM 接口）。 */
export async function listCampaignV2Templates(): Promise<{ items: CampaignV2TemplateListItem[] }> {
  const r = await fetchApi(apiUrl("/crm/campaign-v2/templates"));
  if (!r.ok) throw new Error(await errorMessageFromResponse(r, await r.text()));
  return r.json() as Promise<{ items: CampaignV2TemplateListItem[] }>;
}

/** 活动 V2：指定模板下已发布版式列表（Mock CRM 接口）。 */
export async function listCampaignV2Layouts(
  emailKey: string
): Promise<{ items: CampaignV2LayoutListItem[] }> {
  const r = await fetchApi(
    apiUrl(`/crm/campaign-v2/templates/${encodeURIComponent(emailKey)}/layouts`)
  );
  if (!r.ok) throw new Error(await errorMessageFromResponse(r, await r.text()));
  return r.json() as Promise<{ items: CampaignV2LayoutListItem[] }>;
}

export type CampaignV2BindingCheckResult = {
  available: boolean;
  invalidHint: string | null;
  templateDisplayName: string;
  layoutLabel: string | null;
};

/** 活动 V2：校验已保存的模板 + 版式绑定是否仍可用（打开活动 / 发信前）。 */
export async function checkCampaignV2Binding(
  emailKey: string,
  layoutVariantId: string
): Promise<CampaignV2BindingCheckResult> {
  const params = new URLSearchParams({ layout: layoutVariantId });
  const r = await fetchApi(
    apiUrl(
      `/crm/campaign-v2/templates/${encodeURIComponent(emailKey)}/binding-check?${params.toString()}`
    )
  );
  if (!r.ok) throw new Error(await errorMessageFromResponse(r, await r.text()));
  return r.json() as Promise<CampaignV2BindingCheckResult>;
}

/** 列出全部 block 组件母版（插入默认真源）。 */
export async function listBlockMasters(): Promise<{ items: BlockMaster[] }> {
  const r = await fetchApi(apiUrl("/masters/blocks"));
  if (!r.ok) throw new Error(await errorMessageFromResponse(r, await r.text()));
  return r.json() as Promise<{ items: BlockMaster[] }>;
}

export type SaveBlockInsertDefaultResult = {
  master: BlockMaster;
  componentLabel: string;
};

/** 将提取的插入默认原型写入全局组件母版。 */
export async function saveBlockMasterInsertDefault(
  masterId: string,
  prototype: BlockInsertPrototype
): Promise<SaveBlockInsertDefaultResult> {
  const r = await fetchApi(apiUrl(`/masters/blocks/${encodeURIComponent(masterId)}/insert-default`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(prototype),
  });
  if (!r.ok) throw new Error(await errorMessageFromResponse(r, await r.text()));
  return r.json() as Promise<SaveBlockInsertDefaultResult>;
}

/** 列出已保存的 Section 模块母版。 */
export async function listSectionMasters(): Promise<{ items: SectionMaster[] }> {
  const r = await fetchApi(apiUrl("/masters/sections"));
  if (!r.ok) throw new Error(await errorMessageFromResponse(r, await r.text()));
  return r.json() as Promise<{ items: SectionMaster[] }>;
}

export async function createSectionMaster(master: SectionMaster): Promise<SectionMaster> {
  const r = await fetchApi(apiUrl("/masters/sections"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(master),
  });
  if (!r.ok) throw new Error(await errorMessageFromResponse(r, await r.text()));
  return r.json() as Promise<SectionMaster>;
}

export async function renameSectionMaster(
  masterId: string,
  name: string
): Promise<SectionMaster> {
  const r = await fetchApi(apiUrl(`/masters/sections/${encodeURIComponent(masterId)}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!r.ok) throw new Error(await errorMessageFromResponse(r, await r.text()));
  return r.json() as Promise<SectionMaster>;
}

export async function deleteSectionMaster(masterId: string): Promise<void> {
  const r = await fetchApi(apiUrl(`/masters/sections/${encodeURIComponent(masterId)}`), {
    method: "DELETE",
  });
  if (!r.ok) throw new Error(await errorMessageFromResponse(r, await r.text()));
}
