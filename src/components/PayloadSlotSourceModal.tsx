import { useEffect, useState } from "react";
import type { EmailPayload } from "../types/email";
import type { CreatePayloadSlotModalMode } from "./CreatePayloadSlotModal";
import {
  listSceneCollectionPresets,
  type SceneCollectionPresetSummary,
} from "../api/sceneCollectionPresets";
import {
  listSceneScalarPresets,
  type SceneScalarPresetSummary,
} from "../api/sceneScalarPresets";
import {
  createCollectionPayloadSlot,
  createScalarPayloadSlot,
  validateNewPayloadSlotFields,
} from "../lib/createPayloadSlot";
import type { StandardScalarValueType } from "../payload-contract/standard-scalar-types";
import { payloadSlotValueTypeLabel } from "../payload-contract/value-type-labels";
import {
  getPayloadVariableScene,
  PAYLOAD_VARIABLE_SCENE_OPTIONS,
  payloadVariableSceneLabel,
  setPayloadVariableScene,
  type PayloadVariableScene,
} from "../lib/payloadVariableScene";
import { StandardScalarValueTypeSelect } from "./StandardScalarValueTypeSelect";
import { ShopInput, ShopPrimaryButton, ShopSecondaryButton, ShopSelect } from "./ui/ShopFormControls";
import { ModalFormField } from "./ui/ModalFormField";
import { SelectablePickerTable } from "./ui/SelectablePickerTable";
import { ShopSectionModal } from "./ui/ShopSectionModal";

type PayloadSlotSourceModalProps = {
  visible: boolean;
  mode: CreatePayloadSlotModalMode;
  payload: EmailPayload;
  initialScene?: PayloadVariableScene;
  onClose: () => void;
  onCustomConfirm: (args: { slotId: string; payload: EmailPayload }) => void;
  onSceneSaved: (scene: PayloadVariableScene) => void;
  onScenePresetConfirm?: (args: { scene: PayloadVariableScene; presetId: string }) => void;
  /** 内置标准变量预设接入后由父组件处理创建 */
  onSceneScalarPresetConfirm?: (args: { scene: PayloadVariableScene; presetId: string }) => void;
};

export function PayloadSlotSourceModal({
  visible,
  mode,
  payload,
  initialScene,
  onClose,
  onCustomConfirm,
  onSceneSaved,
  onScenePresetConfirm,
  onSceneScalarPresetConfirm,
}: PayloadSlotSourceModalProps) {
  const [sourceMode, setSourceMode] = useState<"custom" | "scene">("scene");
  const [sceneDraft, setSceneDraft] = useState<PayloadVariableScene>(getPayloadVariableScene);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [collectionPresets, setCollectionPresets] = useState<SceneCollectionPresetSummary[]>([]);
  const [scalarPresets, setScalarPresets] = useState<SceneScalarPresetSummary[]>([]);
  const [presetsLoading, setPresetsLoading] = useState(false);
  const [presetsLoadError, setPresetsLoadError] = useState<string | null>(null);

  const [labelDraft, setLabelDraft] = useState("");
  const [slotIdDraft, setSlotIdDraft] = useState("");
  const [valueTypeDraft, setValueTypeDraft] = useState<StandardScalarValueType>("string");
  const [initialValueDraft, setInitialValueDraft] = useState("");
  const [labelError, setLabelError] = useState("");
  const [slotIdError, setSlotIdError] = useState("");

  useEffect(() => {
    if (!visible) return;
    setSourceMode("scene");
    setSceneDraft(initialScene ?? getPayloadVariableScene());
    setSelectedPresetId(null);
    setFormError("");
    setCollectionPresets([]);
    setScalarPresets([]);
    setPresetsLoadError(null);
    setLabelDraft("");
    setSlotIdDraft("");
    setValueTypeDraft("string");
    setInitialValueDraft("");
    setLabelError("");
    setSlotIdError("");
  }, [visible, mode, initialScene]);

  useEffect(() => {
    if (!visible || sourceMode !== "scene") {
      setCollectionPresets([]);
      setScalarPresets([]);
      setPresetsLoadError(null);
      setPresetsLoading(false);
      return;
    }
    let cancelled = false;
    setPresetsLoading(true);
    setPresetsLoadError(null);
    const load =
      mode === "collection"
        ? listSceneCollectionPresets(sceneDraft).then((items) => ({ kind: "collection" as const, items }))
        : listSceneScalarPresets(sceneDraft).then((items) => ({ kind: "scalar" as const, items }));

    void load
      .then((result) => {
        if (cancelled) return;
        if (result.kind === "collection") {
          setCollectionPresets(result.items);
          setScalarPresets([]);
          setSelectedPresetId((prev) => {
            if (prev && result.items.some((p) => p.presetId === prev)) return prev;
            return result.items[0]?.presetId ?? null;
          });
        } else {
          setScalarPresets(result.items);
          setCollectionPresets([]);
          setSelectedPresetId((prev) => {
            if (prev && result.items.some((p) => p.presetId === prev)) return prev;
            return result.items[0]?.presetId ?? null;
          });
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setCollectionPresets([]);
        setScalarPresets([]);
        setSelectedPresetId(null);
        setPresetsLoadError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setPresetsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, mode, sourceMode, sceneDraft]);

  const title = mode === "scalar" ? "添加标准变量" : "添加列表变量";
  const scenePresetCount = mode === "collection" ? collectionPresets.length : scalarPresets.length;

  const handleCustomConfirm = () => {
    setFormError("");
    const fieldErrors = validateNewPayloadSlotFields(payload, slotIdDraft, labelDraft);
    setLabelError(fieldErrors.label ?? "");
    setSlotIdError(fieldErrors.slotId ?? "");
    if (fieldErrors.label || fieldErrors.slotId) return;

    const result =
      mode === "scalar"
        ? createScalarPayloadSlot(payload, {
            slotId: slotIdDraft,
            label: labelDraft,
            valueType: valueTypeDraft,
            initialValue: initialValueDraft,
          })
        : createCollectionPayloadSlot(payload, {
            slotId: slotIdDraft,
            label: labelDraft,
          });

    if ("error" in result) {
      if (result.fieldErrors?.label) setLabelError(result.fieldErrors.label);
      if (result.fieldErrors?.slotId) setSlotIdError(result.fieldErrors.slotId);
      setFormError(result.error);
      return;
    }

    onCustomConfirm({ slotId: slotIdDraft.trim(), payload: result.payload });
  };

  const handleConfirm = () => {
    setFormError("");
    if (sourceMode === "custom") {
      handleCustomConfirm();
      return;
    }

    setPayloadVariableScene(sceneDraft);
    onSceneSaved(sceneDraft);

    if (!selectedPresetId) {
      setFormError(
        mode === "collection"
          ? "请选择一个场景内置列表变量。"
          : "请选择一个场景内置标准变量。"
      );
      return;
    }

    if (mode === "collection") {
      if (!onScenePresetConfirm) {
        setFormError("当前无法创建场景列表变量，请使用自定义。");
        return;
      }
      onScenePresetConfirm({ scene: sceneDraft, presetId: selectedPresetId });
      return;
    }

    if (!onSceneScalarPresetConfirm) {
      setFormError("场景内置标准变量尚未接入创建流程，请先用自定义。");
      return;
    }
    onSceneScalarPresetConfirm({ scene: sceneDraft, presetId: selectedPresetId });
  };

  const confirmLabel = sourceMode === "custom" ? "确定" : "创建变量";
  const confirmDisabled =
    sourceMode === "scene" && (presetsLoading || scenePresetCount === 0);

  const customHint =
    mode === "scalar"
      ? "名称与 key 写入 payload.slots；初值可选，写入 payload.values。"
      : "名称与 key 写入 payload.slots；列表字段与数据创建后可在右侧「变量详情」中配置。";

  const sceneHint =
    mode === "collection"
      ? "从接口加载场景内置列表变量，自动写入列定义与预览数据（推荐）。"
      : "从接口加载场景内置标准变量，自动写入变量目录与预览初值（推荐；预设接入后可用）。";

  const sceneEmptyLabel =
    mode === "collection"
      ? `场景「${payloadVariableSceneLabel(sceneDraft)}」暂无内置列表变量预设。`
      : `场景「${payloadVariableSceneLabel(sceneDraft)}」暂无内置标准变量预设，请先用自定义。`;

  const customForm = (
    <div className="payload-slot-source-modal__custom-pane create-payload-slot-modal">
      <p className="text-body-var-pill-modal__hint">{customHint}</p>

      {mode === "scalar" ? (
        <>
          <ModalFormField label="变量类型" htmlFor="payload-slot-source-type">
            <StandardScalarValueTypeSelect
              id="payload-slot-source-type"
              value={valueTypeDraft}
              onChange={setValueTypeDraft}
            />
          </ModalFormField>

          <ModalFormField label="变量初值" htmlFor="payload-slot-source-initial">
            <ShopInput
              id="payload-slot-source-initial"
              value={initialValueDraft}
              type={valueTypeDraft === "number" ? "number" : "text"}
              placeholder={
                valueTypeDraft === "number"
                  ? "可选，例如 100"
                  : valueTypeDraft === "url"
                    ? "可选，例如 https://example.com"
                    : "可选，留空则不写入 payload.values"
              }
              onChange={(e) => {
                setInitialValueDraft(e.target.value);
                if (formError) setFormError("");
              }}
            />
          </ModalFormField>
        </>
      ) : null}

      <ModalFormField
        label="变量名称"
        htmlFor="payload-slot-source-label"
        hint={
          labelError ? (
            <p id="payload-slot-source-label-err" className="text-rich-editor__link-error" role="alert">
              {labelError}
            </p>
          ) : undefined
        }
      >
        <ShopInput
          id="payload-slot-source-label"
          value={labelDraft}
          placeholder="例如：店铺名称"
          aria-invalid={Boolean(labelError)}
          aria-describedby={labelError ? "payload-slot-source-label-err" : undefined}
          onChange={(e) => {
            setLabelDraft(e.target.value);
            if (labelError) setLabelError("");
            if (formError) setFormError("");
          }}
        />
      </ModalFormField>

      <ModalFormField
        label="变量标识（key）"
        htmlFor="payload-slot-source-id"
        hint={
          slotIdError ? (
            <p id="payload-slot-source-id-err" className="text-rich-editor__link-error" role="alert">
              {slotIdError}
            </p>
          ) : (
            <p id="payload-slot-source-id-tip">key 须在 payload.slots 中唯一。</p>
          )
        }
      >
        <ShopInput
          id="payload-slot-source-id"
          value={slotIdDraft}
          placeholder="storeName"
          aria-invalid={Boolean(slotIdError)}
          aria-describedby={slotIdError ? "payload-slot-source-id-err" : "payload-slot-source-id-tip"}
          onChange={(e) => {
            setSlotIdDraft(e.target.value);
            if (slotIdError) setSlotIdError("");
            if (formError) setFormError("");
          }}
        />
      </ModalFormField>
    </div>
  );

  const scenePane = (
    <div className="payload-slot-source-modal__scene-pane">
      <p className="text-body-var-pill-modal__hint">{sceneHint}</p>
      <ModalFormField label="场景" htmlFor="payload-scene-select">
        <ShopSelect
          id="payload-scene-select"
          value={sceneDraft}
          onChange={(next) => {
            setSceneDraft(next as PayloadVariableScene);
            setFormError("");
          }}
        >
          {PAYLOAD_VARIABLE_SCENE_OPTIONS.map((option) => (
            <ShopSelect.Option key={option.value} value={option.value}>
              {option.label}
            </ShopSelect.Option>
          ))}
        </ShopSelect>
      </ModalFormField>

      {presetsLoading ? (
        <p className="text-body-var-pill-modal__empty">
          正在从接口加载内置{mode === "collection" ? "列表" : "标准"}变量…
        </p>
      ) : presetsLoadError ? (
        <p className="text-body-var-pill-modal__empty" role="alert">
          加载失败：{presetsLoadError}
        </p>
      ) : scenePresetCount === 0 ? (
        <p className="text-body-var-pill-modal__empty">{sceneEmptyLabel}</p>
      ) : (
        <>
          <p className="modal-form-field__section-title">
            选择要创建的内置{mode === "collection" ? "列表" : "标准"}变量
          </p>
          <SelectablePickerTable
            ariaLabel={mode === "collection" ? "场景内置列表变量" : "场景内置标准变量"}
            rowKey={(preset) => preset.presetId}
            selectedKey={selectedPresetId}
            onSelect={(presetId) => {
              setSelectedPresetId(presetId);
              setFormError("");
            }}
            radioName={
              mode === "collection" ? "scene-collection-preset" : "scene-scalar-preset"
            }
            dataSource={mode === "collection" ? collectionPresets : scalarPresets}
            columns={
              mode === "collection"
                ? [
                    {
                      key: "label",
                      title: "名称",
                      render: (preset) => preset.label,
                    },
                    {
                      key: "id",
                      title: "标识",
                      render: (preset) => (
                        <code className="selectable-picker-table__mono">{preset.slotId}</code>
                      ),
                    },
                    {
                      key: "meta",
                      title: "预览行数",
                      width: 88,
                      align: "right",
                      render: (preset) => String(preset.seedRowCount),
                    },
                  ]
                : [
                    {
                      key: "label",
                      title: "名称",
                      render: (preset) => preset.label,
                    },
                    {
                      key: "id",
                      title: "标识",
                      render: (preset) => (
                        <code className="selectable-picker-table__mono">{preset.slotId}</code>
                      ),
                    },
                    {
                      key: "meta",
                      title: "类型",
                      width: 88,
                      render: (preset) => payloadSlotValueTypeLabel(preset.valueType),
                    },
                  ]
            }
          />
        </>
      )}
    </div>
  );

  return (
    <ShopSectionModal
      title={title}
      visible={visible}
      centered
      destroyOnClose
      maskClosable={false}
      keyboard
      wrapClassName="text-body-inline-var-modal-wrap text-body-var-pill-modal-wrap"
      onCancel={onClose}
      footer={
        <div className="shop-section-modal__footer-actions">
          <ShopSecondaryButton htmlType="button" onClick={onClose}>
            取消
          </ShopSecondaryButton>
          <ShopPrimaryButton htmlType="button" disabled={confirmDisabled} onClick={handleConfirm}>
            {confirmLabel}
          </ShopPrimaryButton>
        </div>
      }
    >
      <div className="text-body-inline-var-modal payload-slot-source-modal">
        <div className="text-body-inline-var-modal__mode-tabs" role="tablist" aria-label="变量来源选择">
          <button
            type="button"
            role="tab"
            aria-selected={sourceMode === "scene"}
            className={`text-body-inline-var-modal__mode-tab${sourceMode === "scene" ? " text-body-inline-var-modal__mode-tab--active" : ""}`}
            onClick={() => setSourceMode("scene")}
          >
            场景变量
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={sourceMode === "custom"}
            className={`text-body-inline-var-modal__mode-tab${sourceMode === "custom" ? " text-body-inline-var-modal__mode-tab--active" : ""}`}
            onClick={() => setSourceMode("custom")}
          >
            自定义
          </button>
        </div>

        {sourceMode === "custom" ? customForm : scenePane}

        {formError && !labelError && !slotIdError ? (
          <p className="text-body-inline-var-modal__error" role="alert">
            {formError}
          </p>
        ) : null}
      </div>
    </ShopSectionModal>
  );
}
