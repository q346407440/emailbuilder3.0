import type { BuiltinStructureSummary } from "../payload-contract/builtin-structure-catalog";
import { getApiBase } from "./apiBase";

const FETCH_TIMEOUT_MS = 60_000;

function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBase()}${normalized}`;
}

async function fetchBuiltinStructureApi(input: string): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(input, { signal: controller.signal });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error("请求超时，请确认已运行 npm run dev:all（API 端口 8787）");
    }
    throw e;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function errorMessageFromResponse(r: Response, bodyText: string): Promise<string> {
  try {
    const j = JSON.parse(bodyText) as { error?: { message?: string } };
    if (j.error?.message) return j.error.message;
  } catch {
    // ignore
  }
  return bodyText || `HTTP ${r.status}`;
}

export async function listBuiltinStructureCatalog(): Promise<BuiltinStructureSummary[]> {
  const r = await fetchBuiltinStructureApi(apiUrl("/builtin-structure-catalog"));
  if (!r.ok) {
    throw new Error(await errorMessageFromResponse(r, await r.text()));
  }
  const body = (await r.json()) as { items?: BuiltinStructureSummary[] };
  return body.items ?? [];
}
