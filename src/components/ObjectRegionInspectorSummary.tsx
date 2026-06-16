import type { ButtonHTMLAttributes } from "react";
import type { EmailPayload, EmailTemplate, ObjectRegionBinding, RepeatFieldMapping } from "../types/email";
import {
  objectBindingMappingRows,
  objectBindingOverviewHostLabel,
  objectBindingPreviewFields,
} from "../lib/objectInspectorSummaryCopy";
import { Field } from "./ui/Field";
import { ReadonlyCollectionItemPreview } from "./ReadonlyCollectionItemPreview";

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

export type ObjectRegionInspectorSummaryProps = {
  template: EmailTemplate;
  hostId: string;
  objectBind: ObjectRegionBinding;
  payload: EmailPayload | null;
  formatMappingLine?: (mapping: RepeatFieldMapping) => string;
  onEdit?: () => void;
  editLabel?: string;
  onUnbind?: () => void;
  unbindTitle?: string;
};

export function ObjectRegionInspectorSummary({
  template,
  hostId,
  objectBind,
  payload,
  formatMappingLine,
  onEdit,
  editLabel = "编辑绑定",
  onUnbind,
  unbindTitle = "解除对象绑定",
}: ObjectRegionInspectorSummaryProps) {
  const variableLabel = objectBind.label?.trim() || objectBind.slotId;
  const previewFields = objectBindingPreviewFields(objectBind);
  const previewValue = payload?.values?.[objectBind.slotId];
  const previewRows =
    previewValue && typeof previewValue === "object" && !Array.isArray(previewValue)
      ? [previewValue as Record<string, unknown>]
      : [];
  const mappingRows =
    formatMappingLine && objectBind.fieldMappings?.length
      ? objectBindingMappingRows(objectBind, formatMappingLine)
      : [];

  const editAction = onEdit ? (
    <InspectorTextAction type="button" onClick={onEdit}>
      {editLabel}
    </InspectorTextAction>
  ) : null;
  const unbindAction = onUnbind ? (
    <InspectorTextAction
      type="button"
      className="resource-text-action--danger"
      title={unbindTitle}
      onClick={onUnbind}
    >
      解除绑定
    </InspectorTextAction>
  ) : null;
  const manageHeaderExtra =
    onEdit || onUnbind ? (
      <span className="resource-text-actions">
        {editAction}
        {unbindAction}
      </span>
    ) : null;

  return (
    <div className="inspector-list-bind-panel">
      <Field label="对象变量" headerExtra={manageHeaderExtra}>
        <p className="inspector-list-bind-panel__primary">{variableLabel}</p>
      </Field>

      <dl className="inspector-list-bind-overview" aria-label="绑定概览">
        <div className="inspector-list-bind-overview__item">
          <dt>绑定方式</dt>
          <dd>一对一映射</dd>
        </div>
        <div className="inspector-list-bind-overview__item">
          <dt>映射容器</dt>
          <dd>{objectBindingOverviewHostLabel(template, hostId)}</dd>
        </div>
        <div className="inspector-list-bind-overview__item">
          <dt>已映射字段</dt>
          <dd>{mappingRows.length > 0 ? `${mappingRows.length} 项` : "未配置"}</dd>
        </div>
      </dl>

      {mappingRows.length > 0 ? (
        <Field label="字段映射">
          <ul className="inspector-list-bind-mapping">
            {mappingRows.map((line, index) => (
              <li key={`${objectBind.fieldMappings?.[index]?.id ?? index}-${line}`} className="inspector-list-bind-mapping__row">
                {line}
              </li>
            ))}
          </ul>
        </Field>
      ) : null}

      <Field
        label="数据预览"
        hint="展示当前对象变量取值；修改数据请至左侧「变量」面板。"
      >
        <ReadonlyCollectionItemPreview
          slotId={objectBind.slotId}
          fields={previewFields}
          values={previewRows}
          tabCount={1}
          padToTabCount
        />
      </Field>
    </div>
  );
}
