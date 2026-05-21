import { useEffect, useRef, useState } from "react";
import { message } from "@shoplazza/sds";
import type { EmailMeta } from "../types/email";
import { getEmailMeta, putEmailMeta } from "../api/client";
import { Field } from "./ui/Field";
import { ShopInput, ShopSelect, ShopTextArea } from "./ui/ShopFormControls";

/** 连续自动保存时合并提示，避免 message 刷屏 */
const META_SAVE_TOAST_MIN_MS = 2400;

type Props = {
  emailKey: string | null;
  onError?: (message: string) => void;
};

type FormState = {
  displayName: string;
  description: string;
  owner: string;
  status: "draft" | "active" | "deprecated";
  supersededBy: string;
  designSourceType: "figma" | "sketch" | "screenshot" | "other";
  designSourceUrl: string;
  subject: string;
  preheader: string;
  senderName: string;
  senderEmail: string;
  campaignTag: string;
};

const STATUS_OPTIONS: Array<{ value: FormState["status"]; label: string }> = [
  { value: "draft", label: "draft（草稿）" },
  { value: "active", label: "active（活跃）" },
  { value: "deprecated", label: "deprecated（已淘汰）" },
];

const DESIGN_SOURCE_TYPE_OPTIONS: Array<{ value: FormState["designSourceType"]; label: string }> = [
  { value: "figma", label: "Figma" },
  { value: "sketch", label: "Sketch" },
  { value: "screenshot", label: "截图" },
  { value: "other", label: "其它" },
];

function metaToForm(meta: EmailMeta | null): FormState {
  return {
    displayName: meta?.displayName ?? "",
    description: meta?.description ?? "",
    owner: meta?.owner ?? "",
    status: (meta?.status as FormState["status"]) ?? "draft",
    supersededBy: meta?.supersededBy ?? "",
    designSourceType: (meta?.designSource?.type as FormState["designSourceType"]) ?? "figma",
    designSourceUrl: meta?.designSource?.url ?? "",
    subject: meta?.delivery?.subject ?? "",
    preheader: meta?.delivery?.preheader ?? "",
    senderName: meta?.delivery?.senderName ?? "",
    senderEmail: meta?.delivery?.senderEmail ?? "",
    campaignTag: meta?.delivery?.campaignTag ?? "",
  };
}

function formToPatch(form: FormState): Partial<EmailMeta> {
  return {
    displayName: form.displayName,
    description: form.description,
    owner: form.owner,
    status: form.status,
    supersededBy: form.supersededBy || undefined,
    designSource: {
      type: form.designSourceType,
      url: form.designSourceUrl,
    },
    delivery: {
      subject: form.subject,
      preheader: form.preheader,
      senderName: form.senderName,
      senderEmail: form.senderEmail,
      campaignTag: form.campaignTag,
    },
  };
}

export function MetaEditor({ emailKey, onError }: Props) {
  const [form, setForm] = useState<FormState>(() => metaToForm(null));
  const [loaded, setLoaded] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMetaToastAtRef = useRef(0);

  const supersededRequired = form.status === "deprecated";

  useEffect(() => {
    let cancelled = false;
    if (!emailKey) {
      setForm(metaToForm(null));
      setLoaded(false);
      return;
    }
    setLoaded(false);
    void (async () => {
      try {
        const m = await getEmailMeta(emailKey);
        if (cancelled) return;
        setForm(metaToForm(m));
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

  function notifyMetaPersisted() {
    const now = Date.now();
    if (now - lastMetaToastAtRef.current < META_SAVE_TOAST_MIN_MS) return;
    lastMetaToastAtRef.current = now;
    message.info("元信息已写入 meta.json", 1.6);
  }

  function scheduleSave(next: FormState) {
    if (!emailKey || !loaded) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void (async () => {
        try {
          await putEmailMeta(emailKey, formToPatch(next));
          notifyMetaPersisted();
        } catch (err) {
          onError?.(err instanceof Error ? err.message : String(err));
        }
      })();
    }, 500);
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      scheduleSave(next);
      return next;
    });
  }

  const disabled = !emailKey;

  return (
    <aside className="theme-panel theme-sidebar meta-editor">
      <header className="theme-panel__header">
        <h2 className="side-panel__title">邮件元信息</h2>
      </header>

      <div className="theme-panel__body theme-panel__side-nav meta-editor__body">
        <div className="theme-panel__group">
          <h3 className="theme-panel__group-title">基础</h3>
          <Field label="显示名称">
            <ShopInput
              value={form.displayName}
              onChange={(e) => update("displayName", e.target.value)}
              disabled={disabled}
            />
          </Field>
          <Field label="说明">
            <ShopTextArea
              rows={2}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              disabled={disabled}
            />
          </Field>
          <Field label="负责人">
            <ShopInput
              value={form.owner}
              onChange={(e) => update("owner", e.target.value)}
              disabled={disabled}
              placeholder="例如：marketing@team"
            />
          </Field>
          <Field label="状态">
            <ShopSelect
              value={form.status}
              disabled={disabled}
              style={{ width: "100%" }}
              onChange={(v) =>
                update("status", (typeof v === "string" ? v : form.status) as FormState["status"])
              }
            >
              {STATUS_OPTIONS.map((o) => (
                <ShopSelect.Option key={o.value} value={o.value}>
                  {o.label}
                </ShopSelect.Option>
              ))}
            </ShopSelect>
          </Field>
          {supersededRequired ? (
            <Field label="被谁取代">
              <ShopInput
                value={form.supersededBy}
                onChange={(e) => update("supersededBy", e.target.value)}
                disabled={disabled}
                placeholder="另一个 emailKey"
              />
            </Field>
          ) : null}
        </div>

        <div className="theme-panel__group">
          <h3 className="theme-panel__group-title">投递信息</h3>
          <Field label="主题行 subject">
            <ShopInput
              value={form.subject}
              onChange={(e) => update("subject", e.target.value)}
              disabled={disabled}
              placeholder="邮件主题（收件箱第一行）"
            />
          </Field>
          <Field label="预览文本 preheader">
            <ShopInput
              value={form.preheader}
              onChange={(e) => update("preheader", e.target.value)}
              disabled={disabled}
              placeholder="收件箱第二行的隐藏摘要"
            />
          </Field>
          <Field label="发件人显示名">
            <ShopInput
              value={form.senderName}
              onChange={(e) => update("senderName", e.target.value)}
              disabled={disabled}
            />
          </Field>
          <Field label="发件人地址">
            <ShopInput
              type="email"
              value={form.senderEmail}
              onChange={(e) => update("senderEmail", e.target.value)}
              disabled={disabled}
              placeholder="noreply@example.com"
            />
          </Field>
          <Field label="Campaign Tag">
            <ShopInput
              value={form.campaignTag}
              onChange={(e) => update("campaignTag", e.target.value)}
              disabled={disabled}
              placeholder="例如：engagement_q2_grooming"
            />
          </Field>
        </div>

        <div className="theme-panel__group">
          <h3 className="theme-panel__group-title">设计源</h3>
          <Field label="来源类型">
            <ShopSelect
              value={form.designSourceType}
              disabled={disabled}
              style={{ width: "100%" }}
              onChange={(v) =>
                update(
                  "designSourceType",
                  (typeof v === "string" ? v : form.designSourceType) as FormState["designSourceType"]
                )
              }
            >
              {DESIGN_SOURCE_TYPE_OPTIONS.map((o) => (
                <ShopSelect.Option key={o.value} value={o.value}>
                  {o.label}
                </ShopSelect.Option>
              ))}
            </ShopSelect>
          </Field>
          <Field label="链接">
            <ShopInput
              type="url"
              value={form.designSourceUrl}
              onChange={(e) => update("designSourceUrl", e.target.value)}
              disabled={disabled}
              placeholder="https://www.figma.com/..."
            />
          </Field>
        </div>

        <p className="inspector__muted meta-editor__hint">
          失焦或停止输入 500ms 后自动写入 <code>meta.json</code>。
        </p>
      </div>
    </aside>
  );
}
