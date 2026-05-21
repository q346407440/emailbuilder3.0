import type { EmailListItem, EmailMeta, EmailPayload, EmailTemplate } from "../types/email";
import type { TokenPresets } from "../types/tokenPreset";
import type { ProjectIconManifest } from "../types/iconAsset";
import type { LayoutManifest } from "../layout-variant-contract/types";

const base = "/api/v1";

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
  const r = await fetch(`${base}/emails`);
  if (!r.ok) throw new Error(await errorMessageFromResponse(r, await r.text()));
  return r.json() as Promise<{ items: EmailListItem[] }>;
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

export type MasterListItem = {
  masterId: string;
  name?: string;
  version?: string;
  master: Record<string, unknown>;
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

export function subscribeEmailListChanges(
  onChanged: (event: EmailListChangedEvent) => void
): () => void {
  const source = new EventSource(`${base}/emails/events`);
  const handleListChanged = (event: Event) => {
    const messageEvent = event as MessageEvent<string>;
    onChanged(parseEmailListChangedEvent(messageEvent.data ?? ""));
  };
  source.addEventListener("list_changed", handleListChanged);
  return () => {
    source.removeEventListener("list_changed", handleListChanged);
    source.close();
  };
}

export function subscribeEmailDataChanges(
  emailKey: string,
  onChanged: (event: EmailListChangedEvent) => void
): () => void {
  const source = new EventSource(`${base}/emails/events`);
  const handleEmailChanged = (event: Event) => {
    const messageEvent = event as MessageEvent<string>;
    const parsed = parseEmailListChangedEvent(messageEvent.data ?? "");
    if (parsed.emailKey !== emailKey) return;
    onChanged(parsed);
  };
  source.addEventListener("email_changed", handleEmailChanged);
  return () => {
    source.removeEventListener("email_changed", handleEmailChanged);
    source.close();
  };
}

export function subscribeTokenPresetChanges(onChanged: (event: TokenPresetChangedEvent) => void): () => void {
  const source = new EventSource(`${base}/emails/events`);
  const handleTokenPresetChanged = (event: Event) => {
    const messageEvent = event as MessageEvent<string>;
    try {
      const parsed = JSON.parse(messageEvent.data ?? "{}") as TokenPresetChangedEvent;
      onChanged(parsed);
    } catch {
      onChanged({});
    }
  };
  source.addEventListener("token_preset_changed", handleTokenPresetChanged);
  return () => {
    source.removeEventListener("token_preset_changed", handleTokenPresetChanged);
    source.close();
  };
}

export async function getEmailDataRevision(
  emailKey: string,
  layoutVariantId?: string | null
): Promise<{ revision: string }> {
  const r = await fetch(
    `${base}/emails/${encodeURIComponent(emailKey)}/data-revision${layoutQuery(layoutVariantId)}`
  );
  if (!r.ok) throw new Error(await errorMessageFromResponse(r, await r.text()));
  return r.json() as Promise<{ revision: string }>;
}

export async function getLayoutManifest(emailKey: string): Promise<LayoutManifest | null> {
  const r = await fetch(`${base}/emails/${encodeURIComponent(emailKey)}/layout-manifest`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(await errorMessageFromResponse(r, await r.text()));
  return r.json() as Promise<LayoutManifest>;
}

export async function putActiveLayoutVariant(
  emailKey: string,
  activeLayoutVariantId: string
): Promise<void> {
  const r = await fetch(`${base}/emails/${encodeURIComponent(emailKey)}/layout-manifest`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ activeLayoutVariantId }),
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
  const r = await fetch(
    `${base}/emails/${encodeURIComponent(emailKey)}/template${layoutQuery(layoutVariantId)}`
  );
  if (!r.ok) throw new Error(await errorMessageFromResponse(r, await r.text()));
  return r.json() as Promise<EmailTemplate>;
}

export async function getPayload(emailKey: string): Promise<EmailPayload | null> {
  const r = await fetch(`${base}/emails/${encodeURIComponent(emailKey)}/payload`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(await errorMessageFromResponse(r, await r.text()));
  return r.json() as Promise<EmailPayload>;
}

export async function getPayloadByPreset(
  emailKey: string,
  preset: string
): Promise<EmailPayload | null> {
  const qs = preset && preset !== "default" ? `?preset=${encodeURIComponent(preset)}` : "";
  const r = await fetch(`${base}/emails/${encodeURIComponent(emailKey)}/payload${qs}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(await errorMessageFromResponse(r, await r.text()));
  return r.json() as Promise<EmailPayload>;
}

export async function listPayloadPresets(emailKey: string): Promise<string[]> {
  const r = await fetch(`${base}/emails/${encodeURIComponent(emailKey)}/payload-presets`);
  if (!r.ok) throw new Error(await errorMessageFromResponse(r, await r.text()));
  const body = (await r.json()) as { presets: string[] };
  return body.presets ?? ["default"];
}

export async function getTokenPresets(
  emailKey: string,
  layoutVariantId?: string | null
): Promise<TokenPresets | null> {
  const r = await fetch(
    `${base}/emails/${encodeURIComponent(emailKey)}/token-presets${layoutQuery(layoutVariantId)}`
  );
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(await errorMessageFromResponse(r, await r.text()));
  return r.json() as Promise<TokenPresets>;
}

export async function listGlobalTokenPresets(): Promise<{ items: GlobalTokenPresetListItem[] }> {
  const r = await fetch(`${base}/token-presets`);
  if (!r.ok) throw new Error(await errorMessageFromResponse(r, await r.text()));
  return r.json() as Promise<{ items: GlobalTokenPresetListItem[] }>;
}

export async function getGlobalTokenPreset(presetId: string): Promise<TokenPresets> {
  const r = await fetch(`${base}/token-presets/${encodeURIComponent(presetId)}`);
  if (!r.ok) throw new Error(await errorMessageFromResponse(r, await r.text()));
  return r.json() as Promise<TokenPresets>;
}

export async function putGlobalTokenPreset(presetId: string, body: TokenPresets): Promise<void> {
  const r = await fetch(`${base}/token-presets/${encodeURIComponent(presetId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(await errorMessageFromResponse(r, t));
  }
}

export async function listMasters(kind: "sections" | "blocks"): Promise<{ items: MasterListItem[] }> {
  const r = await fetch(`${base}/masters/${kind}`);
  if (!r.ok) throw new Error(await errorMessageFromResponse(r, await r.text()));
  return r.json() as Promise<{ items: MasterListItem[] }>;
}

export async function getMaster(kind: "sections" | "blocks", masterId: string): Promise<Record<string, unknown>> {
  const r = await fetch(`${base}/masters/${kind}/${encodeURIComponent(masterId)}`);
  if (!r.ok) throw new Error(await errorMessageFromResponse(r, await r.text()));
  return r.json() as Promise<Record<string, unknown>>;
}

export async function putMaster(
  kind: "sections" | "blocks",
  masterId: string,
  body: Record<string, unknown>
): Promise<void> {
  const r = await fetch(`${base}/masters/${kind}/${encodeURIComponent(masterId)}`, {
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
  const r = await fetch(
    `${base}/emails/${encodeURIComponent(emailKey)}/template${layoutQuery(layoutVariantId)}`,
    {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(await errorMessageFromResponse(r, t));
  }
}

export async function putPayload(emailKey: string, body: EmailPayload): Promise<void> {
  const r = await fetch(`${base}/emails/${encodeURIComponent(emailKey)}/payload`, {
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
  const r = await fetch(
    `${base}/emails/${encodeURIComponent(emailKey)}/token-presets${layoutQuery(layoutVariantId)}`,
    {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(await errorMessageFromResponse(r, t));
  }
}

export async function putEmailMeta(emailKey: string, body: Partial<EmailMeta>): Promise<void> {
  const r = await fetch(`${base}/emails/${encodeURIComponent(emailKey)}/meta`, {
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
  const r = await fetch(`${base}/emails/${encodeURIComponent(emailKey)}/meta`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(await errorMessageFromResponse(r, await r.text()));
  return r.json() as Promise<EmailMeta>;
}

export async function listProjectIconAssets(): Promise<ProjectIconManifest> {
  const r = await fetch(`${base}/project-assets/icons`);
  if (!r.ok) throw new Error(await errorMessageFromResponse(r, await r.text()));
  return r.json() as Promise<ProjectIconManifest>;
}

export async function fetchBuiltinCollectionCatalog(
  catalogId: "products" | "albums"
): Promise<{ catalogId: string; items: Record<string, unknown>[] }> {
  const r = await fetch(`${base}/collection-catalogs/${encodeURIComponent(catalogId)}`);
  if (!r.ok) throw new Error(await errorMessageFromResponse(r, await r.text()));
  return r.json() as Promise<{ catalogId: string; items: Record<string, unknown>[] }>;
}
