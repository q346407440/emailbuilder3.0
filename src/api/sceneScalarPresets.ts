import type { PayloadVariableScene } from "../lib/payloadVariableScene";
import { getApiBase } from "./apiBase";

const FETCH_TIMEOUT_MS = 60_000;

export type SceneScalarPresetSummary = {
  presetId: string;
  slotId: string;
  label: string;
  description?: string;
  valueType: string;
};

function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBase()}${normalized}`;
}

async function fetchSceneScalarPresetsApi(input: string): Promise<Response> {
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

/** 列出某场景下可用的内置标准变量（目录；暂无数据时为空数组） */
export async function listSceneScalarPresets(
  scene: PayloadVariableScene
): Promise<SceneScalarPresetSummary[]> {
  const r = await fetchSceneScalarPresetsApi(
    apiUrl(`/scene-scalar-presets?scene=${encodeURIComponent(scene)}`)
  );
  if (!r.ok) {
    throw new Error(await errorMessageFromResponse(r, await r.text()));
  }
  const body = (await r.json()) as { items?: SceneScalarPresetSummary[] };
  return body.items ?? [];
}
