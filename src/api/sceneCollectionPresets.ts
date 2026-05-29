import type { PayloadVariableScene } from "../lib/payloadVariableScene";
import type { SceneCollectionPreset } from "../payload-contract/scene-collection-presets/types";
import { getApiBase } from "./apiBase";

const FETCH_TIMEOUT_MS = 60_000;

export type SceneCollectionPresetSummary = {
  presetId: string;
  slotId: string;
  label: string;
  description?: string;
  dataSourceKind: "custom" | "builtin";
  seedRowCount: number;
  builtinCatalog?: string;
};

export type SceneCollectionPresetRuntimeValues = {
  slotId: string;
  values: Record<string, unknown>;
};

function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBase()}${normalized}`;
}

async function fetchScenePresetsApi(input: string): Promise<Response> {
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

function sceneQuery(scene: PayloadVariableScene): string {
  return `scene=${encodeURIComponent(scene)}`;
}

/** 列出某场景下可用的内置列表变量（目录） */
export async function listSceneCollectionPresets(
  scene: PayloadVariableScene
): Promise<SceneCollectionPresetSummary[]> {
  const r = await fetchScenePresetsApi(
    apiUrl(`/scene-collection-presets?${sceneQuery(scene)}`)
  );
  if (!r.ok) {
    throw new Error(await errorMessageFromResponse(r, await r.text()));
  }
  const body = (await r.json()) as { items?: SceneCollectionPresetSummary[] };
  return body.items ?? [];
}

/** 获取单个内置列表变量完整定义（含 itemFields、seedValues） */
export async function getSceneCollectionPreset(
  scene: PayloadVariableScene,
  presetId: string
): Promise<SceneCollectionPreset> {
  const r = await fetchScenePresetsApi(
    apiUrl(
      `/scene-collection-presets/${encodeURIComponent(presetId)}?${sceneQuery(scene)}`
    )
  );
  if (r.status === 404) {
    throw new Error("内置列表变量不存在");
  }
  if (!r.ok) {
    throw new Error(await errorMessageFromResponse(r, await r.text()));
  }
  return r.json() as Promise<SceneCollectionPreset>;
}

/**
 * 获取该内置变量对应的当次 values 片段（键为 slotId，与线上一致）。
 * 本地 JSON 仍由服务端从 data/scene-collection-presets 读取；上线后仅需替换此 API 的实现。
 */
export async function getSceneCollectionPresetRuntimeValues(
  scene: PayloadVariableScene,
  presetId: string
): Promise<SceneCollectionPresetRuntimeValues> {
  const r = await fetchScenePresetsApi(
    apiUrl(
      `/scene-collection-presets/${encodeURIComponent(presetId)}/runtime-values?${sceneQuery(scene)}`
    )
  );
  if (r.status === 404) {
    throw new Error("内置列表变量不存在");
  }
  if (!r.ok) {
    throw new Error(await errorMessageFromResponse(r, await r.text()));
  }
  return r.json() as Promise<SceneCollectionPresetRuntimeValues>;
}
