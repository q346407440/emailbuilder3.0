import { useEffect, useMemo, useState } from "react";
import type { EmailBlock, EmailPayload, EmailTemplate } from "../types/email";
import { collectionItemFieldValueTypeLabel, formatCollectionSlotListSummary } from "../lib/repeatListItemField";
import { CollectionFieldPickerTable } from "./CollectionFieldPickerTable";
import { repeatMappingTargetLabel } from "../lib/repeatMappableContentBindPaths";
import {
  buildCollectionFieldPickerRows,
  collectionSampleFromPayloadValues,
  formatSourceFieldExample,
  readCatalogSourceValue,
} from "../lib/collectionFieldMapping";
import {
  defaultExpandedCollectionGroupPaths,
  flattenNestedCollectionFieldsPreview,
  hasNestedCollectionInItemFields,
} from "../lib/collectionFieldMappingTree";
import {
  defaultExpandedRepeatTargetGroups,
  findRepeatTargetLeafByKey,
  firstRepeatTargetLeafKey,
  flattenRepeatTargetFieldsForNav,
  repeatTargetGroupHasChildMapping,
} from "../lib/repeatTargetFieldMappingTree";
import {
  childRepeatPrototypeDisabledKeysForParent,
  defaultExpandedRepeatPrototypePickerBranches,
  flattenRepeatPrototypePickerRows,
  repeatPrototypePickerBranchKeysToBlock,
  visibleRepeatPrototypePickerRows,
  type ChildRepeatPrototypeOption,
  type ChildRepeatPrototypePickerRow,
  type NestedCollectionFieldOption,
  type RepeatLoopScope,
} from "../lib/repeatNestedBinding";
import {
  parentScalarItemFieldsFromItemFields,
  repeatPrototypeOptionsToPickerOptions,
  repeatPrototypePickerCanonicalHint,
  type RepeatPrototypePickerOption,
} from "../lib/repeatNestedBindingUi";
import { Field } from "./ui/Field";
import { ShopPrimaryButton, ShopSecondaryButton, ShopSelect } from "./ui/ShopFormControls";
import { ShopSectionModal } from "./ui/ShopSectionModal";

const LOOP_SCOPE_OPTIONS: Array<{ value: RepeatLoopScope; label: string }> = [
  { value: "parentOnly", label: "只循环父级列表" },
  { value: "parentAndChild", label: "父级与子级都循环" },
  { value: "childOnly", label: "只循环子级列表" },
];

type WizardStepId = "scope" | "parent" | "child" | "parentMap" | "childMap";

type WizardStep = { id: WizardStepId; title: string };

function buildWizardSteps(args: {
  loopScope: RepeatLoopScope;
  showChildSection: boolean;
  showParentMapping: boolean;
  showChildMapping: boolean;
}): WizardStep[] {
  const steps: WizardStep[] = [{ id: "scope", title: "循环范围" }];
  steps.push({
    id: "parent",
    title: args.loopScope === "childOnly" ? "父级变量" : "父级列表",
  });
  if (args.showParentMapping) {
    steps.push({ id: "parentMap", title: "父级字段映射" });
  }
  if (args.showChildSection) {
    steps.push({ id: "child", title: "子级列表" });
  }
  if (args.showChildMapping) {
    steps.push({ id: "childMap", title: "子级字段映射" });
  }
  return steps;
}

function WizardStepNav({
  steps,
  currentIndex,
}: {
  steps: WizardStep[];
  currentIndex: number;
}) {
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

export type RepeatCollectionCandidate = {
  key: string;
  slotId: string;
  itemPath?: string;
  label: string;
  itemFields: NonNullable<EmailBlock["repeat"]>["itemFields"];
  minItems?: number;
  maxItems?: number;
  description?: string;
};

export type RepeatPrototypeOption = {
  key: string;
  hostId: string;
  prototypeChildIds: string[];
  label: string;
  description: string;
  source: "container" | "leaf-self" | "leaf-parent" | "global";
};

export type RepeatTargetFieldOption = {
  key: string;
  blockId: string;
  bindPath: string;
  label: string;
};

function mappedFieldLabel(
  itemFields: RepeatCollectionCandidate["itemFields"],
  sourceKey: string | undefined
): string {
  if (!sourceKey) return "不映射";
  const field = itemFields.find((f) => f.key === sourceKey);
  if (!field) return "不映射";
  return field.label?.trim() || field.key;
}

export type RepeatRegionBindModalProps = {
  visible: boolean;
  canvasMode: boolean;
  template: EmailTemplate;
  payload: EmailPayload;
  hasCurrentRepeat: boolean;
  collectionCandidates: RepeatCollectionCandidate[];
  prototypeOptions: RepeatPrototypeOption[];
  rowTemplateLocked?: boolean;
  /** 父级列表 repeat 宿主（父级行模板树表上下文） */
  parentListHostId?: string;
  /** 父级列表变量已在外层确定，向导内仅回显不可换槽 */
  parentListSlotLocked?: boolean;
  /** 父级列表 itemFields 是否含子列表，用于展示「循环范围」 */
  showLoopScope?: boolean;
  loopScope?: RepeatLoopScope;
  scopePreview?: string;
  nestedChildListLabel?: string;
  /** 父级列表项下可选的子级 collection（itemPath） */
  nestedCollectionOptions?: NestedCollectionFieldOption[];
  /** 父级行模板根（用于子级行模板树表） */
  parentPrototypeChildIds?: string[];
  childPrototypeOptions?: ChildRepeatPrototypeOption[];
  childItemPath?: string;
  childPrototypeOptionKey?: string;
  childPrototypeChildIds?: string[];
  anchorItemIndex?: number;
  parentTargetFieldOptions: RepeatTargetFieldOption[];
  childTargetFieldOptions?: RepeatTargetFieldOption[];
  repeatSlotId: string;
  repeatPrototypeOptionKey: string;
  parentMappingDraft: Record<string, string>;
  childMappingDraft?: Record<string, string>;
  repeatCandidate: RepeatCollectionCandidate | undefined;
  selectedPrototypeOption: RepeatPrototypeOption | undefined;
  onClose: () => void;
  onApply: () => void;
  onRemove?: () => void;
  onLoopScopeChange?: (scope: RepeatLoopScope) => void;
  onChildItemPathChange?: (path: string) => void;
  onChildPrototypeOptionKeyChange?: (key: string) => void;
  onAnchorItemIndexChange?: (index: number) => void;
  onRepeatPrototypeOptionKeyChange: (key: string) => void;
  onParentMappingDraftChange: (draft: Record<string, string>) => void;
  onChildMappingDraftChange?: (draft: Record<string, string>) => void;
  onSlotOrPrototypeChange: (slotId: string, prototypeKey: string) => void;
};

export function RepeatRegionBindModal({
  visible,
  canvasMode,
  template,
  payload,
  hasCurrentRepeat,
  collectionCandidates,
  prototypeOptions,
  rowTemplateLocked = false,
  parentListHostId = "",
  parentListSlotLocked = false,
  showLoopScope = false,
  loopScope = "parentOnly",
  scopePreview = "",
  nestedChildListLabel = "子级列表",
  nestedCollectionOptions = [],
  parentPrototypeChildIds = [],
  childPrototypeOptions = [],
  childItemPath = "",
  childPrototypeOptionKey = "",
  childPrototypeChildIds = [],
  anchorItemIndex = 0,
  parentTargetFieldOptions,
  childTargetFieldOptions = [],
  repeatSlotId,
  repeatPrototypeOptionKey,
  parentMappingDraft,
  childMappingDraft = {},
  repeatCandidate,
  selectedPrototypeOption,
  onClose,
  onApply,
  onRemove,
  onLoopScopeChange,
  onChildItemPathChange,
  onChildPrototypeOptionKeyChange,
  onAnchorItemIndexChange,
  onRepeatPrototypeOptionKeyChange,
  onParentMappingDraftChange,
  onChildMappingDraftChange,
  onSlotOrPrototypeChange,
}: RepeatRegionBindModalProps) {
  const itemFields = repeatCandidate?.itemFields ?? [];
  const parentScalarFields = parentScalarItemFieldsFromItemFields(itemFields);
  const showParentSection = loopScope !== "childOnly";
  const showChildSection = loopScope === "parentAndChild" || loopScope === "childOnly";
  const showParentMapping = showParentSection && loopScope !== "childOnly";
  const showChildMapping = showChildSection && childTargetFieldOptions.length > 0;
  const wizardMode = showLoopScope;
  const wizardSteps = useMemo(
    () =>
      buildWizardSteps({
        loopScope,
        showChildSection,
        showParentMapping,
        showChildMapping,
      }),
    [loopScope, showChildSection, showParentMapping, showChildMapping]
  );
  const [wizardStepIndex, setWizardStepIndex] = useState(0);
  const currentWizardStep = wizardSteps[wizardStepIndex];

  useEffect(() => {
    if (visible) setWizardStepIndex(0);
  }, [visible]);

  useEffect(() => {
    if (wizardStepIndex >= wizardSteps.length) {
      setWizardStepIndex(Math.max(0, wizardSteps.length - 1));
    }
  }, [wizardStepIndex, wizardSteps.length]);

  useEffect(() => {
    if (!visible || !showChildSection) return;
    const only = nestedCollectionOptions[0];
    if (nestedCollectionOptions.length === 1 && only && childItemPath !== only.path) {
      onChildItemPathChange?.(only.path);
    }
  }, [visible, showChildSection, nestedCollectionOptions, childItemPath, onChildItemPathChange]);

  useEffect(() => {
    if (!visible || !showChildSection || !onChildPrototypeOptionKeyChange) return;
    const only = childPrototypeOptions[0];
    if (childPrototypeOptions.length === 1 && only && childPrototypeOptionKey !== only.key) {
      onChildPrototypeOptionKeyChange(only.key);
    }
  }, [
    visible,
    showChildSection,
    childPrototypeOptions,
    childPrototypeOptionKey,
    onChildPrototypeOptionKeyChange,
  ]);

  const selectedChildNested = nestedCollectionOptions.find((f) => f.path === childItemPath);
  const childMappingItemFields = selectedChildNested?.itemFields ?? [];

  const validateWizardStep = (stepId: WizardStepId | undefined): string | null => {
    if (!stepId) return null;
    if (stepId === "parent") {
      if (!repeatSlotId) return "请选择父级列表变量。";
      if (showParentSection && !repeatPrototypeOptionKey) return "请选择父级行模板。";
    }
    if (stepId === "child") {
      if (nestedCollectionOptions.length > 0 && !childItemPath.trim()) {
        return "请选择要循环的子级列表。";
      }
      if (childPrototypeOptions.length > 0 && !childPrototypeOptionKey) {
        return "请选择子级行模板。";
      }
    }
    return null;
  };

  const goNextWizardStep = () => {
    const err = validateWizardStep(currentWizardStep?.id);
    if (err) {
      window.alert(err);
      return;
    }
    setWizardStepIndex((i) => Math.min(i + 1, wizardSteps.length - 1));
  };

  const isLastWizardStep = wizardStepIndex >= wizardSteps.length - 1;
  const modalTitle = wizardMode && currentWizardStep
    ? `绑定列表重复 · ${currentWizardStep.title}`
    : "绑定列表重复";

  const scopePreviewBlock =
    showLoopScope && scopePreview ? (
      <div className="repeat-region-bind-modal__scope-preview" role="status">
        {scopePreview}
      </div>
    ) : null;

  const scopeStepContent =
    showLoopScope && onLoopScopeChange ? (
      <Field label="循环范围">
        <div className="repeat-region-bind-modal__scope-options" role="radiogroup" aria-label="循环范围">
          {LOOP_SCOPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`repeat-region-bind-modal__scope-option${
                loopScope === opt.value ? " repeat-region-bind-modal__scope-option--active" : ""
              }`}
              aria-checked={loopScope === opt.value}
              role="radio"
              onClick={() => onLoopScopeChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Field>
    ) : null;

  const parentSlotEchoCandidate =
    repeatCandidate ??
    collectionCandidates.find((c) => c.key === repeatSlotId) ??
    collectionCandidates[0];
  const parentSlotStep = (
    <Field label="父级列表变量" className="inspector-field--modal-table">
      {parentListSlotLocked ? (
        <p className="repeat-region-bind-modal__section-hint inspector__muted">
          列表变量在进入绑定时已确定，此处仅回显结构，不可更换为其他列表。
        </p>
      ) : null}
      {!parentSlotEchoCandidate ? (
        <p className="text-body-var-pill-modal__empty">当前没有可用的列表变量。</p>
      ) : (
        <CollectionSlotPickerTable
          candidates={
            parentListSlotLocked ? [parentSlotEchoCandidate] : collectionCandidates
          }
          payload={payload}
          selectedSlotId={parentSlotEchoCandidate.key}
          onSelectSlotId={(slotId) => onSlotOrPrototypeChange(slotId, repeatPrototypeOptionKey)}
          readOnly={parentListSlotLocked}
        />
      )}
    </Field>
  );

  const parentPickerOptions = useMemo(
    () => repeatPrototypeOptionsToPickerOptions(template, prototypeOptions),
    [template, prototypeOptions]
  );
  const parentPickerContextRootIds = useMemo(() => {
    if (parentListHostId.trim()) return [parentListHostId];
    const hostId = prototypeOptions[0]?.hostId;
    return hostId ? [hostId] : [];
  }, [parentListHostId, prototypeOptions]);

  const childPrototypeDisabledKeys = useMemo(
    () => childRepeatPrototypeDisabledKeysForParent(selectedPrototypeOption, childPrototypeOptions),
    [selectedPrototypeOption, childPrototypeOptions]
  );

  useEffect(() => {
    if (!visible || !onChildPrototypeOptionKeyChange) return;
    if (!childPrototypeOptionKey || !childPrototypeDisabledKeys.has(childPrototypeOptionKey)) return;
    const firstEnabled = childPrototypeOptions.find((opt) => !childPrototypeDisabledKeys.has(opt.key));
    if (firstEnabled) onChildPrototypeOptionKeyChange(firstEnabled.key);
  }, [
    visible,
    childPrototypeOptionKey,
    childPrototypeDisabledKeys,
    childPrototypeOptions,
    onChildPrototypeOptionKeyChange,
  ]);

  const parentRowTemplateStep =
    showParentSection && parentPickerContextRootIds.length > 0 && parentPickerOptions.length > 0 ? (
      <Field
        label={canvasMode ? "父级重复范围" : "父级行模板"}
        className="inspector-field--modal-table"
      >
        <p className="repeat-region-bind-modal__section-hint inspector__muted">
          在列表循环容器下的区块树中点选；单块仅复制该块，layout/grid 则复制该容器及其子级。
        </p>
        <RepeatPrototypePickerTable
          template={template}
          contextRootIds={parentPickerContextRootIds}
          contextLabelSuffix="父级列表循环容器"
          options={parentPickerOptions}
          selectedOptionKey={repeatPrototypeOptionKey}
          onSelectOptionKey={(key) => {
            onRepeatPrototypeOptionKeyChange(key);
            onSlotOrPrototypeChange(repeatSlotId, key);
          }}
          readOnly={rowTemplateLocked}
          ariaLabel="可选父级行模板"
        />
        {rowTemplateLocked ? (
          <p className="repeat-region-bind-modal__row-template-lock-hint">
            父级行模板已在列表宿主绑定；请选中父级宿主容器后再更换。
          </p>
        ) : null}
      </Field>
    ) : showParentSection ? (
      <Field label={canvasMode ? "父级重复范围" : "父级行模板"}>
        <p className="repeat-region-bind-modal__empty-hint">当前没有可选的父级行模板。</p>
      </Field>
    ) : null;

  const childPickerCandidates = useMemo((): RepeatCollectionCandidate[] => {
    if (!repeatCandidate) return [];
    return [
      {
        key: repeatCandidate.key,
        slotId: repeatCandidate.slotId,
        label: repeatCandidate.label,
        itemFields: repeatCandidate.itemFields,
        minItems: repeatCandidate.minItems,
        maxItems: repeatCandidate.maxItems,
        description: repeatCandidate.description,
      },
    ];
  }, [repeatCandidate]);

  const childCollectionStep = (
    <Field label="子级列表变量" className="inspector-field--modal-table">
      {!repeatCandidate ? (
        <p className="repeat-region-bind-modal__empty-hint">请先在「父级列表」步骤选择父级列表变量。</p>
      ) : !hasNestedCollectionInItemFields(repeatCandidate.itemFields) ? (
        <p className="repeat-region-bind-modal__empty-hint">
          当前父级列表项下没有可循环的子列表。请更换父级变量或调整循环范围。
        </p>
      ) : (
        <CollectionSlotPickerTable
          candidates={childPickerCandidates}
          payload={payload}
          selectedSlotId={repeatSlotId}
          onSelectSlotId={() => {}}
          nestedCollectionSelection={{
            selectedPath: childItemPath,
            onSelectPath: (path) => onChildItemPathChange?.(path),
          }}
        />
      )}
    </Field>
  );

  const childRowTemplateStep = (
    <>
      {loopScope === "childOnly" && onAnchorItemIndexChange ? (
        <Field label="子级数据来源">
          <div className="repeat-region-bind-modal__anchor-row">
            <span className="repeat-region-bind-modal__anchor-label">锚定父级列表中的某一项</span>
            <ShopSelect
              value={String(anchorItemIndex)}
              onChange={(value) => onAnchorItemIndexChange(Number(value))}
            >
              <ShopSelect.Option value="0">父级列表第 1 项</ShopSelect.Option>
              <ShopSelect.Option value="1">父级列表第 2 项</ShopSelect.Option>
              <ShopSelect.Option value="2">父级列表第 3 项</ShopSelect.Option>
            </ShopSelect>
          </div>
        </Field>
      ) : loopScope === "parentAndChild" ? (
        <>
          <p className="repeat-region-bind-modal__section-hint inspector__muted">
            循环上下文：当前父级项（继承父级列表循环）
          </p>
          {selectedChildNested ? (
            <p className="repeat-region-bind-modal__child-bind-summary" role="status">
              子级循环宿主：
              {childPrototypeOptions.find((o) => o.key === childPrototypeOptionKey)?.label ??
                "（请选择行模板）"}
              · 行模板：
              {childPrototypeOptions.find((o) => o.key === childPrototypeOptionKey)
                ?.prototypeChildIds
                .map((cid) => template.blockMeta?.[cid]?.name?.trim() || cid)
                .join("、") || "—"}
              · 变量路径：{childItemPath || "—"}
            </p>
          ) : null}
        </>
      ) : null}
      {onChildPrototypeOptionKeyChange && childPrototypeOptions.length > 0 ? (
        <Field label="子级行模板" className="inspector-field--modal-table">
          <p className="repeat-region-bind-modal__section-hint inspector__muted">
            在父级行模板下的区块树中点选；单块仅复制该块，layout/grid 则复制该容器及其子级。循环容器由所选行自动确定。
          </p>
          <RepeatPrototypePickerTable
            template={template}
            contextRootIds={parentPrototypeChildIds}
            contextLabelSuffix="父级行模板"
            options={childPrototypeOptions}
            selectedOptionKey={childPrototypeOptionKey}
            onSelectOptionKey={onChildPrototypeOptionKeyChange}
            disabledOptionKeys={childPrototypeDisabledKeys}
            ariaLabel="可选子级行模板"
          />
          {childPrototypeDisabledKeys.size > 0 ? (
            <p className="repeat-region-bind-modal__row-template-lock-hint">
              与父级行模板相同的选项已置灰，不可再选为子级行模板。
            </p>
          ) : null}
        </Field>
      ) : null}
    </>
  );

  const parentMappingStep =
    showParentMapping && repeatCandidate && parentTargetFieldOptions.length > 0 ? (
      <FieldMappingSplitPanel
        visible={visible}
        template={template}
        payload={payload}
        repeatCandidate={repeatCandidate}
        itemFields={parentScalarFields}
        prototypeChildIds={selectedPrototypeOption?.prototypeChildIds ?? []}
        targetFieldOptions={parentTargetFieldOptions}
        mappingDraft={parentMappingDraft}
        onMappingDraftChange={onParentMappingDraftChange}
        mappingAriaLabel="父级列表项字段映射"
      />
    ) : (
      <p className="repeat-region-bind-modal__empty-hint">
        行模板内没有可映射的父级业务字段，将沿用模板已有变量绑定。
      </p>
    );

  const childMappingStep =
    showChildMapping && repeatCandidate && onChildMappingDraftChange ? (
      <>
        {loopScope === "parentAndChild" ? (
          <p className="repeat-region-bind-modal__section-hint inspector__muted">
            已选「父级与子级都循环」时，请完成子级字段映射；SKU 等子列表字段仅在此步骤配置。
          </p>
        ) : null}
        <FieldMappingSplitPanel
        visible={visible}
        template={template}
        payload={payload}
        repeatCandidate={repeatCandidate}
        itemFields={childMappingItemFields}
        prototypeChildIds={childPrototypeChildIds}
        targetFieldOptions={childTargetFieldOptions}
        mappingDraft={childMappingDraft}
        onMappingDraftChange={onChildMappingDraftChange}
        mappingAriaLabel="子级列表项字段映射"
        />
      </>
    ) : (
      <p className="repeat-region-bind-modal__empty-hint">
        子级行模板内没有可映射的业务字段，将沿用模板已有变量绑定。
      </p>
    );

  const renderWizardStepBody = () => {
    switch (currentWizardStep?.id) {
      case "scope":
        return scopeStepContent;
      case "parent":
        return (
          <>
            {parentSlotStep}
            {parentRowTemplateStep}
          </>
        );
      case "child":
        return (
          <>
            {childCollectionStep}
            {childRowTemplateStep}
          </>
        );
      case "parentMap":
        return parentMappingStep;
      case "childMap":
        return childMappingStep;
      default:
        return null;
    }
  };

  const renderLegacySinglePage = () => (
    <>
      {scopePreviewBlock}
      {scopeStepContent}
      {parentSlotStep}
      {parentRowTemplateStep}
      {showChildSection ? (
        <Field label="子级列表">
          {childCollectionStep}
          {childRowTemplateStep}
        </Field>
      ) : null}
      {showParentMapping && repeatCandidate && parentTargetFieldOptions.length > 0 ? (
        <Field label="父级字段映射" className="inspector-field--modal-table">
          {parentMappingStep}
        </Field>
      ) : null}
      {showChildMapping && repeatCandidate && onChildMappingDraftChange ? (
        <Field label="子级字段映射" className="inspector-field--modal-table">
          {childMappingStep}
        </Field>
      ) : null}
      {repeatCandidate &&
      !showParentMapping &&
      !showChildMapping &&
      (loopScope === "parentOnly" || loopScope === "childOnly") ? (
        <p className="repeat-region-bind-modal__empty-hint">
          行模板内没有可映射的业务字段，将沿用模板已有变量绑定。
        </p>
      ) : null}
    </>
  );

  return (
    <ShopSectionModal
      title={modalTitle}
      visible={visible}
      centered
      destroyOnClose
      maskClosable={false}
      keyboard
      wrapClassName={`text-body-inline-var-modal-wrap text-body-var-pill-modal-wrap repeat-region-bind-modal-wrap${
        wizardMode ? " repeat-region-bind-modal-wrap--wizard" : ""
      }`}
      bodyStyle={{ paddingTop: 16, paddingRight: 24, paddingBottom: 24, paddingLeft: 24 }}
      onCancel={onClose}
      footer={
        <div className="repeat-region-bind-modal__footer">
          <div className="repeat-region-bind-modal__footer-start">
            {hasCurrentRepeat && onRemove ? (
              <ShopSecondaryButton
                htmlType="button"
                onClick={onRemove}
                title="将物化为静态预览行，并清除父级与子级列表循环"
              >
                解除列表绑定（含子级 skus）
              </ShopSecondaryButton>
            ) : null}
          </div>
          <div className="shop-section-modal__footer-actions repeat-region-bind-modal__footer-actions">
            <ShopSecondaryButton htmlType="button" onClick={onClose}>
              取消
            </ShopSecondaryButton>
            {wizardMode && wizardStepIndex > 0 ? (
              <ShopSecondaryButton
                htmlType="button"
                onClick={() => setWizardStepIndex((i) => Math.max(0, i - 1))}
              >
                上一步
              </ShopSecondaryButton>
            ) : null}
            {wizardMode && !isLastWizardStep ? (
              <ShopPrimaryButton htmlType="button" onClick={goNextWizardStep}>
                下一步
              </ShopPrimaryButton>
            ) : (
              <ShopPrimaryButton
                htmlType="button"
                onClick={() => {
                  if (wizardMode) {
                    const err = validateWizardStep(currentWizardStep?.id);
                    if (err) {
                      window.alert(err);
                      return;
                    }
                  }
                  onApply();
                }}
              >
                应用
              </ShopPrimaryButton>
            )}
          </div>
        </div>
      }
    >
      <div
        className={`text-body-inline-var-modal repeat-region-bind-modal${
          wizardMode ? " repeat-region-bind-modal--wizard" : ""
        }`}
      >
        {scopePreviewBlock}
        {wizardMode ? (
          <>
            <WizardStepNav steps={wizardSteps} currentIndex={wizardStepIndex} />
            <div className="repeat-region-bind-modal__wizard-body">{renderWizardStepBody()}</div>
          </>
        ) : (
          renderLegacySinglePage()
        )}
      </div>
    </ShopSectionModal>
  );
}

function FieldMappingSplitPanel({
  visible,
  template,
  payload,
  repeatCandidate,
  itemFields,
  prototypeChildIds,
  targetFieldOptions,
  mappingDraft,
  onMappingDraftChange,
}: {
  visible: boolean;
  template: EmailTemplate;
  payload: EmailPayload;
  repeatCandidate: RepeatCollectionCandidate;
  itemFields: RepeatCollectionCandidate["itemFields"];
  prototypeChildIds: string[];
  targetFieldOptions: RepeatTargetFieldOption[];
  mappingDraft: Record<string, string>;
  onMappingDraftChange: (draft: Record<string, string>) => void;
  mappingAriaLabel?: string;
}) {
  const navEntries = useMemo(
    () => flattenRepeatTargetFieldsForNav(template, prototypeChildIds, targetFieldOptions),
    [template, prototypeChildIds, targetFieldOptions]
  );
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() =>
    defaultExpandedRepeatTargetGroups(navEntries)
  );
  const [activeTargetKey, setActiveTargetKey] = useState(() => firstRepeatTargetLeafKey(navEntries));

  useEffect(() => {
    if (!visible) return;
    setExpandedGroups(defaultExpandedRepeatTargetGroups(navEntries));
    setActiveTargetKey((prev) =>
      findRepeatTargetLeafByKey(navEntries, prev) ? prev : firstRepeatTargetLeafKey(navEntries)
    );
  }, [visible, navEntries]);

  const visibleNavEntries = useMemo(() => {
    const out: typeof navEntries = [];
    let hiddenBelowDepth: number | null = null;
    for (const entry of navEntries) {
      if (hiddenBelowDepth !== null && entry.depth > hiddenBelowDepth) continue;
      hiddenBelowDepth = null;
      out.push(entry);
      if (entry.kind === "group" && !expandedGroups.has(entry.key)) {
        hiddenBelowDepth = entry.depth;
      }
    }
    return out;
  }, [navEntries, expandedGroups]);

  const activeLeaf = findRepeatTargetLeafByKey(navEntries, activeTargetKey);
  const activeTarget =
    targetFieldOptions.find((target) => target.key === activeTargetKey) ?? targetFieldOptions[0];
  if (!activeTarget || !activeLeaf) return null;

  const mappedKey = mappingDraft[activeTarget.key];

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

  return (
    <div className="repeat-region-bind-modal__mapping-split">
      <nav className="repeat-region-bind-modal__mapping-tabs" aria-label="模板字段">
        {visibleNavEntries.map((entry) => {
          if (entry.kind === "group") {
            const isExpanded = expandedGroups.has(entry.key);
            const mapped = repeatTargetGroupHasChildMapping(entry.key, navEntries, mappingDraft);
            return (
              <div
                key={entry.key}
                className="repeat-region-bind-modal__mapping-tab-row"
                style={{ ["--mapping-depth" as string]: String(entry.depth) }}
              >
                <button
                  type="button"
                  className="repeat-region-bind-modal__mapping-expand"
                  aria-expanded={isExpanded}
                  aria-label={isExpanded ? "折叠子字段" : "展开子字段"}
                  onClick={() => toggleGroup(entry.key)}
                >
                  {isExpanded ? "▼" : "▶"}
                </button>
                <button
                  type="button"
                  className="repeat-region-bind-modal__mapping-tab repeat-region-bind-modal__mapping-tab--group"
                  title={entry.label}
                  onClick={() => toggleGroup(entry.key)}
                >
                  <span className="repeat-region-bind-modal__mapping-tab-label">{entry.label}</span>
                  {mapped ? (
                    <span className="repeat-region-bind-modal__mapping-tab-dot" aria-hidden />
                  ) : null}
                </button>
              </div>
            );
          }

          const isActive = entry.key === activeTarget.key;
          const mapped = Boolean(mappingDraft[entry.key]?.trim());
          return (
            <div
              key={entry.key}
              className="repeat-region-bind-modal__mapping-tab-row"
              style={{ ["--mapping-depth" as string]: String(entry.depth) }}
            >
              <span className="repeat-region-bind-modal__mapping-expand-placeholder" aria-hidden />
              <button
                type="button"
                className={`repeat-region-bind-modal__mapping-tab${
                  isActive ? " repeat-region-bind-modal__mapping-tab--active" : ""
                }`}
                title={`${entry.label}\n${entry.bindPath}`}
                onClick={() => setActiveTargetKey(entry.key)}
              >
                <span className="repeat-region-bind-modal__mapping-tab-label">{entry.label}</span>
                {mapped ? (
                  <span className="repeat-region-bind-modal__mapping-tab-dot" aria-hidden />
                ) : null}
              </button>
            </div>
          );
        })}
      </nav>
      <div className="repeat-region-bind-modal__mapping-panel">
        <div className="repeat-region-bind-modal__mapping-panel-head">
          <span className="repeat-region-bind-modal__mapping-panel-target">
            {repeatMappingTargetLabel(template, activeTarget.blockId, activeTarget.bindPath)}
          </span>
          <span className="repeat-region-bind-modal__mapping-panel-current">
            当前映射：{mappedFieldLabel(itemFields, mappedKey)}
          </span>
        </div>
        <ItemFieldMappingPickerTable
          payload={payload}
          slotId={repeatCandidate.slotId}
          itemFields={itemFields}
          mappedKey={mappedKey}
          onSelectSource={(sourceKey) =>
            onMappingDraftChange({
              ...mappingDraft,
              [activeTarget.key]: sourceKey,
            })
          }
        />
      </div>
    </div>
  );
}

function formatSlotNestedGroupExample(
  payload: EmailPayload,
  slotId: string,
  groupKey: string
): string {
  const raw = payload.values?.[slotId];
  if (!Array.isArray(raw) || raw.length === 0) return "—";
  const first = raw[0];
  if (!first || typeof first !== "object" || Array.isArray(first)) return "—";
  const nested = (first as Record<string, unknown>)[groupKey];
  if (!Array.isArray(nested)) return "—";
  const count = nested.filter((item) => item && typeof item === "object" && !Array.isArray(item)).length;
  return count === 0 ? "0 项" : `${count} 项`;
}

function formatSlotFieldPathExample(
  payload: EmailPayload,
  slotId: string,
  path: string
): string {
  const raw = payload.values?.[slotId];
  if (!Array.isArray(raw) || raw.length === 0) return "—";
  const first = raw[0];
  if (!first || typeof first !== "object" || Array.isArray(first)) return "—";
  const row = first as Record<string, unknown>;
  const value = path.includes(".") ? readCatalogSourceValue(row, path) : row[path];
  return formatSourceFieldExample(value);
}

function CollectionSlotPickerTable({
  candidates,
  payload,
  selectedSlotId,
  onSelectSlotId,
  nestedCollectionSelection,
  readOnly = false,
}: {
  candidates: RepeatCollectionCandidate[];
  payload: EmailPayload;
  selectedSlotId: string;
  onSelectSlotId: (slotId: string) => void;
  /** 在已选父级列表项 schema 下选择子级 collection（itemPath），复用同一树表交互 */
  nestedCollectionSelection?: {
    selectedPath: string;
    onSelectPath: (path: string) => void;
  };
  /** 仅展示已选列表（无单选、不可切换槽） */
  readOnly?: boolean;
}) {
  const [expandedSlotIds, setExpandedSlotIds] = useState<Set<string>>(() => new Set());
  const [expandedGroupsBySlot, setExpandedGroupsBySlot] = useState<Record<string, Set<string>>>({});
  const pickNestedChild = Boolean(nestedCollectionSelection);
  const slotReadOnly = readOnly && !pickNestedChild;

  useEffect(() => {
    const selected = candidates.find((c) => c.key === selectedSlotId) ?? candidates[0];
    if (!selected || !hasNestedCollectionInItemFields(selected.itemFields)) return;
    const slotKey = selected.key;
    setExpandedSlotIds((prev) => {
      if (prev.has(slotKey)) return prev;
      const next = new Set(prev);
      next.add(slotKey);
      return next;
    });
    setExpandedGroupsBySlot((prev) => {
      const groupPaths = new Set(defaultExpandedCollectionGroupPaths(selected.itemFields));
      if (nestedCollectionSelection?.selectedPath) {
        groupPaths.add(nestedCollectionSelection.selectedPath);
      }
      if (prev[slotKey]) return prev;
      return { ...prev, [slotKey]: groupPaths };
    });
  }, [selectedSlotId, candidates, nestedCollectionSelection?.selectedPath]);

  const groupsForSlot = (slotId: string, itemFields: RepeatCollectionCandidate["itemFields"]) =>
    expandedGroupsBySlot[slotId] ?? defaultExpandedCollectionGroupPaths(itemFields);

  const toggleSlotSchema = (slotId: string, itemFields: RepeatCollectionCandidate["itemFields"]) => {
    setExpandedSlotIds((prev) => {
      const next = new Set(prev);
      if (next.has(slotId)) {
        next.delete(slotId);
        return next;
      }
      next.add(slotId);
      setExpandedGroupsBySlot((groups) => ({
        ...groups,
        [slotId]: defaultExpandedCollectionGroupPaths(itemFields),
      }));
      return next;
    });
  };

  const toggleSlotGroup = (slotId: string, groupKey: string) => {
    setExpandedGroupsBySlot((prev) => {
      const current = new Set(prev[slotId] ?? []);
      if (current.has(groupKey)) current.delete(groupKey);
      else current.add(groupKey);
      return { ...prev, [slotId]: current };
    });
  };

  const radioGroupName = pickNestedChild
    ? "repeat-region-nested-child-collection"
    : "repeat-region-collection-slot";

  return (
    <div
      className="text-body-var-pill-modal__table-wrap repeat-region-bind-modal__table-viewport repeat-region-bind-modal__slot-picker-wrap"
      role={slotReadOnly ? "group" : "radiogroup"}
      aria-label={
        pickNestedChild
          ? "可选子级列表"
          : slotReadOnly
            ? "已选父级列表变量"
            : "可选列表变量"
      }
    >
      <table className="text-body-var-pill-modal__table">
        <thead>
          <tr>
            <th className="text-body-var-pill-modal__th text-body-var-pill-modal__th--radio" scope="col">
              <span className="text-body-var-pill-modal__sr-only">
                {slotReadOnly ? "展开" : "选择"}
              </span>
            </th>
            <th className="text-body-var-pill-modal__th" scope="col">
              名称
            </th>
            <th className="text-body-var-pill-modal__th" scope="col">
              标识
            </th>
            <th className="text-body-var-pill-modal__th text-body-var-pill-modal__th--type" scope="col">
              类型
            </th>
            <th className="text-body-var-pill-modal__th" scope="col">
              首项示例
            </th>
          </tr>
        </thead>
        <tbody>
          {candidates.flatMap((candidate) => {
            const selected = candidate.key === selectedSlotId;
            const example = formatCollectionSlotListSummary(
              payload,
              candidate.slotId,
              candidate.itemFields
            );
            const hasNested = hasNestedCollectionInItemFields(candidate.itemFields);
            const schemaExpanded = expandedSlotIds.has(candidate.key);
            const groupExpanded = groupsForSlot(candidate.key, candidate.itemFields);
            const previewEntries = hasNested
              ? flattenNestedCollectionFieldsPreview(candidate.itemFields, groupExpanded)
              : [];

            const mainRow = (
              <tr
                key={candidate.key}
                className={`text-body-var-pill-modal__row${
                  slotReadOnly || pickNestedChild
                    ? " text-body-var-pill-modal__row--context"
                    : selected
                      ? " text-body-var-pill-modal__row--selected"
                      : ""
                }`}
                onClick={
                  pickNestedChild || slotReadOnly
                    ? undefined
                    : () => {
                        onSelectSlotId(candidate.key);
                      }
                }
                onKeyDown={
                  pickNestedChild || slotReadOnly
                    ? undefined
                    : (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onSelectSlotId(candidate.key);
                        }
                      }
                }
                tabIndex={pickNestedChild || slotReadOnly ? undefined : 0}
                role={pickNestedChild || slotReadOnly ? undefined : "radio"}
                aria-checked={pickNestedChild || slotReadOnly ? undefined : selected}
                aria-expanded={hasNested ? schemaExpanded : undefined}
              >
                <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--radio">
                  {hasNested ? (
                    <button
                      type="button"
                      className="repeat-region-bind-modal__mapping-expand"
                      aria-expanded={schemaExpanded}
                      aria-label={schemaExpanded ? "折叠子列表结构" : "展开子列表结构"}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSlotSchema(candidate.key, candidate.itemFields);
                      }}
                    >
                      {schemaExpanded ? "▼" : "▶"}
                    </button>
                  ) : null}
                  {pickNestedChild || slotReadOnly ? (
                    <span
                      className="repeat-region-bind-modal__mapping-expand-placeholder"
                      aria-hidden
                    />
                  ) : (
                    <input
                      type="radio"
                      name={radioGroupName}
                      className="text-body-var-pill-modal__radio"
                      checked={selected}
                      onChange={() => onSelectSlotId(candidate.key)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`选择 ${candidate.label}`}
                    />
                  )}
                </td>
                <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--label">
                  {candidate.label}
                </td>
                <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--id">
                  <code>{candidate.slotId}</code>
                </td>
                <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--type">
                  列表
                </td>
                <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--value" title={example}>
                  {example}
                </td>
              </tr>
            );

            if (!hasNested || !schemaExpanded) {
              return [mainRow];
            }

            const detailRows = previewEntries.map((entry) => {
              if (entry.kind === "group") {
                const isGroupOpen = groupExpanded.has(entry.path);
                const pathSelected =
                  pickNestedChild && nestedCollectionSelection?.selectedPath === entry.path;
                const groupLabel = entry.field.label?.trim() || entry.path;
                return (
                  <tr
                    key={`${candidate.key}:group:${entry.path}`}
                    className={`text-body-var-pill-modal__row text-body-var-pill-modal__row--group${
                      pathSelected ? " text-body-var-pill-modal__row--selected" : ""
                    }`}
                    style={{ ["--picker-depth" as string]: String(entry.depth) }}
                    onClick={
                      pickNestedChild
                        ? () => nestedCollectionSelection?.onSelectPath(entry.path)
                        : undefined
                    }
                    onKeyDown={
                      pickNestedChild
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              nestedCollectionSelection?.onSelectPath(entry.path);
                            }
                          }
                        : undefined
                    }
                    tabIndex={pickNestedChild ? 0 : undefined}
                    role={pickNestedChild ? "radio" : undefined}
                    aria-checked={pickNestedChild ? pathSelected : undefined}
                  >
                    <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--radio">
                      <button
                        type="button"
                        className="repeat-region-bind-modal__mapping-expand"
                        aria-expanded={isGroupOpen}
                        aria-label={isGroupOpen ? "折叠子字段" : "展开子字段"}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSlotGroup(candidate.key, entry.path);
                        }}
                      >
                        {isGroupOpen ? "▼" : "▶"}
                      </button>
                      {pickNestedChild ? (
                        <input
                          type="radio"
                          name={radioGroupName}
                          className="text-body-var-pill-modal__radio"
                          checked={Boolean(pathSelected)}
                          onChange={() => nestedCollectionSelection?.onSelectPath(entry.path)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`选择 ${groupLabel}`}
                        />
                      ) : null}
                    </td>
                    <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--label">
                      {entry.field.label?.trim() || entry.path}
                    </td>
                    <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--id">
                      <code>{entry.path}</code>
                    </td>
                    <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--type">
                      列表
                    </td>
                    <td
                      className="text-body-var-pill-modal__td text-body-var-pill-modal__td--value"
                      title={formatSlotNestedGroupExample(payload, candidate.slotId, entry.path)}
                    >
                      {formatSlotNestedGroupExample(payload, candidate.slotId, entry.path)}
                    </td>
                  </tr>
                );
              }

              return (
                <tr
                  key={`${candidate.key}:leaf:${entry.path}`}
                  className="text-body-var-pill-modal__row text-body-var-pill-modal__row--nested"
                  style={{ ["--picker-depth" as string]: String(entry.depth) }}
                >
                  <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--radio">
                    <span
                      className="repeat-region-bind-modal__mapping-expand-placeholder"
                      aria-hidden
                    />
                  </td>
                  <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--label">
                    {entry.field.label?.trim() || entry.path}
                  </td>
                  <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--id">
                    <code>{entry.path}</code>
                  </td>
                  <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--type">
                    {collectionItemFieldValueTypeLabel(entry.field.valueType)}
                  </td>
                  <td
                    className="text-body-var-pill-modal__td text-body-var-pill-modal__td--value"
                    title={formatSlotFieldPathExample(payload, candidate.slotId, entry.path)}
                  >
                    {formatSlotFieldPathExample(payload, candidate.slotId, entry.path)}
                  </td>
                </tr>
              );
            });

            return [mainRow, ...detailRows];
          })}
        </tbody>
      </table>
    </div>
  );
}

function RepeatPrototypePickerTable({
  template,
  contextRootIds,
  contextLabelSuffix,
  options,
  selectedOptionKey,
  onSelectOptionKey,
  disabledOptionKeys,
  readOnly = false,
  ariaLabel,
}: {
  template: EmailTemplate;
  contextRootIds: string[];
  contextLabelSuffix: string;
  options: RepeatPrototypePickerOption[] | ChildRepeatPrototypeOption[];
  selectedOptionKey: string;
  onSelectOptionKey: (key: string) => void;
  /** 与父级行模板等价的 optionKey：置灰且不可选（仅子级行模板步骤传入） */
  disabledOptionKeys?: ReadonlySet<string>;
  readOnly?: boolean;
  ariaLabel: string;
}) {
  const allRows = useMemo(
    () => flattenRepeatPrototypePickerRows(template, contextRootIds, contextLabelSuffix, options),
    [template, contextRootIds, contextLabelSuffix, options]
  );
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(() =>
    defaultExpandedRepeatPrototypePickerBranches(allRows, template)
  );

  useEffect(() => {
    setExpandedBranches(defaultExpandedRepeatPrototypePickerBranches(allRows, template));
  }, [allRows, template]);

  useEffect(() => {
    const selected = options.find((opt) => opt.key === selectedOptionKey);
    const anchorId = selected?.prototypeChildIds[selected.prototypeChildIds.length - 1];
    if (!anchorId) return;
    const ancestorKeys = repeatPrototypePickerBranchKeysToBlock(
      template,
      contextRootIds,
      anchorId
    );
    if (ancestorKeys.length === 0) return;
    setExpandedBranches((prev) => {
      const next = new Set(prev);
      ancestorKeys.forEach((key) => next.add(key));
      return next;
    });
  }, [template, contextRootIds, options, selectedOptionKey]);

  const visibleRows = useMemo(
    () => visibleRepeatPrototypePickerRows(allRows, expandedBranches),
    [allRows, expandedBranches]
  );

  const toggleBranch = (rowKey: string) => {
    setExpandedBranches((prev) => {
      const next = new Set(prev);
      if (next.has(rowKey)) next.delete(rowKey);
      else next.add(rowKey);
      return next;
    });
  };

  const treeRowClass = (depth: number, extra = "") =>
    `text-body-var-pill-modal__row${depth > 0 ? " text-body-var-pill-modal__row--nested" : ""}${extra}`;

  function renderRepeatPrototypePickerRow(row: ChildRepeatPrototypePickerRow) {
    if (row.kind === "context") {
      return (
        <tr
          key={row.rowKey}
          className="text-body-var-pill-modal__row text-body-var-pill-modal__row--context"
          style={{ ["--picker-depth" as string]: String(row.depth) }}
        >
          <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--radio">
            <span className="repeat-region-bind-modal__mapping-expand-placeholder" aria-hidden />
          </td>
          <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--label" colSpan={4}>
            {row.label}
          </td>
        </tr>
      );
    }

    if (row.kind === "block") {
      const isExpanded = !row.expandable || expandedBranches.has(row.branchKey);
      return (
        <tr
          key={row.rowKey}
          className={treeRowClass(row.depth, " text-body-var-pill-modal__row--group")}
          style={{ ["--picker-depth" as string]: String(row.depth) }}
        >
          <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--radio">
            {row.expandable ? (
              <button
                type="button"
                className="repeat-region-bind-modal__mapping-expand"
                aria-expanded={isExpanded}
                aria-label={isExpanded ? "折叠子区块" : "展开子区块"}
                onClick={() => toggleBranch(row.branchKey)}
              >
                {isExpanded ? "▼" : "▶"}
              </button>
            ) : (
              <span className="repeat-region-bind-modal__mapping-expand-placeholder" aria-hidden />
            )}
          </td>
          <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--label">
            {row.label}
            {repeatPrototypePickerCanonicalHint(template, row.blockId) ? (
              <span className="repeat-region-bind-modal__prototype-hint inspector__muted">
                {repeatPrototypePickerCanonicalHint(template, row.blockId)}
              </span>
            ) : null}
          </td>
          <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--id">
            <code className="repeat-region-bind-modal__block-id-ellipsis" title={row.blockId}>
              {row.blockId}
            </code>
          </td>
          <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--type">{row.typeLabel}</td>
          <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--value inspector__muted">
            —
          </td>
        </tr>
      );
    }

    const selected = row.optionKey === selectedOptionKey;
    const disabled = Boolean(disabledOptionKeys?.has(row.optionKey));
    const selectable = !readOnly && !disabled;
    const collapseKey = row.branchKey;
    const isExpanded = !collapseKey || expandedBranches.has(collapseKey);
    const hint = disabled
      ? "该行模板已在父级步骤选用，不可再选为子级行模板。"
      : `循环写在「${row.hostLabel}」；${row.modeLabel}。${row.description}`;
    return (
      <tr
        key={row.rowKey}
        className={treeRowClass(
          row.depth,
          `${selected ? " text-body-var-pill-modal__row--selected" : ""}${
            readOnly ? " text-body-var-pill-modal__row--readonly" : ""
          }${disabled ? " text-body-var-pill-modal__row--disabled" : ""}`
        )}
        style={{ ["--picker-depth" as string]: String(row.depth) }}
        onClick={selectable ? () => onSelectOptionKey(row.optionKey) : undefined}
        onKeyDown={
          selectable
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectOptionKey(row.optionKey);
                }
              }
            : undefined
        }
        tabIndex={selectable ? 0 : -1}
        role="radio"
        aria-checked={selected}
        aria-disabled={disabled || undefined}
        title={row.label}
      >
        <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--radio">
          {row.expandable && collapseKey ? (
            <button
              type="button"
              className="repeat-region-bind-modal__mapping-expand"
              aria-expanded={isExpanded}
              aria-label={isExpanded ? "折叠子区块" : "展开子区块"}
              onClick={(e) => {
                e.stopPropagation();
                toggleBranch(collapseKey);
              }}
            >
              {isExpanded ? "▼" : "▶"}
            </button>
          ) : (
            <span className="repeat-region-bind-modal__mapping-expand-placeholder" aria-hidden />
          )}
          <input
            type="radio"
            name={`repeat-region-prototype-${ariaLabel}`}
            className="text-body-var-pill-modal__radio"
            checked={selected}
            disabled={readOnly || disabled}
            onChange={() => onSelectOptionKey(row.optionKey)}
            onClick={(e) => e.stopPropagation()}
            aria-label={`选择 ${row.label}，${row.modeLabel}`}
          />
        </td>
        <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--label">
          {row.label}
          {repeatPrototypePickerCanonicalHint(template, row.blockId) ? (
            <span className="repeat-region-bind-modal__prototype-hint inspector__muted">
              {repeatPrototypePickerCanonicalHint(template, row.blockId)}
            </span>
          ) : null}
        </td>
        <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--id">
          <code className="repeat-region-bind-modal__block-id-ellipsis" title={row.blockId}>
            {row.blockId}
          </code>
        </td>
        <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--type">{row.typeLabel}</td>
        <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--value" title={hint}>
          {row.modeLabel} · 循环容器：{row.hostLabel}
        </td>
      </tr>
    );
  }

  return (
    <div
      className="text-body-var-pill-modal__table-wrap repeat-region-bind-modal__table-viewport repeat-region-bind-modal__slot-picker-wrap"
      role="radiogroup"
      aria-label={ariaLabel}
      aria-readonly={readOnly || undefined}
    >
      <table className="text-body-var-pill-modal__table">
        <thead>
          <tr>
            <th className="text-body-var-pill-modal__th text-body-var-pill-modal__th--radio" scope="col">
              <span className="text-body-var-pill-modal__sr-only">选择</span>
            </th>
            <th className="text-body-var-pill-modal__th" scope="col">
              名称
            </th>
            <th className="text-body-var-pill-modal__th" scope="col">
              标识
            </th>
            <th className="text-body-var-pill-modal__th text-body-var-pill-modal__th--type" scope="col">
              类型
            </th>
            <th className="text-body-var-pill-modal__th" scope="col">
              说明
            </th>
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row) => renderRepeatPrototypePickerRow(row))}
        </tbody>
      </table>
    </div>
  );
}

function ItemFieldMappingPickerTable({
  payload,
  slotId,
  itemFields,
  mappedKey,
  onSelectSource,
}: {
  payload: EmailPayload;
  slotId: string;
  itemFields: RepeatCollectionCandidate["itemFields"];
  mappedKey: string | undefined;
  onSelectSource: (sourceKey: string) => void;
}) {
  const options = useMemo(() => {
    const sample = collectionSampleFromPayloadValues(payload, slotId, itemFields);
    return buildCollectionFieldPickerRows(sample, itemFields);
  }, [payload, slotId, itemFields]);

  return (
    <CollectionFieldPickerTable
      ariaLabel="映射到列表项字段"
      name={`repeat-field-map-${slotId}`}
      options={options}
      mappedKey={mappedKey}
      onSelect={onSelectSource}
    />
  );
}
