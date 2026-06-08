import { useEffect, useMemo, useRef, useState } from "react";
import * as api from "../api/client";
import { CrmOpsShell } from "../components/crmOps/CrmOpsShell";
import { readCampaignV2BindingFromUrl } from "../lib/campaignCreateBindingUrl";
import { goToEmailCampaign, goToEmailEditorFromCampaignCreate } from "../lib/appNavigation";

type TemplateOption = {
  key: string;
  label: string;
};

type LayoutOption = {
  id: string;
  label: string;
  layoutVariantId: string | null;
};

type TemplateVersionTab = "v1" | "v2";

export function EmailCampaignCreatePage() {
  const [templateVersion, setTemplateVersion] = useState<TemplateVersionTab>("v2");
  const [templateOptions, setTemplateOptions] = useState<TemplateOption[]>([]);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateLoadError, setTemplateLoadError] = useState<string | null>(null);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string | null>(null);
  const [templateDropdownOpen, setTemplateDropdownOpen] = useState(false);

  const [layoutOptions, setLayoutOptions] = useState<LayoutOption[]>([]);
  const [layoutLoading, setLayoutLoading] = useState(false);
  const [layoutLoadError, setLayoutLoadError] = useState<string | null>(null);
  const [selectedLayoutId, setSelectedLayoutId] = useState<string | null>(null);
  const [layoutDropdownOpen, setLayoutDropdownOpen] = useState(false);

  const [bindingCheckLoading, setBindingCheckLoading] = useState(false);
  const [bindingInvalidHint, setBindingInvalidHint] = useState<string | null>(null);

  const dropdownAreaRef = useRef<HTMLDivElement | null>(null);
  const preserveLayoutSelectionRef = useRef<string | null>(null);
  const initialBindingAppliedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const loadTemplates = async () => {
      setTemplateLoading(true);
      setTemplateLoadError(null);
      try {
        const response = await api.listCampaignV2Templates();
        if (cancelled) return;
        setTemplateOptions(
          response.items.map((item) => ({
            key: item.emailKey,
            label: item.displayName || item.emailKey,
          }))
        );
      } catch (error) {
        if (cancelled) return;
        setTemplateLoadError(error instanceof Error ? error.message : String(error));
      } finally {
        if (!cancelled) setTemplateLoading(false);
      }
    };
    void loadTemplates();
    return () => {
      cancelled = true;
    };
  }, []);

  /** 活动打开时恢复 URL 上的已保存绑定（Mock：`?emailKey=&layout=`）。 */
  useEffect(() => {
    if (initialBindingAppliedRef.current) return;
    const { emailKey, layoutVariantId } = readCampaignV2BindingFromUrl();
    if (!emailKey || !layoutVariantId) return;
    initialBindingAppliedRef.current = true;
    preserveLayoutSelectionRef.current = layoutVariantId;
    setTemplateVersion("v2");
    setSelectedTemplateKey(emailKey);
    setSelectedLayoutId(layoutVariantId);
  }, []);

  useEffect(() => {
    setTemplateDropdownOpen(false);
    setLayoutDropdownOpen(false);
    if (templateVersion === "v1") {
      setSelectedTemplateKey(null);
      setLayoutOptions([]);
      setSelectedLayoutId(null);
      setLayoutLoadError(null);
    }
  }, [templateVersion]);

  useEffect(() => {
    const handleWindowPointerDown = (event: PointerEvent) => {
      if (!dropdownAreaRef.current) return;
      if (dropdownAreaRef.current.contains(event.target as Node)) return;
      setTemplateDropdownOpen(false);
      setLayoutDropdownOpen(false);
    };
    window.addEventListener("pointerdown", handleWindowPointerDown);
    return () => window.removeEventListener("pointerdown", handleWindowPointerDown);
  }, []);

  useEffect(() => {
    if (templateVersion !== "v2" || !selectedTemplateKey) return;
    let cancelled = false;

    const loadLayouts = async () => {
      setLayoutLoading(true);
      setLayoutLoadError(null);
      setLayoutDropdownOpen(false);
      try {
        const response = await api.listCampaignV2Layouts(selectedTemplateKey);
        if (cancelled) return;

        const options: LayoutOption[] = response.items.map((item) => ({
          id: item.layoutVariantId,
          label: item.label?.trim() || item.layoutVariantId,
          layoutVariantId: item.layoutVariantId,
        }));

        setLayoutOptions(options);
        setSelectedLayoutId((previousId) => {
          const preserve = preserveLayoutSelectionRef.current;
          if (preserve) {
            preserveLayoutSelectionRef.current = null;
            return preserve;
          }
          return options.some((item) => item.id === previousId)
            ? previousId
            : (options[0]?.id ?? null);
        });
      } catch (error) {
        if (cancelled) return;
        setLayoutOptions([]);
        setSelectedLayoutId(null);
        setLayoutLoadError(error instanceof Error ? error.message : String(error));
      } finally {
        if (!cancelled) setLayoutLoading(false);
      }
    };

    void loadLayouts();
    return () => {
      cancelled = true;
    };
  }, [templateVersion, selectedTemplateKey]);

  /** 已选模板 + 版式时校验绑定是否仍可用（打开活动 / 切换选型后）。 */
  useEffect(() => {
    if (templateVersion !== "v2" || !selectedTemplateKey || !selectedLayoutId) {
      setBindingInvalidHint(null);
      return;
    }

    let cancelled = false;
    const run = async () => {
      setBindingCheckLoading(true);
      try {
        const result = await api.checkCampaignV2Binding(selectedTemplateKey, selectedLayoutId);
        if (cancelled) return;

        setBindingInvalidHint(result.available ? null : result.invalidHint);

        if (result.templateDisplayName) {
          setTemplateOptions((prev) => {
            if (prev.some((item) => item.key === selectedTemplateKey)) return prev;
            return [
              ...prev,
              { key: selectedTemplateKey, label: result.templateDisplayName },
            ];
          });
        }

        const layoutId = selectedLayoutId;
        const layoutLabel = result.layoutLabel?.trim() || layoutId;
        setLayoutOptions((prev) => {
          if (prev.some((item) => item.id === layoutId)) return prev;
          return [...prev, { id: layoutId, label: layoutLabel, layoutVariantId: layoutId }];
        });
      } catch (error) {
        if (cancelled) return;
        setBindingInvalidHint(
          error instanceof Error ? error.message : "模板可用性校验失败"
        );
      } finally {
        if (!cancelled) setBindingCheckLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [templateVersion, selectedTemplateKey, selectedLayoutId]);

  const activeTemplateOptions = useMemo(
    () => (templateVersion === "v2" ? templateOptions : []),
    [templateOptions, templateVersion]
  );

  const activeLayoutOptions = useMemo(
    () => (templateVersion === "v2" && selectedTemplateKey ? layoutOptions : []),
    [layoutOptions, selectedTemplateKey, templateVersion]
  );

  const selectedTemplateLabel = useMemo(() => {
    if (!selectedTemplateKey) return "";
    return activeTemplateOptions.find((option) => option.key === selectedTemplateKey)?.label ?? "";
  }, [activeTemplateOptions, selectedTemplateKey]);

  const selectedLayoutLabel = useMemo(() => {
    if (!selectedLayoutId) return "";
    return activeLayoutOptions.find((option) => option.id === selectedLayoutId)?.label ?? "";
  }, [activeLayoutOptions, selectedLayoutId]);

  const dropdownDisplayText =
    selectedTemplateLabel ||
    (templateVersion === "v2" ? "请选择邮件模板" : "试用中未完成配置");
  const layoutDisplayText =
    selectedLayoutLabel ||
    (templateVersion === "v1"
      ? "无可选版式"
      : !selectedTemplateKey
        ? "请先选择模板"
        : layoutLoading
          ? "版式加载中…"
          : "请选择版式");
  const canGoSetEmail =
    templateVersion === "v2" &&
    Boolean(selectedTemplateKey) &&
    Boolean(selectedLayoutId) &&
    !bindingCheckLoading &&
    !bindingInvalidHint;

  return (
    <CrmOpsShell activeNav="emailCampaign">
      <section className="crm-create">
        <header className="crm-create__head">
          <button
            type="button"
            className="crm-create__back"
            aria-label="返回商家邮件列表"
            onClick={goToEmailCampaign}
          >
            <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden>
              <path d="M10 3 5 8l5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
          <h4 className="crm-create__title">创建邮件</h4>
        </header>

        <div className="crm-create__content">
          <section className="crm-create__panel crm-create__panel--main">
            <div className="crm-create__field">
              <div className="crm-create__label">邮件名称</div>
              <div className="crm-create__input-wrap">
                <input className="crm-create__input" placeholder="请输入邮件名称" />
                <span className="crm-create__counter">0 / 20</span>
              </div>
            </div>

            <div className="crm-create__field">
              <div className="crm-create__label-row">
                <span className="crm-create__label">触发条件</span>
                <span className="crm-create__meta">预计店铺数：0</span>
              </div>
              <div className="crm-create__condition-row">
                <button type="button" className="crm-create__picker">店铺ID</button>
                <button type="button" className="crm-create__picker crm-create__picker--small">包含</button>
                <input className="crm-create__condition-input" placeholder="多个 ID 可用逗号或空格分隔" />
              </div>
              <div className="crm-create__condition-actions">
                <button type="button" className="crm-create__outline-btn">添加条件</button>
                <button type="button" className="crm-create__primary-btn">确定</button>
              </div>
            </div>

            <div className="crm-create__field">
              <div className="crm-create__label">再次触发规则</div>
              <label className="crm-create__radio-card">
                <input type="radio" name="retriggerRule" />
                <span>
                  <strong>仅触发一次</strong>
                  <small>同一店铺只会进入一次，即使再次满足触发条件也不重复进入。</small>
                </span>
              </label>
              <label className="crm-create__radio-card">
                <input type="radio" name="retriggerRule" defaultChecked />
                <span>
                  <strong>允许重复进入</strong>
                  <small>只要店铺再次从不满足触发条件变成满足触发条件，就重新进入。</small>
                </span>
              </label>
              <label className="crm-create__radio-card">
                <input type="radio" name="retriggerRule" />
                <span>
                  <strong>允许在一段时间后重新进入</strong>
                  <small>达到指定冷却时间后，再次从不满足触发条件变成满足触发条件时允许重新进入。</small>
                </span>
              </label>
            </div>
          </section>

          <aside className="crm-create__panel crm-create__panel--push">
            <h5 className="crm-create__push-title">邮件推送</h5>
            <div className="crm-create__push-field">
              <div className="crm-create__push-label-row">
                <span className="crm-create__push-label">邮件模版</span>
                <div className="crm-create__version-tabs" role="tablist" aria-label="邮件模板版本">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={templateVersion === "v1"}
                    className={`crm-create__version-tab ${
                      templateVersion === "v1" ? "crm-create__version-tab--active" : ""
                    }`}
                    onClick={() => setTemplateVersion("v1")}
                  >
                    V1
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={templateVersion === "v2"}
                    className={`crm-create__version-tab ${
                      templateVersion === "v2" ? "crm-create__version-tab--active" : ""
                    }`}
                    onClick={() => setTemplateVersion("v2")}
                  >
                    V2
                  </button>
                </div>
              </div>

              <div className="crm-create__dropdown-row" ref={dropdownAreaRef}>
                <div className="crm-create__dropdown">
                  <button
                    type="button"
                    className="crm-create__dropdown-trigger"
                    aria-haspopup="listbox"
                    aria-expanded={templateDropdownOpen}
                    onClick={() => {
                      setLayoutDropdownOpen(false);
                      setTemplateDropdownOpen((open) => !open);
                    }}
                  >
                    <span className="crm-create__dropdown-text">{dropdownDisplayText}</span>
                    <span className="crm-create__dropdown-chevron" aria-hidden>
                      <svg viewBox="0 0 12 12" width="12" height="12" fill="none">
                        <path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.2" />
                      </svg>
                    </span>
                  </button>
                  {templateDropdownOpen ? (
                    <div className="crm-create__dropdown-menu" role="listbox" aria-label="邮件模板列表">
                      {activeTemplateOptions.length === 0 ? (
                        <div className="crm-create__dropdown-empty">
                          {templateVersion === "v1"
                            ? "V1 当前无模板数据"
                            : templateLoading
                              ? "模板加载中…"
                              : "暂无已发布模板"}
                        </div>
                      ) : (
                        activeTemplateOptions.map((option) => (
                          <button
                            key={option.key}
                            type="button"
                            className={`crm-create__dropdown-option ${
                              selectedTemplateKey === option.key
                                ? "crm-create__dropdown-option--active"
                                : ""
                            }`}
                            onClick={() => {
                              setSelectedTemplateKey(option.key);
                              setSelectedLayoutId(null);
                              setTemplateDropdownOpen(false);
                            }}
                          >
                            {option.label}
                          </button>
                        ))
                      )}
                    </div>
                  ) : null}
                </div>

                {templateVersion === "v2" ? (
                  <div className="crm-create__dropdown">
                    <button
                      type="button"
                      className="crm-create__dropdown-trigger"
                      aria-haspopup="listbox"
                      aria-expanded={layoutDropdownOpen}
                      disabled={!selectedTemplateKey}
                      onClick={() => {
                        setTemplateDropdownOpen(false);
                        if (!selectedTemplateKey) return;
                        setLayoutDropdownOpen((open) => !open);
                      }}
                    >
                      <span className="crm-create__dropdown-text">{layoutDisplayText}</span>
                      <span className="crm-create__dropdown-chevron" aria-hidden>
                        <svg viewBox="0 0 12 12" width="12" height="12" fill="none">
                          <path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.2" />
                        </svg>
                      </span>
                    </button>
                    {layoutDropdownOpen ? (
                      <div className="crm-create__dropdown-menu" role="listbox" aria-label="版式列表">
                        {activeLayoutOptions.length === 0 ? (
                          <div className="crm-create__dropdown-empty">
                            {layoutLoading ? "版式加载中…" : "暂无已发布版式"}
                          </div>
                        ) : (
                          activeLayoutOptions.map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              className={`crm-create__dropdown-option ${
                                selectedLayoutId === option.id ? "crm-create__dropdown-option--active" : ""
                              }`}
                              onClick={() => {
                                setSelectedLayoutId(option.id);
                                setLayoutDropdownOpen(false);
                              }}
                            >
                              {option.label}
                            </button>
                          ))
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {bindingInvalidHint ? (
                <p className="crm-create__binding-error" role="alert">
                  {bindingInvalidHint}
                </p>
              ) : null}
              {templateLoadError ? <p className="crm-create__tip">模板列表加载失败：{templateLoadError}</p> : null}
              {layoutLoadError ? <p className="crm-create__tip">版式列表加载失败：{layoutLoadError}</p> : null}
            </div>

            <div className="crm-create__push-field">
              <div className="crm-create__push-label">最多发送次数</div>
              <div className="crm-create__readonly-input">1 次</div>
            </div>
            <div className="crm-create__push-field">
              <div className="crm-create__push-label">发送间隔天数</div>
              <div className="crm-create__readonly-input">1 天</div>
            </div>
            <div className="crm-create__push-field">
              <div className="crm-create__push-label">触发后发送</div>
              <div className="crm-create__readonly-input">第 1 天发送</div>
              <button
                type="button"
                className="crm-create__set-email-link"
                disabled={!canGoSetEmail}
                onClick={() => {
                  if (!selectedTemplateKey) return;
                  const layoutVariantId =
                    layoutOptions.find((option) => option.id === selectedLayoutId)?.layoutVariantId ?? null;
                  goToEmailEditorFromCampaignCreate(selectedTemplateKey, layoutVariantId);
                }}
              >
                设置邮件
              </button>
            </div>
          </aside>
        </div>

        <footer className="crm-create__footer">
          <button type="button" className="crm-create__ghost-btn" onClick={goToEmailCampaign}>
            取消
          </button>
          <button
            type="button"
            className="crm-create__primary-btn"
            disabled={
              templateVersion === "v2" &&
              Boolean(selectedTemplateKey && selectedLayoutId) &&
              Boolean(bindingInvalidHint)
            }
          >
            确认
          </button>
        </footer>
      </section>
    </CrmOpsShell>
  );
}
