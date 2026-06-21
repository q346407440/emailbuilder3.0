import type { ButtonHTMLAttributes } from "react";
import type { EmailPayload, EmailTemplate, RepeatFieldMapping, RepeatRegionBinding } from "../types/email";
import type { RepeatContextRelation } from "../lib/repeatRegion";
import {
  repeatBindingMappingRows,
  repeatBindingOverviewRowCount,
  repeatBindingOverviewStructureShort,
  repeatBindingPreviewFields,
  repeatBindingRelationOpsLabel,
} from "../lib/repeatInspectorSummaryCopy";
import { normalizeItemVisibility, setCollectionItemVisibilityAt, collectionSlotAllowsItemVisibility } from "../lib/collectionItemVisibility";
import { toCollectionItems } from "../lib/payloadSlotDraft";
import { CollectionFixedLengthField } from "./CollectionFixedLengthField";
import { ReadonlyCollectionItemPreview } from "./ReadonlyCollectionItemPreview";
import { Field } from "./ui/Field";

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

export type RepeatRegionInspectorSummaryProps = {
  template: EmailTemplate;
  hostId: string;
  repeat: RepeatRegionBinding;
  itemCount: number;
  payload: EmailPayload | null;
  relation: RepeatContextRelation;
  prototypeRootId?: string;
  fieldMappingsOnBlock?: RepeatFieldMapping[];
  formatMappingLine?: (mapping: RepeatFieldMapping) => string;
  onEdit?: () => void;
  editLabel?: string;
  onUnbind?: () => void;
  unbindTitle?: string;
  onItemVisibilityChange?: (itemVisibility: boolean[]) => void;
  /** 与变量面板共用的列表固定长度（payload.slots）；仅 repeat 宿主且可编辑时展示 */
  collectionFixedLength?: number;
  collectionFixedLengthDisabled?: boolean;
  collectionFixedLengthDisabledReason?: string;
  onCollectionFixedLengthChange?: (length: number) => void;
  /** 嵌套 itemPath 时覆盖 Inspector 数据预览行（默认读顶层 slot values） */
  previewValues?: unknown;
};

export function RepeatRegionInspectorSummary({
  template,
  hostId,
  repeat,
  itemCount,
  payload,
  relation,
  prototypeRootId,
  fieldMappingsOnBlock = [],
  formatMappingLine,
  onEdit,
  editLabel = "编辑绑定",
  onUnbind,
  unbindTitle,
  onItemVisibilityChange,
  collectionFixedLength,
  collectionFixedLengthDisabled = false,
  collectionFixedLengthDisabledReason,
  onCollectionFixedLengthChange,
  previewValues,
}: RepeatRegionInspectorSummaryProps) {
  const variableLabel = repeat.label?.trim() || repeat.slotId;
  const { contextHint } = repeatBindingRelationOpsLabel(
    relation,
    template,
    hostId,
    prototypeRootId
  );
  const previewFields = repeatBindingPreviewFields(repeat);
  const resolvedPreviewValues = previewValues ?? payload?.values?.[repeat.slotId];
  const previewRowCount = Math.max(
    itemCount,
    toCollectionItems(resolvedPreviewValues).length,
    1
  );
  const slotDef = payload?.slots?.[repeat.slotId];
  const allowsItemVisibility = collectionSlotAllowsItemVisibility(slotDef);
  const itemVisibility = allowsItemVisibility
    ? normalizeItemVisibility(previewRowCount, slotDef?.itemVisibility)
    : undefined;
  const mappingRows =
    formatMappingLine && repeat.fieldMappings?.length
      ? repeatBindingMappingRows(repeat, formatMappingLine)
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

  if (relation === "host") {
    return (
      <div className="inspector-list-bind-panel">
        <Field label="列表变量" headerExtra={manageHeaderExtra}>
          <p className="inspector-list-bind-panel__primary">{variableLabel}</p>
        </Field>

        <dl className="inspector-list-bind-overview" aria-label="绑定概览">
          <div className="inspector-list-bind-overview__item">
            <dt>画布行数</dt>
            <dd>{repeatBindingOverviewRowCount(itemCount, repeat)}</dd>
          </div>
          <div className="inspector-list-bind-overview__item">
            <dt>每行结构</dt>
            <dd>{repeatBindingOverviewStructureShort(template, hostId, repeat)}</dd>
          </div>
          <div className="inspector-list-bind-overview__item">
            <dt>已映射字段</dt>
            <dd>{mappingRows.length > 0 ? `${mappingRows.length} 项` : "未配置"}</dd>
          </div>
        </dl>

        {collectionFixedLength !== undefined ? (
          <CollectionFixedLengthField
            slotId={repeat.slotId}
            fixedLength={collectionFixedLength}
            disabled={collectionFixedLengthDisabled || !onCollectionFixedLengthChange}
            disabledReason={
              collectionFixedLengthDisabledReason ??
              (!onCollectionFixedLengthChange ? "当前不可编辑列表长度。" : undefined)
            }
            hint="修改后同步至左侧「变量」面板；「画布行数」还受显隐与数据源预览影响。"
            onCommit={onCollectionFixedLengthChange ?? (() => undefined)}
          />
        ) : null}

        {mappingRows.length > 0 ? (
          <Field label="字段映射">
            <ul className="inspector-list-bind-mapping">
              {mappingRows.map((line) => (
                <li key={line} className="inspector-list-bind-mapping__row">
                  {line}
                </li>
              ))}
            </ul>
          </Field>
        ) : null}

        <Field
          label="数据预览"
          hint={
            allowsItemVisibility
              ? "无数据时不显示行，不占高度。勾选「不展示」与变量面板同步；列表长度见上方；修改数据请至左侧「变量」面板。"
              : "无数据时不显示行，不占高度。列表长度见上方；修改数据请至左侧「变量」面板。"
          }
        >
          <ReadonlyCollectionItemPreview
            slotId={repeat.slotId}
            fields={previewFields}
            values={resolvedPreviewValues}
            itemVisibility={itemVisibility}
            onItemHiddenChange={
              allowsItemVisibility && onItemVisibilityChange
                ? (index, hidden) => {
                    onItemVisibilityChange(
                      setCollectionItemVisibilityAt(itemVisibility, previewRowCount, index, !hidden)
                    );
                  }
                : undefined
            }
          />
        </Field>
      </div>
    );
  }

  return (
    <div className="inspector-list-bind-panel">
      {contextHint ? (
        <p className="inspector__muted inspector-list-bind-panel__summary">{contextHint}</p>
      ) : null}

      <Field label="列表变量" headerExtra={manageHeaderExtra}>
        <p className="inspector-list-bind-panel__primary">{variableLabel}</p>
      </Field>

      {relation === "mapped-field" && fieldMappingsOnBlock.length > 0 && formatMappingLine ? (
        <Field label="字段填充">
          <ul className="inspector-list-bind-mapping">
            {fieldMappingsOnBlock.map((mapping) => (
              <li key={mapping.id} className="inspector-list-bind-mapping__row">
                {formatMappingLine(mapping)}
              </li>
            ))}
          </ul>
        </Field>
      ) : null}
    </div>
  );
}
