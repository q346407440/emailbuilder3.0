import { useState } from "react";
import type { EmailPayload, EmailTemplate } from "../types/email";
import { collectPayloadVariableSlots } from "../lib/payloadSlots";
import { payloadSlotValueTypeLabel } from "../payload-contract/value-type-labels";
import { CreatePayloadSlotModal, type CreatePayloadSlotModalMode } from "./CreatePayloadSlotModal";
import { ShopSecondaryButton } from "./ui/ShopFormControls";

type Props = {
  template: EmailTemplate;
  payload: EmailPayload;
  selectedSlotId: string | null;
  onSelectSlot: (slotId: string) => void;
  onPayloadChange: (next: EmailPayload) => void;
  onCollectionSlotCreated?: (slotId: string) => void;
};

function slotTypeLabel(valueType: string): string {
  return payloadSlotValueTypeLabel(valueType);
}

function slotMeta(slot: ReturnType<typeof collectPayloadVariableSlots>[number]): string {
  const type = slotTypeLabel(slot.valueType);
  if (slot.valueType === "collection") {
    const count =
      slot.minItems !== undefined && slot.maxItems !== undefined && slot.minItems === slot.maxItems
        ? `${slot.maxItems} 项`
        : slot.maxItems !== undefined
          ? `最多 ${slot.maxItems} 项`
          : "列表";
    return `${type} · ${count}`;
  }
  return `${type} · 绑定 ${slot.bindings.length} 处`;
}

export function PayloadPanel({
  template,
  payload,
  selectedSlotId,
  onSelectSlot,
  onPayloadChange,
  onCollectionSlotCreated,
}: Props) {
  const [createModalMode, setCreateModalMode] = useState<CreatePayloadSlotModalMode | null>(null);

  const slots = collectPayloadVariableSlots(template, payload);
  const activeSlotId = selectedSlotId ?? slots[0]?.slotId ?? null;

  const handleCreateConfirm = ({ slotId, payload: nextPayload }: { slotId: string; payload: EmailPayload }) => {
    const wasCollection = createModalMode === "collection";
    onPayloadChange(nextPayload);
    onSelectSlot(slotId);
    setCreateModalMode(null);
    if (wasCollection) onCollectionSlotCreated?.(slotId);
  };

  return (
    <>
      <aside className="theme-panel theme-sidebar payload-panel">
        <header className="theme-panel__header">
          <div className="theme-panel__title-row">
            <h2 className="side-panel__title">变量赋值</h2>
            <span
              className="theme-panel__slot-count"
              aria-label={`共 ${slots.length} 个可外部赋值变量`}
            >
              {slots.length} 个
            </span>
          </div>
          <p className="theme-panel__header-hint">变量目录以 payload.slots 为准；绑定位置由当前版式模板决定。</p>
          <div className="payload-panel__create-actions theme-panel__actions">
            <ShopSecondaryButton
              htmlType="button"
              className="payload-panel__create-btn"
              onClick={() => setCreateModalMode("scalar")}
            >
              创建标准变量
            </ShopSecondaryButton>
            <ShopSecondaryButton
              htmlType="button"
              className="payload-panel__create-btn"
              onClick={() => setCreateModalMode("collection")}
            >
              创建列表变量
            </ShopSecondaryButton>
          </div>
        </header>

        <div className="theme-panel__body theme-panel__side-nav">
          <div className="theme-panel__group">
            <h3 className="theme-panel__group-title">变量列表</h3>
            {slots.length === 0 ? (
              <p className="theme-panel__group-empty">payload.slots 中暂无变量目录项。</p>
            ) : (
              <ul className="theme-panel__option-list">
                {slots.map((slot) => {
                  const selected = slot.slotId === activeSlotId;
                  const title = slot.label ?? slot.slotId;
                  return (
                    <li key={slot.slotId}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        className={`theme-panel__option ${selected ? "theme-panel__option--active" : ""}`}
                        onClick={() => onSelectSlot(slot.slotId)}
                      >
                        <span className="theme-panel__option-title">{title}</span>
                        <span className="theme-panel__option-meta">{slotMeta(slot)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </aside>

      {createModalMode ? (
        <CreatePayloadSlotModal
          mode={createModalMode}
          visible
          payload={payload}
          onClose={() => setCreateModalMode(null)}
          onConfirm={handleCreateConfirm}
        />
      ) : null}
    </>
  );
}
