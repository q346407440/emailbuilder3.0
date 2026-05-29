import type { EmailPayload } from "../types/email";
import type { IntegrationTokenPresetSelection } from "./integrationStylePreset";

const API_V1 = "/api/v1";

export function integrationApiOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "http://127.0.0.1:5180";
}

function layoutQuery(layoutVariantId: string | null | undefined): string {
  const id = (layoutVariantId ?? "").trim();
  return id ? `?layout=${encodeURIComponent(id)}` : "";
}

export function buildExternalValuesOnlyBody(values: Record<string, unknown>): string {
  return JSON.stringify({ values }, null, 2);
}

export function buildFullPayloadPutBody(payload: EmailPayload): string {
  return JSON.stringify(payload, null, 2);
}

export function buildPutPayloadCurl(
  emailKey: string,
  payload: EmailPayload,
  origin = integrationApiOrigin()
): string {
  const url = `${origin}${API_V1}/emails/${encodeURIComponent(emailKey)}/payload`;
  const body = JSON.stringify(payload);
  return [
    `curl -X PUT '${url}' \\`,
    `  -H 'Content-Type: application/json' \\`,
    `  -d '${body.replace(/'/g, "'\\''")}'`,
  ].join("\n");
}

export function buildGetMergedCurl(
  emailKey: string,
  layoutVariantId: string | null | undefined,
  origin = integrationApiOrigin()
): string {
  const url = `${origin}${API_V1}/emails/${encodeURIComponent(emailKey)}/merged${layoutQuery(layoutVariantId)}`;
  return `curl -s '${url}'`;
}

export type IntegrationApiEndpoint = {
  method: string;
  path: string;
  description: string;
};

export type IntegrationApiDemo = {
  id: string;
  group: string;
  title: string;
  description: string;
  method: string;
  path: string;
  curl: string;
};

export function integrationEndpointsForEmail(
  emailKey: string,
  layoutVariantId: string | null | undefined
): IntegrationApiEndpoint[] {
  const enc = encodeURIComponent(emailKey);
  const layout = layoutQuery(layoutVariantId);
  return [
    {
      method: "GET",
      path: `${API_V1}/emails/${enc}/layout-manifest`,
      description: "版式清单（variants、activeLayoutVariantId）；无 manifest 时 404",
    },
    {
      method: "GET",
      path: `${API_V1}/emails/${enc}/payload`,
      description: "场景级 payload（slots 目录 + values 取值）",
    },
    {
      method: "PUT",
      path: `${API_V1}/emails/${enc}/payload`,
      description: "写入完整 payload；多版式时须通过全部 template 校验",
    },
    {
      method: "GET",
      path: `${API_V1}/emails/${enc}/token-presets${layout}`,
      description: "当前版式本邮件 tokenPresets.json（$themeRef 解析用）",
    },
    {
      method: "GET",
      path: `${API_V1}/token-presets`,
      description: "公共样式预设目录（items[].presetId）",
    },
    {
      method: "GET",
      path: `${API_V1}/token-presets/{presetId}`,
      description: "某一公共样式预设全文（data/token-presets/<id>.json）",
    },
    {
      method: "GET",
      path: `${API_V1}/emails/${enc}/merged${layout}`,
      description: "template + payload 结构合并（不含 $themeRef 烘焙；见接入页本地试跑）",
    },
    {
      method: "GET",
      path: `${API_V1}/emails/${enc}/template${layout}`,
      description: "当前版式 template.json（结构真源）",
    },
  ];
}

export function integrationApiDemos(
  emailKey: string,
  layoutVariantId: string | null | undefined,
  tokenPreset: IntegrationTokenPresetSelection,
  globalPresetIdForDemo: string | null,
  origin = integrationApiOrigin()
): IntegrationApiDemo[] {
  const enc = encodeURIComponent(emailKey);
  const layoutQs = layoutQuery(layoutVariantId);
  const demos: IntegrationApiDemo[] = [
    {
      id: "layout-manifest",
      group: "版式",
      title: "获取场景版式清单",
      description:
        "返回 activeLayoutVariantId 与 variants[]（id、label）。单版式场景通常仅 default；无 layout-manifest.json 时接口 404。",
      method: "GET",
      path: `${API_V1}/emails/${enc}/layout-manifest`,
      curl: `curl -s '${origin}${API_V1}/emails/${enc}/layout-manifest'`,
    },
    {
      id: "template",
      group: "版式",
      title: "获取指定版式结构",
      description: "读取 layouts/<layout>/template.json；layout 省略时使用 manifest 激活版式或 legacy 根目录模板。",
      method: "GET",
      path: `${API_V1}/emails/${enc}/template${layoutQs}`,
      curl: `curl -s '${origin}${API_V1}/emails/${enc}/template${layoutQs}'`,
    },
    {
      id: "global-list",
      group: "样式预设",
      title: "列出公共样式预设",
      description: "扫描 data/token-presets/*.json；items[].presetId 即下文 {presetId}。",
      method: "GET",
      path: `${API_V1}/token-presets`,
      curl: `curl -s '${origin}${API_V1}/token-presets'`,
    },
    {
      id: "email-token-presets",
      group: "样式预设",
      title: "获取本邮件当前版式样式预设",
      description:
        "layouts/<layout>/tokenPresets.json。模板中 $themeRef 默认按此文档解析；编辑器可选用公共预设覆盖预览。",
      method: "GET",
      path: `${API_V1}/emails/${enc}/token-presets${layoutQs}`,
      curl: `curl -s '${origin}${API_V1}/emails/${enc}/token-presets${layoutQs}'`,
    },
    {
      id: "payload-get",
      group: "业务变量",
      title: "读取场景级 payload",
      description: "含 slots 目录与 values；多版式共用同一份 payload.json。",
      method: "GET",
      path: `${API_V1}/emails/${enc}/payload`,
      curl: `curl -s '${origin}${API_V1}/emails/${enc}/payload'`,
    },
    {
      id: "scene-presets-list",
      group: "内置列表变量",
      title: "按场景列出内置列表变量",
      description:
        "真源 data/scene-collection-presets/<scene>/*.json；本地由 API 读盘，上线后可换为 Loyalty 等同形接口。",
      method: "GET",
      path: `${API_V1}/scene-collection-presets?scene=loyalty-internal-admin`,
      curl: `curl -s '${origin}${API_V1}/scene-collection-presets?scene=loyalty-internal-admin'`,
    },
    {
      id: "scene-presets-runtime",
      group: "内置列表变量",
      title: "获取内置变量当次 values 片段",
      description: "返回 { slotId, values }，values 的 key 为 slotId，与发信入参形态一致。",
      method: "GET",
      path: `${API_V1}/scene-collection-presets/loyalty-internal-abnormal-config/runtime-values?scene=loyalty-internal-admin`,
      curl: `curl -s '${origin}${API_V1}/scene-collection-presets/loyalty-internal-abnormal-config/runtime-values?scene=loyalty-internal-admin'`,
    },
    {
      id: "merged",
      group: "合并",
      title: "结构合并（不含主题烘焙）",
      description:
        "仅 mergeTemplatePayload，不展开 repeat、不解析 $themeRef。完整渲染需在己方合并 tokenPresets 后自行 resolve。",
      method: "GET",
      path: `${API_V1}/emails/${enc}/merged${layoutQs}`,
      curl: `curl -s '${origin}${API_V1}/emails/${enc}/merged${layoutQs}'`,
    },
  ];

  const sampleGlobalId = globalPresetIdForDemo ?? "default";
  demos.splice(3, 0, {
    id: "global-one",
    group: "样式预设",
    title: "获取某一公共样式预设",
    description: `示例 presetId=${sampleGlobalId}；与接入页顶栏「样式来源」选公共预设时一致。`,
    method: "GET",
    path: `${API_V1}/token-presets/${encodeURIComponent(sampleGlobalId)}`,
    curl: `curl -s '${origin}${API_V1}/token-presets/${encodeURIComponent(sampleGlobalId)}'`,
  });

  if (tokenPreset !== "local") {
    demos.push({
      id: "context-hint",
      group: "说明",
      title: "当前接入页渲染上下文",
      description: `接入页本地「合并试跑」使用公共预设 tokenPreset=${tokenPreset} 烘焙 $themeRef；服务端 GET merged 仍不含主题。`,
      method: "—",
      path: `tokenPreset=${tokenPreset}${layoutVariantId ? `&layout=${layoutVariantId}` : ""}`,
      curl: `# 第三方自行合并时：GET token-presets/${tokenPreset} + GET emails/.../template + payload.values`,
    });
  }

  return demos;
}
