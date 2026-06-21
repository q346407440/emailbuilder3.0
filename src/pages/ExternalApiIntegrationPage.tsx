import { useCallback, useEffect, useMemo, useState } from "react";
import { toastError, toastSuccess } from "../lib/appToast";
import { TemplateValidationDock } from "../components/TemplateValidationDock";
import { validationSaveBlockedMessage } from "../lib/validationIssueDisplay";
import type { ValidationIssue } from "../lib/validate";
import type { EmailListItem, EmailPayload, EmailTemplate } from "../types/email";
import type { LayoutManifest } from "../layout-variant-contract/types";
import type { TokenPresets } from "../types/tokenPreset";
import * as api from "../api/client";
import {
  buildIntegrationSearchParams,
  goToEmailEditor,
  goToEmailEditorWithContext,
  goToExternalApiIntegration,
} from "../lib/appNavigation";
import { collectPayloadVariableSlots } from "../lib/payloadSlots";
import { payloadSlotValueTypeLabel } from "../payload-contract/value-type-labels";
import {
  listBuiltinStructureDefinitions,
} from "../payload-contract/builtin-structure-catalog";
import { builtinStructureScopeLabel } from "../lib/builtinStructureSlot";
import {
  buildExternalValuesOnlyBody,
  buildFullPayloadPutBody,
  buildGetMergedCurl,
  buildPutPayloadCurl,
  integrationApiDemos,
  integrationEndpointsForEmail,
} from "../lib/buildIntegrationApiExamples";
import {
  integrationTokenPresetLabel,
  resolveInitialIntegrationTokenPreset,
  resolveIntegrationExpandedTheme,
  type IntegrationTokenPresetSelection,
} from "../lib/integrationStylePreset";
import { buildRepeatPreviewModel, previewModelToFlatTemplate } from "../repeat-runtime";
import { resolveThemeInTemplate } from "../lib/resolveThemeInTemplate";
import { isThemeRef } from "../types/themeRef";
import { validatePayloadAgainstTemplate } from "../lib/validate";
import { fetchTemplatesAndValidatePayload } from "../lib/validatePayloadAllLayouts";
import { TopbarLayoutVariantSelect } from "../components/ui/TopbarLayoutVariantSelect";
import { TopbarTemplateSelect } from "../components/ui/TopbarTemplateSelect";
import { ShopPrimaryButton, ShopSecondaryButton, ShopSelect, ShopTextArea } from "../components/ui/ShopFormControls";
import "../app.css";
import "../antd-admin-field-overrides.css";

function readSearchParams(): URLSearchParams {
  return new URLSearchParams(window.location.search);
}

function readEmailKeyFromUrl(items: EmailListItem[]): string | null {
  const q = readSearchParams();
  const key = (q.get("emailKey") ?? q.get("email") ?? "").trim();
  if (!key) return null;
  return items.some((it) => it.emailKey === key) ? key : null;
}

function readLayoutFromUrl(manifest: LayoutManifest | null): string | null {
  if (!manifest) return null;
  const raw = readSearchParams().get("layout")?.trim();
  if (!raw) return manifest.activeLayoutVariantId;
  return manifest.variants.some((v) => v.id === raw) ? raw : manifest.activeLayoutVariantId;
}

function containsThemeRef(value: unknown): boolean {
  if (isThemeRef(value)) return true;
  if (Array.isArray(value)) return value.some((item) => containsThemeRef(item));
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((item) => containsThemeRef(item));
  }
  return false;
}

function formatItemFieldsSummary(
  itemFields: Array<{ key: string; valueType: string }> | undefined
): string {
  if (!itemFields?.length) return "—";
  return itemFields.map((f) => `${f.key}:${f.valueType}`).join(", ");
}

function defaultPayload(): EmailPayload {
  return { schemaVersion: "1.0.0", slots: {}, values: {} };
}

const builtinStructures = listBuiltinStructureDefinitions();

function builtinStructureLengthLabel(
  structure: (typeof builtinStructures)[number]
): string {
  if (structure.valueType !== "collection") return "单值";
  if (structure.lengthPolicy?.kind === "locked") {
    return `${structure.lengthPolicy.fixedLength} 项固定`;
  }
  return "可配置";
}

function syncIntegrationUrl(
  emailKey: string,
  layoutVariantId: string | null,
  tokenPreset: IntegrationTokenPresetSelection
): void {
  const qs = buildIntegrationSearchParams(emailKey, {
    layoutVariantId,
    tokenPreset,
  });
  const next = `${window.location.pathname}?${qs}`;
  if (`${window.location.pathname}${window.location.search}` !== next) {
    window.history.replaceState(null, "", next);
  }
}

export function ExternalApiIntegrationPage() {
  const [items, setItems] = useState<EmailListItem[]>([]);
  const [emailKey, setEmailKey] = useState<string | null>(null);
  const [layoutManifest, setLayoutManifest] = useState<LayoutManifest | null>(null);
  const [layoutVariantId, setLayoutVariantId] = useState<string | null>(null);
  const [template, setTemplate] = useState<EmailTemplate | null>(null);
  const [payload, setPayload] = useState<EmailPayload>(defaultPayload());
  const [localTokenPresets, setLocalTokenPresets] = useState<TokenPresets | null>(null);
  const [globalTokenPresets, setGlobalTokenPresets] = useState<Record<string, TokenPresets>>({});
  const [tokenPresetSelection, setTokenPresetSelection] =
    useState<IntegrationTokenPresetSelection>("local");
  const [valuesJson, setValuesJson] = useState("{}");
  const [valuesJsonError, setValuesJsonError] = useState<string | null>(null);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [mergeStatus, setMergeStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const globalPresetIds = useMemo(
    () => new Set(Object.keys(globalTokenPresets)),
    [globalTokenPresets]
  );

  const loadGlobalPresets = useCallback(async () => {
    try {
      const r = await api.listGlobalTokenPresets();
      const map = Object.fromEntries(
        r.items.filter((item) => item.tokenPresets).map((item) => [item.presetId, item.tokenPresets])
      );
      setGlobalTokenPresets(map);
      return map;
    } catch {
      setGlobalTokenPresets({});
      return {};
    }
  }, []);

  const loadList = useCallback(async () => {
    const r = await api.listEmails();
    setItems(r.items);
    return r.items;
  }, []);

  const loadScene = useCallback(
    async (
      key: string,
      layoutHint: string | null,
      tokenHint: string | null,
      globals: Record<string, TokenPresets>
    ): Promise<{ layoutId: string | null; token: IntegrationTokenPresetSelection }> => {
      setLoading(true);
      setError(null);
      setValidationIssues([]);
      setMergeStatus(null);
      try {
        const manifest = await api.getLayoutManifest(key);
        setLayoutManifest(manifest);
        const layoutId =
          layoutHint && manifest?.variants.some((v) => v.id === layoutHint)
            ? layoutHint
            : manifest?.activeLayoutVariantId ?? null;
        setLayoutVariantId(layoutId);

        const [tpl, pl, tp, meta] = await Promise.all([
          api.getTemplate(key, layoutId),
          api.getPayload(key),
          api.getTokenPresets(key, layoutId),
          api.getEmailMeta(key).catch(() => null),
        ]);
        const effectivePayload = pl ?? defaultPayload();
        setTemplate(tpl);
        setPayload(effectivePayload);
        setLocalTokenPresets(tp);
        setValuesJson(JSON.stringify(effectivePayload.values ?? {}, null, 2));
        setValuesJsonError(null);

        const token = resolveInitialIntegrationTokenPreset(
          meta,
          tp,
          new Set(Object.keys(globals)),
          tokenHint
        );
        setTokenPresetSelection(token);
        return { layoutId, token };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        toastError(msg);
        setTemplate(null);
        setPayload(defaultPayload());
        setLocalTokenPresets(null);
        setValuesJson("{}");
        return { layoutId: null, token: "local" };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void (async () => {
      try {
        const [list, globals] = await Promise.all([loadList(), loadGlobalPresets()]);
        const fromUrl = readEmailKeyFromUrl(list);
        const initial = fromUrl ?? list[0]?.emailKey ?? null;
        setEmailKey(initial);
        if (initial) {
          const manifest = await api.getLayoutManifest(initial);
          const layout = readLayoutFromUrl(manifest);
          const tokenHint = readSearchParams().get("tokenPreset");
          const { layoutId, token } = await loadScene(initial, layout, tokenHint, globals);
          syncIntegrationUrl(initial, layoutId, token);
        } else {
          setLoading(false);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        toastError(msg);
        setLoading(false);
      }
    })();
  }, [loadList, loadGlobalPresets, loadScene]);

  const slots = useMemo(() => {
    if (!template) return [];
    return collectPayloadVariableSlots(template, payload);
  }, [template, payload]);

  const parsedValues = useMemo((): Record<string, unknown> | null => {
    try {
      const v = JSON.parse(valuesJson) as unknown;
      if (!v || typeof v !== "object" || Array.isArray(v)) {
        return null;
      }
      return v as Record<string, unknown>;
    } catch {
      return null;
    }
  }, [valuesJson]);

  const simulatedPayload = useMemo((): EmailPayload | null => {
    if (!parsedValues) return null;
    return { ...payload, values: parsedValues };
  }, [payload, parsedValues]);

  const endpoints = useMemo(
    () => (emailKey ? integrationEndpointsForEmail(emailKey, layoutVariantId) : []),
    [emailKey, layoutVariantId]
  );

  const apiDemos = useMemo(() => {
    if (!emailKey) return [];
    const firstGlobal = Object.keys(globalTokenPresets)[0] ?? null;
    return integrationApiDemos(emailKey, layoutVariantId, tokenPresetSelection, firstGlobal);
  }, [emailKey, layoutVariantId, tokenPresetSelection, globalTokenPresets]);

  const renderContextSummary = useMemo(() => {
    const layoutLabel =
      layoutManifest?.variants.find((v) => v.id === layoutVariantId)?.label ??
      layoutVariantId ??
      "（未选择版式）";
    return {
      layout: layoutLabel,
      token: integrationTokenPresetLabel(tokenPresetSelection, globalTokenPresets),
    };
  }, [layoutManifest, layoutVariantId, tokenPresetSelection, globalTokenPresets]);

  const navigateContext = useCallback(
    (key: string, layout: string | null, token: IntegrationTokenPresetSelection) => {
      goToExternalApiIntegration(key, { layoutVariantId: layout, tokenPreset: token });
    },
    []
  );

  const handleSelectEmail = useCallback(
    (nextKey: string) => {
      setEmailKey(nextKey);
      void loadGlobalPresets().then((globals) =>
        loadScene(nextKey, null, null, globals).then(({ layoutId, token }) => {
          syncIntegrationUrl(nextKey, layoutId, token);
          navigateContext(nextKey, layoutId, token);
        })
      );
    },
    [loadGlobalPresets, loadScene, navigateContext]
  );

  const handleSelectLayout = useCallback(
    (nextLayoutId: string) => {
      if (!emailKey) return;
      void loadScene(emailKey, nextLayoutId, readSearchParams().get("tokenPreset"), globalTokenPresets).then(
        ({ token }) => {
          setLayoutVariantId(nextLayoutId);
          syncIntegrationUrl(emailKey, nextLayoutId, token);
          navigateContext(emailKey, nextLayoutId, token);
        }
      );
    },
    [emailKey, globalTokenPresets, loadScene, navigateContext]
  );

  const handleCreateLayout = useCallback(
    async (label: string) => {
      if (!emailKey) return;
      const created = await api.createLayoutVariant(emailKey, { label });
      setLayoutManifest(created.manifest);
      await loadScene(emailKey, created.layoutVariantId, readSearchParams().get("tokenPreset"), globalTokenPresets);
      setLayoutVariantId(created.layoutVariantId);
      syncIntegrationUrl(emailKey, created.layoutVariantId, readSearchParams().get("tokenPreset") ?? "");
    },
    [emailKey, globalTokenPresets, loadScene]
  );

  const handleRenameLayout = useCallback(
    async (label: string) => {
      if (!emailKey || !layoutVariantId) return;
      const updated = await api.patchLayoutVariant(emailKey, layoutVariantId, { label });
      setLayoutManifest(updated.manifest);
    },
    [emailKey, layoutVariantId]
  );

  const handleSelectTokenPreset = useCallback(
    (raw: unknown) => {
      if (!emailKey) return;
      const next =
        raw === "local" || raw === null || raw === undefined
          ? "local"
          : String(raw);
      const selection: IntegrationTokenPresetSelection =
        next === "local" ? "local" : globalPresetIds.has(next) ? next : "local";
      setTokenPresetSelection(selection);
      syncIntegrationUrl(emailKey, layoutVariantId, selection);
      navigateContext(emailKey, layoutVariantId, selection);
    },
    [emailKey, globalPresetIds, layoutVariantId, navigateContext]
  );

  const parseValuesJson = useCallback((): Record<string, unknown> | null => {
    try {
      const v = JSON.parse(valuesJson) as unknown;
      if (!v || typeof v !== "object" || Array.isArray(v)) {
        setValuesJsonError("values 须为 JSON 对象（键为 slotId）");
        return null;
      }
      setValuesJsonError(null);
      return v as Record<string, unknown>;
    } catch (e) {
      setValuesJsonError(e instanceof Error ? e.message : "JSON 解析失败");
      return null;
    }
  }, [valuesJson]);

  const runValidate = useCallback(async () => {
    if (!emailKey || !template) return;
    const values = parseValuesJson();
    if (!values) return;
    const nextPayload: EmailPayload = { ...payload, values };
    try {
      if (layoutManifest && layoutManifest.variants.length > 0) {
        const skippedLayouts: string[] = [];
        const issues = await fetchTemplatesAndValidatePayload(
          layoutManifest,
          nextPayload,
          layoutVariantId,
          template,
          (layoutId) => api.getTemplate(emailKey, layoutId),
          (failure) => skippedLayouts.push(failure.layoutVariantId)
        );
        setValidationIssues(issues);
        if (issues.length === 0 && skippedLayouts.length === 0) {
          toastSuccess("校验通过：模拟入参符合全部版式 template");
        } else if (issues.length === 0) {
          toastSuccess(`校验通过：已跳过 ${skippedLayouts.length} 个异常版式`);
        } else {
          toastError(validationSaveBlockedMessage(issues));
        }
      } else {
        const issues = validatePayloadAgainstTemplate(template, nextPayload);
        setValidationIssues(issues);
        if (issues.length === 0) toastSuccess("校验通过");
        else toastError(validationSaveBlockedMessage(issues));
      }
    } catch (e) {
      toastError(e instanceof Error ? e.message : String(e));
    }
  }, [emailKey, layoutManifest, layoutVariantId, parseValuesJson, payload, template]);

  const runMergePreview = useCallback(() => {
    if (!template) return;
    const values = parseValuesJson();
    if (!values) return;
    const nextPayload: EmailPayload = { ...payload, values };
    try {
      const previewModel = buildRepeatPreviewModel(template, nextPayload);
      let merged = previewModelToFlatTemplate(previewModel, template);
      const designTokens = resolveIntegrationExpandedTheme(
        localTokenPresets,
        globalTokenPresets,
        tokenPresetSelection
      );
      if (containsThemeRef(merged)) {
        const resolved = resolveThemeInTemplate(merged, designTokens);
        merged = resolved.template ?? merged;
        if (resolved.issues.length) {
          setMergeStatus(
            `合并完成（含 $themeRef 烘焙），主题解析有 ${resolved.issues.length} 条提示`
          );
          toastError(`主题解析提示 ${resolved.issues.length} 条`);
          return;
        }
      }
      const statusText = `本地合并成功：已展开 repeat、合并 payload，并按「${integrationTokenPresetLabel(tokenPresetSelection, globalTokenPresets)}」烘焙主题`;
      setMergeStatus(statusText);
      toastSuccess("合并预览成功");
    } catch (e) {
      setMergeStatus(null);
      toastError(e instanceof Error ? e.message : String(e));
    }
  }, [
    globalTokenPresets,
    localTokenPresets,
    parseValuesJson,
    payload,
    template,
    tokenPresetSelection,
  ]);

  const copyText = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toastSuccess(`已复制${label}`);
    } catch {
      toastError("复制失败，请手动选择文本复制");
    }
  }, []);

  if (loading && !template) {
    return (
      <div className="app app--loading">
        <p>正在加载外部 API 接入页…</p>
      </div>
    );
  }

  if (!emailKey || items.length === 0) {
    return (
      <div className="app app--loading">
        <p>暂无邮件模板，请先在编辑器中创建场景。</p>
        <ShopSecondaryButton htmlType="button" onClick={goToEmailEditor}>
          返回邮件编辑
        </ShopSecondaryButton>
      </div>
    );
  }

  const globalOptions = Object.keys(globalTokenPresets).sort((a, b) => a.localeCompare(b, "en"));

  return (
    <div className="app app--integration">
      <header className="topbar">
        <div className="topbar__brand">外部 API 接入</div>
        <TopbarTemplateSelect
          items={items}
          value={emailKey}
          renaming={false}
          onSelect={handleSelectEmail}
          onRename={async () => {}}
        />
        <TopbarLayoutVariantSelect
          manifest={layoutManifest}
          value={layoutVariantId}
          disabled={loading}
          onSelect={handleSelectLayout}
          onCreate={handleCreateLayout}
          onRename={handleRenameLayout}
        />
        <div className="topbar__select-wrap">
          <span className="topbar__select-label">样式来源</span>
          <div className="topbar__select-slot">
            <ShopSelect
              className="topbar__select"
              disabled={loading}
              value={tokenPresetSelection}
              onChange={handleSelectTokenPreset}
            >
              <ShopSelect.Option value="local">本邮件（当前版式 tokenPresets）</ShopSelect.Option>
              {globalOptions.map((id) => (
                <ShopSelect.Option key={id} value={id}>
                  公共：{id}
                </ShopSelect.Option>
              ))}
            </ShopSelect>
          </div>
        </div>
        <ShopSecondaryButton
          className="topbar__btn"
          htmlType="button"
          onClick={() => goToEmailEditorWithContext(emailKey, layoutVariantId)}
        >
          返回邮件编辑
        </ShopSecondaryButton>
        <span className="topbar__hint" title="版式决定 template；样式来源决定 $themeRef 烘焙（本地试跑）">
          版式 + 样式 + values
        </span>
      </header>

      {error && !template ? (
        <div className="app__banner app__banner--error" role="alert">
          {error}
        </div>
      ) : null}

      <main className="integration-workspace">
        <section className="integration-panel integration-panel--context">
          <h2 className="integration-panel__title">当前渲染上下文</h2>
          <dl className="integration-context-dl">
            <div>
              <dt>邮件场景</dt>
              <dd>
                <code>{emailKey}</code>
              </dd>
            </div>
            <div>
              <dt>版式 layout</dt>
              <dd>
                <code>{layoutVariantId ?? "default"}</code> · {renderContextSummary.layout}
              </dd>
            </div>
            <div>
              <dt>样式 tokenPreset</dt>
              <dd>{renderContextSummary.token}</dd>
            </div>
            <div>
              <dt>业务变量</dt>
              <dd>
                场景级 <code>payload.json</code>（与版式无关）；下方 JSON 仅模拟 <code>values</code>
              </dd>
            </div>
          </dl>
        </section>

        <section className="integration-panel">
          <h2 className="integration-panel__title">变量结构目录（内置）</h2>
          <p className="integration-panel__lead">
            编辑器只允许从下列内置数据结构创建变量；通用结构面向所有接入方，专用结构仅供标注的后台使用。
          </p>
          <div className="integration-table-wrap">
            <table className="integration-table">
              <thead>
                <tr>
                  <th>默认 slotId</th>
                  <th>名称</th>
                  <th>类型</th>
                  <th>范围</th>
                  <th>长度</th>
                </tr>
              </thead>
              <tbody>
                {builtinStructures.map((structure) => (
                  <tr key={structure.structureId}>
                    <td>
                      <code>{structure.defaultSlotId}</code>
                    </td>
                    <td>{structure.label}</td>
                    <td>{payloadSlotValueTypeLabel(structure.valueType)}</td>
                    <td>{builtinStructureScopeLabel(structure)}</td>
                    <td>{builtinStructureLengthLabel(structure)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="integration-panel">
          <h2 className="integration-panel__title">变量目录（payload.slots）</h2>
          <p className="integration-panel__lead">
            由当前版式 template + 场景 <code>payload.slots</code> 派生；外部按 <code>slotId</code> 写入{" "}
            <code>values</code>。
          </p>
          {slots.length === 0 ? (
            <p className="integration-panel__empty">当前模板没有可外部赋值的变量槽。</p>
          ) : (
            <div className="integration-table-wrap">
              <table className="integration-table">
                <thead>
                  <tr>
                    <th>slotId</th>
                    <th>类型</th>
                    <th>说明</th>
                    <th>列表列 / 约束</th>
                  </tr>
                </thead>
                <tbody>
                  {slots.map((slot) => (
                    <tr key={slot.slotId}>
                      <td>
                        <code>{slot.slotId}</code>
                      </td>
                      <td>{payloadSlotValueTypeLabel(slot.valueType)}</td>
                      <td>{slot.label ?? slot.description ?? "—"}</td>
                      <td>
                        {slot.valueType === "collection"
                          ? `${formatItemFieldsSummary(slot.itemFields)}${
                              slot.minItems !== undefined || slot.maxItems !== undefined
                                ? ` · ${slot.minItems ?? "?"}–${slot.maxItems ?? "?"} 项`
                                : ""
                            }`
                          : `绑定 ${slot.bindings.length} 处`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="integration-panel integration-panel--values">
          <h2 className="integration-panel__title">模拟外部入参（values）</h2>
          <p className="integration-panel__lead">
            对接方通常只 PUT/POST <code>values</code>；目录 <code>slots</code> 由模板维护方定义。
          </p>
          <ShopTextArea
            className="integration-values-editor"
            rows={14}
            value={valuesJson}
            onChange={(e) => {
              setValuesJson(e.target.value);
              setValuesJsonError(null);
            }}
            spellCheck={false}
            aria-label="模拟外部 values JSON"
          />
          {valuesJsonError ? (
            <p className="integration-panel__error">{valuesJsonError}</p>
          ) : null}
          {mergeStatus ? <p className="integration-panel__status">{mergeStatus}</p> : null}
          <div className="integration-panel__actions">
            <ShopPrimaryButton htmlType="button" onClick={() => void runValidate()}>
              校验入参
            </ShopPrimaryButton>
            <ShopSecondaryButton htmlType="button" onClick={runMergePreview}>
              本地合并试跑（含主题）
            </ShopSecondaryButton>
            <ShopSecondaryButton
              htmlType="button"
              disabled={!parsedValues}
              onClick={() =>
                void copyText(buildExternalValuesOnlyBody(parsedValues ?? {}), "values 示例")
              }
            >
              复制 values 示例
            </ShopSecondaryButton>
            <ShopSecondaryButton
              htmlType="button"
              disabled={!simulatedPayload}
              onClick={() =>
                simulatedPayload &&
                void copyText(buildFullPayloadPutBody(simulatedPayload), "完整 PUT 体")
              }
            >
              复制完整 payload
            </ShopSecondaryButton>
            <ShopSecondaryButton
              htmlType="button"
              disabled={!simulatedPayload}
              onClick={() =>
                simulatedPayload &&
                void copyText(buildPutPayloadCurl(emailKey, simulatedPayload), "PUT curl")
              }
            >
              复制 PUT curl
            </ShopSecondaryButton>
            <ShopSecondaryButton
              htmlType="button"
              onClick={() => void copyText(buildGetMergedCurl(emailKey, layoutVariantId), "GET merged curl")}
            >
              复制 GET merged curl
            </ShopSecondaryButton>
          </div>
        </section>

        <section className="integration-panel integration-panel--api integration-panel--demos">
          <h2 className="integration-panel__title">第三方接入 API 示例</h2>
          <p className="integration-panel__lead">
            基址 <code>{typeof window !== "undefined" ? window.location.origin : ""}/api/v1</code>
            。按分组复制 curl 即可探测版式、公共样式与本场景 payload；下方为路径速查。
          </p>
          <div className="integration-demos">
            {apiDemos.map((demo) => (
              <article key={demo.id} className="integration-demo-card">
                <div className="integration-demo-card__head">
                  <span className="integration-demo-card__group">{demo.group}</span>
                  <span className="integration-endpoints__method">{demo.method}</span>
                  <h3 className="integration-demo-card__title">{demo.title}</h3>
                </div>
                <p className="integration-demo-card__desc">{demo.description}</p>
                <code className="integration-demo-card__path">{demo.path}</code>
                <pre className="integration-demo-card__curl">{demo.curl}</pre>
                <ShopSecondaryButton
                  htmlType="button"
                  className="integration-demo-card__copy"
                  onClick={() => void copyText(demo.curl, demo.title)}
                >
                  复制 curl
                </ShopSecondaryButton>
              </article>
            ))}
          </div>
          <h3 className="integration-panel__subtitle">路径速查</h3>
          <ul className="integration-endpoints">
            {endpoints.map((ep) => (
              <li key={`${ep.method}-${ep.path}`}>
                <span className="integration-endpoints__method">{ep.method}</span>
                <code className="integration-endpoints__path">{ep.path}</code>
                <span className="integration-endpoints__desc">{ep.description}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
      {validationIssues.length > 0 && template ? (
        <TemplateValidationDock
          issues={validationIssues}
          template={template}
          onNavigateIssue={(_target) => {
            document.querySelector(".integration-panel--values")?.scrollIntoView({ behavior: "smooth" });
          }}
        />
      ) : null}
    </div>
  );
}
