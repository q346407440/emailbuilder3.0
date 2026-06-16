import { useCallback, useRef } from "react";
import type { LayoutManifest } from "../layout-variant-contract/types";
import type { EmailPayload, EmailTemplate } from "../types/email";
import * as api from "../api/client";
import { collectPersistValidationIssues } from "../lib/persistValidation";
import { fetchTemplatesAndValidatePayload } from "../lib/validatePayloadAllLayouts";

type Params = {
  emailKey: string | null;
  /** 场景版式 id；legacy 邮件为 null */
  layoutVariantId?: string | null;
  /** 多版式场景清单；有则保存 payload 前对照全部版式 template */
  layoutManifest?: LayoutManifest | null;
  template: EmailTemplate | null;
  payload: EmailPayload | null;
  /** 每次成功写入 template.json + payload.json 后调用（用于刷新列表、状态栏） */
  onPersistSuccess?: (source: "manual") => void | Promise<void>;
  /** 写入失败（含校验 422） */
  onPersistError?: (message: string) => void;
};

/** 模板/样式预设等默认手动保存；变量目录创建与删除通过 persist*Catalog 立即落盘。 */
export function useEmailDiskPersist({
  emailKey,
  layoutVariantId = null,
  layoutManifest = null,
  template,
  payload,
  onPersistSuccess,
  onPersistError,
}: Params) {
  const baselineJsonRef = useRef<string | null>(null);
  const persistChainRef = useRef<Promise<unknown>>(Promise.resolve());

  const templateRef = useRef(template);
  const payloadRef = useRef(payload);
  const layoutVariantIdRef = useRef(layoutVariantId);
  const layoutManifestRef = useRef(layoutManifest);
  const emailKeyRef = useRef(emailKey);
  templateRef.current = template;
  payloadRef.current = payload;
  emailKeyRef.current = emailKey;
  layoutVariantIdRef.current = layoutVariantId;
  layoutManifestRef.current = layoutManifest;

  const onSuccessRef = useRef(onPersistSuccess);
  const onErrorRef = useRef(onPersistError);
  onSuccessRef.current = onPersistSuccess;
  onErrorRef.current = onPersistError;
  const baselineEmailKeyRef = useRef<string | null>(emailKey);
  if (baselineEmailKeyRef.current !== emailKey) {
    baselineEmailKeyRef.current = emailKey;
    baselineJsonRef.current = null;
  }

  type PersistOptions = {
    /** 仅写入 payload.json（新建变量入库；template 不变） */
    payloadOnly?: boolean;
    /** 覆盖当前 template 快照（用于 setState 后立刻落盘） */
    template?: EmailTemplate;
    /** 覆盖当前内存快照（用于 setState 后立刻落盘） */
    payload?: EmailPayload;
    /** 变量目录增删等须立即落盘：跳过与 baseline 相同则跳过的短路 */
    force?: boolean;
  };

  const runPersist = useCallback(
    async (options?: PersistOptions): Promise<boolean> => {
      const task = async (): Promise<boolean> => {
        const key = emailKeyRef.current;
        const t = options?.template ?? templateRef.current;
        const p = options?.payload ?? payloadRef.current;
        if (!key || !t || !p) return false;

        const snap = JSON.stringify({ template: t, payload: p });
        if (!options?.force && snap === baselineJsonRef.current) return true;

        const issues = collectPersistValidationIssues(t, p, {
          payloadOnly: options?.payloadOnly,
        });
        if (issues.length > 0) {
          onErrorRef.current?.(
            issues.map((i) => `${i.path}：${i.reason}`).join("；") || "校验未通过"
          );
          return false;
        }

        const manifest = layoutManifestRef.current;
        if (manifest && manifest.variants.length > 0) {
          const crossLayoutIssues = await fetchTemplatesAndValidatePayload(
            manifest,
            p,
            layoutVariantIdRef.current,
            t,
            (layoutId) => api.getTemplate(key, layoutId)
          );
          if (crossLayoutIssues.length > 0) {
            onErrorRef.current?.(
              crossLayoutIssues.map((i) => `${i.path}：${i.reason}`).join("；")
            );
            return false;
          }
        }

        try {
          if (!options?.payloadOnly) {
            await api.putTemplate(key, t, layoutVariantIdRef.current);
          }
          await api.putPayload(key, p);
          baselineJsonRef.current = snap;
          await Promise.resolve(onSuccessRef.current?.("manual"));
          return true;
        } catch (e) {
          onErrorRef.current?.(e instanceof Error ? e.message : String(e));
          return false;
        }
      };

      const queuedTask = persistChainRef.current.then(task, task);
      persistChainRef.current = queuedTask.then(
        () => undefined,
        () => undefined
      );
      return queuedTask;
    },
    []
  );

  const flushPersist = useCallback(async (): Promise<boolean> => {
    const key = emailKeyRef.current;
    const t = templateRef.current;
    const p = payloadRef.current;
    if (!key || !t || !p) return false;
    const snap = JSON.stringify({ template: t, payload: p });
    if (snap === baselineJsonRef.current) return true;
    return runPersist();
  }, [runPersist]);

  /** 新建变量：立即写入 payload.json（成功后才应更新编辑器内存） */
  const persistPayloadSlotCatalog = useCallback(
    async (nextPayload: EmailPayload): Promise<boolean> => {
      return runPersist({ payloadOnly: true, payload: nextPayload, force: true });
    },
    [runPersist]
  );

  /** 删除变量：立即写入 template.json + payload.json（成功后才应更新编辑器内存） */
  const persistTemplatePayloadCatalog = useCallback(
    async (nextTemplate: EmailTemplate, nextPayload: EmailPayload): Promise<boolean> => {
      return runPersist({ template: nextTemplate, payload: nextPayload, force: true });
    },
    [runPersist]
  );

  return { flushPersist, persistPayloadSlotCatalog, persistTemplatePayloadCatalog };
}
