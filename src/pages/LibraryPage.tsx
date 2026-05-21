import { useCallback, useEffect, useMemo, useState } from "react";
import type { EmailPayload, EmailTemplate } from "../types/email";
import type { TokenPresets } from "../types/tokenPreset";
import * as api from "../api/client";
import { EmailPreview } from "../components/EmailPreview";
import { Inspector } from "../components/Inspector";
import { MasterCatalogPanel, type MasterCatalogTab } from "../components/MasterCatalogPanel";
import { ShopPrimaryButton, ShopSecondaryButton } from "../components/ui/ShopFormControls";
import { TopbarGlobalPresetSelect } from "../components/ui/TopbarGlobalPresetSelect";
import { useMasterCatalog } from "../hooks/useMasterCatalog";
import {
  collectMasterValidationIssues,
  masterKindForCatalogTab,
  masterToEmailTemplate,
  mergeBlockMasterFromTemplate,
  mergeSectionMasterFromTemplate,
} from "../lib/masterCatalog";
import { goToEmailEditor } from "../lib/appNavigation";
import { resolveDesignTokens } from "../lib/resolveTokenPreset";
import { resolveThemeInTemplate } from "../lib/resolveThemeInTemplate";
import type { SectionMaster } from "../types/master";
import "../app.css";
import "../sds-admin-field-overrides.css";

export function LibraryPage() {
  const masterCatalog = useMasterCatalog();
  const [globalTokenPresets, setGlobalTokenPresets] = useState<Record<string, TokenPresets>>({});
  const [activeGlobalPresetId, setActiveGlobalPresetId] = useState<string | null>(null);
  const [catalogTab, setCatalogTab] = useState<MasterCatalogTab>("blocks");
  const [selectedBlockMasterId, setSelectedBlockMasterId] = useState<string | null>(null);
  const [selectedSectionMasterId, setSelectedSectionMasterId] = useState<string | null>(null);
  const [expandedSectionIds, setExpandedSectionIds] = useState<Record<string, boolean>>({});
  const [catalogTemplateDraft, setCatalogTemplateDraft] = useState<EmailTemplate | null>(null);
  const [catalogPayloadDraft, setCatalogPayloadDraft] = useState<EmailPayload>({
    schemaVersion: "1.0.0",
    slots: {},
    values: {},
  });
  const [catalogSelectedBlockId, setCatalogSelectedBlockId] = useState<string | null>(null);
  const [catalogBlockSyncNonce, setCatalogBlockSyncNonce] = useState(0);
  const [catalogDiskSnapshot, setCatalogDiskSnapshot] = useState<EmailTemplate | null>(null);
  const [saveStatus, setSaveStatus] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadGlobalPresets = useCallback(async () => {
    try {
      const r = await api.listGlobalTokenPresets();
      const map = Object.fromEntries(
        r.items.filter((item) => item.tokenPresets).map((item) => [item.presetId, item.tokenPresets])
      );
      setGlobalTokenPresets(map);
      setActiveGlobalPresetId((prev) => {
        if (prev && map[prev]) return prev;
        return Object.keys(map)[0] ?? null;
      });
    } catch {
      setGlobalTokenPresets({});
    }
  }, []);

  useEffect(() => {
    void loadGlobalPresets();
  }, [loadGlobalPresets]);

  const selectedBlockMaster = useMemo(
    () => masterCatalog.blockMasters.find((m) => m.masterId === selectedBlockMasterId) ?? null,
    [masterCatalog.blockMasters, selectedBlockMasterId]
  );

  const selectedSectionMaster = useMemo(
    () => masterCatalog.sectionMasters.find((m) => m.masterId === selectedSectionMasterId) ?? null,
    [masterCatalog.sectionMasters, selectedSectionMasterId]
  );

  const sectionPreviewTemplate = useCallback(
    (master: SectionMaster) => {
      return catalogTemplateDraft && selectedSectionMasterId === master.masterId
        ? catalogTemplateDraft
        : masterToEmailTemplate(master, { templateId: master.masterId });
    },
    [catalogTemplateDraft, selectedSectionMasterId]
  );

  useEffect(() => {
    const master = catalogTab === "blocks" ? selectedBlockMaster : selectedSectionMaster;
    if (!master) {
      setCatalogTemplateDraft(null);
      setCatalogSelectedBlockId(null);
      return;
    }
    setCatalogTemplateDraft(
      structuredClone(masterToEmailTemplate(master, { templateId: master.masterId }))
    );
    setCatalogDiskSnapshot(
      structuredClone(masterToEmailTemplate(master, { templateId: master.masterId }))
    );
    setCatalogPayloadDraft({ schemaVersion: "1.0.0", slots: {}, values: {} });
    setSaveStatus("");
    setSaveError(null);
    if (catalogTab === "blocks" && selectedBlockMaster) {
      setCatalogSelectedBlockId(selectedBlockMaster.sampleBlockId);
    } else if (catalogTab === "sections" && selectedSectionMaster) {
      setCatalogSelectedBlockId(selectedSectionMaster.rootBlockId);
    }
  }, [catalogTab, selectedBlockMaster, selectedSectionMaster]);

  const activeGlobalPreset = activeGlobalPresetId ? globalTokenPresets[activeGlobalPresetId] : null;

  const effectiveDesignTokens = useMemo(
    () => resolveDesignTokens(activeGlobalPreset ?? null),
    [activeGlobalPreset]
  );

  const catalogMerged = useMemo(() => {
    if (!catalogTemplateDraft) return null;
    const resolved = resolveThemeInTemplate(catalogTemplateDraft, effectiveDesignTokens);
    return resolved.template ?? catalogTemplateDraft;
  }, [catalogTemplateDraft, effectiveDesignTokens]);

  const catalogValidationIssues = useMemo(() => {
    const master = catalogTab === "blocks" ? selectedBlockMaster : selectedSectionMaster;
    if (!master) return [];
    return collectMasterValidationIssues(master);
  }, [catalogTab, selectedBlockMaster, selectedSectionMaster]);

  const presetOptions = useMemo(
    () =>
      Object.entries(globalTokenPresets).map(([presetId, tp]) => ({
        presetId,
        label: tp.presets[tp.activePresetId]?.label ?? presetId,
      })),
    [globalTokenPresets]
  );

  const activePresetLabel =
    presetOptions.find((o) => o.presetId === activeGlobalPresetId)?.label ?? activeGlobalPresetId;

  const onSelectBlockMaster = useCallback(
    (masterId: string) => {
      setCatalogTab("blocks");
      setSelectedBlockMasterId(masterId);
      const master = masterCatalog.blockMasters.find((m) => m.masterId === masterId);
      if (master) setCatalogSelectedBlockId(master.sampleBlockId);
    },
    [masterCatalog.blockMasters]
  );

  const onSelectSectionMaster = useCallback(
    (masterId: string) => {
      setCatalogTab("sections");
      setSelectedSectionMasterId(masterId);
      const master = masterCatalog.sectionMasters.find((m) => m.masterId === masterId);
      setCatalogSelectedBlockId(master?.rootBlockId ?? null);
      setExpandedSectionIds((prev) => ({ ...prev, [masterId]: true }));
    },
    [masterCatalog.sectionMasters]
  );

  const onToggleSectionExpanded = useCallback(
    (masterId: string) => {
      setExpandedSectionIds((prev) => {
        const nextExpanded = !prev[masterId];
        if (nextExpanded) {
          setSelectedSectionMasterId(masterId);
          const master = masterCatalog.sectionMasters.find((m) => m.masterId === masterId);
          setCatalogSelectedBlockId(master?.rootBlockId ?? null);
          setCatalogTab("sections");
        }
        return { ...prev, [masterId]: nextExpanded };
      });
    },
    [masterCatalog.sectionMasters]
  );

  const catalogDirty = useMemo(() => {
    if (!catalogTemplateDraft || !catalogDiskSnapshot) return false;
    return JSON.stringify(catalogTemplateDraft) !== JSON.stringify(catalogDiskSnapshot);
  }, [catalogTemplateDraft, catalogDiskSnapshot]);

  const activeMaster = catalogTab === "blocks" ? selectedBlockMaster : selectedSectionMaster;

  const saveCatalogMaster = useCallback(async () => {
    if (!catalogTemplateDraft || !activeMaster) return;
    const merged =
      catalogTab === "blocks"
        ? mergeBlockMasterFromTemplate(selectedBlockMaster!, catalogTemplateDraft)
        : mergeSectionMasterFromTemplate(selectedSectionMaster!, catalogTemplateDraft);
    const issues = collectMasterValidationIssues(merged);
    if (issues.length) {
      setSaveError(issues.map((i) => `${i.path}：${i.reason}`).join("；"));
      setSaveStatus("");
      return;
    }
    setSaveStatus("保存中…");
    setSaveError(null);
    try {
      const kind = masterKindForCatalogTab(catalogTab);
      await api.putMaster(kind, activeMaster.masterId, merged as unknown as Record<string, unknown>);
      setCatalogDiskSnapshot(structuredClone(catalogTemplateDraft));
      setSaveStatus("已保存");
      await masterCatalog.reload();
    } catch (e) {
      setSaveStatus("");
      setSaveError(e instanceof Error ? e.message : String(e));
    }
  }, [
    activeMaster,
    catalogTab,
    catalogTemplateDraft,
    masterCatalog,
    selectedBlockMaster,
    selectedSectionMaster,
  ]);

  const discardCatalogDraft = useCallback(() => {
    if (!catalogDiskSnapshot) return;
    setCatalogTemplateDraft(structuredClone(catalogDiskSnapshot));
    setCatalogPayloadDraft({ schemaVersion: "1.0.0", slots: {}, values: {} });
    setSaveStatus("已放弃未保存更改");
    setSaveError(null);
  }, [catalogDiskSnapshot]);

  const onSelectCatalogBlock = useCallback(
    (blockId: string | null) => {
      setCatalogSelectedBlockId(blockId);
      setCatalogBlockSyncNonce((n) => n + 1);
      if (blockId && catalogTab === "sections") {
        const owner = masterCatalog.sectionMasters.find((m) => m.blocks[blockId]);
        if (owner) setSelectedSectionMasterId(owner.masterId);
      }
    },
    [catalogTab, masterCatalog.sectionMasters]
  );

  return (
    <div className="app app--library">
      <header className="topbar">
        <div className="topbar__brand">组件库管理</div>
        <TopbarGlobalPresetSelect
          options={presetOptions}
          value={activeGlobalPresetId}
          onChange={setActiveGlobalPresetId}
        />
        <ShopPrimaryButton
          className="topbar__btn"
          htmlType="button"
          disabled={!catalogTemplateDraft || !catalogDirty}
          onClick={() => void saveCatalogMaster()}
        >
          保存
        </ShopPrimaryButton>
        {catalogDirty ? (
          <ShopSecondaryButton className="topbar__btn" htmlType="button" onClick={discardCatalogDraft}>
            放弃未保存更改
          </ShopSecondaryButton>
        ) : null}
        <ShopSecondaryButton className="topbar__btn" htmlType="button" onClick={goToEmailEditor}>
          返回邮件编辑
        </ShopSecondaryButton>
        <span
          className="topbar__hint"
          title="保存后写入 data/masters/blocks 或 data/masters/sections 下对应 JSON"
        >
          {saveStatus || "手动保存模式 · 修改右侧配置后点击保存写入母版"}
        </span>
      </header>

      {saveError ? <div className="app__banner app__banner--warn">{saveError}</div> : null}
      {masterCatalog.error ? (
        <div className="app__banner app__banner--warn">{masterCatalog.error}</div>
      ) : null}
      {catalogValidationIssues.length > 0 ? (
        <div className="app__banner app__banner--warn">
          母版校验提示：{catalogValidationIssues.map((i) => `${i.path}：${i.reason}`).join("；")}
        </div>
      ) : null}

      <main className="workspace">
        <MasterCatalogPanel
          tab={catalogTab}
          onTabChange={setCatalogTab}
          blockMasters={masterCatalog.blockMasters}
          sectionMasters={masterCatalog.sectionMasters}
          selectedBlockMasterId={selectedBlockMasterId}
          selectedSectionMasterId={selectedSectionMasterId}
          expandedSectionIds={expandedSectionIds}
          catalogTemplate={catalogTemplateDraft}
          catalogSelectedBlockId={catalogSelectedBlockId}
          catalogBlockSyncNonce={catalogBlockSyncNonce}
          onSelectBlockMaster={onSelectBlockMaster}
          onSelectSectionMaster={onSelectSectionMaster}
          onToggleSectionExpanded={onToggleSectionExpanded}
          onSelectCatalogBlock={onSelectCatalogBlock}
          sectionPreviewTemplate={sectionPreviewTemplate}
        />

        <section className="canvas-col">
          <div className="canvas-col__head">
            <div className="canvas-col__title">母版预览</div>
            {activePresetLabel ? (
              <p className="canvas-col__preview-hint">公共样式 · {activePresetLabel}</p>
            ) : null}
          </div>
          <div className="canvas-scroll">
            <div className="canvas-frame">
              {catalogMerged ? (
                <EmailPreview
                  template={catalogMerged}
                  selectedBlockId={catalogSelectedBlockId}
                  onSelectBlock={onSelectCatalogBlock}
                />
              ) : (
                <p className="canvas-col__empty-hint">请在左侧选择 Block 或 Section。</p>
              )}
            </div>
          </div>
        </section>

        {catalogTemplateDraft ? (
          <Inspector
            template={catalogTemplateDraft}
            payload={catalogPayloadDraft}
            selectedBlockId={catalogSelectedBlockId}
            onUpdate={({ template: nextTemplate, payload: nextPayload }) => {
              setCatalogTemplateDraft(nextTemplate);
              setCatalogPayloadDraft(nextPayload);
            }}
            onTemplateChange={setCatalogTemplateDraft}
            mergedTemplate={catalogMerged}
            effectiveDesignTokens={effectiveDesignTokens}
          />
        ) : (
          <aside className="side-inspector">
            <h2 className="inspector__title">组件设置</h2>
            <p className="inspector__muted">请在左侧选择 Block 或 Section。</p>
          </aside>
        )}
      </main>
    </div>
  );
}
