import { useCallback, useEffect, useMemo, useState } from "react";
import { toastError, toastInfo, toastSuccess, toastWarning } from "../lib/appToast";
import * as api from "../api/client";
import { CrmOpsShell } from "../components/crmOps/CrmOpsShell";
import {
  EmailTemplateCreateModal,
  type EmailTemplateCreateModalMode,
} from "../components/ui/EmailTemplateCreateModal";
import {
  LayoutVariantCreateModal,
  type LayoutVariantCreateSubmit,
} from "../components/ui/LayoutVariantCreateModal";
import { useConfirmDialog } from "../components/ui/ConfirmDialogProvider";
import { MetaEditor } from "../components/MetaEditor";
import { ShopInput, ShopPrimaryButton, ShopSecondaryButton } from "../components/ui/ShopFormControls";
import { ShopSectionModal } from "../components/ui/ShopSectionModal";
import {
  sortEmailCatalogDesignsByCreatedDesc,
  sortEmailItemsByCreatedDesc,
} from "../lib/emailCatalogSort";
import { goToEmailEditorWithContext } from "../lib/appNavigation";
import { toUserFacingErrorMessage } from "../lib/userFacingError";
import { isPublishedPublishStatus, type PublishStatus } from "../publish-status-contract";
import {
  reduceAiPipelineProgress,
  buildPendingRestoreAstSteps,
  type AiStepUiState,
} from "../layout-variant-ai-contract/progress";

function formatDateTime(value: string | undefined): string {
  if (!value) return "暂无记录";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "暂无记录";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function publishLabel(publishStatus: api.EmailTemplateCatalogItem["publishStatus"]): string {
  return isPublishedPublishStatus(publishStatus) ? "已发布" : "未发布";
}

function countPublishedDesigns(designs: api.EmailTemplateCatalogDesign[]): number {
  return designs.filter((design) => isPublishedPublishStatus(design.publishStatus)).length;
}

export function EmailTemplateListPage() {
  const { confirm } = useConfirmDialog();
  const [items, setItems] = useState<api.EmailTemplateCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [templateQuery, setTemplateQuery] = useState("");
  const [designQuery, setDesignQuery] = useState("");
  const [templatePublishedOnly, setTemplatePublishedOnly] = useState(false);
  const [designPublishedOnly, setDesignPublishedOnly] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<EmailTemplateCreateModalMode>("create");
  const [copySourceKey, setCopySourceKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [selectedEmailKey, setSelectedEmailKey] = useState<string | null>(null);
  const [designCreateOpen, setDesignCreateOpen] = useState(false);
  const [designCreating, setDesignCreating] = useState(false);
  const [aiPipelineSteps, setAiPipelineSteps] = useState<AiStepUiState[] | null>(null);
  const [mailInfoOpen, setMailInfoOpen] = useState(false);
  const [renamingDesign, setRenamingDesign] = useState<api.EmailTemplateCatalogDesign | null>(null);
  const [renameDesignName, setRenameDesignName] = useState("");
  const [renameDesignError, setRenameDesignError] = useState<string | null>(null);
  const [designActionBusy, setDesignActionBusy] = useState(false);
  const [templateActionBusy, setTemplateActionBusy] = useState(false);
  const [metaDirty, setMetaDirty] = useState(false);
  const [metaSaving, setMetaSaving] = useState(false);
  const [metaSaveNonce, setMetaSaveNonce] = useState(0);

  const reportMetaEditorError = useCallback((msg: string) => {
    toastError(msg);
  }, []);

  const loadCatalog = useCallback(async (options?: { showLoading?: boolean }): Promise<api.EmailTemplateCatalogItem[]> => {
    const showLoading = options?.showLoading ?? true;
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const response = await api.listEmailTemplateCatalog();
      setItems(response.items);
      return response.items;
    } catch (err) {
      setError(toUserFacingErrorMessage(err, "加载模板列表失败，请刷新重试"));
      return [];
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
    return api.subscribeEmailListChanges(() => {
      void loadCatalog({ showLoading: false });
    });
  }, [loadCatalog]);

  const filteredItems = useMemo(() => {
    const keyword = templateQuery.trim().toLowerCase();
    return sortEmailItemsByCreatedDesc(
      items.filter((item) => {
        if (templatePublishedOnly && !isPublishedPublishStatus(item.publishStatus)) return false;
        if (!keyword) return true;
        const haystack = [
          item.displayName,
          item.description,
          item.subject,
          item.preheader,
          item.emailKey,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(keyword);
      })
    );
  }, [items, templatePublishedOnly, templateQuery]);

  const selectedItem = useMemo(() => {
    if (!filteredItems.length) return null;
    return (
      filteredItems.find((item) => item.emailKey === selectedEmailKey) ??
      filteredItems[0] ??
      null
    );
  }, [filteredItems, selectedEmailKey]);

  const filteredDesigns = useMemo(() => {
    const designs = selectedItem?.designs ?? [];
    const keyword = designQuery.trim().toLowerCase();
    return sortEmailCatalogDesignsByCreatedDesc(
      designs.filter((design) => {
        if (designPublishedOnly && !isPublishedPublishStatus(design.publishStatus)) return false;
        if (!keyword) return true;
        return [design.label, design.designId, publishLabel(design.publishStatus)]
          .join(" ")
          .toLowerCase()
          .includes(keyword);
      })
    );
  }, [selectedItem, designPublishedOnly, designQuery]);

  useEffect(() => {
    if (!filteredItems.length) {
      setSelectedEmailKey(null);
      return;
    }
    if (!selectedEmailKey || !filteredItems.some((item) => item.emailKey === selectedEmailKey)) {
      setSelectedEmailKey(filteredItems[0]!.emailKey);
    }
  }, [filteredItems, selectedEmailKey]);

  useEffect(() => {
    setDesignQuery("");
  }, [selectedEmailKey]);

  const openCreateModal = () => {
    setCreateMode("create");
    setCopySourceKey(null);
    setCreateOpen(true);
  };

  const openCopyModal = (emailKey: string) => {
    setCreateMode("copy");
    setCopySourceKey(emailKey);
    setCreateOpen(true);
  };

  const closeCreateModal = () => {
    if (creating) return;
    setCreateOpen(false);
    setCopySourceKey(null);
  };

  const submitCreate = async (displayName: string) => {
    setCreating(true);
    try {
      const created = await api.createEmail({
        displayName,
        ...(createMode === "copy" && copySourceKey ? { copyFromEmailKey: copySourceKey } : {}),
      });
      toastInfo(createMode === "copy" ? "邮件模板已复制" : "邮件模板已创建");
      setCreateOpen(false);
      setCopySourceKey(null);
      // 先刷新列表再选中：否则 selectedEmailKey 尚未出现在 filteredItems 时会被 useEffect 重置为首项
      setTemplateQuery("");
      setTemplatePublishedOnly(false);
      await loadCatalog({ showLoading: false });
      setSelectedEmailKey(created.emailKey);
    } finally {
      setCreating(false);
    }
  };

  const setTemplatePublishStatus = async (
    item: api.EmailTemplateCatalogItem,
    publishStatus: api.EmailTemplateCatalogItem["publishStatus"]
  ) => {
    setTemplateActionBusy(true);
    try {
      await api.putEmailMeta(item.emailKey, { publishStatus });
      await loadCatalog({ showLoading: false });
      toastInfo(publishStatus === "published" ? "邮件模板已发布" : "邮件模板已撤回发布");
    } finally {
      setTemplateActionBusy(false);
    }
  };

  const openRenameDesign = (design: api.EmailTemplateCatalogDesign) => {
    setRenamingDesign(design);
    setRenameDesignName(design.label);
    setRenameDesignError(null);
  };

  const closeRenameDesign = () => {
    if (designActionBusy) return;
    setRenamingDesign(null);
    setRenameDesignError(null);
  };

  const renameDesign = async () => {
    if (!selectedItem || !renamingDesign) return;
    const normalized = renameDesignName.trim();
    if (!normalized) {
      setRenameDesignError("版式名称不能为空");
      return;
    }
    setDesignActionBusy(true);
    try {
      await api.patchLayoutVariant(selectedItem.emailKey, renamingDesign.designId, {
        label: normalized,
      });
      toastInfo("版式已重命名");
      setRenamingDesign(null);
      await loadCatalog();
    } catch (err) {
      setRenameDesignError(toUserFacingErrorMessage(err, "保存失败，请稍后重试"));
    } finally {
      setDesignActionBusy(false);
    }
  };

  const setDesignPublishStatus = async (
    design: api.EmailTemplateCatalogDesign,
    publishStatus: PublishStatus
  ) => {
    if (!selectedItem) return;
    setDesignActionBusy(true);
    try {
      await api.patchLayoutVariant(selectedItem.emailKey, design.designId, { publishStatus });
      await loadCatalog({ showLoading: false });
      toastInfo(publishStatus === "published" ? "版式已发布" : "版式已撤回发布");
    } finally {
      setDesignActionBusy(false);
    }
  };

  const deleteDesign = async (design: api.EmailTemplateCatalogDesign) => {
    if (!selectedItem) return;
    if (selectedItem.designs.length <= 1) {
      toastWarning("至少需要保留一个版式");
      return;
    }
    const ok = await confirm({
      title: "删除版式",
      message: `删除后将移除「${design.label}」的结构与样式预设。是否继续？`,
      confirmLabel: "删除",
      cancelLabel: "取消",
      danger: true,
    });
    if (!ok) return;
    setDesignActionBusy(true);
    try {
      await api.deleteLayoutVariant(selectedItem.emailKey, design.designId);
      toastInfo("版式已删除");
      await loadCatalog();
    } finally {
      setDesignActionBusy(false);
    }
  };

  const deleteTemplate = async (item: api.EmailTemplateCatalogItem) => {
    const ok = await confirm({
      title: "删除邮件模板",
      message: `删除后将移除「${item.displayName}」及其全部版式。是否继续？`,
      confirmLabel: "删除",
      cancelLabel: "取消",
      danger: true,
    });
    if (!ok) return;
    await api.deleteEmail(item.emailKey);
    toastInfo("邮件模板已删除");
    await loadCatalog();
  };

  const createDesign = async (payload: LayoutVariantCreateSubmit) => {
    if (!selectedItem) return;
    setDesignCreating(true);
    setAiPipelineSteps(payload.kind === "ai" ? buildPendingRestoreAstSteps() : null);
    try {
      const created =
        payload.kind === "ai"
          ? await api.createLayoutVariantFromDesignImage(
              selectedItem.emailKey,
              payload.label,
              payload.imageFile,
              {
                pipeline: payload.pipeline,
                llmProfile: payload.llmProfile,
                onProgress: (progress) => {
                  setAiPipelineSteps((prev) => reduceAiPipelineProgress(prev, progress));
                },
              }
            )
          : await api.createLayoutVariant(selectedItem.emailKey, { label: payload.label });
      setDesignCreateOpen(false);
      setAiPipelineSteps(null);
      toastInfo(payload.kind === "ai" ? "版式已生成" : "版式已创建");
      goToEmailEditorWithContext(selectedItem.emailKey, created.layoutVariantId);
    } finally {
      setDesignCreating(false);
    }
  };

  const copySourceDisplayName =
    createMode === "copy" && copySourceKey
      ? items.find((item) => item.emailKey === copySourceKey)?.displayName
      : undefined;
  const selectedTemplatePublished = selectedItem
    ? isPublishedPublishStatus(selectedItem.publishStatus)
    : false;
  const selectedPublishedDesignCount = selectedItem
    ? countPublishedDesigns(selectedItem.designs)
    : 0;

  return (
    <CrmOpsShell activeNav="templateEditor">
      <section className="template-list-page">
        <header className="template-list-page__head">
          <div>
            <h4 className="template-list-page__title">邮件模板</h4>
            <p className="template-list-page__subtitle">
              按邮件场景管理模板，并在每个模板下维护多个布局版式。
            </p>
          </div>
        </header>

        {error ? <p className="template-list-page__error">{error}</p> : null}

        {loading ? (
          <div className="template-list-page__empty">正在加载邮件模板…</div>
        ) : items.length === 0 ? (
          <div className="template-list-page__empty">
            <p>暂无邮件模板</p>
            <button type="button" className="template-list-page__primary" onClick={openCreateModal}>
              新建邮件模板
            </button>
          </div>
        ) : (
          <div className="template-master-detail">
            <aside className="template-master-detail__sidebar" aria-label="邮件模板列表">
              <div className="template-master-detail__sidebar-head">
                <span>邮件模板</span>
                <button type="button" onClick={openCreateModal}>
                  新建
                </button>
              </div>
              <div className="template-master-detail__sidebar-tools">
                <input
                  className="template-list-page__search"
                  name="templateSearch"
                  aria-label="搜索邮件模板"
                  value={templateQuery}
                  placeholder="搜索模板名称或标识"
                  onChange={(event) => setTemplateQuery(event.target.value)}
                />
                <div className="template-filter-row">
                  <span>共 {filteredItems.length} 个模板</span>
                  <label className="template-filter-checkbox">
                    <input
                      type="checkbox"
                      checked={templatePublishedOnly}
                      onChange={(event) => setTemplatePublishedOnly(event.target.checked)}
                    />
                    <span>仅看已发布</span>
                  </label>
                </div>
              </div>
              <div className="template-master-detail__template-list" role="tablist" aria-orientation="vertical">
                {filteredItems.map((item) => {
                  const active = item.emailKey === selectedEmailKey;
                  return (
                    <button
                      type="button"
                      role="tab"
                      aria-selected={active}
                      className={`template-master-item${
                        active ? " template-master-item--active" : ""
                      }`}
                      key={item.emailKey}
                      onClick={() => setSelectedEmailKey(item.emailKey)}
                    >
                      <span className="template-master-item__name">{item.displayName}</span>
                      <span className="template-master-item__line">
                        <span
                          className={`template-master-item__status${
                            isPublishedPublishStatus(item.publishStatus)
                              ? " template-master-item__status--published"
                              : ""
                          }`}
                        >
                          {publishLabel(item.publishStatus)}
                        </span>
                        <span className="template-master-item__meta">
                          {item.designs.length} 个版式
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </aside>

            {selectedItem ? (
              <section className="template-detail-panel" aria-label="当前邮件模板详情">
              <header className="template-detail-panel__head">
                <div>
                  <div className="template-detail-panel__title-row">
                    <h5 className="template-detail-panel__title">{selectedItem.displayName}</h5>
                    <span
                      className={`template-detail-panel__status${
                        selectedTemplatePublished ? " template-detail-panel__status--published" : ""
                      }`}
                    >
                      {publishLabel(selectedItem.publishStatus)}
                    </span>
                  </div>
                  <p className="template-detail-panel__description">
                    {selectedItem.description || "暂无模板说明"}
                  </p>
                </div>
                <div className="template-detail-panel__actions">
                  <button
                    type="button"
                    onClick={() => setMailInfoOpen(true)}
                  >
                    模板信息
                  </button>
                  <button
                    type="button"
                    disabled={templateActionBusy}
                    onClick={() =>
                      void setTemplatePublishStatus(
                        selectedItem,
                        selectedTemplatePublished ? "draft" : "published"
                      )
                    }
                  >
                    {selectedTemplatePublished ? "撤回发布" : "发布模板"}
                  </button>
                  <button type="button" onClick={() => openCopyModal(selectedItem.emailKey)}>
                    复制模板
                  </button>
                  <button
                    type="button"
                    className="template-detail-panel__danger"
                    onClick={() => void deleteTemplate(selectedItem)}
                  >
                    删除
                  </button>
                </div>
              </header>

              <div className="template-detail-panel__summary">
                <div>
                  <span>发信主题</span>
                  <strong>{selectedItem.subject || "未填写"}</strong>
                </div>
                <div>
                  <span>发信预览摘要</span>
                  <strong>{selectedItem.preheader || "未填写"}</strong>
                </div>
                <div>
                  <span>内容数据</span>
                  <strong>{selectedItem.contentDataSummary.slotCount} 个变量</strong>
                </div>
              </div>

              <div className="template-design-section">
                <div className="template-design-section__head">
                  <div>
                    <h6>版式</h6>
                    <p>
                      共 {selectedItem.designs.length} 个，已发布 {selectedPublishedDesignCount} 个
                    </p>
                  </div>
                  <div className="template-design-section__actions">
                    <label className="template-filter-checkbox">
                      <input
                        type="checkbox"
                        checked={designPublishedOnly}
                        onChange={(event) => setDesignPublishedOnly(event.target.checked)}
                      />
                      <span>仅看已发布</span>
                    </label>
                    <input
                      className="template-list-page__search template-design-section__search"
                      name="designSearch"
                      aria-label="搜索版式"
                      value={designQuery}
                      placeholder="搜索版式"
                      onChange={(event) => setDesignQuery(event.target.value)}
                    />
                    <button
                      type="button"
                      className="template-list-page__primary"
                      onClick={() => setDesignCreateOpen(true)}
                    >
                      新版式
                    </button>
                  </div>
                </div>

                <div className="template-design-table-wrap">
                  <table className="template-design-table">
                    <thead>
                      <tr>
                        <th>版式名称</th>
                        <th>状态</th>
                        <th>最近编辑</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDesigns.map((design) => {
                        const designPublished = isPublishedPublishStatus(design.publishStatus);
                        return (
                          <tr key={design.designId}>
                            <td>
                              <button
                                type="button"
                                className="template-design-table__name"
                                onClick={() =>
                                  goToEmailEditorWithContext(selectedItem.emailKey, design.designId)
                                }
                              >
                                {design.label}
                              </button>
                            </td>
                            <td>
                              <span
                                className={`template-design-table__status${
                                  designPublished ? " template-design-table__status--published" : ""
                                }`}
                              >
                                {designPublished ? "已发布" : "未发布"}
                              </span>
                            </td>
                            <td>{formatDateTime(design.updatedAt ?? design.createdAt)}</td>
                            <td>
                              <div className="template-design-table__actions">
                              <button
                                type="button"
                                className="template-design-table__action"
                                onClick={() =>
                                  goToEmailEditorWithContext(selectedItem.emailKey, design.designId)
                                }
                              >
                                编辑
                              </button>
                              <button
                                type="button"
                                className="template-design-table__action"
                                disabled={designActionBusy}
                                onClick={() => openRenameDesign(design)}
                              >
                                重命名
                              </button>
                              <button
                                type="button"
                                className="template-design-table__action"
                                disabled={designActionBusy}
                                onClick={() =>
                                  void setDesignPublishStatus(
                                    design,
                                    designPublished ? "draft" : "published"
                                  )
                                }
                              >
                                {designPublished ? "撤回发布" : "发布"}
                              </button>
                              <button
                                type="button"
                                className="template-design-table__action template-design-table__action--danger"
                                disabled={designActionBusy || selectedItem.designs.length <= 1}
                                onClick={() => void deleteDesign(design)}
                              >
                                删除
                              </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredDesigns.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="template-design-table__empty">
                            没有匹配的版式
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
              </section>
            ) : (
              <section className="template-detail-panel" aria-label="当前邮件模板详情">
                <div className="template-list-page__empty">没有匹配的邮件模板</div>
              </section>
            )}
          </div>
        )}
      </section>

      <EmailTemplateCreateModal
        visible={createOpen}
        mode={createMode}
        copySourceDisplayName={copySourceDisplayName}
        creating={creating}
        onCancel={closeCreateModal}
        onCreate={submitCreate}
      />
      <LayoutVariantCreateModal
        visible={designCreateOpen}
        mode="create"
        busy={designCreating}
        aiPipelineSteps={aiPipelineSteps}
        onCancel={() => {
          if (designCreating) return;
          setDesignCreateOpen(false);
          setAiPipelineSteps(null);
        }}
        onSubmit={createDesign}
      />
      {selectedItem ? (
        <ShopSectionModal
          visible={mailInfoOpen}
          title="编辑模板信息"
          width={640}
          onCancel={() => setMailInfoOpen(false)}
          destroyOnClose
          footer={
            <div className="shop-section-modal__footer-actions">
              <ShopSecondaryButton onClick={() => setMailInfoOpen(false)} disabled={metaSaving}>
                取消
              </ShopSecondaryButton>
              <ShopPrimaryButton
                onClick={() => setMetaSaveNonce((value) => value + 1)}
                loading={metaSaving}
                disabled={!metaDirty}
              >
                保存
              </ShopPrimaryButton>
            </div>
          }
        >
          <MetaEditor
            emailKey={selectedItem.emailKey}
            variant="embedded"
            showEmbeddedHeader={false}
            externalSaveNonce={metaSaveNonce}
            onDirtyChange={setMetaDirty}
            onSavingChange={setMetaSaving}
            onError={reportMetaEditorError}
            onSaved={() => void loadCatalog({ showLoading: false })}
          />
        </ShopSectionModal>
      ) : null}
      {renamingDesign ? (
        <ShopSectionModal
          visible
          title="重命名版式"
          onCancel={closeRenameDesign}
          maskClosable={!designActionBusy}
          closable={!designActionBusy}
          destroyOnClose
          footer={
            <div className="shop-section-modal__footer-actions">
              <ShopSecondaryButton onClick={closeRenameDesign} disabled={designActionBusy}>
                取消
              </ShopSecondaryButton>
              <ShopPrimaryButton onClick={() => void renameDesign()} loading={designActionBusy}>
                保存
              </ShopPrimaryButton>
            </div>
          }
        >
          <div className="inspector-field">
            <span className="inspector-field__label">版式名称</span>
            <ShopInput
              autoFocus
              value={renameDesignName}
              maxLength={80}
              placeholder="请输入版式名称"
              onChange={(event) => setRenameDesignName(event.target.value)}
              onPressEnter={() => void renameDesign()}
            />
            {renameDesignError ? (
              <span className="topbar__rename-error">{renameDesignError}</span>
            ) : null}
          </div>
        </ShopSectionModal>
      ) : null}
    </CrmOpsShell>
  );
}
