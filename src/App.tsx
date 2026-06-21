import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
} from "react";
import type { PublishStatus } from "./publish-status-contract";
import type { EmailListItem, EmailMeta, EmailPayload, EmailTemplate } from "./types/email";
import type { LayoutManifest } from "./layout-variant-contract/types";
import type { TokenPresets } from "./types/tokenPreset";
import * as api from "./api/client";
import {
  buildRepeatPreviewModel,
  previewModelToFlatTemplate,
  applyThemeToPreviewModel,
} from "./repeat-runtime";
import { resolveBlockTheme } from "./lib/resolveThemeInTemplate";
import { applyVisibilityRules, templateHasVisibilityRules } from "./lib/visibility";
import { collectExternalVariableSlots, getSlotPrimaryBlockId } from "./lib/payloadSlots";
import {
  buildPreviewPayload,
  discardPayloadSlotDraft,
  type PayloadSlotDraft,
  type PayloadSlotDraftMap,
} from "./lib/payloadSlotDraft";
import { normalizeTokenPresetTokens } from "./token-preset-contract/standard-keys";
import {
  validatePayloadAgainstTemplate,
  validatePayloadAgainstTemplateUnion,
  validateTemplate,
  validationIssuesForEditorDisplay,
} from "./lib/validate";
import {
  errorMessageDuplicatesValidationIssues,
  validationSaveBlockedMessage,
} from "./lib/validationIssueDisplay";
import {
  configureAppToast,
  toastError,
  toastInfo,
  toastLoading,
  toastSuccess,
  toastWarning,
} from "./lib/appToast";
import type { ClassifiedValidationIssue } from "./lib/validationIssueRouting";
import { useValidationIssuesForEditor } from "./hooks/useValidationIssuesForEditor";
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
import { CanvasDragInsertRoot } from "./components/canvas/CanvasDragInsertRoot";
import { TemplateValidationDock } from "./components/TemplateValidationDock";
import { resolveCanvasPreviewViewportWidth } from "./editor-canvas-contract";
import { stableStringify } from "./lib/stableStringify";
import { EditorEmailPreviewHost } from "./components/EditorEmailPreviewHost";
import { EditorLeftPanelHost } from "./components/EditorLeftPanelHost";
import { EditorInspectorColumnHost } from "./components/EditorInspectorColumnHost";
import { EditorCanvasBlockActionsHost } from "./components/EditorCanvasBlockActionsHost";
import {
  resetEditorUiState,
  getEditorUiState,
  setSelectedBlockRefDirect,
  setWorkbenchView,
  setCanvasPreviewViewport,
} from "./editor-ui/store";
import { useEditorUiActions, useEditorUiSelector } from "./editor-ui/react";
import { MetaEditor } from "./components/MetaEditor";
import { ShopPrimaryButton, ShopSecondaryButton } from "./components/ui/ShopFormControls";
import {
  EmailTemplateCreateModal,
  type EmailTemplateCreateModalMode,
} from "./components/ui/EmailTemplateCreateModal";
import { TopbarTemplateSelect } from "./components/ui/TopbarTemplateSelect";
import { TopbarLayoutVariantSelect } from "./components/ui/TopbarLayoutVariantSelect";
import { useConfirmDialog } from "./components/ui/ConfirmDialogProvider";
import { CanvasInsertBlockModal } from "./components/ui/CanvasInsertBlockModal";
import { SaveSectionModal } from "./components/ui/SaveSectionModal";
import { ShopSectionModal } from "./components/ui/ShopSectionModal";
import { useEmailDiskPersist } from "./hooks/useEmailDiskPersist";
import { useEditorLayoutPrewarm } from "./hooks/useEditorLayoutPrewarm";
import { prewarmEditorInspectorLookups } from "./lib/editorIdlePrewarm";
import {
  emailDataSyncEditorSnapshot,
  shouldShowEmailDataSyncToast,
} from "./lib/emailDataSyncToast";
import { TopbarHomeBackButton } from "./components/ui/TopbarHomeBackButton";
import { isCanvasNonBlockClickTarget } from "./lib/canvasEmptySelection";
import {
  getSelectedBlockRefAtInvoke,
  getSelectedPhysicalBlockIdAtInvoke,
} from "./lib/editorSelectionAtInvoke";
import { parseCssPx } from "./lib/canvasDimensionResolve";
import { EMAIL_ROOT_FIXED_WIDTH } from "./render-defaults-contract/values";
import { deleteBlockFromTemplate } from "./lib/deleteTemplateBlock";
import { applyObjectBindMappingsToTemplate } from "./lib/objectBindRegion";
import {
  duplicateBlockBelow,
  moveBlockAmongSiblings,
} from "./lib/templateBlockSiblingOps";
import {
  insertCatalogBlockIntoTemplate,
  listInsertableCatalogEntries,
  type InsertBlockMode,
} from "./lib/templateBlockInsert";
import type { BlockCatalogEntry } from "./lib/blockDefaults";
import type { BlockMaster, SectionMaster } from "./types/master";
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
  buildPendingRestoreAstSteps,
  type AiStepUiState,
} from "./layout-variant-ai-contract/progress";
import type { LayoutVariantAiFromImagePipeline } from "./layout-variant-ai-contract/aiFromImagePipeline";
import type { LlmProfileSelection } from "./layout-variant-ai-contract/llmProfileCatalog";
import {
  buildEmailTemplateEditorPath,
  parseEmailTemplateEditorPath,
  type EmailTemplateEditorEntry,
} from "./lib/appNavigation";
import "./app.css";
import "./antd-admin-field-overrides.css";

type WorkbenchView = "tokens" | "payload" | "block";

/** 顶栏工作台视图：顺序按运营使用频率（高 → 低）。 */
const WORKBENCH_VIEW_TABS: ReadonlyArray<{ view: WorkbenchView; label: string }> = [
  { view: "block", label: "模板组件" },
  { view: "payload", label: "数据变量" },
  { view: "tokens", label: "主题样式" },
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

function readEmailTemplateEditorEntry(): EmailTemplateEditorEntry {
  return readSearchParams().get("entry") === "campaign" ? "campaign" : "catalog";
}

function pickEmailKeyParam(v: string | null): string {
  return (v ?? "").trim().replace(/^["']|["']$/g, "");
}

/** 地址栏原始 emailKey（不校验是否在列表中）。 */
function readEmailKeyParamRaw(): string | null {
  try {
    const route = parseEmailTemplateEditorPath(window.location.pathname);
    if (route?.emailKey) return route.emailKey;
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
    const route = parseEmailTemplateEditorPath(window.location.pathname);
    if (route?.layoutVariantId) return route.layoutVariantId;
    const raw = readSearchParams().get("layout")?.trim();
    return raw || null;
  } catch {
    return null;
  }
}

function writeEditorResourceToUrl(emailKey: string | null, layoutVariantId: string | null): void {
  try {
    const key = emailKey?.trim() || null;
    if (key && layoutVariantId) {
      const search = window.location.search;
      window.history.replaceState(
        null,
        "",
        `${buildEmailTemplateEditorPath(key, layoutVariantId)}${search}`
      );
      return;
    }
    const url = new URL(window.location.href);
    if (key) url.searchParams.set("emailKey", key);
    else url.searchParams.delete("emailKey");
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
  const { confirm } = useConfirmDialog();
  const editorEntry = readEmailTemplateEditorEntry();
  const lockLayoutResourceActions = editorEntry === "campaign";
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
  /** 单变量会话草稿：合并进画布预览（内置 mock 变量不可编辑，通常为空） */
  const [payloadSlotDrafts, setPayloadSlotDrafts] = useState<PayloadSlotDraftMap>({});
  const [tokenPresets, setTokenPresets] = useState<TokenPresets | null>(null);
  const [globalTokenPresets, setGlobalTokenPresets] = useState<Record<string, TokenPresets>>({});
  const workbenchView = useEditorUiSelector((s) => s.workbenchView);
  const canvasPreviewViewport = useEditorUiSelector((s) => s.canvasPreviewViewport);
  const { selectBlock } = useEditorUiActions();
  const [selectedPayloadSlotId, setSelectedPayloadSlotId] = useState<string | null>(null);
  const [insertModalOpen, setInsertModalOpen] = useState(false);
  const [insertModalMode, setInsertModalMode] = useState<InsertBlockMode>("child");
  const [insertingBlock, setInsertingBlock] = useState(false);
  const [deletingBlock, setDeletingBlock] = useState(false);
  const [reorderingBlock, setReorderingBlock] = useState(false);
  /** 仅当模板存在条件显隐时展示画布开关；默认关（画布仍显示这些区块）；开=整段按「全部不满足」裁剪 */
  const [canvasSimulateAllHidden, setCanvasSimulateAllHidden] = useState(false);
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
  const [emailLoadBusy, setEmailLoadBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestedInspectorTab, setRequestedInspectorTab] = useState<InspectorMainTab | null>(
    null
  );
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [templateResourceBusy, setTemplateResourceBusy] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createModalMode, setCreateModalMode] = useState<EmailTemplateCreateModalMode>("create");
  const [layoutVariantBusy, setLayoutVariantBusy] = useState(false);
  /** 保存失败后展示 phase=save 的校验项（如已开背景图但未填地址） */
  const [revealDeferredValidation, setRevealDeferredValidation] = useState(false);
  const [mailInfoOpen, setMailInfoOpen] = useState(false);
  /** 以图 AI 创建版式：弹窗内分步进度 */
  const [aiPipelineSteps, setAiPipelineSteps] = useState<AiStepUiState[] | null>(null);
  const [metaSendTestNonce, setMetaSendTestNonce] = useState(0);
  const [metaCanSendTest, setMetaCanSendTest] = useState(false);
  const [metaDirty, setMetaDirty] = useState(false);
  const [metaSaving, setMetaSaving] = useState(false);
  const [metaSaveNonce, setMetaSaveNonce] = useState(0);
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
    configureAppToast({ top: 60, maxCount: 3 });
  }, []);

  useEffect(() => {
    if (!emailKey) setMetaCanSendTest(false);
  }, [emailKey]);

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
    const previousLayoutId = layoutVariantIdRef.current;
    const requestId = ++loadEmailRequestIdRef.current;
    pendingLoadEmailKeyRef.current = key;
    setEmailLoadBusy(true);
    setError(null);

    const layoutHint = (preferredLayoutId ?? readLayoutHintFromUrl() ?? "").trim() || null;

    promise = (async (): Promise<void> => {
    let dismissLoading: (() => void) | null = null;
    if (requestId === loadEmailRequestIdRef.current) {
      dismissLoading = toastLoading("加载中…");
    }
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
        for (const v of visibleVariants) {
          if (v.id === layoutId) {
            sceneTemplates.push({ layoutVariantId: v.id, template: t });
            continue;
          }
          try {
            sceneTemplates.push({
              layoutVariantId: v.id,
              template: normalizeEmailRootBlock(await api.getTemplate(key, v.id)),
            });
          } catch {
            // 其它版式异常不阻断当前版式编辑；详细问题留给校验流程暴露。
          }
        }
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
      writeEditorResourceToUrl(key, layoutId);
      setStylePresetListSelection(initialSel);
      setEmailKey(key);
      setTemplate(t);
      setPayload(p);
      setPayloadSlotDrafts({});
      setTokenPresets(tpNorm);
      setSelectedPayloadSlotId(null);
      resetEditorUiState();
      setLastSelectedEmailKey(key);
      setDiskTemplatePayload({ template: structuredClone(t), payload: structuredClone(p) });
      setDiskTokenPresets(structuredClone(tpNorm));
      setRevealDeferredValidation(false);
    } catch (e) {
      if (requestId !== loadEmailRequestIdRef.current) return;
      reportOperationalError(e instanceof Error ? e.message : String(e));
      if (key === previousKey && previousLayoutId && previousLayoutId !== layoutHint) {
        // 同模板切换版式失败：保留编辑态并回退到上一版式，避免版式选择器卡死
        void loadEmail(key, previousLayoutId);
        return;
      }
      const list = itemsRef.current;
      const revertKey =
        previousKey && list.some((it) => it.emailKey === previousKey)
          ? previousKey
          : list[0]?.emailKey ?? null;
      if (revertKey && revertKey !== key) {
        void loadEmail(revertKey);
      } else if (revertKey) {
        void loadEmail(revertKey, previousLayoutId);
      } else {
        setEmailKey(null);
      }
    } finally {
      if (requestId === loadEmailRequestIdRef.current) {
        dismissLoading?.();
        setEmailLoadBusy(false);
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
    let previewModel = buildRepeatPreviewModel(
      applyObjectBindMappingsToTemplate(afterVisibility),
      previewPayload
    );
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
    const rootW = (previewModel.root.block.props as Record<string, unknown> | undefined)?.width;
    const width =
      typeof rootW === "string" && rootW.trim() ? rootW.trim() : EMAIL_ROOT_FIXED_WIDTH;
    return parseCssPx(width) ?? resolveCanvasPreviewViewportWidth("desktop");
  }, [previewModel]);
  const insertableEntries = useMemo(() => listInsertableCatalogEntries(), []);
  const sectionCatalogItems = useMemo(
    () => toSectionCatalogItems(Object.values(sectionMastersById)),
    [sectionMastersById]
  );
  const canvasActionsBusy = insertingBlock || deletingBlock || reorderingBlock;

  const templatesForPayloadValidation = useMemo(() => {
    if (!template || !layoutVariantId) return [];
    if (sceneLayoutTemplates.length <= 1) return [template];
    return sceneLayoutTemplates.map((item) =>
      item.layoutVariantId === layoutVariantId ? template : item.template
    );
  }, [sceneLayoutTemplates, template, layoutVariantId]);

  // 校验（validateTemplate 等含大量全树遍历）降为低优先级：编辑时优先绘制画布预览，
  // 校验结果稍后补算，避免每次改字段都同步阻塞按键。错误高亮因此可能延迟一帧呈现。
  const deferredTemplate = useDeferredValue(template);
  const deferredPayload = useDeferredValue(payload);
  const deferredTokenPresets = useDeferredValue(tokenPresets);
  const deferredResolvedPreview = useDeferredValue(resolvedPreview);
  const deferredTemplatesForPayloadValidation = useDeferredValue(templatesForPayloadValidation);

  /** 编辑态画布用 deferred 预览；加载邮件/版式时用同步预览（Lane A） */
  const canvasPreviewModel =
    emailLoadBusy || layoutVariantBusy
      ? previewModel
      : (deferredResolvedPreview?.previewModel ?? null);

  const editorLayoutPrewarmReady = Boolean(
    template && previewModel && !emailLoadBusy && !layoutVariantBusy
  );
  const layoutPrewarmed = useEditorLayoutPrewarm(editorLayoutPrewarmReady);

  useEffect(() => {
    if (!layoutPrewarmed || !template || !previewModel) return;

    let cancelled = false;
    const schedule =
      typeof requestIdleCallback === "function"
        ? (cb: () => void) => requestIdleCallback(cb, { timeout: 3000 })
        : (cb: () => void) => window.setTimeout(cb, 400);

    const cancel =
      typeof cancelIdleCallback === "function"
        ? (id: number) => cancelIdleCallback(id)
        : (id: number) => window.clearTimeout(id);

    const id = schedule(() => {
      if (cancelled) return;
      prewarmEditorInspectorLookups(template, previewModel);
    });

    return () => {
      cancelled = true;
      cancel(id);
    };
  }, [layoutPrewarmed, template, previewModel]);

  const validationIssues = useMemo(() => {
    if (!deferredTemplate || !deferredPayload) return [];
    const payloadIssues =
      deferredTemplatesForPayloadValidation.length > 1
        ? validatePayloadAgainstTemplateUnion(
            deferredTemplatesForPayloadValidation,
            deferredPayload
          )
        : validatePayloadAgainstTemplate(deferredTemplate, deferredPayload);
    return [
      ...validateTemplate(deferredTemplate),
      ...payloadIssues,
      ...validateTokenPresets(deferredTokenPresets),
      ...(deferredResolvedPreview?.issues ?? []),
    ];
  }, [
    deferredTemplate,
    deferredPayload,
    deferredTokenPresets,
    deferredResolvedPreview,
    deferredTemplatesForPayloadValidation,
  ]);

  const validationIssuesForDisplay = useMemo(
    () =>
      revealDeferredValidation
        ? validationIssues
        : validationIssuesForEditorDisplay(validationIssues),
    [validationIssues, revealDeferredValidation]
  );

  const validationContext = useValidationIssuesForEditor({
    issues: validationIssuesForDisplay,
    template,
    workbenchView,
  });

  const handleNavigateValidationIssue = useCallback(
    (classified: ClassifiedValidationIssue) => {
      const { parsed, workbenchView: view, inspectorTab } = classified;
      if (parsed.layoutVariantId && emailKey && parsed.layoutVariantId !== layoutVariantId) {
        void loadEmail(emailKey, parsed.layoutVariantId);
      }
      if (view === "block" || view === "payload" || view === "tokens") {
        setWorkbenchView(view);
      }
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

  const templateDirty = useMemo(() => {
    if (!diskTemplatePayload || !template) return false;
    return (
      stableStringify(template) !== stableStringify(diskTemplatePayload.template)
    );
  }, [diskTemplatePayload, template]);

  const payloadDirty = useMemo(() => {
    if (!diskTemplatePayload || !payload) return false;
    return stableStringify(payload) !== stableStringify(diskTemplatePayload.payload);
  }, [diskTemplatePayload, payload]);
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
      startTransition(() => {
        setTemplate(next.template);
        setPayload(next.payload);
      });
    },
    []
  );

  const onTemplateChange = useCallback((nextTemplate: EmailTemplate, options?: TemplateChangeOptions) => {
    if (options?.selectBlockRef !== undefined) {
      setSelectedBlockRefDirect(options.selectBlockRef);
    } else {
      const currentRef = getEditorUiState().selectedBlockRef;
      setSelectedBlockRefDirect(
        template !== null
          ? reconcileSelectedBlockRefAfterTemplateChange(template, nextTemplate, currentRef)
          : currentRef
      );
    }
    startTransition(() => {
      setTemplate(nextTemplate);
    });
  }, [template]);

  // 稳定引用：让 Inspector 的 React.memo 在滚动等无关重渲染时能跳过。
  const handleDiscardPayloadSlotDraft = useCallback((slotId: string) => {
    setPayloadSlotDrafts((prev) => discardPayloadSlotDraft(prev, slotId));
  }, []);
  const handleConsumedInspectorTabRequest = useCallback(() => {
    setRequestedInspectorTab(null);
  }, []);

  const onPersistSuccess = useCallback(
    async () => {
      setError(null);
      void loadList();
    },
    [loadList]
  );

  const onPersistError = useCallback(
    (msg: string) => {
      lastPersistErrorRef.current = msg;
      if (errorMessageDuplicatesValidationIssues(msg, validationIssues)) {
        setRevealDeferredValidation(true);
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
        toastError(msg);
        throw new Error(msg);
      }
      setError(null);
      lastPersistErrorRef.current = "";
      const dismiss = toastLoading("变量入库中…");
      let ok = false;
      try {
        ok = await persistPayloadSlotCatalog(nextPayload);
      } finally {
        dismiss();
      }
      if (!ok) {
        const detail = lastPersistErrorRef.current.trim();
        const msg = detail
          ? `变量未能写入 payload.json：${detail}`
          : "变量未能写入 payload.json，创建已取消。";
        toastError(msg);
        throw new Error(msg);
      }
      setPayload(nextPayload);
      setSelectedPayloadSlotId(slotId);
      setDiskTemplatePayload({
        template: structuredClone(template),
        payload: structuredClone(nextPayload),
      });
      toastSuccess("变量已创建并写入 payload.json", 1.6);
    },
    [emailKey, template, persistPayloadSlotCatalog]
  );

  const handlePayloadVariableDeleted = useCallback(
    async (next: { template: EmailTemplate; payload: EmailPayload; slotId: string }) => {
      if (!emailKey || !template) {
        const msg = "邮件尚未加载完成，无法删除变量。";
        toastError(msg);
        throw new Error(msg);
      }
      setError(null);
      const dismiss = toastLoading("变量删除中…");
      let ok = false;
      try {
        ok = await persistTemplatePayloadCatalog(next.template, next.payload);
      } finally {
        dismiss();
      }
      if (!ok) {
        const msg = "变量未能从库中删除，请查看顶部错误说明。";
        toastError(msg);
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
      toastSuccess("变量已从 payload.json 与模板中删除", 1.6);
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
        aiPipeline?: LayoutVariantAiFromImagePipeline;
        llmProfile?: LlmProfileSelection;
      }
    ) => {
      if (!emailKey) return;
      if (!(await confirmDiscardLayoutDirty())) return;
      const copyFrom = options?.copyFromLayoutVariantId?.trim() || null;
      const designImageFile = options?.designImageFile ?? null;
      const aiPipeline = options?.aiPipeline ?? "restore-ast";
      const aiFromImage = Boolean(designImageFile);
      setLayoutVariantBusy(true);
      if (aiFromImage) {
        setAiPipelineSteps(buildPendingRestoreAstSteps());
      }
      setError(null);
      const loadingText = copyFrom
        ? "正在复制版式…"
        : aiFromImage
          ? "正在根据设计图生成版式…"
          : "正在创建新版式…";
      const dismiss = toastLoading(loadingText);
      try {
        const created = aiFromImage
          ? await api.createLayoutVariantFromDesignImage(emailKey, label, designImageFile!, {
              pipeline: aiPipeline,
              llmProfile: options?.llmProfile,
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
        const pendingIssues = created.validationIssues ?? [];
        if (aiFromImage && pendingIssues.length > 0) {
          toastWarning(
            `已生成版式「${created.label}」，其中 ${pendingIssues.length} 项内容建议人工确认后再发布`
          );
        } else {
          toastInfo(
            copyFrom
              ? `已复制版式「${created.label}」`
              : aiFromImage
                ? `已生成版式「${created.label}」`
                : `已创建版式「${created.label}」`
          );
        }
        setAiPipelineSteps(null);
      } catch (e) {
        reportOperationalError(e instanceof Error ? e.message : String(e));
        throw e;
      } finally {
        dismiss();
        setLayoutVariantBusy(false);
      }
    },
    [confirmDiscardLayoutDirty, emailKey, loadEmail, reportOperationalError]
  );

  const renameLayoutVariant = useCallback(
    async (label: string) => {
      if (!emailKey || !layoutVariantId || !layoutManifest) return;
      setLayoutVariantBusy(true);
      setError(null);
      const dismiss = toastLoading("版式名称保存中…");
      try {
        const updated = await api.patchLayoutVariant(emailKey, layoutVariantId, { label });
        setLayoutManifest(updated.manifest);
        toastInfo("版式名称已更新");
      } catch (e) {
        reportOperationalError(e instanceof Error ? e.message : String(e));
        throw e;
      } finally {
        dismiss();
        setLayoutVariantBusy(false);
      }
    },
    [emailKey, layoutManifest, layoutVariantId]
  );

  const setLayoutVariantPublishStatus = useCallback(
    async (publishStatus: PublishStatus) => {
      if (!emailKey || !layoutVariantId || !layoutManifest) return;
      setLayoutVariantBusy(true);
      setError(null);
      const dismiss = toastLoading("更新版式发布状态中…");
      try {
        const updated = await api.patchLayoutVariant(emailKey, layoutVariantId, { publishStatus });
        setLayoutManifest(updated.manifest);
        toastInfo(publishStatus === "published" ? "版式已发布，可在创建营销活动时选用" : "版式已撤回发布");
      } catch (e) {
        reportOperationalError(e instanceof Error ? e.message : String(e));
        throw e;
      } finally {
        dismiss();
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
      setError(null);
      try {
      // 仅 loadEmail 成功后再持久化 active 版式，避免加载失败时 manifest 已切到无效版式
      await loadEmail(emailKey, nextLayoutId);
      } catch (e) {
        reportOperationalError(e instanceof Error ? e.message : String(e));
      }
    },
    [confirmDiscardLayoutDirty, emailKey, layoutManifest, layoutVariantId, loadEmail]
  );

  const switchEmailTemplate = useCallback(
    async (nextEmailKey: string) => {
      const nextKey = nextEmailKey.trim();
      if (!nextKey || nextKey === emailKey) return;
      if (!(await confirmDiscardLayoutDirty())) {
        return;
      }
      setTemplateResourceBusy(true);
      setError(null);
      try {
        await loadEmail(nextKey);
      } catch (e) {
        reportOperationalError(e instanceof Error ? e.message : String(e));
      } finally {
        setTemplateResourceBusy(false);
      }
    },
    [confirmDiscardLayoutDirty, emailKey, loadEmail, reportOperationalError]
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
          selectedBlockId: getSelectedPhysicalBlockIdAtInvoke(),
          mode: insertModalMode,
          entry,
          tokenPresets,
          blockMastersById,
        });
        setTemplate(result.template);
        selectBlock({ kind: "physical", blockId: result.insertedBlockId });
        setInsertModalOpen(false);
        toastInfo(
          insertModalMode === "child"
            ? `已插入子级「${entry.name}」`
            : `已在下方插入「${entry.name}」`,
          1.6
        );
      } catch (e) {
        reportOperationalError(e instanceof Error ? e.message : String(e));
      } finally {
        setInsertingBlock(false);
      }
    },
    [template, insertModalMode, selectBlock, tokenPresets, blockMastersById, reportOperationalError]
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
          selectedBlockId: getSelectedPhysicalBlockIdAtInvoke(),
          mode: insertModalMode,
          section,
          tokenPresets,
        });
        setTemplate(result.template);
        selectBlock({ kind: "physical", blockId: result.insertedBlockId });
        setInsertModalOpen(false);
        toastInfo(
          insertModalMode === "child"
            ? `已插入子级模块「${section.name}」`
            : `已在下方插入模块「${section.name}」`,
          1.6
        );
      } catch (e) {
        reportOperationalError(e instanceof Error ? e.message : String(e));
      } finally {
        setInsertingBlock(false);
      }
    },
    [
      template,
      insertModalMode,
      selectBlock,
      tokenPresets,
      sectionMastersById,
      reportOperationalError,
    ]
  );

  const handleSaveSection = useCallback(
    async (name: string) => {
      const selectedPhysicalBlockId = getSelectedPhysicalBlockIdAtInvoke();
      const selectedBlockRef = getSelectedBlockRefAtInvoke();
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
        toastSuccess(`模块「${saved.name}」已保存`);
      } finally {
        setSavingSection(false);
      }
    },
    [
      template,
      payload,
      previewPayload,
      previewModel,
      sectionMastersById,
      tokenPresets,
    ]
  );

  const handleRenameSection = useCallback(async (masterId: string, name: string) => {
    const saved = await api.renameSectionMaster(masterId, name);
    setSectionMastersById((prev) => ({ ...prev, [saved.masterId]: saved }));
    toastSuccess("模块已重命名");
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
        toastSuccess(`已删除模块「${section.name}」`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        toastError(msg);
        throw e;
      }
    },
    [sectionMastersById]
  );

  const handleCanvasDragInserted = useCallback(
    ({ insertedBlockId, label }: { insertedBlockId: string; label: string }) => {
      selectBlock({ kind: "physical", blockId: insertedBlockId });
      toastInfo(`已插入「${label}」`, 1.6);
    },
    [selectBlock]
  );

  const handleCanvasDragMoved = useCallback(
    ({ blockId, label }: { blockId: string; label: string }) => {
      selectBlock({ kind: "physical", blockId });
      toastInfo(`已移动「${label}」`, 1.6);
    },
    [selectBlock]
  );

  const handleDeleteSelectedCanvasBlock = useCallback(async () => {
    const selectedPhysicalBlockId = getSelectedPhysicalBlockIdAtInvoke();
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
      toastSuccess(`已删除「${label}」`);
    } catch (e) {
      reportOperationalError(e instanceof Error ? e.message : String(e));
    } finally {
      setDeletingBlock(false);
    }
  }, [confirm, template, deletingBlock, selectBlock, reportOperationalError]);

  const handleMoveSelectedCanvasBlock = useCallback(
    (direction: "up" | "down") => {
      const selectedPhysicalBlockId = getSelectedPhysicalBlockIdAtInvoke();
      if (!template || !selectedPhysicalBlockId || canvasActionsBusy) return;
      setReorderingBlock(true);
      try {
        const next = moveBlockAmongSiblings(template, selectedPhysicalBlockId, direction);
        setTemplate(next);
        toastInfo(direction === "up" ? "已上移" : "已下移", 1.6);
      } catch (e) {
        reportOperationalError(e instanceof Error ? e.message : String(e));
      } finally {
        setReorderingBlock(false);
      }
    },
    [template, canvasActionsBusy, reportOperationalError]
  );

  const handleDuplicateSelectedCanvasBlock = useCallback(() => {
    const selectedPhysicalBlockId = getSelectedPhysicalBlockIdAtInvoke();
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
      toastSuccess(`已复制「${label}」`, 1.6);
    } catch (e) {
      reportOperationalError(e instanceof Error ? e.message : String(e));
    } finally {
      setReorderingBlock(false);
    }
  }, [template, canvasActionsBusy, selectBlock, reportOperationalError]);

  const save = useCallback(async () => {
    if (!emailKey || !template || !payload) return;
    setError(null);
    const issues = [...validateTemplate(template), ...validatePayloadAgainstTemplate(template, payload)];
    if (issues.length > 0) {
      setRevealDeferredValidation(true);
      toastError(validationSaveBlockedMessage(issues));
      return;
    }
    const dismiss = toastLoading("区块保存中…");
    try {
      await api.putTemplate(emailKey, template, layoutVariantId);
      setDiskTemplatePayload((prev) => ({
        template: structuredClone(template),
        payload: prev?.payload ? structuredClone(prev.payload) : structuredClone(payload),
      }));
      setError(null);
      setRevealDeferredValidation(false);
      toastSuccess("区块已保存", 2);
      void loadList({ silent: true });
    } catch (e) {
      reportOperationalError(e instanceof Error ? e.message : String(e));
    } finally {
      dismiss();
    }
  }, [emailKey, layoutVariantId, template, payload, loadList]);

  const discardDraft = useCallback(() => {
    if (!diskTemplatePayload) return;
    setTemplate(structuredClone(diskTemplatePayload.template));
    setRevealDeferredValidation(false);
    toastInfo("已放弃未保存区块更改", 1.6);
  }, [diskTemplatePayload]);

  const saveTokenPresets = useCallback(async () => {
    if (!emailKey || !tokenPresets) return;
    setError(null);
    const dismiss = toastLoading("正在保存本邮件样式预设…");
    try {
      const body = normalizeTokenPresetsDocument(tokenPresetsWithoutAppliedGlobal(tokenPresets));
      await api.putTokenPresets(emailKey, body, layoutVariantId);
      setTokenPresets(body);
      setDiskTokenPresets(structuredClone(body));
      toastInfo("本邮件样式预设已保存");
      void loadList({ silent: true });
    } catch (e) {
      reportOperationalError(e instanceof Error ? e.message : String(e));
    } finally {
      dismiss();
    }
  }, [emailKey, layoutVariantId, tokenPresets, loadList]);

  const saveGlobalStylePreset = useCallback(async () => {
    if (stylePresetListSelection === "local") return;
    const presetId = stylePresetListSelection;
    const picked = globalPresetDraft[presetId] ?? globalTokenPresets[presetId];
    if (!picked) return;
    setError(null);
    const dismiss = toastLoading("正在保存公共样式预设…");
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
      toastInfo("公共样式预设已保存");
      void loadList({ silent: true });
    } catch (e) {
      reportOperationalError(e instanceof Error ? e.message : String(e));
    } finally {
      dismiss();
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
      toastSuccess(`已创建公共预设「${displayLabel}」`);
      void loadGlobalTokenPresets({ silent: true });
    },
    [globalTokenPresets, loadGlobalTokenPresets]
  );

  const onSelectLocalStylePreset = useCallback(() => {
    setStylePresetListSelection("local");
  }, []);

  const persistTemplateDefaultStylePreset = useCallback(async () => {
    if (!emailKey) return;
    setError(null);
    const dismiss = toastLoading("正在写入模板默认样式预设…");
    try {
      const value = stylePresetListSelection;
      await api.putEmailMeta(emailKey, { defaultStylePresetSelection: value });
      const nextMeta = await api.getEmailMeta(emailKey).catch(() => null);
      setEmailMeta(nextMeta);
      toastInfo("已设为模板默认样式预设");
    } catch (e) {
      reportOperationalError(e instanceof Error ? e.message : String(e));
    } finally {
      dismiss();
    }
  }, [emailKey, stylePresetListSelection]);

  const submitTemplateCreateModal = useCallback(
    async (displayName: string) => {
      const isCopy = createModalMode === "copy";
      setCreatingTemplate(true);
      setError(null);
      const dismiss = toastLoading(isCopy ? "正在复制模板…" : "正在创建新模板…");
      try {
        const created = await api.createEmail({
          displayName,
          ...(isCopy && emailKey ? { copyFromEmailKey: emailKey } : {}),
        });
        await loadList({ silent: true });
        setCreateModalOpen(false);
        await loadEmail(created.emailKey);
        toastInfo(isCopy ? `已复制为「${created.displayName}」` : `已创建模板「${created.displayName}」`);
      } catch (e) {
        reportOperationalError(e instanceof Error ? e.message : String(e));
        throw e;
      } finally {
        dismiss();
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
      setTemplateResourceBusy(true);
      setError(null);
      const dismiss = toastLoading("模板名称保存中…");
      try {
        await api.putEmailMeta(emailKey, { displayName });
        const nextMeta = await api.getEmailMeta(emailKey).catch(() => null);
        setEmailMeta(nextMeta);
        await loadList({ silent: true });
        toastInfo("模板名称已更新");
      } catch (e) {
        reportOperationalError(e instanceof Error ? e.message : String(e));
        throw e;
      } finally {
        dismiss();
        setTemplateResourceBusy(false);
      }
    },
    [emailKey, loadList, reportOperationalError]
  );

  const setTemplatePublishStatus = useCallback(
    async (publishStatus: PublishStatus) => {
      if (!emailKey) return;
      setTemplateResourceBusy(true);
      setError(null);
      const dismiss = toastLoading("更新模板发布状态中…");
      try {
        await api.putEmailMeta(emailKey, { publishStatus });
        const nextMeta = await api.getEmailMeta(emailKey).catch(() => null);
        setEmailMeta(nextMeta);
        await loadList({ silent: true });
        toastInfo(publishStatus === "published" ? "模板已发布，可在创建营销活动时选用" : "模板已撤回发布");
      } catch (e) {
        reportOperationalError(e instanceof Error ? e.message : String(e));
        throw e;
      } finally {
        dismiss();
        setTemplateResourceBusy(false);
      }
    },
    [emailKey, loadList, reportOperationalError]
  );

  const deleteCurrentTemplate = useCallback(async () => {
    if (!emailKey) return;
    if (!(await confirmDiscardLayoutDirty())) return;
    setTemplateResourceBusy(true);
    setError(null);
    const dismiss = toastLoading("正在删除模板…");
    try {
      await api.deleteEmail(emailKey);
      const nextItem = itemsRef.current.find((item) => item.emailKey !== emailKey) ?? null;
      await loadList({ silent: true });
      if (nextItem) {
        await loadEmail(nextItem.emailKey);
      } else {
        setEmailKey(null);
        setLayoutManifest(null);
        setSceneLayoutTemplates([]);
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
      toastInfo("模板已删除");
    } catch (e) {
      reportOperationalError(e instanceof Error ? e.message : String(e));
      throw e;
    } finally {
      dismiss();
      setTemplateResourceBusy(false);
    }
  }, [confirmDiscardLayoutDirty, emailKey, loadEmail, loadList, reportOperationalError, selectBlock]);

  const deleteCurrentLayoutVariant = useCallback(async () => {
    if (!emailKey || !layoutVariantId || !layoutManifest) return;
    if (!(await confirmDiscardLayoutDirty())) return;
    setLayoutVariantBusy(true);
    setError(null);
    const dismiss = toastLoading("正在删除版式…");
    try {
      const result = await api.deleteLayoutVariant(emailKey, layoutVariantId);
      setLayoutManifest(result.manifest);
      await loadEmail(emailKey, result.activeLayoutVariantId);
      toastInfo("版式已删除");
    } catch (e) {
      reportOperationalError(e instanceof Error ? e.message : String(e));
      throw e;
    } finally {
      dismiss();
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
        toastInfo("公共样式预设已删除");
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
          toastInfo("检测到邮件模板 JSON 文件存在变更，已为你自动同步更新", 4.2);
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

  const globalTokenPresetsList = useMemo(
    () =>
      Object.entries(globalTokenPresets)
        .map(([presetId, presets]) => ({
          presetId,
          tokenPresets: presets,
        }))
        .sort((a, b) => a.presetId.localeCompare(b.presetId, "en")),
    [globalTokenPresets]
  );

  const onPayloadPanelVariableCreated = useCallback(
    ({ payload: nextPayload, slotId }: { payload: EmailPayload; slotId: string }) =>
      handlePayloadVariableCreated(nextPayload, slotId),
    [handlePayloadVariableCreated]
  );

  const handleTokenPresetInspectorChange = useCallback(
    (next: TokenPresets) => {
      const copy = structuredClone(next) as TokenPresets;
      delete copy.appliedGlobalPresetId;
      if (stylePresetListSelection === "local") {
        setTokenPresets(copy);
      } else {
        const id = stylePresetListSelection;
        setGlobalPresetDraft((d) => ({ ...d, [id]: copy }));
      }
    },
    [stylePresetListSelection]
  );

  const emptyCatalog =
    emailCatalogReady && items.length === 0 && error === null && !template && !payload;

  const emailTemplateCreateModal = (
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
  );

  if (emptyCatalog) {
    return (
      <div
        className="app app--loading app--empty-catalog"
      >
        <p className="app__empty-catalog-title">暂无邮件模板</p>
        <p className="app__hint">
          点击下方按钮，创建您的第一封邮件模板。
        </p>
        <ShopPrimaryButton
          className="app__empty-catalog-create"
          disabled={creatingTemplate}
          onClick={openCreateTemplateModal}
        >
          创建新模板
        </ShopPrimaryButton>
        {emailTemplateCreateModal}
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
            服务连接失败，请检查网络后刷新重试；若问题持续，请联系管理员。
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <TopbarHomeBackButton />
        <div className="topbar__resource-path" aria-label="当前邮件模板与版式">
          <TopbarTemplateSelect
            items={items}
            value={emailKey}
            disabled={lockLayoutResourceActions || emailLoadBusy || templateResourceBusy}
            busy={templateResourceBusy}
            renaming={templateResourceBusy}
            creating={creatingTemplate}
            deleting={templateResourceBusy}
            onSelect={(nextEmailKey) => void switchEmailTemplate(nextEmailKey)}
            onRename={renameCurrentTemplate}
            onDelete={deleteCurrentTemplate}
            onOpenCreate={openCreateTemplateModal}
            onOpenCopy={openCopyTemplateModal}
            onSetPublishStatus={setTemplatePublishStatus}
          />
          <span className="topbar__resource-separator" aria-hidden>
            ›
          </span>
          <TopbarLayoutVariantSelect
            manifest={layoutManifest}
            value={layoutVariantId}
            busy={layoutVariantBusy}
            aiPipelineSteps={aiPipelineSteps}
            disabled={lockLayoutResourceActions || emailLoadBusy || templateResourceBusy}
            onSelect={(nextLayoutId) => void switchLayoutVariant(nextLayoutId)}
            onCreate={createLayoutVariant}
            onCreateModalClosed={() => setAiPipelineSteps(null)}
            onRename={renameLayoutVariant}
            onDelete={deleteCurrentLayoutVariant}
            onSetPublishStatus={setLayoutVariantPublishStatus}
          />
        </div>
        <div className="topbar__view-switch" role="tablist" aria-label="工作台视图">
          {WORKBENCH_VIEW_TABS.map(({ view, label }) => (
            <button
              key={view}
              type="button"
              role="tab"
              aria-selected={workbenchView === view}
              className={`topbar__view-btn ${workbenchView === view ? "topbar__view-btn--active" : ""}`}
              onClick={() => startTransition(() => setWorkbenchView(view))}
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
              disabled={!emailKey}
              title={!emailKey ? "请先选择邮件模板" : "编辑模板基础信息和发信信息"}
              onClick={() => setMailInfoOpen(true)}
            >
              模板信息
            </button>
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
      </header>
      {mailInfoOpen ? (
        <ShopSectionModal
          visible
          title="编辑模板信息"
          width={520}
          onCancel={() => setMailInfoOpen(false)}
          maskClosable
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
            emailKey={emailKey}
            onError={reportOperationalError}
            variant="embedded"
            showEmbeddedHeader={false}
            externalSaveNonce={metaSaveNonce}
            onDirtyChange={setMetaDirty}
            onSavingChange={setMetaSaving}
          />
        </ShopSectionModal>
      ) : null}

      <CanvasDragInsertRoot
        enabled={workbenchView === "block" && !!template && !!previewModel}
        sourceTemplate={template!}
        previewModel={previewModel!}
        tokenPresets={tokenPresets}
        blockMastersById={blockMastersById}
        sectionMastersById={sectionMastersById}
        onTemplateChange={setTemplate}
        onInserted={handleCanvasDragInserted}
        onMoved={handleCanvasDragMoved}
        onError={reportOperationalError}
      >
      <main className="workspace">
        {emailKey ? (
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
        <EditorLeftPanelHost
          layoutPrewarmed={layoutPrewarmed}
          template={template}
          payload={payload}
          previewModel={previewModel}
          insertableEntries={insertableEntries}
          sectionCatalogItems={sectionCatalogItems}
          onRenameSection={handleRenameSection}
          onDeleteSection={handleDeleteSection}
          selectedPayloadSlotId={selectedPayloadSlotId}
          onSelectPayloadSlot={onSelectPayloadSlot}
          onPayloadChange={setPayload}
          onPayloadPanelVariableCreated={onPayloadPanelVariableCreated}
          globalTokenPresetsList={globalTokenPresetsList}
          tokenPresets={tokenPresets}
          stylePresetListSelection={stylePresetListSelection}
          onSelectLocalStylePreset={onSelectLocalStylePreset}
          onSelectGlobalStylePreset={onSelectGlobalStylePreset}
          createGlobalStylePreset={createGlobalStylePreset}
          getSlotError={validationContext.getSlotError}
          getSlotWarning={validationContext.getSlotWarning}
          tokenPresetsError={validationContext.tokenPresetsError}
          tokenPresetsWarning={validationContext.tokenPresetsWarning}
          blockErrorIds={validationContext.blockErrorIds}
          blockWarnIds={validationContext.blockWarnIds}
        />
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
                onClick={() => startTransition(() => setCanvasPreviewViewport("desktop"))}
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
                onClick={() => startTransition(() => setCanvasPreviewViewport("mobile"))}
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
            <div
              className="canvas-scroll"
              ref={canvasScrollRef}
              onClick={(e) => {
                if (isCanvasNonBlockClickTarget(e.target)) selectBlock(null);
              }}
            >
              <div className="canvas-frame">
                {canvasPreviewModel ?? previewModel ? (
                  <EditorEmailPreviewHost
                    previewModel={(canvasPreviewModel ?? previewModel)!}
                    sourceTemplate={template}
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
          <EditorCanvasBlockActionsHost
            template={template}
            previewModel={previewModel}
            canvasScrollRef={canvasScrollRef}
            canvasStageRef={canvasStageRef}
            canvasPreviewViewportPx={canvasPreviewViewportPx}
            canvasRootConfiguredWidthPx={canvasRootConfiguredWidthPx}
            canvasActionsBusy={canvasActionsBusy}
            onOpenInsertModal={openInsertModal}
            onOpenSaveSectionModal={() => setSaveSectionModalOpen(true)}
            onDeleteSelectedBlock={handleDeleteSelectedCanvasBlock}
            onMoveSelectedBlock={handleMoveSelectedCanvasBlock}
            onDuplicateSelectedBlock={handleDuplicateSelectedCanvasBlock}
          />
        </section>
        <EditorInspectorColumnHost
          layoutPrewarmed={layoutPrewarmed}
          template={template}
          payload={payload}
          previewPayload={previewPayload!}
          previewModel={previewModel}
          onUpdate={onUpdate}
          onTemplateChange={onTemplateChange}
          onDiscardPayloadSlotDraft={handleDiscardPayloadSlotDraft}
          emailKey={emailKey}
          layoutVariantId={layoutVariantId}
          effectiveDesignTokens={effectiveDesignTokens}
          tokenPresets={tokenPresets}
          onBlockMasterSaved={handleBlockMasterSaved}
          getFieldError={validationContext.getFieldError}
          getFieldWarning={validationContext.getFieldWarning}
          requestedInspectorTab={requestedInspectorTab}
          onConsumedInspectorTabRequest={handleConsumedInspectorTabRequest}
          payloadSlotDrafts={payloadSlotDrafts}
          onSlotDraftChange={handleSlotDraftChange}
          selectedPayloadSlotId={selectedPayloadSlotId}
          onPayloadChange={setPayload}
          onVariableDeleted={handlePayloadVariableDeleted}
          onSlotIdChange={setSelectedPayloadSlotId}
          tokenPresetForInspector={tokenPresetForInspector}
          stylePresetInspectorDirty={stylePresetInspectorDirty}
          stylePresetListSelection={stylePresetListSelection}
          onSetAsTemplateDefault={persistTemplateDefaultStylePreset}
          isTemplateDefaultForCurrentSelection={isCurrentStylePresetTemplateDefault}
          setAsTemplateDefaultDisabled={!emailKey}
          onDeleteGlobal={deleteGlobalStylePreset}
          onTokenPresetInspectorChange={handleTokenPresetInspectorChange}
          onSaveStylePreset={saveCurrentStylePresetFromPanel}
          tokenPresetsError={validationContext.tokenPresetsError}
          tokenPresetsWarning={validationContext.tokenPresetsWarning}
          getSlotError={validationContext.getSlotError}
          getSlotWarning={validationContext.getSlotWarning}
        />
      </main>
      </CanvasDragInsertRoot>
      {validationIssuesForDisplay.length > 0 ? (
        <TemplateValidationDock
          issues={validationIssuesForDisplay}
          template={template}
          onNavigateIssue={handleNavigateValidationIssue}
        />
      ) : null}
      {emailTemplateCreateModal}
    </div>
  );
}
