import { useState } from "react";
import type { EmailPayload, EmailTemplate } from "../types/email";
import { collectPayloadVariableSlots } from "../lib/payloadSlots";
import { payloadSlotValueTypeLabel } from "../payload-contract/value-type-labels";
import { PayloadSlotSourceModal } from "./PayloadSlotSourceModal";
import { createPayloadSlotFromBuiltinStructure } from "../lib/createPayloadSlot";
import { toastError } from "../lib/appToast";
import {
  builtinStructureScopeLabel,
  getPayloadSlotBuiltinStructure,
} from "../lib/builtinStructureSlot";

type Props = {
  template: EmailTemplate;
  payload: EmailPayload;
  selectedSlotId: string | null;
  onSelectSlot: (slotId: string) => void;
  onPayloadChange: (next: EmailPayload) => void;
  /** 新建变量：先写入 payload.json，成功后再更新编辑器（失败则 UI 不变） */
  onVariableCreated?: (args: { payload: EmailPayload; slotId: string }) => void | Promise<void>;
  onCollectionSlotCreated?: (slotId: string) => void;
  getSlotError?: (slotId: string) => string | undefined;
  getSlotWarning?: (slotId: string) => string | undefined;
};

function slotTypeLabel(valueType: string): string {
  return payloadSlotValueTypeLabel(valueType);
}

function slotMeta(
  slot: ReturnType<typeof collectPayloadVariableSlots>[number],
  payload: EmailPayload
): string {
  const type = slotTypeLabel(slot.valueType);
  const structureLabel = builtinStructureScopeLabel(
    getPayloadSlotBuiltinStructure(payload.slots[slot.slotId])
  );
  if (slot.valueType === "object") {
    const fieldCount = slot.objectFields?.length ?? 0;
    return `${type} · ${structureLabel} · ${fieldCount} 个字段`;
  }
  if (slot.valueType === "collection") {
    const count =
      slot.minItems !== undefined && slot.maxItems !== undefined && slot.minItems === slot.maxItems
        ? `${slot.maxItems} 项`
        : slot.maxItems !== undefined
          ? `最多 ${slot.maxItems} 项`
          : "列表";
    return `${type} · ${structureLabel} · ${count}`;
  }
  return `${type} · ${structureLabel} · ${slot.bindings.length} 处`;
}

export function PayloadPanel({
  template,
  payload,
  selectedSlotId,
  onSelectSlot,
  onPayloadChange,
  onVariableCreated,
  onCollectionSlotCreated,
  getSlotError,
  getSlotWarning,
}: Props) {
  const [sourceModalOpen, setSourceModalOpen] = useState(false);

  const slots = collectPayloadVariableSlots(template, payload);
  const activeSlotId = selectedSlotId ?? slots[0]?.slotId ?? null;

  async function commitNewVariable(nextPayload: EmailPayload, slotId: string) {
    setSourceModalOpen(false);
    try {
      if (onVariableCreated) {
        await onVariableCreated({ payload: nextPayload, slotId });
      } else {
        onPayloadChange(nextPayload);
        onSelectSlot(slotId);
      }
      if (
        nextPayload.slots[slotId]?.valueType === "collection" ||
        nextPayload.slots[slotId]?.valueType === "object"
      ) {
        onCollectionSlotCreated?.(slotId);
      }
    } catch (e) {
      toastError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <>
      <aside className="block-tree payload-panel" aria-label="变量赋值">
        <div className="block-tree__title payload-panel__title">
          <span>变量赋值</span>
          <span className="payload-panel__title-count" aria-label={`共 ${slots.length} 个`}>
            {slots.length} 个
          </span>
        </div>

        <div className="block-tree__scroll payload-panel__scroll">
          <div className="payload-panel__section">
            <div className="theme-panel__group-head">
              <h3 className="theme-panel__group-title">变量列表</h3>
              <div className="resource-text-actions" role="group" aria-label="添加变量">
                <button
                  type="button"
                  className="resource-text-action"
                  onClick={() => setSourceModalOpen(true)}
                >
                  添加变量
                </button>
              </div>
            </div>

            {slots.length === 0 ? (
              <p className="payload-panel__empty">暂无变量，请点击添加变量。</p>
            ) : (
              <ul className="theme-panel__option-list sidebar-nav-list">
                {slots.map((slot) => {
                  const selected = slot.slotId === activeSlotId;
                  const title = slot.label ?? slot.slotId;
                  const slotErr = getSlotError?.(slot.slotId);
                  const slotWarn = !slotErr ? getSlotWarning?.(slot.slotId) : undefined;
                  const metaParts = [slotMeta(slot, payload)];
                  return (
                    <li key={slot.slotId}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        className={`theme-panel__option ${selected ? "theme-panel__option--active" : ""} ${
                          slotErr
                            ? "theme-panel__option--validation-error"
                            : slotWarn
                              ? "theme-panel__option--validation-warn"
                              : ""
                        }`.trim()}
                        title={slotErr ?? slotWarn}
                        onClick={() => onSelectSlot(slot.slotId)}
                      >
                        <span className="theme-panel__option-title">{title}</span>
                        <span className="theme-panel__option-meta">{metaParts.join(" · ")}</span>
                        <span className="payload-panel__slot-key">{slot.slotId}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </aside>

      {sourceModalOpen ? (
        <PayloadSlotSourceModal
          visible
          payload={payload}
          onClose={() => setSourceModalOpen(false)}
          onBuiltinStructureConfirm={({ structureId }) => {
            const result = createPayloadSlotFromBuiltinStructure(payload, structureId);
            if ("error" in result) {
              toastError(result.error);
              return;
            }
            void commitNewVariable(result.payload, result.slotId);
          }}
        />
      ) : null}
    </>
  );
}
