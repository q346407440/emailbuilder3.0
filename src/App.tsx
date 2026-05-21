import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EmailListItem, EmailMeta, EmailPayload, EmailTemplate } from "./types/email";
import type { LayoutManifest } from "./layout-variant-contract/types";
import type { TokenPresets } from "./types/tokenPreset";
import * as api from "./api/client";
import { mergeTemplatePayload } from "./lib/merge";
import { expandRepeatRegions, sourceBlockIdFromRepeatClone } from "./lib/repeatRegion";
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
import { normalizeTokenPresetTokens } from "./lib/tokenPresetStandardOrder";
import {
  validatePayloadAgainstTemplate,
  validatePayloadAgainstTemplateUnion,
  validateTemplate,
} from "./lib/validate";
import { validateTokenPresets } from "./lib/validateTokenPresets";
import { createDefaultTokenPresets } from "./lib/defaultTokenPresets";
import { resolveDesignTokens } from "./lib/resolveTokenPreset";
import { resolveThemeInTemplate } from "./lib/resolveThemeInTemplate";
import { isThemeRef } from "./types/themeRef";
import { getLastSelectedEmailKey, setLastSelectedEmailKey } from "./lib/lastSelectedEmail";
import { normalizeEmailRootBlock } from "./lib/normalizeEmailRoot";
import { BlockTree } from "./components/BlockTree";
import { ValidationIssuesBanner } from "./components/ValidationIssuesBanner";
import { EmailPreview } from "./components/EmailPreview";
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
import { TopbarLayoutVariantSelect } from "./components/ui/TopbarLayoutVariantSelect";
import { useEmailDiskPersist } from "./hooks/useEmailDiskPersist";
import { layoutVariantTokenPresetsPathHint } from "./lib/layoutVariantPathHint";
import {
  emailDataSyncEditorSnapshot,
  shouldShowEmailDataSyncToast,
} from "./lib/emailDataSyncToast";
import { goToLibrary } from "./lib/appNavigation";
import "./app.css";
import "./sds-admin-field-overrides.css";

type WorkbenchView = "tokens" | "payload" | "meta" | "block";

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

/** 从地址栏 `?emailKey=` 或 `?email=` 读取要打开的模板（须存在于当前列表）。 */
function readEmailKeyFromUrl(items: EmailListItem[]): string | null {
  try {
    const q = readSearchParams();
    const pick = (v: string | null) => (v ?? "").trim().replace(/^["']|["']$/g, "");
    const key = pick(q.get("emailKey")) || pick(q.get("email"));
    if (!key) return null;
    return items.some((it) => it.emailKey === key) ? key : null;
  } catch {
    return null;
  }
}

function readLayoutVariantFromUrl(manifest: LayoutManifest | null): string | null {
  if (!manifest) return null;
  try {
    const raw = readSearchParams().get("layout")?.trim();
    if (!raw) return null;
    return manifest.variants.some((v) => v.id === raw) ? raw : null;
  } catch {
    return null;
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

function sortEmailItemsByNewest(items: EmailListItem[]): EmailListItem[] {
  const toTs = (v?: string): number => {
    if (!v) return 0;
    const ts = Date.parse(v);
    return Number.isFinite(ts) ? ts : 0;
  };
  return [...items].sort((a, b) => {
    const delta = toTs(b.updatedAt) - toTs(a.updatedAt);
    if (delta !== 0) return delta;
    return b.emailKey.localeCompare(a.emailKey, "zh-CN", { numeric: true, sensitivity: "base" });
  });
}

function isEmailItemsEqual(a: EmailListItem[], b: EmailListItem[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const left = a[i]!;
    const right = b[i]!;
    if (
      left.emailKey !== right.emailKey ||
      left.displayName !== right.displayName ||
      left.templateId !== right.templateId ||
      left.templateVersion !== right.templateVersion ||
      left.hasPayload !== right.hasPayload ||
      (left.hasLayoutVariants ?? false) !== (right.hasLayoutVariants ?? false) ||
      (left.activeLayoutVariantId ?? "") !== (right.activeLayoutVariantId ?? "") ||
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
  const [autoOpenDataSourceSlotId, setAutoOpenDataSourceSlotId] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  /** 画布与区块树共用：同一 id 重复选中时也递增，便于左侧树滚动定位 */
  const [blockTreeSyncNonce, setBlockTreeSyncNonce] = useState(0);
  /** 仅当模板存在条件显隐时展示画布开关；默认关（画布仍显示这些区块）；开=整段按「全部不满足」裁剪 */
  const [canvasSimulateAllHidden, setCanvasSimulateAllHidden] = useState(false);

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

  const selectBlock = useCallback((id: string | null) => {
    setSelectedBlockId(id ? sourceBlockIdFromRepeatClone(id) : null);
    setBlockTreeSyncNonce((n) => n + 1);
  }, []);

  const onSelectPayloadSlot = useCallback(
    (slotId: string) => {
      setSelectedPayloadSlotId(slotId);
      if (!template) return;
      const slot = collectExternalVariableSlots(template).find((s) => s.slotId === slotId);
      if (!slot) return;
      const blockId = getSlotPrimaryBlockId(template, slot);
      if (blockId) selectBlock(blockId);
    },
    [selectBlock, template]
  );
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [renamingTemplate, setRenamingTemplate] = useState(false);
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
  const layoutVariantIdRef = useRef<string | null>(layoutVariantId);
  layoutVariantIdRef.current = layoutVariantId;
  const editorSyncStateRef = useRef({
    template,
    payload,
    tokenPresets,
  });
  editorSyncStateRef.current = { template, payload, tokenPresets };

  const loadList = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    try {
      const r = await api.listEmails();
      const sortedItems = sortEmailItemsByNewest(r.items);
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
        r.items.filter((item) => item.tokenPresets).map((item) => [item.presetId, item.tokenPresets])
      );
      setGlobalTokenPresets(map);
      setDiskGlobalTokenPresets(structuredClone(map));
    } catch (e) {
      if (!opts?.silent) setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void loadList();
    void loadGlobalTokenPresets({ silent: true });
  }, [loadList, loadGlobalTokenPresets]);

  /** 模板列表事件订阅：由服务端监听文件变化并实时推送。 */
  useEffect(() => {
    const unsubscribe = api.subscribeEmailListChanges(() => {
      void loadList({ silent: true });
    });
    return () => unsubscribe();
  }, [loadList]);

  useEffect(() => {
    const unsubscribe = api.subscribeTokenPresetChanges(() => {
      void loadGlobalTokenPresets({ silent: true });
    });
    return () => unsubscribe();
  }, [loadGlobalTokenPresets]);

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
    const previousKey = emailKeyRef.current;
    const requestId = ++loadEmailRequestIdRef.current;
    pendingLoadEmailKeyRef.current = key;
    setEmailKey(key);
    setStatus("加载中…");
    setError(null);
    try {
      const manifest = await api.getLayoutManifest(key);
      const layoutId =
        preferredLayoutId ??
        readLayoutVariantFromUrl(manifest) ??
        manifest?.activeLayoutVariantId ??
        null;
      if (manifest && layoutId && !manifest.variants.some((v) => v.id === layoutId)) {
        throw new Error(`未知版式：${layoutId}`);
      }
      const t = normalizeEmailRootBlock(await api.getTemplate(key, layoutId));
      let sceneTemplates: Array<{ layoutVariantId: string; template: EmailTemplate }> = [];
      if (manifest && manifest.variants.length > 1) {
        sceneTemplates = await Promise.all(
          manifest.variants.map(async (v) => ({
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
      const globalMap = Object.fromEntries(
        globalList.items.filter((item) => item.tokenPresets).map((item) => [item.presetId, item.tokenPresets])
      );
      const globalIds = new Set(Object.keys(globalMap));
      const initialSel = resolveInitialStylePresetListSelection(meta, nextTokenPresets, globalIds);
      const tpNorm = tokenPresetsWithoutAppliedGlobal(nextTokenPresets);
      if (requestId !== loadEmailRequestIdRef.current) return;
      let manifestForState = manifest;
      if (manifest && layoutId && layoutId !== manifest.activeLayoutVariantId) {
        await api.putActiveLayoutVariant(key, layoutId);
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
      setError(e instanceof Error ? e.message : String(e));
      const list = itemsRef.current;
      const revertKey =
        previousKey && list.some((it) => it.emailKey === previousKey)
          ? previousKey
          : list[0]?.emailKey ?? null;
      setEmailKey(revertKey);
    } finally {
      if (requestId === loadEmailRequestIdRef.current) {
        pendingLoadEmailKeyRef.current = null;
      }
    }
  }, [selectBlock]);

  useEffect(() => {
    if (items.length && !emailKey) {
      const fromUrl = readEmailKeyFromUrl(items);
      const lastKey = getLastSelectedEmailKey();
      const lastExists = lastKey ? items.some((it) => it.emailKey === lastKey) : false;
      const initialEmailKey = fromUrl ?? (lastExists && lastKey ? lastKey : items[0]!.emailKey);
      void loadEmail(initialEmailKey);
    }
  }, [items, emailKey, loadEmail]);

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

  const handleCommitPayloadSlot = useCallback(
    (slotId: string) => {
      if (!payload) return;
      const draft = payloadSlotDrafts[slotId];
      if (!draft) return;
      setPayload(commitPayloadSlotDraft(payload, slotId, draft));
      setPayloadSlotDrafts((prev) => discardPayloadSlotDraft(prev, slotId));
      message.success("已保存变量（顶栏「保存」后写入磁盘）");
    },
    [payload, payloadSlotDrafts]
  );

  const resolvedPreview = useMemo((): {
    template: EmailTemplate | null;
    previewTemplate: EmailTemplate | null;
    issues: Array<{ path: string; reason: string }>;
  } => {
    if (!template || !previewPayload) return { template: null, previewTemplate: null, issues: [] };
    const afterVisibility: EmailTemplate = (() => {
      if (!hasVisibilityBlocks) {
        return applyVisibilityRules(template, previewPayload);
      }
      if (canvasSimulateAllHidden) {
        return applyVisibilityRules(template, previewPayload, { simulateAllHidden: true });
      }
      return template;
    })();
    const expandedTemplate = expandRepeatRegions(afterVisibility, previewPayload);
    const mergedTemplate = mergeTemplatePayload(expandedTemplate, previewPayload);
    if (!containsThemeRef(mergedTemplate)) {
      return { template: mergedTemplate, previewTemplate: mergedTemplate, issues: [] };
    }
    if (!effectiveDesignTokens) {
      return {
        template: null,
        previewTemplate: mergedTemplate,
        issues: [{ path: "tokenPresets", reason: "模板包含 $themeRef，但当前缺少可用的样式预设" }],
      };
    }
    const resolved = resolveThemeInTemplate(mergedTemplate, effectiveDesignTokens);
    return {
      template: resolved.template,
      previewTemplate: resolved.template ?? mergedTemplate,
      issues: resolved.issues,
    };
  }, [template, previewPayload, effectiveDesignTokens, hasVisibilityBlocks, canvasSimulateAllHidden]);

  /** 画布用已烘焙主题；烘焙失败时回退未烘焙稿，避免整页卡在「正在加载编辑器…」 */
  const merged = resolvedPreview?.previewTemplate ?? null;

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

  const payloadSlotDraftsDirty = useMemo(() => {
    if (!payload) return false;
    return hasDirtyPayloadSlotDrafts(payload, payloadSlotDrafts);
  }, [payload, payloadSlotDrafts]);

  const templatePayloadDirty = useMemo(() => {
    if (!diskTemplatePayload || !template || !payload) return payloadSlotDraftsDirty;
    return (
      payloadSlotDraftsDirty ||
      stableStringify({ template, payload }) !==
        stableStringify({
          template: diskTemplatePayload.template,
          payload: diskTemplatePayload.payload,
        })
    );
  }, [diskTemplatePayload, template, payload, payloadSlotDraftsDirty]);

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

  const onTemplateChange = useCallback((nextTemplate: EmailTemplate) => {
    setTemplate(nextTemplate);
  }, []);

  const onPersistSuccess = useCallback(
    async () => {
      setStatus("已保存");
      setError(null);
      void loadList();
    },
    [loadList]
  );

  const onPersistError = useCallback((message: string) => {
    setError(message);
    setStatus("");
  }, []);

  const { flushPersist } = useEmailDiskPersist({
    emailKey,
    layoutVariantId,
    layoutManifest,
    template,
    payload,
    onPersistSuccess,
    onPersistError,
  });

  const hasLayoutDirty = templatePayloadDirty || tokenPresetsDirty || globalStylePresetDirty;

  const switchLayoutVariant = useCallback(
    async (nextLayoutId: string) => {
      if (!emailKey || !layoutManifest) return;
      if (nextLayoutId === layoutVariantId) return;
      if (
        hasLayoutDirty &&
        !window.confirm("当前版式有未保存的更改，切换后将丢弃这些编辑。是否继续？")
      ) {
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
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [emailKey, layoutManifest, layoutVariantId, hasLayoutDirty, loadEmail]
  );

  const save = useCallback(async () => {
    if (!emailKey || !template || !payload) return;
    setStatus("保存中…");
    setError(null);
    const ok = await flushPersist();
    if (ok) {
      try {
        if (tokenPresets) {
          const normalizedTp = normalizeTokenPresetsDocument(tokenPresetsWithoutAppliedGlobal(tokenPresets));
          await api.putTokenPresets(emailKey, normalizedTp, layoutVariantId);
          setTokenPresets(normalizedTp);
          setDiskTokenPresets(structuredClone(normalizedTp));
        } else {
          setDiskTokenPresets(null);
        }
        setDiskTemplatePayload({ template: structuredClone(template), payload: structuredClone(payload) });
      } catch (e) {
        setStatus("");
        setError(e instanceof Error ? e.message : String(e));
      }
    } else {
      setStatus("");
    }
  }, [emailKey, layoutVariantId, template, payload, tokenPresets, flushPersist]);

  const discardDraft = useCallback(() => {
    if (!diskTemplatePayload) return;
    setTemplate(structuredClone(diskTemplatePayload.template));
    setPayload(structuredClone(diskTemplatePayload.payload));
    setPayloadSlotDrafts({});
    setTokenPresets(diskTokenPresets ? structuredClone(diskTokenPresets) : null);
    setGlobalPresetDraft({});
    setStatus("已放弃未保存更改");
  }, [diskTemplatePayload, diskTokenPresets]);

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
      setError(e instanceof Error ? e.message : String(e));
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
      setError(e instanceof Error ? e.message : String(e));
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
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [emailKey, stylePresetListSelection]);

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
        setError(e instanceof Error ? e.message : String(e));
        throw e;
      } finally {
        setRenamingTemplate(false);
      }
    },
    [emailKey, loadList]
  );

  /** 当前模板事件订阅：由服务端监听文件变化并推送，前端按当前版式精准同步。 */
  useEffect(() => {
    if (!emailKey) return undefined;
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
        setPayload(p);
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
  }, [emailKey, layoutVariantId, loadList]);

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

  const stylePresetInspectorSourceHint = useMemo(() => {
    if (stylePresetListSelection === "local") {
      if (!emailKey) return "当前编辑本邮件样式预设。";
      return `当前编辑并保存至 ${layoutVariantTokenPresetsPathHint(emailKey, layoutVariantId)}。`;
    }
    return `当前编辑并保存至公共文件 data/token-presets/${stylePresetListSelection}.json。`;
  }, [stylePresetListSelection, emailKey, layoutVariantId]);

  const isCurrentStylePresetTemplateDefault = useMemo(() => {
    const saved = emailMeta?.defaultStylePresetSelection ?? "local";
    return saved === stylePresetListSelection;
  }, [emailMeta?.defaultStylePresetSelection, stylePresetListSelection]);

  const emptyCatalog =
    emailCatalogReady && items.length === 0 && error === null && !template && !payload;

  if (emptyCatalog) {
    return (
      <div className="app app--loading app--empty-catalog">
        <p className="app__empty-catalog-title">暂无邮件模板</p>
        <p className="app__hint">
          在仓库 <code>data/emails/&lt;场景&gt;/</code> 下放入 <code>template.json</code>（推荐同时维护{" "}
          <code>tokenPresets.json</code>、<code>payload.json</code>）。
          多版式场景另建 <code>layout-manifest.json</code> 与 <code>layouts/&lt;版式&gt;/</code> 三件套；保存后列表会自动刷新。
        </p>
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
        <div className="topbar__brand">简易邮件</div>
        <TopbarTemplateSelect
          items={items}
          value={emailKey}
          renaming={renamingTemplate}
          onSelect={(nextEmailKey) => void loadEmail(nextEmailKey)}
          onRename={renameCurrentTemplate}
        />
        <TopbarLayoutVariantSelect
          manifest={layoutManifest}
          value={layoutVariantId}
          disabled={status.startsWith("加载") || status.startsWith("切换")}
          onSelect={(nextLayoutId) => void switchLayoutVariant(nextLayoutId)}
        />
        <div className="topbar__view-switch" role="tablist" aria-label="工作台视图">
          {(
            [
              ["tokens", "样式预设"],
              ["payload", "变量赋值"],
              ["meta", "元信息"],
              ["block", "底层 Block"],
            ] as const
          ).map(([view, label]) => (
            <button
              key={view}
              type="button"
              className={`topbar__view-btn ${workbenchView === view ? "topbar__view-btn--active" : ""}`}
              onClick={() => setWorkbenchView(view)}
            >
              {label}
            </button>
          ))}
        </div>
        <ShopSecondaryButton className="topbar__btn" htmlType="button" onClick={goToLibrary}>
          组件库管理
        </ShopSecondaryButton>
        <ShopPrimaryButton className="topbar__btn" onClick={() => void save()}>
          保存
        </ShopPrimaryButton>
        {(templatePayloadDirty || tokenPresetsDirty || globalStylePresetDirty) &&
        diskTemplatePayload ? (
          <ShopSecondaryButton className="topbar__btn" htmlType="button" onClick={discardDraft}>
            放弃未保存更改
          </ShopSecondaryButton>
        ) : null}
        <span className="topbar__hint" title="仅在点击保存按钮后写入 data/emails 下 JSON">
          手动保存模式
        </span>
        {status ? <span className="topbar__status">{status}</span> : null}
      </header>

      {error ? <div className="app__banner app__banner--error">{error}</div> : null}
      {validationIssues.length ? <ValidationIssuesBanner issues={validationIssues} /> : null}
      <main className="workspace">
        {workbenchView === "tokens" ? (
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
          />
        ) : workbenchView === "payload" ? (
          <PayloadPanel
            template={template}
            payload={payload}
            selectedSlotId={selectedPayloadSlotId}
            onSelectSlot={onSelectPayloadSlot}
            onPayloadChange={setPayload}
            onCollectionSlotCreated={setAutoOpenDataSourceSlotId}
          />
        ) : workbenchView === "meta" ? (
          <MetaEditor emailKey={emailKey} onError={setError} />
        ) : (
          <BlockTree
            template={merged}
            selectedBlockId={selectedBlockId}
            syncNonce={blockTreeSyncNonce}
            onSelect={selectBlock}
          />
        )}
        <section className="canvas-col">
          <div className="canvas-col__head">
            <div className="canvas-col__title">画布预览</div>
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
          <div className="canvas-scroll">
            <div className="canvas-frame">
              <EmailPreview
                template={merged}
                selectedBlockId={selectedBlockId}
                onSelectBlock={selectBlock}
              />
            </div>
          </div>
        </section>
        {workbenchView === "tokens" ? (
          <TokenPresetInspector
            tokenPresets={tokenPresetForInspector}
            dirty={stylePresetInspectorDirty}
            editingSourceHint={stylePresetInspectorSourceHint}
            onSetAsTemplateDefault={() => void persistTemplateDefaultStylePreset()}
            isTemplateDefaultForCurrentSelection={isCurrentStylePresetTemplateDefault}
            setAsTemplateDefaultDisabled={!emailKey}
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
          />
        ) : workbenchView === "payload" ? (
          <PayloadInspector
            template={template}
            payload={payload}
            slotDrafts={payloadSlotDrafts}
            onSlotDraftChange={handleSlotDraftChange}
            onCommitSlot={handleCommitPayloadSlot}
            selectedSlotId={selectedPayloadSlotId}
            autoOpenDataSourceSlotId={autoOpenDataSourceSlotId}
            onAutoOpenDataSourceHandled={() => setAutoOpenDataSourceSlotId(null)}
            onPayloadChange={setPayload}
            onTemplatePayloadChange={onUpdate}
            onSlotIdChange={setSelectedPayloadSlotId}
          />
        ) : (
          <Inspector
            template={template}
            payload={payload}
            previewPayload={previewPayload}
            selectedBlockId={selectedBlockId}
            onUpdate={onUpdate}
            onTemplateChange={onTemplateChange}
            onDiscardPayloadSlotDraft={(slotId) =>
              setPayloadSlotDrafts((prev) => discardPayloadSlotDraft(prev, slotId))
            }
            emailKey={emailKey}
            layoutVariantId={layoutVariantId}
            mergedTemplate={merged}
            effectiveDesignTokens={effectiveDesignTokens}
            tokenPresets={tokenPresets}
          />
        )}
      </main>
    </div>
  );
}
