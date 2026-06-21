import type { DataGroupBindEntryCandidate } from "../lib/dataGroupBindEntryCandidates";
import { payloadSlotValueTypeLabel } from "../payload-contract/value-type-labels";
import { Field } from "./ui/Field";
import { ShopPrimaryButton, ShopSecondaryButton } from "./ui/ShopFormControls";
import { SelectablePickerRadioCell } from "./ui/SelectablePickerRadioCell";
import { ShopSectionModal } from "./ui/ShopSectionModal";
import { PickerTreeTable } from "./ui/PickerTreeTable";

export type { DataGroupBindEntryCandidate } from "../lib/dataGroupBindEntryCandidates";

const DATA_GROUP_BIND_ENTRY_COLUMNS = [
  {
    key: "radio",
    className: "text-body-var-pill-modal__th text-body-var-pill-modal__th--radio",
    title: <span className="text-body-var-pill-modal__sr-only">选择</span>,
  },
  { key: "name", className: "text-body-var-pill-modal__th", title: "名称" },
  { key: "id", className: "text-body-var-pill-modal__th", title: "标识" },
  {
    key: "type",
    className: "text-body-var-pill-modal__th text-body-var-pill-modal__th--type",
    title: "类型",
  },
  { key: "value", className: "text-body-var-pill-modal__th", title: "结构摘要" },
] as const;

const DEFAULT_EMPTY_MESSAGE = "当前没有可用的列表或对象变量，请先在数据变量面板添加。";

export type DataGroupBindEntryModalProps = {
  visible: boolean;
  candidates: DataGroupBindEntryCandidate[];
  selectedKey: string;
  emptyMessage?: string;
  onSelectKey: (key: string) => void;
  onClose: () => void;
  onContinue: (candidate: DataGroupBindEntryCandidate) => void;
};

export function DataGroupBindEntryModal({
  visible,
  candidates,
  selectedKey,
  emptyMessage,
  onSelectKey,
  onClose,
  onContinue,
}: DataGroupBindEntryModalProps) {
  const selected = candidates.find((item) => item.key === selectedKey);
  const nestedParentLabel =
    candidates.find((c) => c.itemPath?.trim())?.parentSlotLabel?.trim() || "";
  const isEmpty = candidates.length === 0;

  return (
    <ShopSectionModal
      visible={visible}
      title="配置数据组绑定"
      onCancel={onClose}
      centered
      destroyOnClose
      maskClosable={false}
      wrapClassName="text-body-var-pill-modal-wrap repeat-region-bind-modal-wrap shop-section-modal-wrap--picker"
      footer={
        <div className="shop-section-modal__footer-actions">
          <ShopSecondaryButton onClick={onClose}>取消</ShopSecondaryButton>
          <ShopPrimaryButton
            disabled={!selected}
            onClick={() => {
              if (selected) onContinue(selected);
            }}
          >
            下一步
          </ShopPrimaryButton>
        </div>
      }
    >
      <Field label="选择变量" className="inspector-field--modal-table">
        {!isEmpty && nestedParentLabel ? (
          <p className="shop-section-modal__selection-banner">
            当前容器位于父级列表「{nestedParentLabel}」行内：请选择父项下的子列表，不能重复绑定父级已使用的列表变量。
          </p>
        ) : null}
        <p className="repeat-region-bind-modal__section-hint inspector__muted">
          选择要绑定到当前容器的变量：列表变量将按条数展开多行；对象变量将一组字段映射到容器内区块。
        </p>
        <PickerTreeTable
          className="repeat-region-bind-modal__slot-picker-wrap"
          role="radiogroup"
          ariaLabel="可选列表或对象变量"
          columns={[...DATA_GROUP_BIND_ENTRY_COLUMNS]}
          emptyText={
            isEmpty ? (
              <p className="text-body-var-pill-modal__empty">
                {emptyMessage ?? DEFAULT_EMPTY_MESSAGE}
              </p>
            ) : undefined
          }
          body={
            isEmpty
              ? null
              : candidates.map((candidate) => {
                  const active = candidate.key === selectedKey;
                  const isParentNested = Boolean(candidate.itemPath?.trim());
                  return (
                    <tr
                      key={candidate.key}
                      className={`text-body-var-pill-modal__row${
                        active ? " text-body-var-pill-modal__row--selected" : ""
                      }`}
                      onClick={() => onSelectKey(candidate.key)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onSelectKey(candidate.key);
                        }
                      }}
                      tabIndex={0}
                      role="radio"
                      aria-checked={active}
                    >
                      <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--radio">
                        <SelectablePickerRadioCell
                          name="data-group-bind-entry-slot"
                          label={candidate.label}
                          checked={active}
                          onChange={() => onSelectKey(candidate.key)}
                        />
                      </td>
                      <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--label">
                        <span title={isParentNested ? candidate.description : undefined}>
                          {candidate.label}
                        </span>
                      </td>
                      <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--id">
                        {isParentNested ? (
                          <span className="repeat-region-bind-modal__slot-id-stack">
                            <code>{candidate.itemPath}</code>
                            <span
                              className="repeat-region-bind-modal__slot-id-parent inspector__muted"
                              title={`父列表变量 ${candidate.slotId}`}
                            >
                              ← {candidate.parentSlotLabel ?? candidate.slotId}
                            </span>
                          </span>
                        ) : (
                          <code>{candidate.slotId}</code>
                        )}
                      </td>
                      <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--type">
                        <span className="repeat-region-bind-modal__slot-type-label">
                          {payloadSlotValueTypeLabel(candidate.valueType)}
                        </span>
                        {isParentNested ? (
                          <span
                            className="repeat-region-bind-modal__parent-nested-tag"
                            title={
                              candidate.description ??
                              `父列表「${candidate.parentSlotLabel ?? candidate.slotId}」下的子列表列`
                            }
                          >
                            父项子列表
                          </span>
                        ) : null}
                      </td>
                      <td
                        className="text-body-var-pill-modal__td text-body-var-pill-modal__td--value"
                        title={candidate.summary}
                      >
                        {candidate.summary}
                      </td>
                    </tr>
                  );
                })
          }
        />
      </Field>
    </ShopSectionModal>
  );
}
