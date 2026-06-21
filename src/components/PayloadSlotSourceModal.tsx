import { useEffect, useMemo, useState } from "react";
import type { EmailPayload } from "../types/email";
import { listBuiltinStructureCatalog } from "../api/builtinStructureCatalog";
import type { BuiltinStructureSummary } from "../payload-contract/builtin-structure-catalog";
import { payloadSlotValueTypeLabel } from "../payload-contract/value-type-labels";
import { builtinStructureScopeLabel } from "../lib/builtinStructureSlot";
import { Field } from "./ui/Field";
import { ShopPrimaryButton, ShopSecondaryButton, ShopSegmented } from "./ui/ShopFormControls";
import { SelectablePickerTable } from "./ui/SelectablePickerTable";
import { ShopSectionModal } from "./ui/ShopSectionModal";

type PayloadSlotSourceModalProps = {
  visible: boolean;
  payload: EmailPayload;
  onClose: () => void;
  onBuiltinStructureConfirm: (args: { structureId: string }) => void;
};

type StructureValueTier = "scalar" | "object" | "collection";

const STRUCTURE_TIER_TABS: ReadonlyArray<{ id: StructureValueTier; label: string; hint: string }> = [
  { id: "scalar", label: "单值", hint: "文本、链接等单个取值，用于文中变量或简单占位。" },
  { id: "object", label: "对象", hint: "一组字段整体绑定到容器内多个区块（不展开多行）。" },
  { id: "collection", label: "列表", hint: "多行 repeating 数据，用于列表 repeat 绑定。" },
];

const TIER_EMPTY_MESSAGE = "该类型下暂无可用结构。";

function structureScopeLabel(structure: BuiltinStructureSummary): string {
  return builtinStructureScopeLabel({
    structureId: structure.structureId,
    scope: structure.scope,
    dedicatedFor: structure.dedicatedFor,
    defaultSlotId: structure.defaultSlotId,
    label: structure.label,
    valueType: structure.valueType,
  });
}

function previewRowLabel(structure: BuiltinStructureSummary): string {
  if (structure.valueType === "object") {
    return structure.objectFieldCount !== undefined
      ? `${structure.objectFieldCount} 个字段`
      : "对象";
  }
  if (structure.valueType !== "collection") return "单值";
  if (structure.lengthPolicy?.kind === "locked") return `${structure.lengthPolicy.fixedLength} 行固定`;
  if (structure.defaultPreviewRowCount !== undefined) return `${structure.defaultPreviewRowCount} 行`;
  return "可配置";
}

function structureValueTier(structure: BuiltinStructureSummary): StructureValueTier {
  if (structure.valueType === "collection") return "collection";
  if (structure.valueType === "object") return "object";
  return "scalar";
}

/** 添加变量选择器分组顺序：标量 → 对象 → 列表（同组内按名称 zh 排序） */
function structureSortWeight(structure: BuiltinStructureSummary): number {
  if (structure.valueType === "collection") return 2;
  if (structure.valueType === "object") return 1;
  return 0;
}

/** 同类型内：通用 → loyalty 专用，组内按名称 zh 排序 */
function compareStructuresInTier(
  a: BuiltinStructureSummary,
  b: BuiltinStructureSummary
): number {
  const scopeA = a.scope === "general" ? 0 : 1;
  const scopeB = b.scope === "general" ? 0 : 1;
  if (scopeA !== scopeB) return scopeA - scopeB;
  return a.label.localeCompare(b.label, "zh-Hans-CN");
}

function sortBuiltinStructures(items: BuiltinStructureSummary[]): BuiltinStructureSummary[] {
  return [...items].sort((a, b) => {
    const weight = structureSortWeight(a) - structureSortWeight(b);
    if (weight !== 0) return weight;
    return compareStructuresInTier(a, b);
  });
}

function countStructuresByTier(structures: readonly BuiltinStructureSummary[]) {
  const counts: Record<StructureValueTier, number> = {
    scalar: 0,
    object: 0,
    collection: 0,
  };
  for (const structure of structures) {
    counts[structureValueTier(structure)] += 1;
  }
  return counts;
}

function firstPreferredStructure(
  structures: readonly BuiltinStructureSummary[],
  payload: EmailPayload
): BuiltinStructureSummary | undefined {
  return (
    structures.find((item) => !payload.slots[item.defaultSlotId]) ?? structures[0]
  );
}

export function PayloadSlotSourceModal({
  visible,
  payload,
  onClose,
  onBuiltinStructureConfirm,
}: PayloadSlotSourceModalProps) {
  const [structures, setStructures] = useState<BuiltinStructureSummary[]>([]);
  const [activeTier, setActiveTier] = useState<StructureValueTier>("scalar");
  const [selectedStructureId, setSelectedStructureId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setFormError("");
    setSelectedStructureId(null);
    setActiveTier("scalar");
    void listBuiltinStructureCatalog()
      .then((items) => {
        if (cancelled) return;
        const sorted = sortBuiltinStructures(items);
        setStructures(sorted);
        const preferred = firstPreferredStructure(sorted, payload);
        if (preferred) {
          setSelectedStructureId(preferred.structureId);
          setActiveTier(structureValueTier(preferred));
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setStructures([]);
        setLoadError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [payload.slots, visible]);

  const tierCounts = useMemo(() => countStructuresByTier(structures), [structures]);

  const filteredStructures = useMemo(
    () => structures.filter((structure) => structureValueTier(structure) === activeTier),
    [activeTier, structures]
  );

  const activeTierMeta = STRUCTURE_TIER_TABS.find((tab) => tab.id === activeTier);

  const selected = useMemo(
    () => structures.find((item) => item.structureId === selectedStructureId),
    [selectedStructureId, structures]
  );

  const confirmDisabled = loading || !selectedStructureId || Boolean(loadError);

  const handleTierChange = (tier: StructureValueTier) => {
    setActiveTier(tier);
    setFormError("");
    const inTier = structures.filter((structure) => structureValueTier(structure) === tier);
    if (!inTier.some((structure) => structure.structureId === selectedStructureId)) {
      setSelectedStructureId(inTier[0]?.structureId ?? null);
    }
  };

  const handleConfirm = () => {
    if (!selected) {
      setFormError("请选择一个内置变量结构。");
      return;
    }
    onBuiltinStructureConfirm({ structureId: selected.structureId });
  };

  return (
    <ShopSectionModal
      title="添加变量"
      visible={visible}
      centered
      destroyOnClose
      maskClosable={false}
      keyboard
      wrapClassName="payload-slot-source-modal-wrap text-body-var-pill-modal-wrap shop-section-modal-wrap--picker"
      onCancel={onClose}
      footer={
        <div className="shop-section-modal__footer-actions">
          <ShopSecondaryButton htmlType="button" onClick={onClose}>
            取消
          </ShopSecondaryButton>
          <ShopPrimaryButton htmlType="button" disabled={confirmDisabled} onClick={handleConfirm}>
            添加变量
          </ShopPrimaryButton>
        </div>
      }
    >
      <div className="text-body-var-pill-modal payload-slot-source-modal">
        <p className="text-body-var-pill-modal__hint">
          先按类型筛选，再选择内置数据结构；标识与列定义由系统固定，预览数据仅用于编辑器试看。
        </p>

        {loading ? (
          <p className="text-body-var-pill-modal__empty">正在加载内置变量结构…</p>
        ) : loadError ? (
          <p className="text-body-var-pill-modal__empty" role="alert">
            加载失败：{loadError}
          </p>
        ) : structures.length === 0 ? (
          <p className="text-body-var-pill-modal__empty">暂无可用内置变量结构。</p>
        ) : (
          <>
            <Field label="变量类型">
              <ShopSegmented<StructureValueTier>
                value={activeTier}
                options={STRUCTURE_TIER_TABS.map((tab) => ({
                  value: tab.id,
                  disabled: tierCounts[tab.id] === 0,
                  label: (
                    <span className="payload-slot-source-modal__segment-label">
                      {tab.label}
                      <span className="payload-slot-source-modal__segment-badge">{tierCounts[tab.id]}</span>
                    </span>
                  ),
                }))}
                onChange={handleTierChange}
              />
            </Field>

            {activeTierMeta ? (
              <p className="payload-slot-source-modal__tier-hint">{activeTierMeta.hint}</p>
            ) : null}

            <Field label="选择结构" className="inspector-field--modal-table">
              <p className="text-body-var-pill-modal__hint">
                在下方表格中单选一条内置结构后点「添加变量」。
              </p>
              <SelectablePickerTable
                ariaLabel={`内置变量结构 · ${activeTierMeta?.label ?? ""}`}
                rowKey={(structure) => structure.structureId}
                selectedKey={selectedStructureId}
                onSelect={(structureId) => {
                  setSelectedStructureId(structureId);
                  setFormError("");
                }}
                radioName="builtin-variable-structure"
                dataSource={filteredStructures}
                maxBodyHeight="min(50vh, 440px)"
                emptyText={
                  <p className="text-body-var-pill-modal__empty">{TIER_EMPTY_MESSAGE}</p>
                }
                columns={[
                  {
                    key: "label",
                    title: "名称",
                    render: (structure) => structure.label,
                  },
                  {
                    key: "id",
                    title: "标识",
                    render: (structure) => (
                      <code className="selectable-picker-table__mono">
                        {structure.defaultSlotId}
                      </code>
                    ),
                  },
                  {
                    key: "scope",
                    title: "范围",
                    width: 150,
                    render: structureScopeLabel,
                  },
                  {
                    key: "rows",
                    title: "结构摘要",
                    width: 108,
                    align: "right",
                    render: previewRowLabel,
                  },
                ]}
              />
            </Field>

            {selected ? (
              <p className="payload-slot-source-modal__selection" role="status">
                已选：<strong>{selected.label}</strong>
                <span className="payload-slot-source-modal__selection-meta">
                  {selected.defaultSlotId} · {payloadSlotValueTypeLabel(selected.valueType)} ·{" "}
                  {structureScopeLabel(selected)}
                </span>
              </p>
            ) : null}
          </>
        )}

        {formError ? (
          <p className="text-body-inline-var-modal__error" role="alert">
            {formError}
          </p>
        ) : null}
      </div>
    </ShopSectionModal>
  );
}
