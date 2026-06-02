import type { EmailMeta, EmailMetaDelivery } from "../meta-contract/types";
import { normalizePersistedEmailMeta } from "../meta-contract/normalize";

export { normalizePersistedEmailMeta };

/** 编辑器元信息面板维护的投递字段（不含 SMTP / 测试收件人）。 */
export type MetaEditorDeliveryFields = Pick<EmailMetaDelivery, "subject" | "preheader">;

export type MetaEditorFormSnapshot = {
  displayName: string;
  description: string;
  subject: string;
  preheader: string;
};

export function metaToEditorForm(meta: EmailMeta | null): MetaEditorFormSnapshot {
  return {
    displayName: meta?.displayName ?? "",
    description: meta?.description ?? "",
    subject: meta?.delivery?.subject ?? "",
    preheader: meta?.delivery?.preheader ?? "",
  };
}

/** 仅写入编辑器维护字段。 */
export function buildMetaEditorPersistPatch(form: MetaEditorFormSnapshot): Partial<EmailMeta> {
  const delivery: MetaEditorDeliveryFields = {
    subject: form.subject,
    preheader: form.preheader,
  };
  return {
    displayName: form.displayName,
    description: form.description,
    delivery,
  };
}
