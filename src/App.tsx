import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import type { PublishStatus } from "./publish-status-contract";
import type { EmailListItem, EmailMeta, EmailPayload, EmailTemplate } from "./types/email";
import type { LayoutManifest } from "./layout-variant-contract/types";
import type { TokenPresets } from "./types/tokenPreset";
import * as api from "./api/client";
import type { VirtualBlockRef } from "./repeat-binding-contract";
import {
  buildRepeatPreviewModel,
  findPreviewNodeByRef,
  previewModelToFlatTemplate,
  applyThemeToPreviewModel,
  refToStableKey,
  resolvePhysicalBlockId,
} from "./repeat-runtime";
import { resolveBlockTheme } from "./lib/resolveThemeInTemplate";
import { applyVisibilityRules, templateHasVisibilityRules } from "./lib/visibility";
import { collectExternalVariableSlots, getSlotPrimaryBlockId } from "./lib/payloadSlots";
import {
  buildPreviewPayload,
  commitPayloadSlotDraft,
  discardPayloadSlotDraft,
  hasDirtyPayloadSlotDrafts,
  type PayloadSlotDraft,
  type PayloadSlotDraftMap,
} from "./lib/payloadSlotDraft";
import { normalizeTokenPresetTokens } from "./token-preset-contract/standard-keys";
import {
  validatePayloadAgainstTemplate,
  validatePayloadAgainstTemplateUnion,
  validateTemplate,
} from "./lib/validate";
import {
  errorMessageDuplicatesValidationIssues,
  validationSaveBlockedMessage,
} from "./lib/validationIssueDisplay";
import { toastError } from "./lib/appToast";
import type { ClassifiedValidationIssue } from "./lib/validationIssueRouting";
import { useValidationIssuesForContext } from "./hooks/useValidationIssuesForContext";
import type { InspectorMainTab } from "./components/AdminInspectorTabs";
import { validateTokenPresets } from "./lib/validateTokenPresets";
import { createDefaultTokenPresets } from "./lib/defaultTokenPresets";
import {
  buildNewPublicTokenPresetsDocument,
  derivePublicTokenPresetId,
} from "./lib/newPublicTokenPresetDefaults";
import { isLogicallyDeleted } from "./lib/logicalDelete";
import {
  listVisibleLayoutVariants,
  resolveEffectiveLayoutVariantId,
} from "./lib/layoutVariantLogicalDelete";
import { resolveDesignTokens } from "./lib/resolveTokenPreset";
import { reconcileSelectedBlockRefAfterTemplateChange, type TemplateChangeOptions } from "./lib/templateBlockSelection";
import { isThemeRef } from "./types/themeRef";
import { getLastSelectedEmailKey, setLastSelectedEmailKey } from "./lib/lastSelectedEmail";
import { normalizeEmailRootBlock } from "./lib/normalizeEmailRoot";
import { BlockTree } from "./components/BlockTree";
import { TemplateValidationDock } from "./components/TemplateValidationDock";
import { EmailPreview } from "./components/EmailPreview";
import type { CanvasPreviewViewportMode } from "./editor-canvas-contract";
import { resolveCanvasPreviewViewportWidth } from "./editor-canvas-contract";
import { Inspector } from "./components/Inspector";
import { stableStringify } from "./lib/stableStringify";
import { TokenPresetInspector } from "./components/TokenPresetInspector";
import { TokenPresetPanel } from "./components/TokenPresetPanel";
import { PayloadPanel } from "./components/PayloadPanel";
import { PayloadInspector } from "./components/PayloadInspector";
import { MetaEditor } from "./components/MetaEditor";
import { message } from "@shoplazza/sds";
import { ShopPrimaryButton, ShopSecondaryButton } from "./components/ui/ShopFormControls";
import { TopbarTemplateSelect } from "./components/ui/TopbarTemplateSelect";
import {
  EmailTemplateCreateModal,
  type EmailTemplateCreateModalMode,
} from "./components/ui/EmailTemplateCreateModal";
import { TopbarLayoutVariantSelect } from "./components/ui/TopbarLayoutVariantSelect";
import { useConfirmDialog } from "./components/ui/ConfirmDialogProvider";
import { CanvasInsertBlockModal } from "./components/ui/CanvasInsertBlockModal";
import { SaveSectionModal } from "./components/ui/SaveSectionModal";
import { useEmailDiskPersist } from "./hooks/useEmailDiskPersist";
import {
  emailDataSyncEditorSnapshot,
  shouldShowEmailDataSyncToast,
} from "./lib/emailDataSyncToast";
import { TopbarHomeBackButton } from "./components/ui/TopbarHomeBackButton";
import {
  computeCanvasBlockActionLayout,
  countCanvasLeftActionButtons,
  escapePreviewBlockIdForSelector,
  pickCanvasBlockActionHorizontalAnchorRect,
  type CanvasBlockActionLayout,
} from "./lib/canvasBlockActionLayout";
import { parseCssPx } from "./lib/canvasDimensionResolve";
import { EMAIL_ROOT_FIXED_WIDTH } from "./render-defaults-contract/values";
import { deleteBlockFromTemplate } from "./lib/deleteTemplateBlock";
import { isRepeatListBindingChildBlock } from "./lib/repeatRegion";
import {
  duplicateBlockBelow,
  getBlockSiblingMoveState,
  moveBlockAmongSiblings,
} from "./lib/templateBlockSiblingOps";
import {
  insertCatalogBlockIntoTemplate,
  listInsertableCatalogEntries,
  type InsertBlockMode,
} from "./lib/templateBlockInsert";
import type { BlockCatalogEntry } from "./lib/blockDefaults";
import type { BlockMaster, SectionMaster } from "./types/master";
import { canSaveAsSection } from "./section-master-contract";
import {
  mergedBlockFromPreviewModel,
  previewFlatTemplateFromModel,
} from "./lib/blockPersistLiteralSnapshot";
import {
  deriveNewSectionMasterId,
  extractSectionFromTemplate,
  insertSectionIntoTemplate,
} from "./lib/sectionMasterOps";
import { toSectionCatalogItems } from "./lib/sectionCatalog";
import { sortEmailItemsByCreatedDesc } from "./lib/emailCatalogSort";
import {
  reduceAiPipelineProgress,
  type AiStepUiState,
} from "./layout-variant-ai-contract/progress";
import type { MjsGenerateMode } from "./layout-variant-ai-contract/mjsGenerateMode";
import "./app.css";
import "./sds-admin-field-overrides.css";

type WorkbenchView = "tokens" | "payload" | "meta" | "block";

/** 顶栏工作台视图：顺序按运营使用频率（高 → 低）。 */
const WORKBENCH_VIEW_TABS: ReadonlyArray<{ view: WorkbenchView; label: string }> = [
  { view: "block", label: "模板组件" },
  { view: "payload", label: "数据变量" },
  { view: "tokens", label: "主题样式" },
  { view: "meta", label: "模板信息" },
];

function defaultPayload(_t: EmailTemplate): EmailPayload {
  return {
    schemaVersion: "1.0.0",
    slots: {},
    values: {},
  };
}

function readSearchParams(): URLSearchParams {
  return new URLSearchParams(window.location.search);
}

function pickEmailKeyParam(v: string | null): string {
  return (v ?? "").trim().replace(/^["']|["']$/g, "");
}

/** 地址栏原始 emailKey（不校验是否在列表中）。 */
function readEmailKeyParamRaw(): string | null {
  try {
    const q = readSearchParams();
    const key = pickEmailKeyParam(q.get("emailKey")) || pickEmailKeyParam(q.get("email"));
    return key || null;
  } catch {
    return null;
  }
}

/** 从地址栏 `?emailKey=` 或 `?email=` 读取要打开的模板（须存在于当前列表）。 */
function readEmailKeyFromUrl(items: EmailListItem[]): string | null {
  const key = readEmailKeyParamRaw();
  if (!key) return null;
  return items.some((it) => it.emailKey === key) ? key : null;
}

/** 地址栏 `?layout=` 原始值（加载 manifest 前作首选版式提示）。 */
function readLayoutHintFromUrl(): string | null {
  try {
    const raw = readSearchParams().get("layout")?.trim();
    return raw || null;
  } catch {
    return null;
  }
}

/** 由上一级「创建邮件」页托管来源时，锁定编辑器顶栏模板/版式切换。 */
function readTopbarLockFromUrl(): boolean {
  try {
    const q = readSearchParams();
    const lock = (q.get("lockFromCampaignCreate") ?? "").trim();
    return lock === "1" || lock.toLowerCase() === "true";
  } catch {
    return false;
  }
}

function writeLayoutVariantToUrl(layoutVariantId: string | null): void {
  try {
    const url = new URL(window.location.href);
    if (layoutVariantId) url.searchParams.set("layout", layoutVariantId);
    else url.searchParams.delete("layout");
    window.history.replaceState(null, "", url.toString());
  } catch {
    /* 非浏览器环境忽略 */
  }
}

function isEmailItemsEqual(a: EmailListItem[], b: EmailListItem[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const left = a[i]!;
    const right = b[i]!;
    if (
      left.emailKey !== right.emailKey ||
      left.displayName !== right.displayName ||
      left.publishStatus !== right.publishStatus ||
      left.templateId !== right.templateId ||
      left.templateVersion !== right.templateVersion ||
      left.hasPayload !== right.hasPayload ||
      (left.hasLayoutVariants ?? false) !== (right.hasLayoutVariants ?? false) ||
      (left.activeLayoutVariantId ?? "") !== (right.activeLayoutVariantId ?? "") ||
      (left.createdAt ?? "") !== (right.createdAt ?? "") ||
      (left.updatedAt ?? "") !== (right.updatedAt ?? "")
    ) {
      return false;
    }
  }
  return true;
}

function containsThemeRef(value: unknown): boolean {
  if (isThemeRef(value)) return true;
  if (Array.isArray(value)) return value.some((item) => containsThemeRef(item));
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((item) => containsThemeRef(item));
  }
  return false;
}

function tokenPresetsWithoutAppliedGlobal(tp: TokenPresets): TokenPresets {
  const next = structuredClone(tp) as TokenPresets;
  delete next.appliedGlobalPresetId;
  return next;
}

/** 保存前统一 family / scale 键序（与公共预设及 Inspector 标准顺序一致） */
function normalizeTokenPresetsDocument(tp: TokenPresets): TokenPresets {
  const next = structuredClone(tp) as TokenPresets;
  for (const preset of Object.values(next.presets)) {
    preset.tokens = normalizeTokenPresetTokens(
      preset.tokens as Record<string, Record<string, string>>
    );
  }
  return next;
}

function resolveInitialStylePresetListSelection(
  meta: EmailMeta | null,
  emailTp: TokenPresets,
  globalIds: Set<string>
): "local" | string {
  const fromMeta = meta?.defaultStylePresetSelection;
  if (fromMeta === "local") return "local";
  if (fromMeta && globalIds.has(fromMeta)) return fromMeta;
  const legacy = emailTp.appliedGlobalPresetId;
  if (legacy && globalIds.has(legacy)) return legacy;
  return "local";
}

export default function App() {
  const topbarSelectionLocked = useMemo(() => readTopbarLockFromUrl(), []);
  const { confirm } = useConfirmDialog();
  const [items, setItems] = useState<EmailListItem[]>([]);
  const [emailKey, setEmailKey] = useState<string | null>(null);
  const [layoutManifest, setLayoutManifest] = useState<LayoutManifest | null>(null);
  /** 多版式场景：各版式 template 快照，用于场景级 payload 联合校验 */
  const [sceneLayoutTemplates, setSceneLayoutTemplates] = useState<
    Array<{ layoutVariantId: string; template: EmailTemplate }>
  >([]);
  const [layoutVariantId, setLayoutVariantId] = useState<string | null>(null);
  const [template, setTemplate] = useState<EmailTemplate | null>(null);
  const [payload, setPayload] = useState<EmailPayload | null>(null);
  /** 单变量未保存草稿：合并进画布预览，点「保存变量」后写入 payload */
  const [payloadSlotDrafts, setPayloadSlotDrafts] = useState<PayloadSlotDraftMap>({});
  const [tokenPresets, setTokenPresets] = useState<TokenPresets | null>(null);
  const [globalTokenPresets, setGlobalTokenPresets] = useState<Record<string, TokenPresets>>({});
  const [workbenchView, setWorkbenchView] = useState<WorkbenchView>("block");
  const [selectedPayloadSlotId, setSelectedPayloadSlotId] = useState<string | null>(null);
  const [selectedBlockRef, setSelectedBlockRef] = useState<VirtualBlockRef | null>(null);
  const [insertModalOpen, setInsertModalOpen] = useState(false);
  const [insertModalMode, setInsertModalMode] = useState<InsertBlockMode>("child");
  const [insertingBlock, setInsertingBlock] = useState(false);
  const [deletingBlock, setDeletingBlock] = useState(false);
  const [reorderingBlock, setReorderingBlock] = useState(false);
  /** 画布与区块树共用：同一 id 重复选中时也递增，便于左侧树滚动定位 */
  const [blockTreeSyncNonce, setBlockTreeSyncNonce] = useState(0);
  /** 仅当模板存在条件显隐时展示画布开关；默认关（画布仍显示这些区块）；开=整段按「全部不满足」裁剪 */
  const [canvasSimulateAllHidden, setCanvasSimulateAllHidden] = useState(false);
  const [canvasPreviewViewport, setCanvasPreviewViewport] =
    useState<CanvasPreviewViewportMode>("desktop");
  const canvasPreviewViewportPx = useMemo(
    () => resolveCanvasPreviewViewportWidth(canvasPreviewViewport),
    [canvasPreviewViewport]
  );

  /** 最近一次从磁盘加载或成功保存后的 template+payload（内存基准） */
  const [diskTemplatePayload, setDiskTemplatePayload] = useState<{
    template: EmailTemplate;
    payload: EmailPayload;
  } | null>(null);
  /** 最近一次加载或保存 tokenPresets.json 后的样式预设快照 */
  const [diskTokenPresets, setDiskTokenPresets] = useState<TokenPresets | null>(null);
  /** 样式预设侧栏：本邮件 `local`，否则为公共预设 id（与画布/右侧编辑源一致） */
  const [stylePresetListSelection, setStylePresetListSelection] = useState<"local" | string>("local");
  const [emailMeta, setEmailMeta] = useState<EmailMeta | null>(null);
  /** 公共样式预设最近一次自磁盘/接口加载的快照（用于未保存检测） */
  const [diskGlobalTokenPresets, setDiskGlobalTokenPresets] = useState<Record<string, TokenPresets>>({});
  /** 正在编辑的公共预设内存稿（仅含已改动的 id） */
  const [globalPresetDraft, setGlobalPresetDraft] = useState<Record<string, TokenPresets>>({});
  /** 组件插入默认真源（masterId → 母版）；启动时从 API 加载。 */
  const [blockMastersById, setBlockMastersById] = useState<Record<string, BlockMaster>>({});
  /** Section 模块母版（masterId → 母版）。 */
  const [sectionMastersById, setSectionMastersById] = useState<Record<string, SectionMaster>>({});
  const [saveSectionModalOpen, setSaveSectionModalOpen] = useState(false);
  const [savingSection, setSavingSection] = useState(false);
  const refreshSectionMasters = useCallback(async () => {
    const { items } = await api.listSectionMasters();
    const map: Record<string, SectionMaster> = {};
    for (const m of items) map[m.masterId] = m;
    setSectionMastersById(map);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void api.listBlockMasters().then(({ items }) => {
      if (cancelled) return;
      const map: Record<string, BlockMaster> = {};
      for (const m of items) map[m.masterId] = m;
      setBlockMastersById(map);
    }).catch(() => {
      /* 母版加载失败时插入仍回退代码出厂默认 */
    });
    void refreshSectionMasters().catch(() => {
      /* 模块库加载失败时插入 Tab 为空列表 */
    });
    return () => {
      cancelled = true;
    };
  }, [refreshSectionMasters]);

  const handleBlockMasterSaved = useCallback((master: BlockMaster) => {
    setBlockMastersById((prev) => ({ ...prev, [master.masterId]: master }));
  }, []);

  const selectBlock = useCallback((ref: VirtualBlockRef | null) => {
    setSelectedBlockRef(ref);
    setBlockTreeSyncNonce((n) => n + 1);
  }, []);

  const onSelectPayloadSlot = useCallback(
    (slotId: string) => {
      setSelectedPayloadSlotId(slotId);
      if (!template) return;
      const slot = collectExternalVariableSlots(template).find((s) => s.slotId === slotId);
      if (!slot) return;
      const blockId = getSlotPrimaryBlockId(template, slot);
      if (blockId) selectBlock({ kind: "physical", blockId });
    },
    [selectBlock, template]
  );
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [requestedInspectorTab, setRequestedInspectorTab] = useState<InspectorMainTab | null>(
    null
  );
  const [renamingTemplate, setRenamingTemplate] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState(false);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [publishingTemplate, setPublishingTemplate] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createModalMode, setCreateModalMode] = useState<EmailTemplateCreateModalMode>("create");
  const [layoutVariantBusy, setLayoutVariantBusy] = useState(false);
  /** 以图 AI 创建版式：弹窗内分步进度 */
  const [aiPipelineSteps, setAiPipelineSteps] = useState<AiStepUiState[] | null>(null);
  const [metaSendTestNonce, setMetaSendTestNonce] = useState(0);
  const [metaCanSendTest, setMetaCanSendTest] = useState(false);
  /** 至少完成过一次非静默的列表拉取（成功或失败），用于区分「尚未请求」与「确实没有模板」 */
  const [emailCatalogReady, setEmailCatalogReady] = useState(false);

  const emailKeyRef = useRef<string | null>(emailKey);
  emailKeyRef.current = emailKey;
  const itemsRef = useRef(items);
  itemsRef.current = items;
  /** 递增序号：仅最后一次 loadEmail 可提交状态，避免快速切换时旧请求覆盖新选择 */
  const loadEmailRequestIdRef = useRef(0);
  /** 正在拉取数据的 emailKey；列表同步 effect 不应在此期间清空编辑态 */
  const pendingLoadEmailKeyRef = useRef<string | null>(null);
  /** 同 key+版式提示的 loadEmail 合并为一次请求（StrictMode 双调用 / 重复 effect） */
  const loadEmailInflightRef = useRef<Map<string, Promise<void>>>(new Map());
  const templateRef = useRef<EmailTemplate | null>(template);
  templateRef.current = template;
  const payloadRef = useRef<EmailPayload | null>(payload);
  payloadRef.current = payload;

  const reportOperationalError = useCallback((msg: string) => {
    if (templateRef.current && payloadRef.current) {
      toastError(msg);
      setError(null);
      return;
    }
    setError(msg);
  }, []);
  /** 首屏自动 loadEmail 只触发一次；超时 watchdog 负责重试 */
  const autoBootstrapAttemptedRef = useRef(false);
  const layoutVariantIdRef = useRef<string | null>(layoutVariantId);
  layoutVariantIdRef.current = layoutVariantId;
  const editorSyncStateRef = useRef({
    template,
    payload,
    tokenPresets,
  });
  editorSyncStateRef.current = { template, payload, tokenPresets };
  /** SSE 同步时判断：未保存的 payload 不应被磁盘快照覆盖（含新建变量落盘前） */
  const payloadDirtyRef = useRef(false);
  const lastPersistErrorRef = useRef("");
  const canvasScrollRef = useRef<HTMLDivElement | null>(null);
  const canvasStageRef = useRef<HTMLDivElement | null>(null);
  const [canvasBlockActionLayout, setCanvasBlockActionLayout] =
    useState<CanvasBlockActionLayout | null>(null);

  const loadList = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    try {
      const r = await api.listEmails();
      const sortedItems = sortEmailItemsByCreatedDesc(r.items);
      setItems((prev) => (isEmailItemsEqual(prev, sortedItems) ? prev : sortedItems));
      setError(null);
    } catch (e) {
      if (!silent) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (!silent) setEmailCatalogReady(true);
    }
  }, []);

  const loadGlobalTokenPresets = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      const r = await api.listGlobalTokenPresets();
      const map = Object.fromEntries(
        r.items
          .filter((item) => item.tokenPresets && !isLogicallyDeleted(item.tokenPresets))
          .map((item) => [item.presetId, item.tokenPresets])
      );
      setGlobalTokenPresets(map);
      setDiskGlobalTokenPresets(structuredClone(map));
    } catch (e) {
      if (!opts?.silent) setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  /** 模板列表事件订阅：由服务端监听文件变化并实时推送。 */
  const editorLive = Boolean(template && payload);

  useEffect(() => {
    if (!editorLive) return undefined;
    const unsubscribe = api.subscribeEmailListChanges(() => {
      void loadList({ silent: true });
    });
    return () => unsubscribe();
  }, [editorLive, loadList]);

  useEffect(() => {
    if (!editorLive) return undefined;
    void loadGlobalTokenPresets({ silent: true });
    const unsubscribe = api.subscribeTokenPresetChanges(() => {
      void loadGlobalTokenPresets({ silent: true });
    });
    return () => unsubscribe();
  }, [editorLive, loadGlobalTokenPresets]);

  useEffect(() => {
    message.config({ top: 60, maxCount: 3 });
  }, []);

  /** 公共预设文件被删或列表刷新后，当前选中 id 不存在时回落到本邮件 */
  useEffect(() => {
    if (stylePresetListSelection === "local") return;
    const keys = Object.keys(globalTokenPresets);
    if (keys.length === 0) return;
    if (!globalTokenPresets[stylePresetListSelection]) {
      setStylePresetListSelection("local");
    }
  }, [stylePresetListSelection, globalTokenPresets]);

  const loadEmail = useCallback(async (key: string, preferredLayoutId?: string | null) => {
    if (!key) return;
    const inflightKey = `${key}::${(preferredLayoutId ?? "").trim()}`;
    let promise = loadEmailInflightRef.current.get(inflightKey);
    if (promise) {
      await promise;
      return;
    }

    const previousKey = emailKeyRef.current;
    const requestId = ++loadEmailRequestIdRef.current;
    pendingLoadEmailKeyRef.current = key;
    setStatus("加载中…");
    setError(null);

    const layoutHint = (preferredLayoutId ?? readLayoutHintFromUrl() ?? "").trim() || null;

    promise = (async (): Promise<void> => {
    try {
      const manifest = await api.getLayoutManifest(key);
      const visibleLayoutIds = manifest
        ? new Set(listVisibleLayoutVariants(manifest.variants).map((v) => v.id))
        : null;
      const layoutHintVisible =
        manifest && layoutHint && visibleLayoutIds?.has(layoutHint) ? layoutHint : null;
      let layoutId: string | null = null;
      if (manifest) {
        const resolved = resolveEffectiveLayoutVariantId(manifest, layoutHintVisible);
        if (resolved.error) {
          throw new Error(resolved.error);
        }
        layoutId = resolved.layoutVariantId;
      }
      const t = normalizeEmailRootBlock(await api.getTemplate(key, layoutId));
      let sceneTemplates: Array<{ layoutVariantId: string; template: EmailTemplate }> = [];
      if (manifest && listVisibleLayoutVariants(manifest.variants).length > 1) {
        const visibleVariants = listVisibleLayoutVariants(manifest.variants);
        sceneTemplates = await Promise.all(
          visibleVariants.map(async (v) => ({
            layoutVariantId: v.id,
            template: normalizeEmailRootBlock(
              v.id === layoutId ? t : await api.getTemplate(key, v.id)
            ),
          }))
        );
      } else if (layoutId) {
        sceneTemplates = [{ layoutVariantId: layoutId, template: t }];
      }
      let p: EmailPayload | null = null;
      try {
        p = await api.getPayload(key);
      } catch {
        p = null;
      }
      if (!p) p = defaultPayload(t);
      let nextTokenPresets: TokenPresets | null = null;
      try {
        nextTokenPresets = await api.getTokenPresets(key, layoutId);
      } catch {
        nextTokenPresets = null;
      }
      if (!nextTokenPresets) nextTokenPresets = createDefaultTokenPresets();
      const [meta, globalList] = await Promise.all([
        api.getEmailMeta(key).catch(() => null),
        api.listGlobalTokenPresets().catch(() => ({ items: [] })),
      ]);
      if (meta && isLogicallyDeleted(meta)) {
        throw new Error("该邮件模板已逻辑删除，可在 meta.json 中删除 deletedAt 字段后恢复");
      }
      const globalMap = Object.fromEntries(
        globalList.items
          .filter((item) => item.tokenPresets && !isLogicallyDeleted(item.tokenPresets))
          .map((item) => [item.presetId, item.tokenPresets])
      );
      const globalIds = new Set(Object.keys(globalMap));
      const initialSel = resolveInitialStylePresetListSelection(meta, nextTokenPresets, globalIds);
      const tpNorm = tokenPresetsWithoutAppliedGlobal(nextTokenPresets);
      if (requestId !== loadEmailRequestIdRef.current) return;
      let manifestForState = manifest;
      if (manifest && layoutId && layoutId !== manifest.activeLayoutVariantId) {
        await api.putActiveLayoutVariant(key, layoutId);
        if (requestId !== loadEmailRequestIdRef.current) return;
        manifestForState = { ...manifest, activeLayoutVariantId: layoutId };
      }
      setGlobalPresetDraft({});
      setGlobalTokenPresets(globalMap);
      setDiskGlobalTokenPresets(structuredClone(globalMap));
      setEmailMeta(meta);
      setLayoutManifest(manifestForState);
      setSceneLayoutTemplates(sceneTemplates);
      setLayoutVariantId(layoutId);
      writeLayoutVariantToUrl(layoutId);
      setStylePresetListSelection(initialSel);
      setEmailKey(key);
      setTemplate(t);
      setPayload(p);
      setPayloadSlotDrafts({});
      setTokenPresets(tpNorm);
      setSelectedPayloadSlotId(null);
      selectBlock(null);
      setLastSelectedEmailKey(key);
      setDiskTemplatePayload({ template: structuredClone(t), payload: structuredClone(p) });
      setDiskTokenPresets(structuredClone(tpNorm));
      setStatus("");
    } catch (e) {
      if (requestId !== loadEmailRequestIdRef.current) return;
      setStatus("");
      reportOperationalError(e instanceof Error ? e.message : String(e));
      const list = itemsRef.current;
      const revertKey =
        previousKey && list.some((it) => it.emailKey === previousKey)
          ? previousKey
          : list[0]?.emailKey ?? null;
      if (revertKey && revertKey !== key) {
        void loadEmail(revertKey);
      } else {
        setEmailKey(null);
      }
    } finally {
      if (requestId === loadEmailRequestIdRef.current) {
        pendingLoadEmailKeyRef.current = null;
      }
    }
    })();

    loadEmailInflightRef.current.set(inflightKey, promise);
    try {
      await promise;
    } finally {
      if (loadEmailInflightRef.current.get(inflightKey) === promise) {
        loadEmailInflightRef.current.delete(inflightKey);
      }
    }
  }, [selectBlock]);

  useEffect(() => {
    if (!items.length || template || autoBootstrapAttemptedRef.current) return;
    if (pendingLoadEmailKeyRef.current) return;

    const fromUrl = readEmailKeyFromUrl(items);
    const rawUrlKey = readEmailKeyParamRaw();
    const urlKey =
      rawUrlKey && items.some((it) => it.emailKey === rawUrlKey) ? rawUrlKey : fromUrl;
    const lastKey = getLastSelectedEmailKey();
    const lastExists = lastKey ? items.some((it) => it.emailKey === lastKey) : false;
    const initialEmailKey = urlKey ?? (lastExists && lastKey ? lastKey : items[0]!.emailKey);

    autoBootstrapAttemptedRef.current = true;
    void loadEmail(initialEmailKey, readLayoutHintFromUrl());
  }, [items, template, loadEmail]);

  /** 首屏加载超时兜底：避免多标签/代理占满连接后永久停在「正在加载编辑器…」 */
  useEffect(() => {
    if (!emailCatalogReady || template) return undefined;
    const targetKey = readEmailKeyFromUrl(items) ?? readEmailKeyParamRaw();
    const timer = window.setTimeout(() => {
      if (templateRef.current) return;
      if (pendingLoadEmailKeyRef.current) return;
      const key =
        targetKey && items.some((it) => it.emailKey === targetKey)
          ? targetKey
          : items[0]?.emailKey;
      if (!key) return;
      setError((prev) => prev ?? "加载超时，正在重试…");
      void loadEmail(key, readLayoutHintFromUrl());
    }, 12_000);
    return () => window.clearTimeout(timer);
  }, [emailCatalogReady, template, items, loadEmail]);

  /** 列表已空或当前 key 不在列表中时，避免继续展示「加载中」或陈旧编辑态 */
  useEffect(() => {
    if (!emailKey) return;
    if (pendingLoadEmailKeyRef.current === emailKey) return;
    if (items.length === 0 || !items.some((it) => it.emailKey === emailKey)) {
      setEmailKey(null);
      setLayoutManifest(null);
      setLayoutVariantId(null);
      setTemplate(null);
      setPayload(null);
      setPayloadSlotDrafts({});
      setTokenPresets(null);
      setGlobalTokenPresets({});
      setStylePresetListSelection("local");
      setEmailMeta(null);
      setGlobalPresetDraft({});
      setDiskGlobalTokenPresets({});
      setDiskTemplatePayload(null);
      setDiskTokenPresets(null);
      selectBlock(null);
    }
  }, [items, emailKey, selectBlock]);

  const effectiveDesignTokens = useMemo(() => {
    if (!tokenPresets) return resolveDesignTokens(null);
    if (stylePresetListSelection === "local") {
      return resolveDesignTokens(tokenPresets);
    }
    const overlay = globalPresetDraft[stylePresetListSelection];
    const base = globalTokenPresets[stylePresetListSelection];
    const picked = overlay ?? base;
    if (picked) return resolveDesignTokens(picked);
    return resolveDesignTokens(tokenPresets);
  }, [tokenPresets, stylePresetListSelection, globalTokenPresets, globalPresetDraft]);

  const hasVisibilityBlocks = useMemo(() => templateHasVisibilityRules(template), [template]);

  useEffect(() => {
    setCanvasSimulateAllHidden(false);
  }, [emailKey, layoutVariantId]);

  useEffect(() => {
    if (!hasVisibilityBlocks) setCanvasSimulateAllHidden(false);
  }, [hasVisibilityBlocks]);

  const previewPayload = useMemo(() => {
    if (!payload) return null;
    return buildPreviewPayload(payload, payloadSlotDrafts);
  }, [payload, payloadSlotDrafts]);

  const handleSlotDraftChange = useCallback((slotId: string, draft: PayloadSlotDraft | null) => {
    setPayloadSlotDrafts((prev) => {
      if (!draft) return discardPayloadSlotDraft(prev, slotId);
      return { ...prev, [slotId]: draft };
    });
  }, []);

  const resolvedPreview = useMemo((): {
    previewModel: ReturnType<typeof buildRepeatPreviewModel> | null;
    issues: Array<{ path: string; reason: string }>;
  } => {
    if (!template || !previewPayload) return { previewModel: null, issues: [] };
    const afterVisibility: EmailTemplate = (() => {
      if (!hasVisibilityBlocks) {
        return applyVisibilityRules(template, previewPayload);
      }
      if (canvasSimulateAllHidden) {
        return applyVisibilityRules(template, previewPayload, { simulateAllHidden: true });
      }
      return template;
    })();
    let previewModel = buildRepeatPreviewModel(afterVisibility, previewPayload);
    const flat = previewModelToFlatTemplate(previewModel, afterVisibility);
    if (!containsThemeRef(flat)) {
      return { previewModel, issues: [] };
    }
    if (!effectiveDesignTokens) {
      return {
        previewModel: null,
        issues: [{ path: "tokenPresets", reason: "模板包含 $themeRef，但当前缺少可用的样式预设" }],
      };
    }
    const issues: Array<{ path: string; reason: string }> = [];
    previewModel = applyThemeToPreviewModel(previewModel, (block) =>
      resolveBlockTheme(block, { theme: effectiveDesignTokens, issues })
    );
    if (issues.length > 0) {
      return { previewModel: null, issues };
    }
    return { previewModel, issues: [] };
  }, [template, previewPayload, effectiveDesignTokens, hasVisibilityBlocks, canvasSimulateAllHidden]);

  const previewModel = resolvedPreview?.previewModel ?? null;
  const canvasRootConfiguredWidthPx = useMemo(() => {
    if (!previewModel) return resolveCanvasPreviewViewportWidth("desktop");
    const rootW = previewModel.root.block.props?.width;
    const width =
      typeof rootW === "string" && rootW.trim() ? rootW.trim() : EMAIL_ROOT_FIXED_WIDTH;
    return parseCssPx(width) ?? resolveCanvasPreviewViewportWidth("desktop");
  }, [previewModel]);
  const insertableEntries = useMemo(() => listInsertableCatalogEntries(), []);
  const sectionCatalogItems = useMemo(
    () => toSectionCatalogItems(Object.values(sectionMastersById)),
    [sectionMastersById]
  );
  const selectedCanvasBlockKey = selectedBlockRef ? refToStableKey(selectedBlockRef) : null;
  const selectedPhysicalBlockId = selectedBlockRef
    ? resolvePhysicalBlockId(selectedBlockRef)
    : null;
  const selectedPreviewNode =
    previewModel && selectedBlockRef
      ? findPreviewNodeByRef(previewModel, selectedBlockRef)
      : null;
  const selectedCanvasBlock = selectedPreviewNode?.block ?? null;
  const selectedSupportsChildInsert =
    selectedCanvasBlock?.type === "emailRoot" ||
    selectedCanvasBlock?.type === "layout" ||
    selectedCanvasBlock?.type === "grid" ||
    selectedCanvasBlock?.type === "image";
  const selectedSupportsBelowInsert = Boolean(
    selectedCanvasBlock && selectedCanvasBlock.type !== "emailRoot" && selectedCanvasBlock.parentId
  );
  const selectedTemplateBlock = useMemo(() => {
    if (!template || !selectedPhysicalBlockId) return null;
    return template.blocks[selectedPhysicalBlockId] ?? null;
  }, [template, selectedPhysicalBlockId]);
  const selectedCanSaveAsSection = Boolean(
    selectedTemplateBlock && canSaveAsSection(selectedTemplateBlock)
  );
  const showCanvasInsertActions =
    selectedSupportsChildInsert || selectedSupportsBelowInsert || selectedCanSaveAsSection;
  const selectedCanDelete = Boolean(
    selectedCanvasBlock && selectedCanvasBlock.type !== "emailRoot"
  );
  const isRepeatListBindingChild = useMemo(() => {
    if (!template || !selectedPhysicalBlockId) return false;
    return isRepeatListBindingChildBlock(template, selectedPhysicalBlockId);
  }, [template, selectedPhysicalBlockId]);
  const siblingMoveState = useMemo(() => {
    if (!template || !selectedPhysicalBlockId) return null;
    return getBlockSiblingMoveState(template, selectedPhysicalBlockId);
  }, [template, selectedPhysicalBlockId]);
  const selectedCanDuplicate = Boolean(
    selectedTemplateBlock &&
      selectedTemplateBlock.type !== "emailRoot" &&
      selectedTemplateBlock.parentId
  );
  const showCanvasLeftActions =
    !isRepeatListBindingChild &&
    (Boolean(siblingMoveState) || selectedCanDuplicate || showCanvasInsertActions);
  const showCanvasBlockActions =
    !isRepeatListBindingChild &&
    (showCanvasLeftActions || selectedCanDelete);
  const canvasActionsBusy = insertingBlock || deletingBlock || reorderingBlock;

  const canvasLeftActionButtonCount = showCanvasLeftActions
    ? countCanvasLeftActionButtons({
        siblingMoveEnabled: Boolean(siblingMoveState),
        canDuplicate: selectedCanDuplicate,
        supportsChildInsert: selectedSupportsChildInsert,
        supportsBelowInsert: selectedSupportsBelowInsert,
        canSaveAsSection: selectedCanSaveAsSection,
      })
    : 0;
  const canvasDeleteActionButtonCount = selectedCanDelete ? 1 : 0;

  useLayoutEffect(() => {
    if (!previewModel || !selectedCanvasBlockKey || !showCanvasBlockActions) {
      setCanvasBlockActionLayout(null);
      return;
    }

    const previewRootId = previewModel.root.block.id;

    const updateLayout = () => {
      const stage = canvasStageRef.current;
      const scroll = canvasScrollRef.current;
      if (!stage || !scroll) {
        setCanvasBlockActionLayout(null);
        return;
      }
      const rootEl = scroll.querySelector<HTMLElement>(
        `[data-email-preview-block="${escapePreviewBlockIdForSelector(previewRootId)}"]`
      );
      const selectedEl = scroll.querySelector<HTMLElement>(
        `[data-email-preview-block="${escapePreviewBlockIdForSelector(selectedCanvasBlockKey)}"]`
      );
      if (!rootEl || !selectedEl) {
        setCanvasBlockActionLayout(null);
        return;
      }
      const viewportEl = scroll.querySelector<HTMLElement>(".email-preview-viewport");
      const horizontalAnchorRect = pickCanvasBlockActionHorizontalAnchorRect({
        previewViewportPx: canvasPreviewViewportPx,
        rootConfiguredWidthPx: canvasRootConfiguredWidthPx,
        previewRootRect: rootEl.getBoundingClientRect(),
        previewViewportRect: viewportEl?.getBoundingClientRect() ?? null,
      });
      const layout = computeCanvasBlockActionLayout({
        stageRect: stage.getBoundingClientRect(),
        horizontalAnchorRect,
        selectedBlockRect: selectedEl.getBoundingClientRect(),
        insertButtonCount: canvasLeftActionButtonCount,
        deleteButtonCount: canvasDeleteActionButtonCount,
      });
      setCanvasBlockActionLayout((prev) => {
        if (
          prev &&
          prev.insert.top === layout.insert.top &&
          prev.insert.verticalAlign === layout.insert.verticalAlign &&
          prev.delete.top === layout.delete.top &&
          prev.delete.verticalAlign === layout.delete.verticalAlign &&
          prev.insertLeft === layout.insertLeft &&
          prev.deleteLeft === layout.deleteLeft
        ) {
          return prev;
        }
        return layout;
      });
    };

    updateLayout();
    const scroll = canvasScrollRef.current;
    scroll?.addEventListener("scroll", updateLayout);
    window.addEventListener("resize", updateLayout);
    return () => {
      scroll?.removeEventListener("scroll", updateLayout);
      window.removeEventListener("resize", updateLayout);
    };
  }, [
    previewModel,
    selectedCanvasBlockKey,
    showCanvasBlockActions,
    canvasLeftActionButtonCount,
    canvasDeleteActionButtonCount,
    blockTreeSyncNonce,
    canvasPreviewViewportPx,
    canvasRootConfiguredWidthPx,
  ]);

  const templatesForPayloadValidation = useMemo(() => {
    if (!template || !layoutVariantId) return [];
    if (sceneLayoutTemplates.length <= 1) return [template];
    return sceneLayoutTemplates.map((item) =>
      item.layoutVariantId === layoutVariantId ? template : item.template
    );
  }, [sceneLayoutTemplates, template, layoutVariantId]);

  const validationIssues = useMemo(() => {
    if (!template || !payload) return [];
    const payloadIssues =
      templatesForPayloadValidation.length > 1
        ? validatePayloadAgainstTemplateUnion(templatesForPayloadValidation, payload)
        : validatePayloadAgainstTemplate(template, payload);
    return [
      ...validateTemplate(template),
      ...payloadIssues,
      ...validateTokenPresets(tokenPresets),
      ...(resolvedPreview?.issues ?? []),
    ];
  }, [template, payload, tokenPresets, resolvedPreview, templatesForPayloadValidation]);

  const validationContext = useValidationIssuesForContext({
    issues: validationIssues,
    template,
    selectedBlockRef,
    workbenchView,
  });

  const handleNavigateValidationIssue = useCallback(
    (classified: ClassifiedValidationIssue) => {
      const { parsed, workbenchView: view, inspectorTab } = classified;
      if (parsed.layoutVariantId && emailKey && parsed.layoutVariantId !== layoutVariantId) {
        void loadEmail(emailKey, parsed.layoutVariantId);
      }
      if (view) setWorkbenchView(view);
      if (parsed.blockId) {
        selectBlock({ kind: "physical", blockId: parsed.blockId });
      } else if (view === "block") {
        selectBlock(null);
      }
      if (parsed.slotId) setSelectedPayloadSlotId(parsed.slotId);
      if (inspectorTab) setRequestedInspectorTab(inspectorTab);
    },
    [emailKey, layoutVariantId, loadEmail, selectBlock]
  );

  const payloadSlotDraftsDirty = useMemo(() => {
    if (!payload) return false;
    return hasDirtyPayloadSlotDrafts(payload, payloadSlotDrafts);
  }, [payload, payloadSlotDrafts]);

  const templateDirty = useMemo(() => {
    if (!diskTemplatePayload || !template) return false;
    return (
      stableStringify(template) !== stableStringify(diskTemplatePayload.template)
    );
  }, [diskTemplatePayload, template]);

  const payloadDirty = useMemo(() => {
    if (!diskTemplatePayload || !payload) return payloadSlotDraftsDirty;
    return (
      payloadSlotDraftsDirty ||
      stableStringify(payload) !== stableStringify(diskTemplatePayload.payload)
    );
  }, [diskTemplatePayload, payload, payloadSlotDraftsDirty]);
  payloadDirtyRef.current = payloadDirty;

  const tokenPresetsDirty = useMemo(() => {
    if (stylePresetListSelection !== "local") return false;
    if (!diskTokenPresets || !tokenPresets) return false;
    return (
      stableStringify(tokenPresetsWithoutAppliedGlobal(tokenPresets)) !==
      stableStringify(tokenPresetsWithoutAppliedGlobal(diskTokenPresets))
    );
  }, [diskTokenPresets, tokenPresets, stylePresetListSelection]);

  const globalStylePresetDirty = useMemo(() => {
    if (stylePresetListSelection === "local") return false;
    const id = stylePresetListSelection;
    const disk = diskGlobalTokenPresets[id];
    if (!disk) return false;
    const eff = globalPresetDraft[id] ?? globalTokenPresets[id];
    if (!eff) return false;
    return stableStringify(eff) !== stableStringify(disk);
  }, [stylePresetListSelection, diskGlobalTokenPresets, globalTokenPresets, globalPresetDraft]);

  const onUpdate = useCallback(
    (next: { template: EmailTemplate; payload: EmailPayload }) => {
      setTemplate(next.template);
      setPayload(next.payload);
    },
    []
  );

  const onTemplateChange = useCallback((nextTemplate: EmailTemplate, options?: TemplateChangeOptions) => {
    if (options?.selectBlockRef !== undefined) {
      setSelectedBlockRef(options.selectBlockRef);
    } else {
      setSelectedBlockRef((current) =>
        template !== null
          ? reconcileSelectedBlockRefAfterTemplateChange(template, nextTemplate, current)
          : current
      );
    }
    setTemplate(nextTemplate);
  }, [template]);

  const onPersistSuccess = useCallback(
    async () => {
      setStatus("已保存");
      setError(null);
      void loadList();
    },
    [loadList]
  );

  const onPersistError = useCallback(
    (msg: string) => {
      lastPersistErrorRef.current = msg;
      setStatus("");
      if (errorMessageDuplicatesValidationIssues(msg, validationIssues)) {
        toastError(validationSaveBlockedMessage(validationIssues));
        return;
      }
      reportOperationalError(msg);
    },
    [validationIssues, reportOperationalError]
  );

  const { persistPayloadSlotCatalog, persistTemplatePayloadCatalog } = useEmailDiskPersist({
    emailKey,
    layoutVariantId,
    layoutManifest,
    template,
    payload,
    onPersistSuccess,
    onPersistError,
  });

  const handlePayloadVariableCreated = useCallback(
    async (nextPayload: EmailPayload, slotId: string) => {
      if (!emailKey || !template) {
        const msg = "邮件尚未加载完成，无法创建变量。";
        message.error(msg);
        throw new Error(msg);
      }
      setStatus("变量入库中…");
      setError(null);
      lastPersistErrorRef.current = "";
      const ok = await persistPayloadSlotCatalog(nextPayload);
      if (!ok) {
        setStatus("");
        const detail = lastPersistErrorRef.current.trim();
        const msg = detail
          ? `变量未能写入 payload.json：${detail}`
          : "变量未能写入 payload.json，创建已取消。";
        message.error(msg);
        throw new Error(msg);
      }
      setPayload(nextPayload);
      setSelectedPayloadSlotId(slotId);
      setDiskTemplatePayload({
        template: structuredClone(template),
        payload: structuredClone(nextPayload),
      });
      setStatus("变量已创建");
      message.success("变量已创建并写入 payload.json", 1.6);
    },
    [emailKey, template, persistPayloadSlotCatalog]
  );

  const handleCommitPayloadSlot = useCallback(
    async (slotId: string) => {
      if (!payload) return;
      const draft = payloadSlotDrafts[slotId];
      if (!draft) return;
      const nextPayload = commitPayloadSlotDraft(payload, slotId, draft);
      setPayload(nextPayload);
      setPayloadSlotDrafts((prev) => discardPayloadSlotDraft(prev, slotId));
      if (!template) return;
      setStatus("变量保存中…");
      setError(null);
      const ok = await persistPayloadSlotCatalog(nextPayload);
      if (ok) {
        setDiskTemplatePayload({
          template: structuredClone(template),
          payload: structuredClone(nextPayload),
        });
        setStatus("变量已保存");
        message.info("变量已写入 payload.json", 1.6);
      } else {
        setStatus("");
      }
    },
    [payload, payloadSlotDrafts, template, persistPayloadSlotCatalog]
  );

  const handlePayloadVariableDeleted = useCallback(
    async (next: { template: EmailTemplate; payload: EmailPayload; slotId: string }) => {
      if (!emailKey || !template) {
        const msg = "邮件尚未加载完成，无法删除变量。";
        message.error(msg);
        throw new Error(msg);
      }
      setStatus("变量删除中…");
      setError(null);
      const ok = await persistTemplatePayloadCatalog(next.template, next.payload);
      if (!ok) {
        setStatus("");
        const msg = "变量未能从库中删除，请查看顶部错误说明。";
        message.error(msg);
        throw new Error(msg);
      }
      setTemplate(next.template);
      setPayload(next.payload);
      setPayloadSlotDrafts((prev) => discardPayloadSlotDraft(prev, next.slotId));
      setSelectedPayloadSlotId((prev) => {
        if (prev !== next.slotId) return prev;
        const remaining = Object.keys(next.payload.slots ?? {});
        return remaining[0] ?? null;
      });
      setDiskTemplatePayload({
        template: structuredClone(next.template),
        payload: structuredClone(next.payload),
      });
      setStatus("变量已删除");
      message.success("变量已从 payload.json 与模板中删除", 1.6);
    },
    [emailKey, template, persistTemplatePayloadCatalog]
  );

  const hasLayoutDirty = templateDirty || payloadDirty || tokenPresetsDirty || globalStylePresetDirty;

  const confirmDiscardLayoutDirty = useCallback(async (): Promise<boolean> => {
    if (!hasLayoutDirty) return true;
    return confirm({
      title: "未保存的更改",
      message: "当前版式有未保存的更改，继续后将丢弃这些编辑。是否继续？",
      confirmLabel: "继续",
    });
  }, [confirm, hasLayoutDirty]);

  const createLayoutVariant = useCallback(
    async (
      label: string,
      options?: {
        copyFromLayoutVariantId?: string;
        designImageFile?: File;
        mjsGenerateMode?: MjsGenerateMode;
      }
    ) => {
      if (!emailKey) return;
      if (!(await confirmDiscardLayoutDirty())) return;
      const copyFrom = options?.copyFromLayoutVariantId?.trim() || null;
      const designImageFile = options?.designImageFile ?? null;
      const aiFromImage = Boolean(designImageFile);
      setLayoutVariantBusy(true);
      if (aiFromImage) setAiPipelineSteps([]);
      setStatus(
        copyFrom
          ? "正在复制版式…"
          : aiFromImage
            ? "正在根据设计图生成版式…"
            : "正在创建新版式…"
      );
      setError(null);
      try {
        const created = aiFromImage
          ? await api.createLayoutVariantFromDesignImage(emailKey, label, designImageFile!, {
              mjsGenerateMode: options?.mjsGenerateMode,
              onProgress: (payload) => {
                setAiPipelineSteps((prev) => reduceAiPipelineProgress(prev, payload));
              },
            })
          : await api.createLayoutVariant(emailKey, {
              label,
              ...(copyFrom ? { copyFromLayoutVariantId: copyFrom } : {}),
            });
        setLayoutManifest(created.manifest);
        await loadEmail(emailKey, created.layoutVariantId);
        setStatus(copyFrom ? "版式已复制" : aiFromImage ? "版式已生成" : "新版式已创建");
        message.info(
          copyFrom
            ? `已复制版式「${created.label}」`
            : aiFromImage
              ? `已生成版式「${created.label}」`
              : `已创建版式「${created.label}」`
        );
        setAiPipelineSteps(null);
      } catch (e) {
        setStatus("");
        reportOperationalError(e instanceof Error ? e.message : String(e));
        throw e;
      } finally {
        setLayoutVariantBusy(false);
      }
    },
    [confirmDiscardLayoutDirty, emailKey, loadEmail, reportOperationalError]
  );

  const renameLayoutVariant = useCallback(
    async (label: string) => {
      if (!emailKey || !layoutVariantId || !layoutManifest) return;
      setLayoutVariantBusy(true);
      setStatus("版式名称保存中…");
      setError(null);
      try {
        const updated = await api.patchLayoutVariant(emailKey, layoutVariantId, { label });
        setLayoutManifest(updated.manifest);
        setStatus("版式名称已更新");
        message.info("版式名称已更新");
      } catch (e) {
        setStatus("");
        reportOperationalError(e instanceof Error ? e.message : String(e));
        throw e;
      } finally {
        setLayoutVariantBusy(false);
      }
    },
    [emailKey, layoutManifest, layoutVariantId]
  );

  const setLayoutVariantPublishStatus = useCallback(
    async (publishStatus: PublishStatus) => {
      if (!emailKey || !layoutVariantId || !layoutManifest) return;
      setLayoutVariantBusy(true);
      setStatus("更新版式发布状态中…");
      setError(null);
      try {
        const updated = await api.patchLayoutVariant(emailKey, layoutVariantId, { publishStatus });
        setLayoutManifest(updated.manifest);
        setStatus(publishStatus === "published" ? "版式已发布" : "版式已撤回发布");
        message.info(publishStatus === "published" ? "版式已发布，活动 V2 可选用" : "版式已撤回发布");
      } catch (e) {
        setStatus("");
        reportOperationalError(e instanceof Error ? e.message : String(e));
        throw e;
      } finally {
        setLayoutVariantBusy(false);
      }
    },
    [emailKey, layoutManifest, layoutVariantId]
  );

  const switchLayoutVariant = useCallback(
    async (nextLayoutId: string) => {
      if (!emailKey || !layoutManifest) return;
      if (nextLayoutId === layoutVariantId) return;
      if (!(await confirmDiscardLayoutDirty())) {
        return;
      }
      setStatus("切换版式中…");
      setError(null);
      try {
        if (nextLayoutId !== layoutManifest.activeLayoutVariantId) {
          await api.putActiveLayoutVariant(emailKey, nextLayoutId);
        }
        await loadEmail(emailKey, nextLayoutId);
      } catch (e) {
        setStatus("");
        reportOperationalError(e instanceof Error ? e.message : String(e));
      }
    },
    [confirmDiscardLayoutDirty, emailKey, layoutManifest, layoutVariantId, loadEmail]
  );

  const openInsertModal = useCallback((mode: InsertBlockMode) => {
    setInsertModalMode(mode);
    setInsertModalOpen(true);
    void refreshSectionMasters().catch(() => {});
  }, [refreshSectionMasters]);

  const closeInsertModal = useCallback(() => {
    if (insertingBlock) return;
    setInsertModalOpen(false);
  }, [insertingBlock]);

  const handlePickInsertBlock = useCallback(
    async (entry: BlockCatalogEntry) => {
      if (!template) return;
      setInsertingBlock(true);
      try {
        const result = insertCatalogBlockIntoTemplate({
          template,
          selectedBlockId: selectedPhysicalBlockId,
          mode: insertModalMode,
          entry,
          tokenPresets,
          blockMastersById,
        });
        setTemplate(result.template);
        selectBlock({ kind: "physical", blockId: result.insertedBlockId });
        setInsertModalOpen(false);
        setStatus(
          insertModalMode === "child"
            ? `已插入子级「${entry.name}」`
            : `已在下方插入「${entry.name}」`
        );
      } catch (e) {
        reportOperationalError(e instanceof Error ? e.message : String(e));
      } finally {
        setInsertingBlock(false);
      }
    },
    [template, selectedPhysicalBlockId, insertModalMode, selectBlock, tokenPresets, blockMastersById]
  );

  const handlePickInsertSection = useCallback(
    async (masterId: string) => {
      if (!template) return;
      const section = sectionMastersById[masterId];
      if (!section) {
        reportOperationalError("模块不存在或已删除，请刷新后重试");
        return;
      }
      setInsertingBlock(true);
      try {
        const result = insertSectionIntoTemplate({
          template,
          selectedBlockId: selectedPhysicalBlockId,
          mode: insertModalMode,
          section,
          tokenPresets,
        });
        setTemplate(result.template);
        selectBlock({ kind: "physical", blockId: result.insertedBlockId });
        setInsertModalOpen(false);
        setStatus(
          insertModalMode === "child"
            ? `已插入子级模块「${section.name}」`
            : `已在下方插入模块「${section.name}」`
        );
      } catch (e) {
        reportOperationalError(e instanceof Error ? e.message : String(e));
      } finally {
        setInsertingBlock(false);
      }
    },
    [
      template,
      selectedPhysicalBlockId,
      insertModalMode,
      selectBlock,
      tokenPresets,
      sectionMastersById,
    ]
  );

  const handleSaveSection = useCallback(
    async (name: string) => {
      if (!template || !selectedPhysicalBlockId) return;
      setSavingSection(true);
      try {
        const existingIds = Object.keys(sectionMastersById);
        const masterId = deriveNewSectionMasterId(existingIds);
        const draft = extractSectionFromTemplate({
          template,
          payload:
            previewPayload ??
            payload ??
            ({ schemaVersion: "1.0.0", slots: {}, values: {} } as EmailPayload),
          rootBlockId: selectedPhysicalBlockId,
          masterId,
          name,
          tokenPresets,
          previewFlatTemplate: previewFlatTemplateFromModel(previewModel, template),
          getMergedBlock: (blockId) =>
            mergedBlockFromPreviewModel(previewModel, blockId, selectedBlockRef),
        });
        const saved = await api.createSectionMaster(draft);
        setSectionMastersById((prev) => ({ ...prev, [saved.masterId]: saved }));
        setSaveSectionModalOpen(false);
        message.success(`模块「${saved.name}」已保存`);
        setStatus(`已保存模块「${saved.name}」`);
      } finally {
        setSavingSection(false);
      }
    },
    [
      template,
      payload,
      previewPayload,
      previewModel,
      selectedPhysicalBlockId,
      selectedBlockRef,
      sectionMastersById,
      tokenPresets,
    ]
  );

  const handleRenameSection = useCallback(async (masterId: string, name: string) => {
    const saved = await api.renameSectionMaster(masterId, name);
    setSectionMastersById((prev) => ({ ...prev, [saved.masterId]: saved }));
    message.success("模块已重命名");
  }, []);

  const handleDeleteSection = useCallback(
    async (masterId: string) => {
      const section = sectionMastersById[masterId];
      if (!section) return;
      try {
        await api.deleteSectionMaster(masterId);
        setSectionMastersById((prev) => {
          const next = { ...prev };
          delete next[masterId];
          return next;
        });
        message.success(`已删除模块「${section.name}」`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        message.error(msg);
        throw e;
      }
    },
    [sectionMastersById]
  );

  const handleDeleteSelectedCanvasBlock = useCallback(async () => {
    if (!template || !selectedPhysicalBlockId || deletingBlock) return;
    const block = template.blocks[selectedPhysicalBlockId];
    if (!block || block.type === "emailRoot") return;
    const label = template.blockMeta?.[selectedPhysicalBlockId]?.name?.trim() || selectedPhysicalBlockId;
    const hasChildren = (block.children?.length ?? 0) > 0;
    const ok = await confirm({
      title: "删除区块",
      message: hasChildren
        ? `确定删除区块「${label}」吗？其全部子级将一并删除。`
        : `确定删除区块「${label}」吗？`,
      confirmLabel: "删除",
      danger: true,
    });
    if (!ok) return;

    setDeletingBlock(true);
    try {
      const parentId = block.parentId;
      const next = deleteBlockFromTemplate(template, selectedPhysicalBlockId);
      setTemplate(next);
      selectBlock(parentId ? { kind: "physical", blockId: parentId } : null);
      setStatus(`已删除「${label}」`);
    } catch (e) {
      reportOperationalError(e instanceof Error ? e.message : String(e));
    } finally {
      setDeletingBlock(false);
    }
  }, [confirm, template, selectedPhysicalBlockId, deletingBlock, selectBlock]);

  const handleMoveSelectedCanvasBlock = useCallback(
    (direction: "up" | "down") => {
      if (!template || !selectedPhysicalBlockId || canvasActionsBusy) return;
      setReorderingBlock(true);
      try {
        const next = moveBlockAmongSiblings(template, selectedPhysicalBlockId, direction);
        setTemplate(next);
        setStatus(direction === "up" ? "已上移" : "已下移");
      } catch (e) {
        reportOperationalError(e instanceof Error ? e.message : String(e));
      } finally {
        setReorderingBlock(false);
      }
    },
    [template, selectedPhysicalBlockId, canvasActionsBusy]
  );

  const handleDuplicateSelectedCanvasBlock = useCallback(() => {
    if (!template || !selectedPhysicalBlockId || canvasActionsBusy) return;
    setReorderingBlock(true);
    try {
      const { template: next, duplicatedRootId } = duplicateBlockBelow(
        template,
        selectedPhysicalBlockId
      );
      setTemplate(next);
      selectBlock({ kind: "physical", blockId: duplicatedRootId });
      const label = next.blockMeta?.[duplicatedRootId]?.name?.trim() || duplicatedRootId;
      setStatus(`已复制「${label}」`);
    } catch (e) {
      reportOperationalError(e instanceof Error ? e.message : String(e));
    } finally {
      setReorderingBlock(false);
    }
  }, [template, selectedPhysicalBlockId, canvasActionsBusy, selectBlock]);

  const save = useCallback(async () => {
    if (!emailKey || !template || !payload) return;
    setStatus("区块保存中…");
    setError(null);
    const issues = [...validateTemplate(template), ...validatePayloadAgainstTemplate(template, payload)];
    if (issues.length > 0) {
      setStatus("");
      toastError(validationSaveBlockedMessage(issues));
      return;
    }
    try {
      await api.putTemplate(emailKey, template, layoutVariantId);
      setDiskTemplatePayload((prev) => ({
        template: structuredClone(template),
        payload: prev?.payload ? structuredClone(prev.payload) : structuredClone(payload),
      }));
      setStatus("");
      setError(null);
      message.success("区块已保存", 2);
      void loadList({ silent: true });
    } catch (e) {
      setStatus("");
      reportOperationalError(e instanceof Error ? e.message : String(e));
    }
  }, [emailKey, layoutVariantId, template, payload, loadList]);

  const discardDraft = useCallback(() => {
    if (!diskTemplatePayload) return;
    setTemplate(structuredClone(diskTemplatePayload.template));
    message.info("已放弃未保存区块更改", 1.6);
  }, [diskTemplatePayload]);

  const saveTokenPresets = useCallback(async () => {
    if (!emailKey || !tokenPresets) return;
    setStatus("正在保存本邮件样式预设…");
    setError(null);
    try {
      const body = normalizeTokenPresetsDocument(tokenPresetsWithoutAppliedGlobal(tokenPresets));
      await api.putTokenPresets(emailKey, body, layoutVariantId);
      setTokenPresets(body);
      setDiskTokenPresets(structuredClone(body));
      setStatus("已保存样式预设");
      message.info("本邮件样式预设已保存");
      void loadList({ silent: true });
    } catch (e) {
      setStatus("");
      reportOperationalError(e instanceof Error ? e.message : String(e));
    }
  }, [emailKey, layoutVariantId, tokenPresets, loadList]);

  const saveGlobalStylePreset = useCallback(async () => {
    if (stylePresetListSelection === "local") return;
    const presetId = stylePresetListSelection;
    const picked = globalPresetDraft[presetId] ?? globalTokenPresets[presetId];
    if (!picked) return;
    setStatus("正在保存公共样式预设…");
    setError(null);
    try {
      const body = normalizeTokenPresetsDocument(tokenPresetsWithoutAppliedGlobal(picked));
      await api.putGlobalTokenPreset(presetId, body);
      setGlobalTokenPresets((prev) => ({ ...prev, [presetId]: structuredClone(body) }));
      setDiskGlobalTokenPresets((prev) => ({ ...prev, [presetId]: structuredClone(body) }));
      setGlobalPresetDraft((prev) => {
        const n = { ...prev };
        delete n[presetId];
        return n;
      });
      setStatus("已保存公共样式预设");
      message.info("公共样式预设已保存");
      void loadList({ silent: true });
    } catch (e) {
      setStatus("");
      reportOperationalError(e instanceof Error ? e.message : String(e));
    }
  }, [stylePresetListSelection, globalPresetDraft, globalTokenPresets, loadList]);

  const saveCurrentStylePresetFromPanel = useCallback(async () => {
    if (stylePresetListSelection === "local") await saveTokenPresets();
    else await saveGlobalStylePreset();
  }, [stylePresetListSelection, saveTokenPresets, saveGlobalStylePreset]);

  const onSelectGlobalStylePreset = useCallback((presetId: string) => {
    if (!globalTokenPresets[presetId]) return;
    setStylePresetListSelection(presetId);
  }, [globalTokenPresets]);

  const createGlobalStylePreset = useCallback(
    async (displayLabel: string) => {
      setError(null);
      const presetId = derivePublicTokenPresetId(displayLabel, Object.keys(globalTokenPresets));
      const body = normalizeTokenPresetsDocument(
        tokenPresetsWithoutAppliedGlobal(buildNewPublicTokenPresetsDocument(displayLabel))
      );
      await api.putGlobalTokenPreset(presetId, body);
      setGlobalTokenPresets((prev) => ({ ...prev, [presetId]: structuredClone(body) }));
      setDiskGlobalTokenPresets((prev) => ({ ...prev, [presetId]: structuredClone(body) }));
      setGlobalPresetDraft((prev) => {
        const n = { ...prev };
        delete n[presetId];
        return n;
      });
      setStylePresetListSelection(presetId);
      message.success(`已创建公共预设「${displayLabel}」`);
      void loadGlobalTokenPresets({ silent: true });
    },
    [globalTokenPresets, loadGlobalTokenPresets]
  );

  const onSelectLocalStylePreset = useCallback(() => {
    setStylePresetListSelection("local");
  }, []);

  const persistTemplateDefaultStylePreset = useCallback(async () => {
    if (!emailKey) return;
    setStatus("正在写入模板默认样式预设…");
    setError(null);
    try {
      const value = stylePresetListSelection;
      await api.putEmailMeta(emailKey, { defaultStylePresetSelection: value });
      const nextMeta = await api.getEmailMeta(emailKey).catch(() => null);
      setEmailMeta(nextMeta);
      setStatus("已更新模板默认样式预设");
      message.info("已设为模板默认样式预设");
    } catch (e) {
      setStatus("");
      reportOperationalError(e instanceof Error ? e.message : String(e));
    }
  }, [emailKey, stylePresetListSelection]);

  const submitTemplateCreateModal = useCallback(
    async (displayName: string) => {
      const isCopy = createModalMode === "copy";
      setCreatingTemplate(true);
      setStatus(isCopy ? "正在复制模板…" : "正在创建新模板…");
      setError(null);
      try {
        const created = await api.createEmail({
          displayName,
          ...(isCopy && emailKey ? { copyFromEmailKey: emailKey } : {}),
        });
        await loadList({ silent: true });
        setCreateModalOpen(false);
        await loadEmail(created.emailKey);
        setStatus(isCopy ? "模板已复制" : "新模板已创建");
        message.info(isCopy ? `已复制为「${created.displayName}」` : `已创建模板「${created.displayName}」`);
      } catch (e) {
        setStatus("");
        reportOperationalError(e instanceof Error ? e.message : String(e));
        throw e;
      } finally {
        setCreatingTemplate(false);
      }
    },
    [createModalMode, emailKey, loadEmail, loadList]
  );

  const openCreateTemplateModal = useCallback(() => {
    setCreateModalMode("create");
    setCreateModalOpen(true);
  }, []);

  const openCopyTemplateModal = useCallback(() => {
    setCreateModalMode("copy");
    setCreateModalOpen(true);
  }, []);

  const renameCurrentTemplate = useCallback(
    async (displayName: string) => {
      if (!emailKey) return;
      setRenamingTemplate(true);
      setStatus("模板名称保存中…");
      setError(null);
      try {
        await api.putEmailMeta(emailKey, { displayName });
        setItems((prev) =>
          prev.map((it) =>
            it.emailKey === emailKey
              ? {
                  ...it,
                  displayName,
                }
              : it
          )
        );
        setStatus("模板名称已更新");
        message.info("模板名称已更新");
        void loadList();
      } catch (e) {
        setStatus("");
        reportOperationalError(e instanceof Error ? e.message : String(e));
        throw e;
      } finally {
        setRenamingTemplate(false);
      }
    },
    [emailKey, loadList]
  );

  const setTemplatePublishStatus = useCallback(
    async (publishStatus: PublishStatus) => {
      if (!emailKey) return;
      setPublishingTemplate(true);
      setStatus("更新模板发布状态中…");
      setError(null);
      try {
        await api.putEmailMeta(emailKey, { publishStatus });
        setItems((prev) =>
          prev.map((it) => (it.emailKey === emailKey ? { ...it, publishStatus } : it))
        );
        setStatus(publishStatus === "published" ? "模板已发布" : "模板已撤回发布");
        message.info(publishStatus === "published" ? "模板已发布，活动 V2 可选用" : "模板已撤回发布");
        void loadList();
      } catch (e) {
        setStatus("");
        reportOperationalError(e instanceof Error ? e.message : String(e));
        throw e;
      } finally {
        setPublishingTemplate(false);
      }
    },
    [emailKey, loadList]
  );

  const deleteCurrentTemplate = useCallback(async () => {
    if (!emailKey) return;
    if (!(await confirmDiscardLayoutDirty())) return;
    const deletedKey = emailKey;
    setDeletingTemplate(true);
    setStatus("正在删除模板…");
    setError(null);
    try {
      await api.deleteEmail(deletedKey);
      const r = await api.listEmails();
      const sorted = sortEmailItemsByCreatedDesc(r.items);
      setItems(sorted);
      const nextKey = sorted[0]?.emailKey ?? null;
      if (nextKey) {
        await loadEmail(nextKey);
        message.info("邮件模板已删除");
      } else {
        setEmailKey(null);
        setTemplate(null);
        setPayload(null);
        setLayoutManifest(null);
        setLayoutVariantId(null);
        setStatus("");
        message.info("邮件模板已删除，当前无其它模板");
      }
    } catch (e) {
      setStatus("");
      reportOperationalError(e instanceof Error ? e.message : String(e));
      throw e;
    } finally {
      setDeletingTemplate(false);
    }
  }, [confirmDiscardLayoutDirty, emailKey, loadEmail]);

  const deleteCurrentLayoutVariant = useCallback(async () => {
    if (!emailKey || !layoutVariantId || !layoutManifest) return;
    if (!(await confirmDiscardLayoutDirty())) return;
    setLayoutVariantBusy(true);
    setStatus("正在删除版式…");
    setError(null);
    try {
      const result = await api.deleteLayoutVariant(emailKey, layoutVariantId);
      setLayoutManifest(result.manifest);
      await loadEmail(emailKey, result.activeLayoutVariantId);
      setStatus("版式已删除");
      message.info("版式已删除");
    } catch (e) {
      setStatus("");
      reportOperationalError(e instanceof Error ? e.message : String(e));
      throw e;
    } finally {
      setLayoutVariantBusy(false);
    }
  }, [confirmDiscardLayoutDirty, emailKey, layoutManifest, layoutVariantId, loadEmail]);

  const deleteGlobalStylePreset = useCallback(
    async (presetId: string) => {
      setError(null);
      try {
        await api.deleteGlobalTokenPreset(presetId);
        setGlobalTokenPresets((prev) => {
          const n = { ...prev };
          delete n[presetId];
          return n;
        });
        setDiskGlobalTokenPresets((prev) => {
          const n = { ...prev };
          delete n[presetId];
          return n;
        });
        setGlobalPresetDraft((prev) => {
          const n = { ...prev };
          delete n[presetId];
          return n;
        });
        if (stylePresetListSelection === presetId) {
          setStylePresetListSelection("local");
        }
        message.info("公共样式预设已删除");
        void loadGlobalTokenPresets({ silent: true });
      } catch (e) {
        reportOperationalError(e instanceof Error ? e.message : String(e));
        throw e;
      }
    },
    [loadGlobalTokenPresets, stylePresetListSelection]
  );

  /** 当前模板事件订阅：由服务端监听文件变化并推送，前端按当前版式精准同步。 */
  useEffect(() => {
    if (!emailKey || !editorLive) return undefined;
    let cancelled = false;
    let syncing = false;
    const syncCurrentEmail = async (changeEvent: { reason?: string }) => {
      if (syncing) return;
      if (pendingLoadEmailKeyRef.current === emailKey) return;
      syncing = true;
      const beforeSnapshot = emailDataSyncEditorSnapshot(editorSyncStateRef.current);
      try {
        const layoutId = layoutVariantIdRef.current;
        const t = normalizeEmailRootBlock(await api.getTemplate(emailKey, layoutId));
        let p: EmailPayload | null = null;
        try {
          p = await api.getPayload(emailKey);
        } catch {
          p = null;
        }
        if (!p) p = defaultPayload(t);
        let nextTokenPresets: TokenPresets | null = null;
        try {
          nextTokenPresets = await api.getTokenPresets(emailKey, layoutId);
        } catch {
          nextTokenPresets = null;
        }
        if (!nextTokenPresets) nextTokenPresets = createDefaultTokenPresets();
        if (cancelled) return;
        const tpSynced = tokenPresetsWithoutAppliedGlobal(nextTokenPresets);
        const afterSnapshot = emailDataSyncEditorSnapshot({
          template: t,
          payload: p,
          tokenPresets: tpSynced,
        });
        setTemplate(t);
        if (payloadDirtyRef.current) {
          const editorPayload = editorSyncStateRef.current.payload;
          if (editorPayload) {
            setPayload(editorPayload);
          }
        } else {
          setPayload(p);
        }
        setTokenPresets(tpSynced);
        setDiskTokenPresets(structuredClone(tpSynced));
        if (
          shouldShowEmailDataSyncToast({
            reason: changeEvent.reason,
            beforeSnapshot,
            afterSnapshot,
          })
        ) {
          message.info("检测到邮件模板 JSON 文件存在变更，已为你自动同步更新", 4.2);
        }
        void loadList({ silent: true });
      } catch {
        /* SSE 同步失败静默：保持当前编辑态，等待下一次事件 */
      } finally {
        syncing = false;
      }
    };
    const unsubscribe = api.subscribeEmailDataChanges(emailKey, (event) => {
      void syncCurrentEmail(event);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [emailKey, layoutVariantId, editorLive, loadList]);

  const tokenPresetForInspector = useMemo(() => {
    if (!tokenPresets) return null;
    if (stylePresetListSelection === "local") return tokenPresets;
    return (
      globalPresetDraft[stylePresetListSelection] ??
      globalTokenPresets[stylePresetListSelection] ??
      null
    );
  }, [tokenPresets, stylePresetListSelection, globalPresetDraft, globalTokenPresets]);

  const stylePresetInspectorDirty = tokenPresetsDirty || globalStylePresetDirty;

  const isCurrentStylePresetTemplateDefault = useMemo(() => {
    const saved = emailMeta?.defaultStylePresetSelection ?? "local";
    return saved === stylePresetListSelection;
  }, [emailMeta?.defaultStylePresetSelection, stylePresetListSelection]);

  const emptyCatalog =
    emailCatalogReady && items.length === 0 && error === null && !template && !payload;

  if (emptyCatalog) {
    return (
      <div
        className="app app--loading app--empty-catalog"
      >
        <p className="app__empty-catalog-title">暂无邮件模板</p>
        <p className="app__hint">
          可点击下方按钮创建第一封模板，或在仓库 <code>data/emails/&lt;场景&gt;/</code> 下手动放入 JSON 文件后刷新页面。
        </p>
        <ShopPrimaryButton
          className="app__empty-catalog-create"
          disabled={creatingTemplate}
          onClick={openCreateTemplateModal}
        >
          创建新模板
        </ShopPrimaryButton>
        <EmailTemplateCreateModal
          visible={createModalOpen}
          mode={createModalMode}
          copySourceDisplayName={
            createModalMode === "copy"
              ? items.find((it) => it.emailKey === emailKey)?.displayName
              : undefined
          }
          creating={creatingTemplate}
          onCancel={() => setCreateModalOpen(false)}
          onCreate={submitTemplateCreateModal}
        />
      </div>
    );
  }

  if (!template || !payload) {
    const loadingMessage = error
      ? error
      : !emailCatalogReady
        ? "正在加载模板列表…"
        : "正在加载编辑器…";
    return (
      <div className="app app--loading">
        <p>{loadingMessage}</p>
        {error ? (
          <p className="app__hint">
            请先运行 <code>npm run dev:all</code>（或单独 <code>npm run server</code>）以启动本地 API。
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <TopbarHomeBackButton />
        <TopbarTemplateSelect
          items={items}
          value={emailKey}
          disabled={topbarSelectionLocked}
          busy={renamingTemplate || deletingTemplate || creatingTemplate || publishingTemplate}
          renaming={renamingTemplate}
          deleting={deletingTemplate}
          creating={creatingTemplate}
          onSelect={(nextEmailKey) => void loadEmail(nextEmailKey)}
          onRename={renameCurrentTemplate}
          onDelete={deleteCurrentTemplate}
          onOpenCreate={openCreateTemplateModal}
          onOpenCopy={topbarSelectionLocked ? undefined : openCopyTemplateModal}
          onSetPublishStatus={
            topbarSelectionLocked ? undefined : setTemplatePublishStatus
          }
        />
        <EmailTemplateCreateModal
          visible={createModalOpen}
          mode={createModalMode}
          copySourceDisplayName={
            createModalMode === "copy"
              ? items.find((it) => it.emailKey === emailKey)?.displayName
              : undefined
          }
          creating={creatingTemplate}
          onCancel={() => setCreateModalOpen(false)}
          onCreate={submitTemplateCreateModal}
        />
        <TopbarLayoutVariantSelect
          manifest={layoutManifest}
          value={layoutVariantId}
          busy={layoutVariantBusy}
          aiPipelineSteps={aiPipelineSteps}
          disabled={topbarSelectionLocked || status.startsWith("加载") || status.startsWith("切换")}
          onSelect={(nextLayoutId) => void switchLayoutVariant(nextLayoutId)}
          onCreate={createLayoutVariant}
          onCreateModalClosed={() => setAiPipelineSteps(null)}
          onRename={renameLayoutVariant}
          onDelete={deleteCurrentLayoutVariant}
          onSetPublishStatus={
            topbarSelectionLocked ? undefined : setLayoutVariantPublishStatus
          }
        />
        {topbarSelectionLocked ? (
          <span
            className="topbar__hint"
            title="当前由创建邮件页进入：模板、版式切换与发布状态均不可修改"
          >
            来源页锁定
          </span>
        ) : null}
        <div className="topbar__view-switch" role="tablist" aria-label="工作台视图">
          {WORKBENCH_VIEW_TABS.map(({ view, label }) => (
            <button
              key={view}
              type="button"
              role="tab"
              aria-selected={workbenchView === view}
              className={`topbar__view-btn ${workbenchView === view ? "topbar__view-btn--active" : ""}`}
              onClick={() => setWorkbenchView(view)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="topbar__actions">
          <div
            className="resource-text-actions topbar__action-group"
            role="group"
            aria-label="当前模板操作"
          >
            <button
              type="button"
              className="resource-text-action"
              disabled={!emailKey || !templateDirty}
              title={
                !emailKey
                  ? "请先选择模板"
                  : templateDirty
                    ? "仅保存区块配置（template）"
                    : "当前无未保存区块更改"
              }
              onClick={() => void save()}
            >
              保存区块
            </button>
            {templateDirty && diskTemplatePayload ? (
              <button
                type="button"
                className="resource-text-action resource-text-action--danger"
                title="仅放弃未保存区块更改"
                onClick={discardDraft}
              >
                放弃未保存区块
              </button>
            ) : null}
            <button
              type="button"
              className="resource-text-action"
              disabled={!emailKey || !metaCanSendTest}
              title={
                !emailKey
                  ? "请先选择模板"
                  : metaCanSendTest
                    ? "发送测试邮件"
                    : "未配置 SMTP，暂不可发送"
              }
              onClick={() => setMetaSendTestNonce((v) => v + 1)}
            >
              发送测试邮件
            </button>
          </div>
        </div>
        {status ? <span className="topbar__status">{status}</span> : null}
      </header>

      <main className="workspace">
        {workbenchView !== "meta" && emailKey ? (
          <div className="meta-editor-send-test-host" hidden aria-hidden>
            <MetaEditor
              emailKey={emailKey}
              onError={reportOperationalError}
              variant="embedded"
              openSendTestNonce={metaSendTestNonce}
              onSendTestCapabilityChange={setMetaCanSendTest}
            />
          </div>
        ) : null}
        {workbenchView === "meta" ? (
          <aside className="block-tree workspace__left-placeholder" aria-label="左侧面板占位">
            <div className="block-tree__title">模板信息</div>
            <div className="block-tree__scroll workspace__left-placeholder-scroll">
              <p className="workspace__left-placeholder-hint">请在右侧面板编辑邮件标题、摘要等模板信息</p>
            </div>
          </aside>
        ) : workbenchView === "tokens" ? (
          <TokenPresetPanel
            tokenPresets={tokenPresets}
            globalTokenPresets={Object.entries(globalTokenPresets)
              .map(([presetId, presets]) => ({
                presetId,
                tokenPresets: presets,
              }))
              .sort((a, b) => a.presetId.localeCompare(b.presetId, "en"))}
            activeListKey={stylePresetListSelection}
            onSelectLocal={onSelectLocalStylePreset}
            onSelectGlobal={onSelectGlobalStylePreset}
            onCreateGlobal={createGlobalStylePreset}
            localValidationHint={validationContext.tokenPresetsError ?? validationContext.tokenPresetsWarning}
          />
        ) : workbenchView === "payload" ? (
          <PayloadPanel
            template={template}
            payload={payload}
            selectedSlotId={selectedPayloadSlotId}
            onSelectSlot={onSelectPayloadSlot}
            onPayloadChange={setPayload}
            getSlotError={validationContext.getSlotError}
            getSlotWarning={validationContext.getSlotWarning}
            onVariableCreated={({ payload: nextPayload, slotId }) =>
              handlePayloadVariableCreated(nextPayload, slotId)
            }
          />
        ) : previewModel ? (
          <BlockTree
            sourceTemplate={template}
            previewModel={previewModel}
            selectedBlockRef={selectedBlockRef}
            syncNonce={blockTreeSyncNonce}
            onSelect={selectBlock}
            blockErrorIds={validationContext.blockErrorIds}
            blockWarnIds={validationContext.blockWarnIds}
          />
        ) : (
          <aside className="block-tree">
            <p className="inspector__muted">预览暂不可用</p>
          </aside>
        )}
        <section className="canvas-col">
          <div className="canvas-col__head">
            <div className="canvas-col__title">画布预览</div>
            <div
              className="canvas-col__viewport-toggle"
              role="group"
              aria-label="预览视窗"
            >
              <button
                type="button"
                className={
                  canvasPreviewViewport === "desktop"
                    ? "canvas-col__viewport-toggle-btn canvas-col__viewport-toggle-btn--active"
                    : "canvas-col__viewport-toggle-btn"
                }
                aria-pressed={canvasPreviewViewport === "desktop"}
                title="桌面预览（600px 视窗）"
                onClick={() => setCanvasPreviewViewport("desktop")}
              >
                桌面
              </button>
              <button
                type="button"
                className={
                  canvasPreviewViewport === "mobile"
                    ? "canvas-col__viewport-toggle-btn canvas-col__viewport-toggle-btn--active"
                    : "canvas-col__viewport-toggle-btn"
                }
                aria-pressed={canvasPreviewViewport === "mobile"}
                title="移动预览（375px 视窗）"
                onClick={() => setCanvasPreviewViewport("mobile")}
              >
                移动
              </button>
            </div>
            <div className="canvas-col__head-end">
            {hasVisibilityBlocks ? (
              <label
                className="canvas-col__visibility-sim"
                title="开启后：凡配置了条件显隐的区块一律按「不显示」裁剪画布（不依赖当前变量值），用于检查全隐藏时的版式；关闭时画布始终画出这些区块，便于编辑。"
              >
                <input
                  type="checkbox"
                  checked={canvasSimulateAllHidden}
                  onChange={(e) => setCanvasSimulateAllHidden(e.target.checked)}
                />
                <span>模拟全部隐藏</span>
              </label>
            ) : null}
            </div>
          </div>
          <div className="canvas-col__stage" ref={canvasStageRef}>
            {previewModel && showCanvasBlockActions && canvasBlockActionLayout ? (
              <div className="canvas-block-actions" aria-label="画布区块操作">
                {showCanvasLeftActions ? (
                  <div
                    className="canvas-block-actions__insert"
                    style={
                      {
                        top: `${canvasBlockActionLayout.insert.top}px`,
                        left: `${canvasBlockActionLayout.insertLeft}px`,
                      } as CSSProperties
                    }
                  >
                    {siblingMoveState ? (
                      <>
                        <ShopSecondaryButton
                          className="canvas-insert-actions__btn"
                          disabled={canvasActionsBusy || !siblingMoveState.canMoveUp}
                          title="在父级 children 中上移一位"
                          onClick={() => handleMoveSelectedCanvasBlock("up")}
                        >
                          上移
                        </ShopSecondaryButton>
                        <ShopSecondaryButton
                          className="canvas-insert-actions__btn"
                          disabled={canvasActionsBusy || !siblingMoveState.canMoveDown}
                          title="在父级 children 中下移一位"
                          onClick={() => handleMoveSelectedCanvasBlock("down")}
                        >
                          下移
                        </ShopSecondaryButton>
                      </>
                    ) : null}
                    {selectedCanDuplicate ? (
                      <ShopSecondaryButton
                        className="canvas-insert-actions__btn"
                        disabled={canvasActionsBusy}
                        title="在当前区块下方复制整块子树（含样式与变量绑定）"
                        onClick={handleDuplicateSelectedCanvasBlock}
                      >
                        复制
                      </ShopSecondaryButton>
                    ) : null}
                    {selectedSupportsChildInsert ? (
                      <ShopSecondaryButton
                        className="canvas-insert-actions__btn"
                        disabled={canvasActionsBusy}
                        onClick={() => openInsertModal("child")}
                      >
                        插入子级
                      </ShopSecondaryButton>
                    ) : null}
                    {selectedSupportsBelowInsert ? (
                      <ShopSecondaryButton
                        className="canvas-insert-actions__btn"
                        disabled={canvasActionsBusy}
                        title="在当前区块后插入同级区块"
                        onClick={() => openInsertModal("below")}
                      >
                        下方插入
                      </ShopSecondaryButton>
                    ) : null}
                    {selectedCanSaveAsSection ? (
                      <ShopSecondaryButton
                        className="canvas-insert-actions__btn"
                        disabled={canvasActionsBusy}
                        title="将当前容器及其子级保存为可复用模块"
                        onClick={() => setSaveSectionModalOpen(true)}
                      >
                        存为模块
                      </ShopSecondaryButton>
                    ) : null}
                  </div>
                ) : null}
                {selectedCanDelete ? (
                  <div
                    className="canvas-block-actions__delete"
                    style={
                      {
                        top: `${canvasBlockActionLayout.delete.top}px`,
                        left: `${canvasBlockActionLayout.deleteLeft}px`,
                      } as CSSProperties
                    }
                  >
                    <ShopSecondaryButton
                      className="canvas-delete-actions__btn"
                      disabled={canvasActionsBusy}
                      title="删除当前区块（含子级）"
                      onClick={handleDeleteSelectedCanvasBlock}
                    >
                      删除
                    </ShopSecondaryButton>
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className="canvas-scroll" ref={canvasScrollRef}>
              <div className="canvas-frame">
                {previewModel ? (
                  <EmailPreview
                    previewModel={previewModel}
                    sourceTemplate={template}
                    selectedBlockRef={selectedBlockRef}
                    onSelectBlock={selectBlock}
                    previewViewportPx={canvasPreviewViewportPx}
                  />
                ) : (
                  <p className="inspector__muted">预览暂不可用（请检查样式预设或校验问题）</p>
                )}
              </div>
            </div>
          </div>
          <CanvasInsertBlockModal
            visible={insertModalOpen}
            busy={insertingBlock}
            title={insertModalMode === "child" ? "插入子级组件" : "下方插入组件"}
            entries={insertableEntries}
            sections={sectionCatalogItems}
            onCancel={closeInsertModal}
            onPick={(entry) => void handlePickInsertBlock(entry)}
            onPickSection={(masterId) => void handlePickInsertSection(masterId)}
            onRenameSection={handleRenameSection}
            onDeleteSection={handleDeleteSection}
          />
          <SaveSectionModal
            visible={saveSectionModalOpen}
            saving={savingSection}
            onCancel={() => {
              if (savingSection) return;
              setSaveSectionModalOpen(false);
            }}
            onSave={handleSaveSection}
          />
        </section>
        {workbenchView === "tokens" ? (
          <TokenPresetInspector
            tokenPresets={tokenPresetForInspector}
            dirty={stylePresetInspectorDirty}
            listSelection={stylePresetListSelection}
            onSetAsTemplateDefault={() => void persistTemplateDefaultStylePreset()}
            isTemplateDefaultForCurrentSelection={isCurrentStylePresetTemplateDefault}
            setAsTemplateDefaultDisabled={!emailKey}
            onDeleteGlobal={deleteGlobalStylePreset}
            onChange={(next) => {
              const copy = structuredClone(next) as TokenPresets;
              delete copy.appliedGlobalPresetId;
              if (stylePresetListSelection === "local") {
                setTokenPresets(copy);
              } else {
                const id = stylePresetListSelection;
                setGlobalPresetDraft((d) => ({ ...d, [id]: copy }));
              }
            }}
            onSave={() => void saveCurrentStylePresetFromPanel()}
            validationError={validationContext.tokenPresetsError}
            validationWarning={
              validationContext.tokenPresetsWarning && !validationContext.tokenPresetsError
                ? validationContext.tokenPresetsWarning
                : undefined
            }
          />
        ) : workbenchView === "payload" ? (
          <PayloadInspector
            template={template}
            payload={payload}
            slotDrafts={payloadSlotDrafts}
            onSlotDraftChange={handleSlotDraftChange}
            onCommitSlot={handleCommitPayloadSlot}
            selectedSlotId={selectedPayloadSlotId}
            onPayloadChange={setPayload}
            onTemplatePayloadChange={onUpdate}
            onVariableDeleted={handlePayloadVariableDeleted}
            onSlotIdChange={setSelectedPayloadSlotId}
            slotValidationError={
              selectedPayloadSlotId
                ? validationContext.getSlotError(selectedPayloadSlotId)
                : undefined
            }
            slotValidationWarning={
              selectedPayloadSlotId && !validationContext.getSlotError(selectedPayloadSlotId)
                ? validationContext.getSlotWarning(selectedPayloadSlotId)
                : undefined
            }
          />
        ) : workbenchView === "meta" ? (
          <aside className="side-inspector side-inspector--meta" aria-label="模板信息">
            <MetaEditor
              emailKey={emailKey}
              onError={reportOperationalError}
              variant="embedded"
              openSendTestNonce={metaSendTestNonce}
              onSendTestCapabilityChange={setMetaCanSendTest}
            />
          </aside>
        ) : (
          <Inspector
            template={template}
            payload={payload}
            previewPayload={previewPayload}
            selectedBlockRef={selectedBlockRef}
            previewModel={previewModel}
            onUpdate={onUpdate}
            onTemplateChange={onTemplateChange}
            onDiscardPayloadSlotDraft={(slotId) =>
              setPayloadSlotDrafts((prev) => discardPayloadSlotDraft(prev, slotId))
            }
            emailKey={emailKey}
            layoutVariantId={layoutVariantId}
            effectiveDesignTokens={effectiveDesignTokens}
            tokenPresets={tokenPresets}
            onBlockMasterSaved={handleBlockMasterSaved}
            getFieldError={validationContext.getFieldError}
            getFieldWarning={validationContext.getFieldWarning}
            requestedInspectorTab={requestedInspectorTab}
            onConsumedInspectorTabRequest={() => setRequestedInspectorTab(null)}
          />
        )}
      </main>
      {validationIssues.length > 0 ? (
        <TemplateValidationDock
          issues={validationIssues}
          template={template}
          onNavigateIssue={handleNavigateValidationIssue}
        />
      ) : null}
    </div>
  );
}
