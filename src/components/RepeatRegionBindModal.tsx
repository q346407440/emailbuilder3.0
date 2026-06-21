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
import { ShopInput, ShopPrimaryButton, ShopSecondaryButton } from "./ui/ShopFormControls";
import { SelectablePickerRadioCell } from "./ui/SelectablePickerRadioCell";
import { ShopSectionModal } from "./ui/ShopSectionModal";
import { PickerTreeTable } from "./ui/PickerTreeTable";
import { toastWarning } from "../lib/appToast";

type RepeatItemMode = "single" | "group";

// 单层绑定向导：列表变量 → 重复方式 → 字段映射（嵌套通过选中内层容器再绑定，不在此弹窗多层配置）。
type WizardStepId = "parentSlot" | "repeatMode" | "parentMap";

type WizardStep = { id: WizardStepId; title: string };

function buildWizardSteps(): WizardStep[] {
  return [
    { id: "parentSlot", title: "列表变量" },
    { id: "repeatMode", title: "重复方式" },
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
  /** 从「配置数据组绑定」已选列表变量时，跳过步骤 1「列表变量」 */
  skipListSlotStep?: boolean;
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
  repeatItemMode: RepeatItemMode;
  repeatGroupSize: number;
  parentMappingDraft: Record<string, string>;
  parentMappingOffsetDraft: Record<string, number>;
  repeatCandidate: RepeatCollectionCandidate | undefined;
  /** 嵌套 itemPath 绑定时，外层 repeat 配置（供 parent. 字段映射） */
  enclosingParentRepeat?: RepeatRegionBinding | null;
  onClose: () => void;
  onApply: () => void;
  onRemove?: () => void;
  onParentMappingDraftChange: (draft: Record<string, string>) => void;
  onRepeatItemModeChange: (mode: RepeatItemMode) => void;
  onRepeatGroupSizeChange: (groupSize: number) => void;
  onParentMappingOffsetDraftChange: (draft: Record<string, number>) => void;
  onSlotChange: (slotId: string) => void;
};

export function RepeatRegionBindModal({
  visible,
  viewOnly = false,
  skipListSlotStep = false,
  template,
  payload,
  hasCurrentRepeat,
  collectionCandidates,
  parentPrototypeChildIds = [],
  parentRowTemplateLabel,
  parentTargetFieldOptions,
  repeatSlotId,
  repeatItemMode,
  repeatGroupSize,
  parentMappingDraft,
  parentMappingOffsetDraft,
  repeatCandidate,
  enclosingParentRepeat = null,
  onClose,
  onApply,
  onRemove,
  onParentMappingDraftChange,
  onRepeatItemModeChange,
  onRepeatGroupSizeChange,
  onParentMappingOffsetDraftChange,
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
              fallbackChildIds: [],
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
    // 已绑定编辑 / 行内「查看绑定」：直达字段映射；数据组入口已选变量：从「重复方式」开始；否则从步骤 1 选列表变量。
    const startOnFieldMapping = viewOnly || hasCurrentRepeat;
    const startIndex = startOnFieldMapping
      ? wizardSteps.length - 1
      : skipListSlotStep
        ? 1
        : 0;
    setWizardStepIndex(startIndex);
  }, [visible, viewOnly, hasCurrentRepeat, skipListSlotStep, wizardSteps.length]);

  const minWizardStepIndex = skipListSlotStep ? 1 : 0;

  const validateWizardStep = (stepId: WizardStepId | undefined): string | null => {
    if (stepId === "parentSlot" && !repeatSlotId) return "请选择列表变量。";
    if (stepId === "repeatMode" && repeatItemMode === "group" && repeatGroupSize < 2) {
      return "分组重复至少需要每组 2 条数据。";
    }
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
            列表变量：{repeatCandidate.label} · 当前为只读查看，如需修改请在所在列表容器上点击「编辑绑定」。
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
          mappingOffsetDraft={parentMappingOffsetDraft}
          itemMode={repeatItemMode}
          groupSize={repeatGroupSize}
          onMappingDraftChange={onParentMappingDraftChange}
          onMappingOffsetDraftChange={onParentMappingOffsetDraftChange}
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
      case "repeatMode":
        return (
          <>
            {skipListSlotStep && repeatCandidate ? (
              <p className="repeat-region-bind-modal__section-hint inspector__muted" role="status">
                列表变量：{repeatCandidate.label}（<code>{repeatCandidate.slotId}</code>）· 已在「配置数据组绑定」中选择
              </p>
            ) : null}
            <RepeatModeStep
              itemMode={repeatItemMode}
              groupSize={repeatGroupSize}
              onItemModeChange={onRepeatItemModeChange}
              onGroupSizeChange={onRepeatGroupSizeChange}
            />
          </>
        );
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
      bodyStyle={{ padding: "16px 0 24px" }}
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
                {wizardStepIndex > minWizardStepIndex ? (
                  <ShopSecondaryButton
                    htmlType="button"
                    onClick={() =>
                      setWizardStepIndex((i) => Math.max(minWizardStepIndex, i - 1))
                    }
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

function RepeatModeStep({
  itemMode,
  groupSize,
  onItemModeChange,
  onGroupSizeChange,
}: {
  itemMode: RepeatItemMode;
  groupSize: number;
  onItemModeChange: (mode: RepeatItemMode) => void;
  onGroupSizeChange: (groupSize: number) => void;
}) {
  return (
    <div className="repeat-region-bind-modal__mode-step">
      <p className="repeat-region-bind-modal__section-hint inspector__muted">
        选择当前容器如何消费列表数据。普通列表用“每条数据复制一次”；栅格、左右错落等一个复制体内展示多条数据时，选择“每组数据复制一次”。
      </p>
      <div className="repeat-region-bind-modal__mode-options" role="radiogroup" aria-label="重复方式">
        <button
          type="button"
          className={`repeat-region-bind-modal__mode-card${
            itemMode === "single" ? " repeat-region-bind-modal__mode-card--active" : ""
          }`}
          onClick={() => onItemModeChange("single")}
        >
          <span className="repeat-region-bind-modal__mode-title">每条数据复制一次</span>
          <span className="repeat-region-bind-modal__mode-desc">
            适合单列卡片、单个图片区块等场景：A、B、C 会生成 3 个复制体。
          </span>
        </button>
        <button
          type="button"
          className={`repeat-region-bind-modal__mode-card${
            itemMode === "group" ? " repeat-region-bind-modal__mode-card--active" : ""
          }`}
          onClick={() => onItemModeChange("group")}
        >
          <span className="repeat-region-bind-modal__mode-title">每组数据复制一次</span>
          <span className="repeat-region-bind-modal__mode-desc">
            适合双列栅格或错落布局：A/B 共用第 1 个复制体，C/D 共用第 2 个复制体。
          </span>
        </button>
      </div>
      {itemMode === "group" ? (
        <Field label="每组数据条数">
          <ShopInput
            type="number"
            min={2}
            step={1}
            value={groupSize}
            onChange={(event) => {
              const next = Number(event.target.value);
              onGroupSizeChange(Number.isFinite(next) ? Math.max(2, Math.floor(next)) : 2);
            }}
          />
          <p className="repeat-region-bind-modal__section-hint inspector__muted">
            后续字段映射可为每个内容区块选择“使用本组第几条数据”。
          </p>
        </Field>
      ) : null}
    </div>
  );
}

export function FieldMappingSplitPanel({
  visible,
  template,
  payload,
  repeatCandidate,
  itemFields,
  enclosingParentRepeat,
  prototypeChildIds,
  targetFieldOptions,
  mappingDraft,
  mappingOffsetDraft,
  itemMode,
  groupSize,
  onMappingDraftChange,
  onMappingOffsetDraftChange,
  mappingAriaLabel = "行模板可映射项",
  targetColumnTitle = "行模板可映射项",
  sourceColumnTitle = "变量数据源",
  buildPickerRows,
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
  mappingOffsetDraft: Record<string, number>;
  itemMode: RepeatItemMode;
  groupSize: number;
  onMappingDraftChange: (draft: Record<string, string>) => void;
  onMappingOffsetDraftChange: (draft: Record<string, number>) => void;
  mappingAriaLabel?: string;
  targetColumnTitle?: string;
  sourceColumnTitle?: string;
  buildPickerRows?: (
    itemFields: RepeatCollectionCandidate["itemFields"]
  ) => import("../lib/collectionFieldMapping").CollectionFieldPickerOption[];
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
  const fallbackLeafKey = firstRepeatTargetLeafKey(navEntries);
  const effectiveTargetKey =
    activeLeaf?.key ?? (fallbackLeafKey || targetFieldOptions[0]?.key || "");
  const activeTarget =
    targetFieldOptions.find((target) => target.key === effectiveTargetKey) ?? targetFieldOptions[0];

  if (!activeTarget) {
    return (
      <p className="inspector__muted repeat-region-bind-modal__empty-hint">
        当前容器内没有可映射的业务内容字段。
      </p>
    );
  }

  const mappedKey = mappingDraft[activeTarget.key];
  const mappedOffset = Math.max(0, Math.floor(mappingOffsetDraft[activeTarget.key] ?? 0));

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
        <MappingSplitColumnHead title={targetColumnTitle} />
        <nav className="repeat-region-bind-modal__mapping-tabs" aria-label={mappingAriaLabel}>
          {visibleNavEntries.length > 0 ? (
            visibleNavEntries.map((entry) => {
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
          })
          ) : (
            targetFieldOptions.map((target) => {
              const isActive = target.key === activeTarget.key;
              const mapped = Boolean(mappingDraft[target.key]?.trim());
              return (
                <div
                  key={target.key}
                  className="repeat-region-bind-modal__mapping-tab-row repeat-region-bind-modal__mapping-tab-row--config"
                >
                  <span className="repeat-region-bind-modal__mapping-expand-placeholder" aria-hidden />
                  <button
                    type="button"
                    className={`repeat-region-bind-modal__mapping-tab repeat-region-bind-modal__mapping-tab--config${
                      isActive ? " repeat-region-bind-modal__mapping-tab--active" : ""
                    }`}
                    title={target.bindPath}
                    onClick={() => setActiveTargetKey(target.key)}
                  >
                    <span className="repeat-region-bind-modal__mapping-tab-label">{target.label}</span>
                    {mapped ? (
                      <span className="repeat-region-bind-modal__mapping-tab-dot" aria-hidden />
                    ) : null}
                    <span className="repeat-region-bind-modal__mapping-kind-tag repeat-region-bind-modal__mapping-kind-tag--config">
                      配置项
                    </span>
                  </button>
                </div>
              );
            })
          )}
        </nav>
      </div>
      <div className="repeat-region-bind-modal__mapping-col repeat-region-bind-modal__mapping-col--source">
        <MappingSplitColumnHead title={sourceColumnTitle} />
        <div className="repeat-region-bind-modal__mapping-panel">
          {itemMode === "group" ? (
            <div className="repeat-region-bind-modal__item-offset-bar" aria-label="分组项位">
              <span className="repeat-region-bind-modal__item-offset-label">当前字段使用</span>
              {Array.from({ length: Math.max(1, groupSize) }).map((_, index) => (
                <button
                  key={index}
                  type="button"
                  className={`repeat-region-bind-modal__item-offset-chip${
                    mappedOffset === index ? " repeat-region-bind-modal__item-offset-chip--active" : ""
                  }`}
                  disabled={readOnly}
                  onClick={() =>
                    onMappingOffsetDraftChange({
                      ...mappingOffsetDraft,
                      [activeTarget.key]: index,
                    })
                  }
                >
                  第 {index + 1} 条
                </button>
              ))}
            </div>
          ) : null}
          <ItemFieldMappingPickerTable
            payload={payload}
            repeatCandidate={repeatCandidate}
            enclosingParentRepeat={enclosingParentRepeat}
            itemFields={itemFields}
            mappedKey={mappedKey}
            readOnly={readOnly}
            buildPickerRows={buildPickerRows}
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
  buildPickerRows,
  onSelectSource,
  readOnly = false,
}: {
  payload: EmailPayload;
  repeatCandidate: RepeatCollectionCandidate;
  enclosingParentRepeat: RepeatRegionBinding | null;
  itemFields: RepeatCollectionCandidate["itemFields"];
  mappedKey: string | undefined;
  buildPickerRows?: (
    itemFields: RepeatCollectionCandidate["itemFields"]
  ) => import("../lib/collectionFieldMapping").CollectionFieldPickerOption[];
  onSelectSource: (sourceKey: string) => void;
  readOnly?: boolean;
}) {
  const options = useMemo(() => {
    if (buildPickerRows) return buildPickerRows(itemFields);
    const repeatBinding: RepeatRegionBinding = {
      mode: "collection",
      slotId: repeatCandidate.slotId,
      prototypeChildIds: [],
      fallbackChildIds: [],
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
  }, [payload, repeatCandidate, enclosingParentRepeat, itemFields, buildPickerRows]);

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
