import { useState } from "react";
import type { EmailPayload, EmailTemplate } from "../types/email";
import { collectPayloadVariableSlots } from "../lib/payloadSlots";
import { payloadSlotValueTypeLabel } from "../payload-contract/value-type-labels";
import type { CreatePayloadSlotModalMode } from "./CreatePayloadSlotModal";
import { PayloadSlotSourceModal } from "./PayloadSlotSourceModal";
import { createCollectionPayloadSlotFromPreset } from "../lib/createPayloadSlot";
import { getSceneCollectionPreset } from "../api/sceneCollectionPresets";
import { getPayloadVariableScene, setPayloadVariableScene } from "../lib/payloadVariableScene";
import { toastError } from "../lib/appToast";

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
  return `${type} · ${slot.bindings.length} 处`;
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
  const [sourceModalMode, setSourceModalMode] = useState<CreatePayloadSlotModalMode | null>(null);

  const slots = collectPayloadVariableSlots(template, payload);
  const activeSlotId = selectedSlotId ?? slots[0]?.slotId ?? null;

  const openCreateFlow = (mode: CreatePayloadSlotModalMode) => {
    setSourceModalMode(mode);
  };

  async function commitNewVariable(nextPayload: EmailPayload, slotId: string, mode: CreatePayloadSlotModalMode) {
    setSourceModalMode(null);
    try {
      if (onVariableCreated) {
        await onVariableCreated({ payload: nextPayload, slotId });
      } else {
        onPayloadChange(nextPayload);
        onSelectSlot(slotId);
      }
      if (mode === "collection") {
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
                  onClick={() => openCreateFlow("collection")}
                >
                  列表变量
                </button>
                <button
                  type="button"
                  className="resource-text-action"
                  onClick={() => openCreateFlow("scalar")}
                >
                  标准变量
                </button>
              </div>
            </div>

            {slots.length === 0 ? (
              <p className="payload-panel__empty">暂无变量，请通过右上角添加。</p>
            ) : (
              <ul className="theme-panel__option-list sidebar-nav-list">
                {slots.map((slot) => {
                  const selected = slot.slotId === activeSlotId;
                  const title = slot.label ?? slot.slotId;
                  const slotErr = getSlotError?.(slot.slotId);
                  const slotWarn = !slotErr ? getSlotWarning?.(slot.slotId) : undefined;
                  const presetManaged = Boolean(
                    payload.slots[slot.slotId]?.sceneCollectionPresetId?.trim()
                  );
                  const metaParts = [slotMeta(slot)];
                  if (presetManaged) metaParts.unshift("场景内置");
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

      {sourceModalMode ? (
        <PayloadSlotSourceModal
          mode={sourceModalMode}
          visible
          payload={payload}
          initialScene={getPayloadVariableScene()}
          onClose={() => setSourceModalMode(null)}
          onCustomConfirm={({ slotId, payload: nextPayload }) => {
            if (!sourceModalMode) return;
            void commitNewVariable(nextPayload, slotId, sourceModalMode);
          }}
          onSceneSaved={(scene) => {
            setPayloadVariableScene(scene);
          }}
          onScenePresetConfirm={({ scene, presetId }) => {
            setSourceModalMode(null);
            void getSceneCollectionPreset(scene, presetId)
              .then((preset) => {
                const result = createCollectionPayloadSlotFromPreset(payload, preset);
                if ("error" in result) {
                  toastError(result.error);
                  return;
                }
                return commitNewVariable(result.payload, result.slotId, "collection");
              })
              .catch((e) => {
                toastError(e instanceof Error ? e.message : String(e));
              });
          }}
        />
      ) : null}
    </>
  );
}
