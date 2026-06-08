import { useEffect, useRef, useState } from "react";
import { message } from "@shoplazza/sds";
import { captureEmailPreviewHtmlFromDom } from "../lib/captureEmailPreviewHtml";
import { resolveTestEmailSubject } from "../lib/emailDeliveryFields";
import {
  buildMetaEditorPersistPatch,
  metaToEditorForm,
  type MetaEditorFormSnapshot,
} from "../lib/metaEditorPersist";
import {
  getEmailMeta,
  getSmtpTestStatus,
  putEmailMeta,
  sendTestEmail,
  type SmtpTestStatus,
} from "../api/client";
import { SendTestEmailModal } from "./SendTestEmailModal";
import { Field } from "./ui/Field";
import { InspectorPanelSection } from "./ui/InspectorPanelSection";
import { ShopInput, ShopTextArea } from "./ui/ShopFormControls";

/** 保存成功提示做节流，避免连续点击刷屏。 */
const META_SAVE_TOAST_MIN_MS = 2400;

function isMetaFormEqual(a: MetaEditorFormSnapshot, b: MetaEditorFormSnapshot): boolean {
  return (
    a.displayName === b.displayName &&
    a.description === b.description &&
    a.subject === b.subject &&
    a.preheader === b.preheader
  );
}

type Props = {
  emailKey: string | null;
  onError?: (message: string) => void;
  /** panel: 左侧整栏；embedded: 作为右侧 inspector 内容区 */
  variant?: "panel" | "embedded";
  /** 顶栏触发发送测试邮件（仅 embedded 场景会使用） */
  openSendTestNonce?: number;
  /** 回传当前是否可发送测试邮件（给顶栏按钮禁用态） */
  onSendTestCapabilityChange?: (capable: boolean) => void;
};

export function MetaEditor({
  emailKey,
  onError,
  variant = "panel",
  openSendTestNonce = 0,
  onSendTestCapabilityChange,
}: Props) {
  const [form, setForm] = useState<MetaEditorFormSnapshot>(() => metaToEditorForm(null));
  const [savedForm, setSavedForm] = useState<MetaEditorFormSnapshot>(() => metaToEditorForm(null));
  const [loaded, setLoaded] = useState(false);
  const [smtpStatus, setSmtpStatus] = useState<SmtpTestStatus | null>(null);
  const [sendTestOpen, setSendTestOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const lastMetaToastAtRef = useRef(0);
  const prevOpenSendTestNonceRef = useRef(openSendTestNonce);

  useEffect(() => {
    let cancelled = false;
    if (!emailKey) {
      const emptyForm = metaToEditorForm(null);
      setForm(emptyForm);
      setSavedForm(emptyForm);
      setLoaded(false);
      return;
    }
    setLoaded(false);
    void (async () => {
      try {
        const m = await getEmailMeta(emailKey);
        if (cancelled) return;
        const nextForm = metaToEditorForm(m);
        setForm(nextForm);
        setSavedForm(nextForm);
        setLoaded(true);
      } catch (err) {
        if (cancelled) return;
        onError?.(err instanceof Error ? err.message : String(err));
        setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [emailKey, onError]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const status = await getSmtpTestStatus();
        if (!cancelled) setSmtpStatus(status);
      } catch (err) {
        if (!cancelled) {
          setSmtpStatus({ configured: false });
          onError?.(err instanceof Error ? err.message : String(err));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onError]);

  function notifyMetaPersisted() {
    const now = Date.now();
    if (now - lastMetaToastAtRef.current < META_SAVE_TOAST_MIN_MS) return;
    lastMetaToastAtRef.current = now;
    message.info("元信息已写入 meta.json", 1.6);
  }

  function update<K extends keyof MetaEditorFormSnapshot>(key: K, value: MetaEditorFormSnapshot[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function saveMeta(next: MetaEditorFormSnapshot): Promise<boolean> {
    if (!emailKey || !loaded) return false;
    setSavingMeta(true);
    try {
      await putEmailMeta(emailKey, buildMetaEditorPersistPatch(next));
      setSavedForm(next);
      notifyMetaPersisted();
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      onError?.(msg);
      message.error(msg);
      return false;
    } finally {
      setSavingMeta(false);
    }
  }

  const disabled = !emailKey;
  const isEmbedded = variant === "embedded";
  const dirty = loaded && !disabled && !isMetaFormEqual(form, savedForm);
  const canSendTest = !disabled && Boolean(smtpStatus?.configured);

  useEffect(() => {
    onSendTestCapabilityChange?.(canSendTest);
    return () => onSendTestCapabilityChange?.(false);
  }, [canSendTest, onSendTestCapabilityChange]);

  useEffect(() => {
    const prev = prevOpenSendTestNonceRef.current;
    prevOpenSendTestNonceRef.current = openSendTestNonce;
    if (!isEmbedded) return;
    if (openSendTestNonce === prev) return;
    if (!canSendTest) return;
    setSendTestOpen(true);
  }, [canSendTest, isEmbedded, openSendTestNonce]);

  async function handleSendTestEmail(args: { to: string }) {
    if (!emailKey) return;
    const subject = resolveTestEmailSubject({
      subject: form.subject,
      displayName: form.displayName,
      emailKey,
    });
    const preheader = form.preheader.trim();
    const html = captureEmailPreviewHtmlFromDom({ subject, preheader });
    if (!html) {
      message.error("未找到画布预览内容，请确认中间「画布预览」已加载");
      return;
    }
    setSending(true);
    try {
      const result = await sendTestEmail(emailKey, {
        to: args.to,
        html,
        subject,
        preheader,
      });
      message.success(`测试邮件已发送${result.messageId ? `（${result.messageId}）` : ""}`, 3);
      setSendTestOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      message.error(msg);
      onError?.(msg);
    } finally {
      setSending(false);
    }
  }

  const content = (
    <div className={isEmbedded ? "meta-editor__scroll meta-editor__scroll--embedded" : "block-tree__scroll meta-editor__scroll"}>
        {dirty ? <p className="meta-editor__save-status meta-editor__save-status--dirty">有未保存修改</p> : null}

        <InspectorPanelSection title="基础" className="meta-editor__section">
          <Field label="显示名称" className="meta-editor__field">
            <ShopInput
              value={form.displayName}
              onChange={(e) => update("displayName", e.target.value)}
              disabled={disabled}
              placeholder="邮件在列表中的名称"
            />
          </Field>
          <Field label="说明" className="meta-editor__field">
            <ShopTextArea
              rows={2}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              disabled={disabled}
              placeholder="可选，内部备注"
            />
          </Field>
        </InspectorPanelSection>

        <InspectorPanelSection title="投递信息" className="meta-editor__section">
          <Field label="主题行" className="meta-editor__field">
            <ShopInput
              value={form.subject}
              onChange={(e) => update("subject", e.target.value)}
              disabled={disabled}
              placeholder="收件箱第一行（subject）"
            />
          </Field>
          <Field label="预览摘要" className="meta-editor__field">
            <ShopInput
              value={form.preheader}
              onChange={(e) => update("preheader", e.target.value)}
              disabled={disabled}
              placeholder="收件箱第二行（preheader）"
            />
          </Field>
        </InspectorPanelSection>
      </div>
  );

  return (
    <>
      {isEmbedded ? (
        <>
          <div className="side-inspector__headrow meta-editor__headrow">
            <h2 className="side-panel__title">邮件元信息</h2>
            <div className="resource-text-actions meta-editor__head-actions" role="group" aria-label="元信息操作">
              <button
                type="button"
                className="resource-text-action"
                disabled={disabled || savingMeta || !dirty}
                onClick={() => void saveMeta(form)}
                title="保存元信息到 meta.json"
              >
                {savingMeta ? "保存中…" : "保存"}
              </button>
              <button
                type="button"
                className="resource-text-action"
                disabled={disabled || savingMeta || !dirty}
                onClick={() => setForm(savedForm)}
                title="还原到最近一次已保存状态"
              >
                还原
              </button>
            </div>
          </div>
          {content}
        </>
      ) : (
        <aside className="block-tree meta-editor" aria-label="邮件元信息">
          <div className="block-tree__title">邮件元信息</div>
          {content}
        </aside>
      )}
      <SendTestEmailModal
        visible={sendTestOpen}
        sending={sending}
        disabled={disabled}
        smtpStatus={smtpStatus}
        displayName={form.displayName}
        emailKey={emailKey ?? ""}
        subject={form.subject}
        preheader={form.preheader}
        onCancel={() => {
          if (!sending) setSendTestOpen(false);
        }}
        onSend={handleSendTestEmail}
      />
    </>
  );
}
