import { useState, type ButtonHTMLAttributes } from "react";
import type { EmailPayload } from "../types/email";
import type { ExternalVariableSlotInfo } from "../lib/payloadSlots";
import { ObjectItemFieldsModal } from "./ObjectItemFieldsModal";
import { ReadonlyCollectionItemPreview } from "./ReadonlyCollectionItemPreview";
import { Field } from "./ui/Field";
import { ShopSecondaryButton } from "./ui/ShopFormControls";

type Props = {
  slot: ExternalVariableSlotInfo;
  previewPayload: EmailPayload;
  layout?: "panel" | "embedded";
  panelSection?: "all" | "config" | "preview";
};

function InspectorTextAction({
  className,
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={["resource-text-action", className].filter(Boolean).join(" ")}
      {...rest}
    />
  );
}

function summarizeObjectFields(
  objectFields: NonNullable<ExternalVariableSlotInfo["objectFields"]>
): string {
  if (objectFields.length === 0) return "尚未声明对象字段";
  const names = objectFields
    .map((f) => f.label?.trim() || f.key?.trim())
    .filter(Boolean)
    .slice(0, 4);
  const head = names.length > 0 ? names.join("、") : "未命名字段";
  if (objectFields.length <= 4 && names.length === objectFields.length) {
    return `共 ${objectFields.length} 个：${head}`;
  }
  return `共 ${objectFields.length} 个${names.length > 0 ? `：${head}…` : ""}`;
}

export function ObjectVariablePanel({
  slot,
  previewPayload,
  layout = "embedded",
  panelSection = "all",
}: Props) {
  const panelLayout = layout === "panel";
  const showConfig = panelSection === "all" || panelSection === "config";
  const showPreview = panelSection === "all" || panelSection === "preview";
  const [objectFieldsModalOpen, setObjectFieldsModalOpen] = useState(false);
  const objectFields = slot.objectFields ?? [];
  const raw = previewPayload.values[slot.slotId];
  const previewRows =
    raw && typeof raw === "object" && !Array.isArray(raw) ? [raw as Record<string, unknown>] : [];

  const objectFieldsAction = (
    <InspectorTextAction onClick={() => setObjectFieldsModalOpen(true)}>
      查看对象字段
    </InspectorTextAction>
  );

  return (
    <section
      className={[
        "object-variable-panel",
        panelLayout ? "object-variable-panel--panel" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {showConfig ? (
        <Field
          label="对象字段"
          headerExtra={panelLayout ? objectFieldsAction : undefined}
          {...(panelLayout
            ? {}
            : {
                hint: "内置数据结构字段为只读，弹窗仅可查看。",
              })}
        >
          <p className="inspector__muted collection-variable-panel__item-fields-summary">
            {summarizeObjectFields(objectFields)}
          </p>
          {panelLayout ? null : (
            <ShopSecondaryButton
              htmlType="button"
              onClick={() => setObjectFieldsModalOpen(true)}
            >
              查看对象字段…
            </ShopSecondaryButton>
          )}
          <ObjectItemFieldsModal
            visible={objectFieldsModalOpen}
            slotId={slot.slotId}
            slotLabel={slot.label}
            objectFields={objectFields}
            onClose={() => setObjectFieldsModalOpen(false)}
          />
        </Field>
      ) : null}

      {showPreview ? (
        <Field
          label="数据预览"
          {...(panelLayout
            ? {}
            : {
                hint: "切换查看对象取值；仅供回显，不可编辑。",
              })}
        >
          <ReadonlyCollectionItemPreview
            slotId={slot.slotId}
            fields={objectFields}
            values={previewRows}
          />
        </Field>
      ) : null}
    </section>
  );
}
