import { useEffect, useMemo, useState } from "react";
import type { EmailBlock, EmailPayload, EmailTemplate, RepeatRegionBinding } from "../types/email";
import { formatRepeatCollectionCandidateListSummary } from "../lib/repeatListItemField";
import { CollectionFieldPickerTable } from "./CollectionFieldPickerTable";
import {
  buildRepeatListScalarFieldPickerRows,
  collectionSampleFromPayloadValues,
  type CollectionJsonSample,
} from "../lib/collectionFieldMapping";
import {
  collectionSampleFromNestedRepeatPayload,
  listRepeatFieldMappingScalarFields,
} from "../lib/repeatNestedFieldMapping";
import {
  countNestedCollectionsInItemFields,
  hasNestedCollectionInItemFields,
  listNestedCollectionFieldsInItemFields,
} from "../lib/collectionFieldMappingTree";
import {
  defaultExpandedRepeatTargetGroups,
  findRepeatTargetLeafByKey,
  firstRepeatTargetLeafKey,
  flattenRepeatTargetFieldsForNav,
  repeatTargetGroupHasChildMapping,
} from "../lib/repeatTargetFieldMappingTree";
import { Field } from "./ui/Field";
import { ShopPrimaryButton, ShopSecondaryButton } from "./ui/ShopFormControls";
import { SelectablePickerRadioCell } from "./ui/SelectablePickerRadioCell";
import { ShopSectionModal } from "./ui/ShopSectionModal";
import { PickerTreeTable } from "./ui/PickerTreeTable";
import { toastWarning } from "../lib/appToast";

// 单层绑定向导：列表变量 → 字段映射（嵌套通过选中内层容器再绑定，不在此弹窗多层配置）。
type WizardStepId = "parentSlot" | "parentMap";

type WizardStep = { id: WizardStepId; title: string };

function buildWizardSteps(): WizardStep[] {
  return [
    { id: "parentSlot", title: "列表变量" },
    { id: "parentMap", title: "字段映射" },
  ];
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
  /** 父项 repeat 展示名（itemPath 子列表行用于 tag 提示） */
  parentSlotLabel?: string;
};

export type RepeatTargetFieldOption = {
  key: string;
  blockId: string;
  bindPath: string;
  label: string;
};

export type RepeatRegionBindModalProps = {
  visible: boolean;
  /** 复制体/行内字段「查看绑定」：直达字段映射且不可编辑 */
  viewOnly?: boolean;
  template: EmailTemplate;
  payload: EmailPayload;
  hasCurrentRepeat: boolean;
  collectionCandidates: RepeatCollectionCandidate[];
  /** 行模板根（字段映射左侧树范围）= 选中容器自身 */
  parentPrototypeChildIds?: string[];
  /** 画布已确定的行模板展示名 */
  parentRowTemplateLabel?: string;
  parentTargetFieldOptions: RepeatTargetFieldOption[];
  repeatSlotId: string;
  parentMappingDraft: Record<string, string>;
  repeatCandidate: RepeatCollectionCandidate | undefined;
  /** 嵌套 itemPath 绑定时，外层 repeat 配置（供 parent. 字段映射） */
  enclosingParentRepeat?: RepeatRegionBinding | null;
  onClose: () => void;
  onApply: () => void;
  onRemove?: () => void;
  onParentMappingDraftChange: (draft: Record<string, string>) => void;
  onSlotChange: (slotId: string) => void;
};

export function RepeatRegionBindModal({
  visible,
  viewOnly = false,
  template,
  payload,
  hasCurrentRepeat,
  collectionCandidates,
  parentPrototypeChildIds = [],
  parentRowTemplateLabel,
  parentTargetFieldOptions,
  repeatSlotId,
  parentMappingDraft,
  repeatCandidate,
  enclosingParentRepeat = null,
  onClose,
  onApply,
  onRemove,
  onParentMappingDraftChange,
  onSlotChange,
}: RepeatRegionBindModalProps) {
  const mappingScalarFields = useMemo(
    () =>
      repeatCandidate
        ? listRepeatFieldMappingScalarFields(
            {
              mode: "collection",
              slotId: repeatCandidate.slotId,
              prototypeChildIds: [],
              itemFields: repeatCandidate.itemFields,
              itemPath: repeatCandidate.itemPath,
              fieldMappings: [],
            },
            enclosingParentRepeat
          )
        : [],
    [repeatCandidate, enclosingParentRepeat]
  );
  const wizardSteps = useMemo(() => buildWizardSteps(), []);
  const [wizardStepIndex, setWizardStepIndex] = useState(0);
  const currentWizardStep = wizardSteps[wizardStepIndex];

  useEffect(() => {
    if (!visible) return;
    // 已绑定编辑 / 行内「查看绑定」：直达字段映射；首次绑定从步骤 1 选列表变量。
    const startOnFieldMapping = viewOnly || hasCurrentRepeat;
    setWizardStepIndex(startOnFieldMapping ? wizardSteps.length - 1 : 0);
  }, [visible, viewOnly, hasCurrentRepeat, wizardSteps.length]);

  const validateWizardStep = (stepId: WizardStepId | undefined): string | null => {
    if (stepId === "parentSlot" && !repeatSlotId) return "请选择列表变量。";
    return null;
  };

  const goNextWizardStep = () => {
    const err = validateWizardStep(currentWizardStep?.id);
    if (err) {
      toastWarning(err);
      return;
    }
    setWizardStepIndex((i) => Math.min(i + 1, wizardSteps.length - 1));
  };

  const isLastWizardStep = wizardStepIndex >= wizardSteps.length - 1;
  const modalTitle = viewOnly
    ? "查看列表绑定 · 字段映射"
    : currentWizardStep
      ? `绑定列表重复 · ${currentWizardStep.title}`
      : "绑定列表重复";

  const parentSlotStep = (
    <Field label="列表变量" className="inspector-field--modal-table">
      {collectionCandidates.length === 0 ? (
        <p className="text-body-var-pill-modal__empty">当前没有可用的列表变量。</p>
      ) : (
        <>
          <p className="repeat-region-bind-modal__section-hint inspector__muted">
            选择一个列表变量作为当前容器的循环数据源；若当前容器在某列表循环行内，可直接选「父项的子列表」实现嵌套复制。
          </p>
          <CollectionSlotPickerTable
            candidates={collectionCandidates}
            payload={payload}
            selectedSlotId={repeatSlotId}
            onSelectSlotId={onSlotChange}
          />
        </>
      )}
    </Field>
  );

  const parentMappingStep =
    repeatCandidate && parentTargetFieldOptions.length > 0 ? (
      <>
        {parentRowTemplateLabel ? (
          <p className="repeat-region-bind-modal__section-hint inspector__muted" role="status">
            当前行模板：{parentRowTemplateLabel}（画布选中区块，不在此弹窗中更换）
          </p>
        ) : null}
        {viewOnly ? (
          <p className="repeat-region-bind-modal__section-hint inspector__muted" role="status">
            列表变量：{repeatCandidate.label}（{repeatCandidate.slotId}）· 只读查看，修改请在列表宿主上点击「编辑绑定」。
          </p>
        ) : null}
        <FieldMappingSplitPanel
          visible={visible}
          template={template}
          payload={payload}
          repeatCandidate={repeatCandidate}
          itemFields={mappingScalarFields}
          enclosingParentRepeat={enclosingParentRepeat}
          prototypeChildIds={parentPrototypeChildIds}
          targetFieldOptions={parentTargetFieldOptions}
          mappingDraft={parentMappingDraft}
          onMappingDraftChange={onParentMappingDraftChange}
          mappingAriaLabel="列表项字段映射"
          readOnly={viewOnly}
        />
      </>
    ) : (
      <p className="repeat-region-bind-modal__empty-hint">
        行模板内没有可映射的业务字段，将沿用模板已有变量绑定。
      </p>
    );

  const renderWizardStepBody = () => {
    switch (currentWizardStep?.id) {
      case "parentSlot":
        return parentSlotStep;
      case "parentMap":
        return parentMappingStep;
      default:
        return null;
    }
  };

  return (
    <ShopSectionModal
      title={modalTitle}
      visible={visible}
      centered
      destroyOnClose
      maskClosable={false}
      keyboard
      wrapClassName={`text-body-inline-var-modal-wrap text-body-var-pill-modal-wrap repeat-region-bind-modal-wrap repeat-region-bind-modal-wrap--wizard${
        viewOnly ? " repeat-region-bind-modal-wrap--view-only" : ""
      }`}
      bodyStyle={{ paddingTop: 16, paddingRight: 24, paddingBottom: 24, paddingLeft: 24 }}
      onCancel={onClose}
      footer={
        <div className="repeat-region-bind-modal__footer">
          {!viewOnly ? (
            <div className="repeat-region-bind-modal__footer-start">
              {hasCurrentRepeat && onRemove ? (
                <ShopSecondaryButton
                  htmlType="button"
                  onClick={onRemove}
                  title="选择解除方式：保留全部展开行，或只保留行模板"
                >
                  解除列表绑定
                </ShopSecondaryButton>
              ) : null}
            </div>
          ) : null}
          <div className="shop-section-modal__footer-actions repeat-region-bind-modal__footer-actions">
            {viewOnly ? (
              <ShopPrimaryButton htmlType="button" onClick={onClose}>
                关闭
              </ShopPrimaryButton>
            ) : (
              <>
                <ShopSecondaryButton htmlType="button" onClick={onClose}>
                  取消
                </ShopSecondaryButton>
                {wizardStepIndex > 0 ? (
                  <ShopSecondaryButton
                    htmlType="button"
                    onClick={() => setWizardStepIndex((i) => Math.max(0, i - 1))}
                  >
                    上一步
                  </ShopSecondaryButton>
                ) : null}
                {!isLastWizardStep ? (
                  <ShopPrimaryButton htmlType="button" onClick={goNextWizardStep}>
                    下一步
                  </ShopPrimaryButton>
                ) : (
                  <ShopPrimaryButton
                    htmlType="button"
                    onClick={() => {
                      const err = validateWizardStep(currentWizardStep?.id);
                      if (err) {
                        toastWarning(err);
                        return;
                      }
                      onApply();
                    }}
                  >
                    应用
                  </ShopPrimaryButton>
                )}
              </>
            )}
          </div>
        </div>
      }
    >
      <div
        className={`text-body-inline-var-modal repeat-region-bind-modal repeat-region-bind-modal--wizard${
          viewOnly ? " repeat-region-bind-modal--view-only" : ""
        }`}
      >
        {viewOnly ? null : <WizardStepNav steps={wizardSteps} currentIndex={wizardStepIndex} />}
        <div className="repeat-region-bind-modal__wizard-body">{renderWizardStepBody()}</div>
      </div>
    </ShopSectionModal>
  );
}

/** 字段映射分栏列头（左右小标题，与区块树顶栏风格对齐） */
function MappingSplitColumnHead({ title }: { title: string }) {
  return (
    <div className="repeat-region-bind-modal__mapping-col-head">
      <span className="repeat-region-bind-modal__mapping-col-title">{title}</span>
    </div>
  );
}

function FieldMappingSplitPanel({
  visible,
  template,
  payload,
  repeatCandidate,
  itemFields,
  enclosingParentRepeat,
  prototypeChildIds,
  targetFieldOptions,
  mappingDraft,
  onMappingDraftChange,
  readOnly = false,
}: {
  visible: boolean;
  template: EmailTemplate;
  payload: EmailPayload;
  repeatCandidate: RepeatCollectionCandidate;
  itemFields: RepeatCollectionCandidate["itemFields"];
  enclosingParentRepeat: RepeatRegionBinding | null;
  prototypeChildIds: string[];
  targetFieldOptions: RepeatTargetFieldOption[];
  mappingDraft: Record<string, string>;
  onMappingDraftChange: (draft: Record<string, string>) => void;
  mappingAriaLabel?: string;
  readOnly?: boolean;
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
      <div className="repeat-region-bind-modal__mapping-col repeat-region-bind-modal__mapping-col--targets">
        <MappingSplitColumnHead title="行模板可映射项" />
        <nav className="repeat-region-bind-modal__mapping-tabs" aria-label="行模板可映射项">
          {visibleNavEntries.map((entry) => {
            if (entry.kind === "group") {
              const isExpanded = expandedGroups.has(entry.key);
              const mapped = repeatTargetGroupHasChildMapping(entry.key, navEntries, mappingDraft);
              const isContainer = entry.tier === "container";
              return (
                <div
                  key={entry.key}
                  className={`repeat-region-bind-modal__mapping-tab-row${
                    isContainer
                      ? " repeat-region-bind-modal__mapping-tab-row--block"
                      : " repeat-region-bind-modal__mapping-tab-row--content-block"
                  }`}
                  style={{ ["--mapping-depth" as string]: String(entry.depth) }}
                >
                  <button
                    type="button"
                    className="repeat-region-bind-modal__mapping-expand"
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? "折叠子级" : "展开子级"}
                    onClick={() => toggleGroup(entry.key)}
                  >
                    {isExpanded ? "▼" : "▶"}
                  </button>
                  <button
                    type="button"
                    className={`repeat-region-bind-modal__mapping-tab repeat-region-bind-modal__mapping-tab--group${
                      isContainer
                        ? " repeat-region-bind-modal__mapping-tab--block"
                        : " repeat-region-bind-modal__mapping-tab--content-block"
                    }`}
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
                className="repeat-region-bind-modal__mapping-tab-row repeat-region-bind-modal__mapping-tab-row--config"
                style={{ ["--mapping-depth" as string]: String(entry.depth) }}
              >
                <span className="repeat-region-bind-modal__mapping-expand-placeholder" aria-hidden />
                <button
                  type="button"
                  className={`repeat-region-bind-modal__mapping-tab repeat-region-bind-modal__mapping-tab--config${
                    isActive ? " repeat-region-bind-modal__mapping-tab--active" : ""
                  }`}
                  title={entry.bindPath}
                  onClick={() => setActiveTargetKey(entry.key)}
                >
                  <span className="repeat-region-bind-modal__mapping-tab-label">{entry.label}</span>
                  {mapped ? (
                    <span className="repeat-region-bind-modal__mapping-tab-dot" aria-hidden />
                  ) : null}
                  <span className="repeat-region-bind-modal__mapping-kind-tag repeat-region-bind-modal__mapping-kind-tag--config">
                    配置项
                  </span>
                </button>
              </div>
            );
          })}
        </nav>
      </div>
      <div className="repeat-region-bind-modal__mapping-col repeat-region-bind-modal__mapping-col--source">
        <MappingSplitColumnHead title="变量数据源" />
        <div className="repeat-region-bind-modal__mapping-panel">
          <ItemFieldMappingPickerTable
            payload={payload}
            repeatCandidate={repeatCandidate}
            enclosingParentRepeat={enclosingParentRepeat}
            itemFields={itemFields}
            mappedKey={mappedKey}
            readOnly={readOnly}
            onSelectSource={(sourceKey) =>
              onMappingDraftChange({
                ...mappingDraft,
                [activeTarget.key]: sourceKey,
              })
            }
          />
        </div>
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
  const pickNestedChild = Boolean(nestedCollectionSelection);
  const slotReadOnly = readOnly && !pickNestedChild;

  const radioGroupName = pickNestedChild
    ? "repeat-region-nested-child-collection"
    : "repeat-region-collection-slot";

  return (
    <PickerTreeTable
      className="repeat-region-bind-modal__slot-picker-wrap"
      role={slotReadOnly ? "group" : "radiogroup"}
      ariaReadonly={slotReadOnly}
      ariaLabel={
        pickNestedChild
          ? "可选子级列表"
          : slotReadOnly
            ? "已选父级列表变量"
            : "可选列表变量"
      }
      columns={[
        {
          key: "radio",
          className: "text-body-var-pill-modal__th text-body-var-pill-modal__th--radio",
          title: (
            <span className="text-body-var-pill-modal__sr-only">{slotReadOnly ? "展开" : "选择"}</span>
          ),
        },
        { key: "name", className: "text-body-var-pill-modal__th", title: "名称" },
        { key: "id", className: "text-body-var-pill-modal__th", title: "标识" },
        {
          key: "type",
          className: "text-body-var-pill-modal__th text-body-var-pill-modal__th--type",
          title: "类型",
        },
        { key: "value", className: "text-body-var-pill-modal__th", title: "首项示例" },
      ]}
      body={candidates.flatMap((candidate) => {
            const selected = candidate.key === selectedSlotId;
            const isParentNested = Boolean(candidate.itemPath?.trim());
            const example = formatRepeatCollectionCandidateListSummary(payload, candidate);
            const hasNested =
              !isParentNested && hasNestedCollectionInItemFields(candidate.itemFields);
            const nestedCount = countNestedCollectionsInItemFields(candidate.itemFields);

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
              >
                <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--radio">
                  {pickNestedChild || slotReadOnly ? (
                    <span
                      className="repeat-region-bind-modal__mapping-expand-placeholder"
                      aria-hidden
                    />
                  ) : (
                    <SelectablePickerRadioCell
                      name={radioGroupName}
                      checked={selected}
                      label={`选择 ${candidate.label}`}
                      onChange={() => onSelectSlotId(candidate.key)}
                    />
                  )}
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
                  <span className="repeat-region-bind-modal__slot-type-label">列表</span>
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
                  ) : !pickNestedChild && nestedCount > 0 ? (
                    <span className="repeat-region-bind-modal__slot-nested-count-tag">
                      含 {nestedCount} 个子列表
                    </span>
                  ) : null}
                </td>
                <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--value" title={example}>
                  {example}
                </td>
              </tr>
            );

            if (!pickNestedChild || !hasNested) {
              return [mainRow];
            }

            const childSubListRows = listNestedCollectionFieldsInItemFields(candidate.itemFields).map(
              (field) => {
                const path = field.key;
                const pathSelected = nestedCollectionSelection?.selectedPath === path;
                const groupLabel = field.label?.trim() || path;
                return (
                  <tr
                    key={`${candidate.key}:nested:${path}`}
                    className={`text-body-var-pill-modal__row text-body-var-pill-modal__row--group text-body-var-pill-modal__row--indented${
                      pathSelected ? " text-body-var-pill-modal__row--selected" : ""
                    }`}
                    style={{ ["--picker-depth" as string]: "1" }}
                    onClick={() => nestedCollectionSelection?.onSelectPath(path)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        nestedCollectionSelection?.onSelectPath(path);
                      }
                    }}
                    tabIndex={0}
                    role="radio"
                    aria-checked={pathSelected}
                  >
                    <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--radio">
                      <span
                        className="repeat-region-bind-modal__mapping-expand-placeholder"
                        aria-hidden
                      />
                      <SelectablePickerRadioCell
                        name={radioGroupName}
                        checked={Boolean(pathSelected)}
                        label={`选择 ${groupLabel}`}
                        onChange={() => nestedCollectionSelection?.onSelectPath(path)}
                      />
                    </td>
                    <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--label">
                      {groupLabel}
                    </td>
                    <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--id">
                      <code>{path}</code>
                    </td>
                    <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--type">
                      <span className="repeat-region-bind-modal__nested-type-tag">子列表</span>
                    </td>
                    <td
                      className="text-body-var-pill-modal__td text-body-var-pill-modal__td--value"
                      title={formatSlotNestedGroupExample(payload, candidate.slotId, path)}
                    >
                      {formatSlotNestedGroupExample(payload, candidate.slotId, path)}
                    </td>
                  </tr>
                );
              }
            );

            return [mainRow, ...childSubListRows];
          })}
    />
  );
}

function ItemFieldMappingPickerTable({
  payload,
  repeatCandidate,
  enclosingParentRepeat,
  itemFields,
  mappedKey,
  onSelectSource,
  readOnly = false,
}: {
  payload: EmailPayload;
  repeatCandidate: RepeatCollectionCandidate;
  enclosingParentRepeat: RepeatRegionBinding | null;
  itemFields: RepeatCollectionCandidate["itemFields"];
  mappedKey: string | undefined;
  onSelectSource: (sourceKey: string) => void;
  readOnly?: boolean;
}) {
  const options = useMemo(() => {
    const repeatBinding: RepeatRegionBinding = {
      mode: "collection",
      slotId: repeatCandidate.slotId,
      prototypeChildIds: [],
      itemFields: repeatCandidate.itemFields,
      itemPath: repeatCandidate.itemPath,
      fieldMappings: [],
    };
    const sample: CollectionJsonSample | null = repeatCandidate.itemPath?.trim()
      ? collectionSampleFromNestedRepeatPayload(
          payload,
          repeatBinding,
          itemFields,
          [],
          enclosingParentRepeat
        )
      : collectionSampleFromPayloadValues(payload, repeatCandidate.slotId, itemFields);
    return buildRepeatListScalarFieldPickerRows(sample, itemFields);
  }, [payload, repeatCandidate, enclosingParentRepeat, itemFields]);

  return (
    <CollectionFieldPickerTable
      ariaLabel="映射到列表项字段"
      name={`repeat-field-map-${repeatCandidate.key}`}
      options={options}
      mappedKey={mappedKey}
      onSelect={onSelectSource}
      readOnly={readOnly}
    />
  );
}
