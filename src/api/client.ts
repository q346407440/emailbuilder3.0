import type { EmailListItem, EmailMeta, EmailPayload, EmailTemplate } from "../types/email";
import type { NestedEmailTemplate } from "../template-disk-contract";
import { nestedToEditorGraph, editorGraphToNested } from "../lib/templateTreeAdapter";
import type { TokenPresets } from "../types/tokenPreset";
import type { ProjectIconManifest } from "../types/iconAsset";
import type { LayoutManifest } from "../layout-variant-contract/types";
import { getApiBase } from "./apiBase";

const FETCH_TIMEOUT_MS = 60_000;

function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBase()}${normalized}`;
}

/** 带超时的 fetch，避免代理/连接池占满时无限挂起 */
async function fetchApi(input: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error("请求超时，请确认已运行 npm run dev:all（API 端口 8787）");
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

export type PatchLayoutVariantResult = {
  layoutVariantId: string;
  label: string;
  manifest: LayoutManifest;
};

export async function patchLayoutVariant(
  emailKey: string,
  layoutVariantId: string,
  body: { label: string; description?: string }
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
