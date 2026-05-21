import { useCallback, useRef } from "react";
import type { LayoutManifest } from "../layout-variant-contract/types";
import type { EmailPayload, EmailTemplate } from "../types/email";
import * as api from "../api/client";
import { fetchTemplatesAndValidatePayload } from "../lib/validatePayloadAllLayouts";
import { validatePayloadAgainstTemplate, validateTemplate } from "../lib/validate";

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

/** 仅在手动保存时写入磁盘，避免自动落盘覆盖用户后续编辑。 */
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

  const runPersist = useCallback(
    async (): Promise<boolean> => {
      const task = async (): Promise<boolean> => {
        const key = emailKeyRef.current;
        const t = templateRef.current;
        const p = payloadRef.current;
        if (!key || !t || !p) return false;

        const snap = JSON.stringify({ template: t, payload: p });
        if (snap === baselineJsonRef.current) return true;

        const issues = [...validateTemplate(t), ...validatePayloadAgainstTemplate(t, p)];
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
          await api.putTemplate(key, t, layoutVariantIdRef.current);
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

  return { flushPersist };
}
