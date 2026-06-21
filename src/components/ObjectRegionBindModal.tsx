import { useEffect, useState } from "react";
import type { EmailPayload, EmailTemplate } from "../types/email";
import { payloadSlotValueTypeLabel } from "../payload-contract/value-type-labels";
import {
  buildObjectScalarFieldPickerRows,
  objectSampleFromPayloadValues,
} from "../lib/objectFieldMapping";
import {
  FieldMappingSplitPanel,
  type RepeatCollectionCandidate,
  type RepeatTargetFieldOption,
} from "./RepeatRegionBindModal";
import { Field } from "./ui/Field";
import { ShopPrimaryButton, ShopSecondaryButton } from "./ui/ShopFormControls";
import { SelectablePickerRadioCell } from "./ui/SelectablePickerRadioCell";
import { ShopSectionModal } from "./ui/ShopSectionModal";
import { PickerTreeTable } from "./ui/PickerTreeTable";
import { toastWarning } from "../lib/appToast";

type WizardStepId = "objectSlot" | "objectMap";

type WizardStep = { id: WizardStepId; title: string };

const WIZARD_STEPS: WizardStep[] = [
  { id: "objectSlot", title: "对象变量" },
  { id: "objectMap", title: "字段映射" },
];

export type ObjectCollectionCandidate = {
  key: string;
  slotId: string;
  label: string;
  objectFields: RepeatCollectionCandidate["itemFields"];
  description?: string;
};

export type ObjectRegionBindModalProps = {
  visible: boolean;
  viewOnly?: boolean;
  /** 从「配置数据组绑定」已选定对象变量时，跳过「对象变量」步，直接进入字段映射 */
  skipObjectSlotStep?: boolean;
  template: EmailTemplate;
  payload: EmailPayload;
  hasCurrentObjectBind: boolean;
  objectCandidates: ObjectCollectionCandidate[];
  hostPrototypeChildIds: string[];
  hostLabel?: string;
  targetFieldOptions: RepeatTargetFieldOption[];
  objectSlotId: string;
  mappingDraft: Record<string, string>;
  objectCandidate: ObjectCollectionCandidate | undefined;
  onClose: () => void;
  onApply: () => void;
  onRemove?: () => void;
  onMappingDraftChange: (draft: Record<string, string>) => void;
  onSlotChange: (slotId: string) => void;
};

function WizardStepNav({ steps, currentIndex }: { steps: WizardStep[]; currentIndex: number }) {
  return (
    <nav className="repeat-region-bind-modal__wizard-steps" aria-label="绑定步骤">
      <ol className="repeat-region-bind-modal__wizard-steps-list">
        {steps.map((step, index) => {
          const active = index === currentIndex;
          const done = index < currentIndex;
          return (
            <li
              key={step.id}
              className={`repeat-region-bind-modal__wizard-step${
                active ? " repeat-region-bind-modal__wizard-step--active" : ""
              }${done ? " repeat-region-bind-modal__wizard-step--done" : ""}`}
              aria-current={active ? "step" : undefined}
            >
              <span className="repeat-region-bind-modal__wizard-step-index">
                {done ? "✓" : index + 1}
              </span>
              <span className="repeat-region-bind-modal__wizard-step-title">{step.title}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function toRepeatCandidate(candidate: ObjectCollectionCandidate): RepeatCollectionCandidate {
  return {
    key: candidate.key,
    slotId: candidate.slotId,
    label: candidate.label,
    itemFields: candidate.objectFields,
    description: candidate.description,
  };
}

export function ObjectRegionBindModal({
  visible,
  viewOnly = false,
  skipObjectSlotStep = false,
  template,
  payload,
  hasCurrentObjectBind,
  objectCandidates,
  hostPrototypeChildIds,
  hostLabel,
  targetFieldOptions,
  objectSlotId,
  mappingDraft,
  objectCandidate,
  onClose,
  onApply,
  onRemove,
  onMappingDraftChange,
  onSlotChange,
}: ObjectRegionBindModalProps) {
  const [wizardStepIndex, setWizardStepIndex] = useState(0);
  const currentWizardStep = WIZARD_STEPS[wizardStepIndex];

  useEffect(() => {
    if (!visible) return;
    const startOnFieldMapping = viewOnly || hasCurrentObjectBind || skipObjectSlotStep;
    setWizardStepIndex(startOnFieldMapping ? WIZARD_STEPS.length - 1 : 0);
  }, [visible, viewOnly, hasCurrentObjectBind, skipObjectSlotStep]);

  const repeatCandidate = objectCandidate ? toRepeatCandidate(objectCandidate) : undefined;

  const validateWizardStep = (stepId: WizardStepId | undefined): string | null => {
    if (stepId === "objectSlot" && !objectSlotId) return "请选择对象变量。";
    return null;
  };

  const goNextWizardStep = () => {
    const err = validateWizardStep(currentWizardStep?.id);
    if (err) {
      toastWarning(err);
      return;
    }
    setWizardStepIndex((i) => Math.min(i + 1, WIZARD_STEPS.length - 1));
  };

  const isLastWizardStep = wizardStepIndex >= WIZARD_STEPS.length - 1;
  const modalTitle = viewOnly
    ? "查看对象绑定 · 字段映射"
    : currentWizardStep
      ? `绑定对象变量 · ${currentWizardStep.title}`
      : "绑定对象变量";

  const objectSlotStep = (
    <Field label="对象变量" className="inspector-field--modal-table">
      {objectCandidates.length === 0 ? (
        <p className="text-body-var-pill-modal__empty">当前没有可用的对象变量。</p>
      ) : (
        <>
          <p className="repeat-region-bind-modal__section-hint inspector__muted">
            选择一个对象变量，将其中的多个字段一次性映射到当前容器内的区块。
          </p>
          <PickerTreeTable
            className="repeat-region-bind-modal__slot-picker-wrap"
            role="radiogroup"
            ariaLabel="可选对象变量"
            columns={[
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
              { key: "value", className: "text-body-var-pill-modal__th", title: "字段数" },
            ]}
            body={objectCandidates.map((candidate) => {
              const selected = candidate.key === objectSlotId;
              const sample = objectSampleFromPayloadValues(payload, candidate.slotId, candidate.objectFields);
              const fieldCount = sample?.keys.length ?? candidate.objectFields.length;
              return (
                <tr
                  key={candidate.key}
                  className={`text-body-var-pill-modal__row${
                    selected ? " text-body-var-pill-modal__row--selected" : ""
                  }`}
                  onClick={() => onSlotChange(candidate.key)}
                  tabIndex={0}
                  role="radio"
                  aria-checked={selected}
                >
                  <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--radio">
                    <SelectablePickerRadioCell
                      name="object-region-bind-slot"
                      label={candidate.label}
                      checked={selected}
                      onChange={() => onSlotChange(candidate.key)}
                    />
                  </td>
                  <td className="text-body-var-pill-modal__td">{candidate.label}</td>
                  <td className="text-body-var-pill-modal__td">
                    <code>{candidate.slotId}</code>
                  </td>
                  <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--type">
                    {payloadSlotValueTypeLabel("object")}
                  </td>
                  <td className="text-body-var-pill-modal__td">{fieldCount} 个字段</td>
                </tr>
              );
            })}
          />
        </>
      )}
    </Field>
  );

  const objectMappingStep =
    repeatCandidate && targetFieldOptions.length > 0 ? (
      <>
        {hostLabel ? (
          <p className="repeat-region-bind-modal__section-hint inspector__muted" role="status">
            当前容器：{hostLabel}（画布选中区块，不在此弹窗中更换）
          </p>
        ) : null}
        {viewOnly ? (
          <p className="repeat-region-bind-modal__section-hint inspector__muted" role="status">
            对象变量：{repeatCandidate.label} · 当前为只读查看，如需修改请在所在容器上点击「编辑绑定」。
          </p>
        ) : null}
        <FieldMappingSplitPanel
          visible={visible}
          template={template}
          payload={payload}
          repeatCandidate={repeatCandidate}
          itemFields={repeatCandidate.itemFields}
          enclosingParentRepeat={null}
          prototypeChildIds={hostPrototypeChildIds}
          targetFieldOptions={targetFieldOptions}
          mappingDraft={mappingDraft}
          mappingOffsetDraft={{}}
          itemMode="single"
          groupSize={1}
          onMappingDraftChange={onMappingDraftChange}
          onMappingOffsetDraftChange={() => {}}
          mappingAriaLabel="容器可映射项"
          readOnly={viewOnly}
          targetColumnTitle="容器可映射项"
          sourceColumnTitle="对象字段"
          buildPickerRows={(itemFields) => {
            const sample = objectSampleFromPayloadValues(
              payload,
              repeatCandidate.slotId,
              itemFields
            );
            return buildObjectScalarFieldPickerRows(itemFields, sample);
          }}
        />
      </>
    ) : (
      <p className="inspector__muted">当前容器内没有可映射的业务内容字段。</p>
    );

  return (
    <ShopSectionModal
      visible={visible}
      title={modalTitle}
      onCancel={onClose}
      centered
      destroyOnClose
      maskClosable={false}
      wrapClassName="text-body-var-pill-modal-wrap repeat-region-bind-modal-wrap repeat-region-bind-modal-wrap--wizard shop-section-modal-wrap--picker"
      footer={
        <>
          {onRemove && hasCurrentObjectBind && !viewOnly ? (
            <ShopSecondaryButton onClick={onRemove}>解除对象绑定</ShopSecondaryButton>
          ) : null}
          <div className="shop-section-modal__footer-actions">
            <ShopSecondaryButton onClick={onClose}>{viewOnly ? "关闭" : "取消"}</ShopSecondaryButton>
            {!viewOnly ? (
              isLastWizardStep ? (
                <ShopPrimaryButton onClick={onApply}>应用绑定</ShopPrimaryButton>
              ) : (
                <ShopPrimaryButton onClick={goNextWizardStep}>下一步</ShopPrimaryButton>
              )
            ) : null}
          </div>
        </>
      }
    >
      {!viewOnly ? <WizardStepNav steps={WIZARD_STEPS} currentIndex={wizardStepIndex} /> : null}
      {currentWizardStep?.id === "objectSlot" ? objectSlotStep : objectMappingStep}
    </ShopSectionModal>
  );
}
