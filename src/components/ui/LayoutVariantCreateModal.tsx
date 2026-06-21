import { useEffect, useMemo, useState } from "react";
import { Alert, Radio, Segmented, Spin, Tag, Upload } from "antd";
import type { UploadProps } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import * as api from "../../api/client";
import type { AiStepUiState } from "../../layout-variant-ai-contract/progress";
import type { LayoutVariantAiFromImagePipeline } from "../../layout-variant-ai-contract/aiFromImagePipeline";
import type {
  LlmProfileOptionsPayload,
  LlmProfileSelection,
} from "../../layout-variant-ai-contract/llmProfileCatalog";
import { coerceLlmProfileSelection, llmModelProfileKey } from "../../layout-variant-ai-contract/llmProfileCatalog";
import {
  LAYOUT_VARIANT_AI_IMAGE_MAX_BYTES,
  LAYOUT_VARIANT_AI_IMAGE_MIME_TYPES,
} from "../../layout-variant-ai-contract/constants";
import { LayoutVariantAiStepList } from "./LayoutVariantAiStepList";
import {
  LayoutVariantCreateLockedSummary,
  pipelineTitleFor,
} from "./LayoutVariantCreateLockedSummary";
import { LayoutVariantLlmProfileFields } from "./LayoutVariantLlmProfileFields";
import { Field } from "./Field";
import { ShopInput, ShopPrimaryButton, ShopSecondaryButton } from "./ShopFormControls";
import { ShopSectionModal } from "./ShopSectionModal";

export type LayoutVariantCreateModalMode = "create" | "copy";

export type LayoutVariantCreateBlankSubmit = {
  kind: "blank";
  label: string;
};

export type LayoutVariantCreateAiSubmit = {
  kind: "ai";
  label: string;
  imageFile: File;
  pipeline: LayoutVariantAiFromImagePipeline;
  llmProfile: LlmProfileSelection;
};

export type LayoutVariantCreateCopySubmit = {
  kind: "copy";
  label: string;
};

export type LayoutVariantCreateSubmit =
  | LayoutVariantCreateBlankSubmit
  | LayoutVariantCreateAiSubmit
  | LayoutVariantCreateCopySubmit;

type LayoutVariantCreateModalProps = {
  visible: boolean;
  mode: LayoutVariantCreateModalMode;
  /** 复制模式下展示源版式名称 */
  copySourceLabel?: string;
  busy?: boolean;
  /** 以图 AI 创建时的分步进度 */
  aiPipelineSteps?: AiStepUiState[] | null;
  onCancel: () => void;
  onSubmit: (payload: LayoutVariantCreateSubmit) => Promise<void>;
};

type CreateMode = "blank" | "ai";

const AI_MIME_SET = new Set<string>(LAYOUT_VARIANT_AI_IMAGE_MIME_TYPES);

const PIPELINE_HINT: Record<
  LayoutVariantAiFromImagePipeline,
  { title: string; description: string }
> = {
  "mjs-patch": {
    title: "方案 1 · patch（暂留）",
    description:
      "底稿 patch 管线已下线，此选项暂留供未来试验其它方案；当前请使用方案 2 · RestoreAst。",
  },
  "restore-ast": {
    title: "方案 2 · RestoreAst",
    description:
      "输出 RestoreAst 语义结构，搜索素材并由组装器生成版式；共 3 步，任一步失败即终止（不重试）。日志保存在 logs/restore-ast-*。",
  },
};

function validateClientDesignImage(file: File): string | null {
  if (!AI_MIME_SET.has(file.type)) {
    return "仅支持 JPG、PNG、WebP 格式的设计图";
  }
  if (file.size > LAYOUT_VARIANT_AI_IMAGE_MAX_BYTES) {
    return "设计图不能超过 10MB";
  }
  return null;
}

function copyModeNote(): string {
  return "将复制源版式的结构与样式预设；内容数据仍共用当前邮件模板。新版式为未发布状态。";
}

export function LayoutVariantCreateModal({
  visible,
  mode,
  copySourceLabel,
  busy,
  aiPipelineSteps,
  onCancel,
  onSubmit,
}: LayoutVariantCreateModalProps) {
  const [draftName, setDraftName] = useState("");
  const [createMode, setCreateMode] = useState<CreateMode>("ai");
  const [aiPipeline, setAiPipeline] = useState<LayoutVariantAiFromImagePipeline>("restore-ast");
  const [llmOptions, setLlmOptions] = useState<LlmProfileOptionsPayload | null>(null);
  const [llmProfile, setLlmProfile] = useState<LlmProfileSelection | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    if (mode === "copy" && copySourceLabel?.trim()) {
      setDraftName(`${copySourceLabel.trim()} 副本`);
    } else {
      setDraftName("");
    }
    setCreateMode(mode !== "copy" ? "ai" : "blank");
    setAiPipeline("restore-ast");
    setImageFile(null);
    setImagePreviewUrl(null);
    setDraftError(null);
    setLlmOptions(null);
    setLlmProfile(null);

    if (mode !== "copy") {
      void api.fetchAiPipelineLlmOptions().then((payload) => {
        setLlmOptions(payload);
        setLlmProfile(payload.defaults);
      }).catch(() => {
        setLlmOptions(null);
        setLlmProfile(null);
      });
    }
  }, [visible, mode, copySourceLabel]);

  useEffect(() => {
    if (!imagePreviewUrl) return;
    return () => URL.revokeObjectURL(imagePreviewUrl);
  }, [imagePreviewUrl]);

  const close = () => {
    if (busy) return;
    onCancel();
  };

  const pickImageFile = (file: File | null) => {
    if (!file) {
      setImageFile(null);
      setImagePreviewUrl(null);
      return;
    }
    const issue = validateClientDesignImage(file);
    if (issue) {
      setDraftError(issue);
      setImageFile(null);
      setImagePreviewUrl(null);
      return;
    }
    setDraftError(null);
    setImageFile(file);
    setImagePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };

  const uploadProps: UploadProps = useMemo(
    () => ({
      accept: LAYOUT_VARIANT_AI_IMAGE_MIME_TYPES.join(","),
      disabled: busy,
      showUploadList: false,
      multiple: false,
      beforeUpload: (file) => {
        pickImageFile(file);
        return false;
      },
    }),
    [busy]
  );

  const submit = async () => {
    const normalized = draftName.trim();
    if (!normalized) {
      setDraftError("版式名称不能为空");
      return;
    }
    if (mode === "create" && createMode === "ai") {
      if (!imageFile) {
        setDraftError("请上传设计图");
        return;
      }
      const issue = validateClientDesignImage(imageFile);
      if (issue) {
        setDraftError(issue);
        return;
      }
      if (!llmProfile?.model) {
        setDraftError("请选择可用的 LLM 模型配置");
        return;
      }
    }
    setDraftError(null);
    try {
      if (mode === "copy") {
        await onSubmit({ kind: "copy", label: normalized });
      } else if (createMode === "ai" && imageFile && llmProfile) {
        await onSubmit({
          kind: "ai",
          label: normalized,
          imageFile,
          pipeline: aiPipeline,
          llmProfile: coerceLlmProfileSelection(
            llmProfile.vendor,
            llmProfile.model,
            llmProfile.thinking
          ),
        });
      } else {
        await onSubmit({ kind: "blank", label: normalized });
      }
    } catch (e) {
      const fallback =
        mode === "copy"
          ? "复制失败，请稍后重试"
          : createMode === "ai"
            ? "生成失败，请稍后重试"
            : "创建失败，请稍后重试";
      setDraftError(e instanceof Error ? e.message : fallback);
    }
  };

  if (!visible) return null;

  const isCopy = mode === "copy";
  const aiMode = !isCopy && createMode === "ai";
  const isGenerating = aiMode && Boolean(busy);
  const hasProgressSteps = Boolean(aiPipelineSteps && aiPipelineSteps.length > 0);
  const showProgressPanel = isGenerating;
  const mjsPatchReserved = aiPipeline === "mjs-patch";
  const canSubmit =
    !busy &&
    (!aiMode || (Boolean(imageFile) && Boolean(llmProfile?.model) && !mjsPatchReserved));
  const pipelineHint = PIPELINE_HINT[aiPipeline];

  const vendorLabel =
    llmOptions?.vendors.find((vendor) => vendor.id === llmProfile?.vendor)?.label ??
    llmProfile?.vendor ??
    "";
  const modelLabel =
    llmOptions?.modelsByVendor[llmProfile?.vendor ?? "doubao"]?.find(
      (model) => model.id === llmProfile?.model
    )?.label ?? llmProfile?.model ?? "";
  const thinkingLabel =
    llmProfile && llmOptions
      ? (llmOptions.thinkingByModelKey[
          llmModelProfileKey(llmProfile.vendor, llmProfile.model)
        ]?.find((opt) => opt.value === llmProfile.thinking)?.label ?? llmProfile.thinking)
      : "";

  const modalWrapClass = [
    "shop-section-modal-wrap",
    "layout-variant-create-modal-wrap",
    aiMode ? "layout-variant-create-modal-wrap--ai" : "",
    showProgressPanel ? "layout-variant-create-modal-wrap--generating" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <ShopSectionModal
      visible
      title={isCopy ? "复制版式" : "新版式"}
      onCancel={close}
      maskClosable={!busy}
      closable={!busy}
      destroyOnClose
      zIndex={busy ? 1000 : undefined}
      wrapClassName={modalWrapClass}
      footer={
        <div className="shop-section-modal__footer-actions">
          <ShopSecondaryButton onClick={close} disabled={busy}>
            取消
          </ShopSecondaryButton>
          <ShopPrimaryButton onClick={() => void submit()} loading={busy} disabled={!canSubmit}>
            {isCopy ? "复制" : aiMode ? "开始生成" : "创建"}
          </ShopPrimaryButton>
        </div>
      }
    >
      <div
        className={[
          "layout-variant-create-modal",
          busy ? "layout-variant-create-modal--busy" : "",
          showProgressPanel ? "layout-variant-create-modal--generating" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {isCopy && copySourceLabel ? (
          <Alert
            type="info"
            showIcon
            className="layout-variant-create-modal__copy-alert"
            title={
              <>
                源版式：<strong>{copySourceLabel}</strong>
              </>
            }
            description={copyModeNote()}
          />
        ) : null}

        <div className="layout-variant-create-modal__row layout-variant-create-modal__row--name-mode">
          <Field
            label="版式名称"
            className="layout-variant-create-modal__field-grow"
            error={draftError === "版式名称不能为空" ? draftError : undefined}
          >
            <ShopInput
              autoFocus
              value={draftName}
              maxLength={80}
              disabled={busy}
              status={draftError === "版式名称不能为空" ? "error" : undefined}
              placeholder={isCopy ? "请输入新版式名称" : "例如：居中流式版式"}
              onChange={(e) => {
                setDraftName(e.target.value);
                if (draftError === "版式名称不能为空") setDraftError(null);
              }}
              onPressEnter={() => canSubmit && void submit()}
            />
          </Field>

          {!isCopy ? (
            <Field label="创建方式" className="layout-variant-create-modal__field-mode">
              <Segmented<CreateMode>
                block
                disabled={busy}
                value={createMode}
                options={[
                  { label: "空白", value: "blank" },
                  {
                    label: (
                      <span className="layout-variant-create-modal__ai-segment-label">
                        以图创建
                        <Tag color="processing" className="layout-variant-create-modal__ai-tag">
                          AI
                        </Tag>
                      </span>
                    ),
                    value: "ai",
                  },
                ]}
                onChange={(next) => {
                  setCreateMode(next);
                  setDraftError(null);
                }}
              />
            </Field>
          ) : null}
        </div>

        {!isCopy && createMode === "blank" ? (
          <Alert type="info" showIcon title="将创建空白画布与默认样式预设。新版式为未发布状态。" />
        ) : null}

        {aiMode ? (
          <div
            className={[
              "layout-variant-create-modal__split",
              showProgressPanel ? "layout-variant-create-modal__split--generating" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div className="layout-variant-create-modal__split-main">
              {showProgressPanel && llmProfile ? (
                <LayoutVariantCreateLockedSummary
                  layoutName={draftName.trim() || "（未命名）"}
                  pipelineTitle={pipelineTitleFor(aiPipeline)}
                  llmProfile={llmProfile}
                  vendorLabel={vendorLabel}
                  modelLabel={modelLabel}
                  thinkingLabel={thinkingLabel}
                  imagePreviewUrl={imagePreviewUrl}
                  imageFileName={imageFile?.name ?? null}
                />
              ) : (
                <>
                  <Field label="AI 方案">
                    <div className="layout-variant-create-modal__scheme-block">
                      <Radio.Group
                        optionType="button"
                        className="layout-variant-create-modal__scheme-buttons"
                        value={aiPipeline}
                        disabled={busy}
                        onChange={(e) =>
                          setAiPipeline(e.target.value as LayoutVariantAiFromImagePipeline)
                        }
                      >
                        <Radio.Button value="mjs-patch">方案 1 · patch（暂留）</Radio.Button>
                        <Radio.Button value="restore-ast">方案 2 · RestoreAst</Radio.Button>
                      </Radio.Group>
                      <p className="layout-variant-create-modal__pipeline-hint">
                        {pipelineHint.description}
                      </p>
                    </div>
                  </Field>

                  {llmProfile && !mjsPatchReserved ? (
                    <div className="layout-variant-create-modal__panel">
                      <h3 className="layout-variant-create-modal__panel-title">模型配置</h3>
                      <LayoutVariantLlmProfileFields
                        options={llmOptions}
                        value={llmProfile}
                        disabled={busy}
                        onChange={setLlmProfile}
                      />
                    </div>
                  ) : null}
                </>
              )}
            </div>

            <div className="layout-variant-create-modal__split-side">
              {showProgressPanel ? (
                <section className="layout-variant-create-modal__progress" aria-live="polite">
                  <h3 className="layout-variant-create-modal__progress-title">生成进度</h3>
                  {hasProgressSteps ? (
                    <LayoutVariantAiStepList steps={aiPipelineSteps!} />
                  ) : (
                    <div className="layout-variant-create-modal__progress-wait">
                      <Spin size="small" />
                      <span>正在启动生成流程…</span>
                    </div>
                  )}
                </section>
              ) : (
                <Field
                  label="设计图"
                  error={
                    draftError === "请上传设计图" || draftError?.includes("设计图")
                      ? draftError
                      : undefined
                  }
                >
                  <Upload.Dragger
                    {...uploadProps}
                    className={`layout-variant-create-modal__dragger${imagePreviewUrl ? " layout-variant-create-modal__dragger--filled" : ""}`}
                  >
                    {imagePreviewUrl ? (
                      <div className="layout-variant-create-modal__dragger-preview">
                        <img src={imagePreviewUrl} alt="设计图预览" />
                        <p className="layout-variant-create-modal__dragger-hint">
                          {imageFile?.name ?? "已选择设计图"} · 点击或拖拽可更换
                        </p>
                      </div>
                    ) : (
                      <>
                        <p className="ant-upload-drag-icon">
                          <InboxOutlined />
                        </p>
                        <p className="ant-upload-text">点击或拖拽设计图到此处</p>
                        <p className="ant-upload-hint">JPG · PNG · WebP · ≤10MB</p>
                      </>
                    )}
                  </Upload.Dragger>
                </Field>
              )}
            </div>
          </div>
        ) : null}

        {draftError &&
        draftError !== "版式名称不能为空" &&
        !draftError.includes("设计图") ? (
          <Alert type="error" showIcon title={draftError} role="alert" />
        ) : null}
      </div>
    </ShopSectionModal>
  );
}
