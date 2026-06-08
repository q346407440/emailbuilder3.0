import { useEffect, useRef, useState } from "react";
import type { AiStepUiState } from "../../layout-variant-ai-contract/progress";
import {
  LAYOUT_VARIANT_AI_IMAGE_MAX_BYTES,
  LAYOUT_VARIANT_AI_IMAGE_MIME_TYPES,
} from "../../layout-variant-ai-contract/constants";
import { LayoutVariantAiStepList } from "./LayoutVariantAiStepList";
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

const AI_MIME_SET = new Set<string>(LAYOUT_VARIANT_AI_IMAGE_MIME_TYPES);

function validateClientDesignImage(file: File): string | null {
  if (!AI_MIME_SET.has(file.type)) {
    return "仅支持 JPG、PNG、WebP 格式的设计图";
  }
  if (file.size > LAYOUT_VARIANT_AI_IMAGE_MAX_BYTES) {
    return "设计图不能超过 10MB";
  }
  return null;
}

function modeNote(isCopy: boolean, aiMode: boolean): string {
  if (isCopy) {
    return "将复制源版式的结构与样式预设；场景变量仍共用当前 payload。新版式为未发布状态。";
  }
  if (aiMode) {
    return "上传设计图后，AI 将自动生成版式结构与样式预设；过程约需 2–8 分钟，校验或脚本执行失败时会自动重试（最多 3 次）。新版式为未发布状态。";
  }
  return "将创建空白画布与默认样式预设。新版式为未发布状态。";
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
  const [useAiFromImage, setUseAiFromImage] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!visible) return;
    if (mode === "copy" && copySourceLabel?.trim()) {
      setDraftName(`${copySourceLabel.trim()} 副本`);
    } else {
      setDraftName("");
    }
    setUseAiFromImage(false);
    setImageFile(null);
    setImagePreviewUrl(null);
    setDraftError(null);
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

  const submit = async () => {
    const normalized = draftName.trim();
    if (!normalized) {
      setDraftError("版式名称不能为空");
      return;
    }
    if (mode === "create" && useAiFromImage) {
      if (!imageFile) {
        setDraftError("请上传设计图");
        return;
      }
      const issue = validateClientDesignImage(imageFile);
      if (issue) {
        setDraftError(issue);
        return;
      }
    }
    setDraftError(null);
    try {
      if (mode === "copy") {
        await onSubmit({ kind: "copy", label: normalized });
      } else if (useAiFromImage && imageFile) {
        await onSubmit({ kind: "ai", label: normalized, imageFile });
      } else {
        await onSubmit({ kind: "blank", label: normalized });
      }
    } catch (e) {
      const fallback =
        mode === "copy" ? "复制失败，请稍后重试" : useAiFromImage ? "生成失败，请稍后重试" : "创建失败，请稍后重试";
      setDraftError(e instanceof Error ? e.message : fallback);
    }
  };

  if (!visible) return null;

  const isCopy = mode === "copy";
  const aiMode = !isCopy && useAiFromImage;
  const canSubmit = !busy && (!aiMode || Boolean(imageFile));
  const showProgress = aiMode && aiPipelineSteps && aiPipelineSteps.length > 0;

  return (
    <ShopSectionModal
      visible
      title={isCopy ? "复制版式结构" : "新建版式结构"}
      onCancel={close}
      maskClosable={!busy}
      closable={!busy}
      destroyOnClose
      zIndex={busy ? 1000 : undefined}
      wrapClassName={`shop-section-modal-wrap layout-variant-create-modal-wrap${aiMode ? " layout-variant-create-modal-wrap--ai" : ""}`}
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
      <div className={`layout-variant-create-modal${busy ? " layout-variant-create-modal--busy" : ""}`}>
        {isCopy && copySourceLabel ? (
          <div className="layout-variant-create-modal__source">
            <span className="layout-variant-create-modal__source-label">源版式</span>
            <span className="layout-variant-create-modal__source-value">{copySourceLabel}</span>
          </div>
        ) : null}

        <Field label="版式名称">
          <ShopInput
            autoFocus
            value={draftName}
            maxLength={80}
            disabled={busy}
            placeholder={isCopy ? "请输入新版式名称" : "例如：居中流式版"}
            onChange={(e) => setDraftName(e.target.value)}
            onPressEnter={() => canSubmit && void submit()}
          />
        </Field>

        {!isCopy ? (
          <Field label="创建方式">
            <div className="layout-variant-create-modal__segment" role="tablist" aria-label="创建方式">
              <button
                type="button"
                role="tab"
                aria-selected={!useAiFromImage}
                disabled={busy}
                className={
                  !useAiFromImage
                    ? "layout-variant-create-modal__segment-item layout-variant-create-modal__segment-item--active"
                    : "layout-variant-create-modal__segment-item"
                }
                onClick={() => {
                  setUseAiFromImage(false);
                  setDraftError(null);
                }}
              >
                空白版式
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={useAiFromImage}
                disabled={busy}
                className={
                  useAiFromImage
                    ? "layout-variant-create-modal__segment-item layout-variant-create-modal__segment-item--active"
                    : "layout-variant-create-modal__segment-item"
                }
                onClick={() => {
                  setUseAiFromImage(true);
                  setDraftError(null);
                }}
              >
                以图创建
                <span className="layout-variant-create-modal__segment-tag">AI</span>
              </button>
            </div>
          </Field>
        ) : null}

        {aiMode ? (
          <Field label="设计图">
            <input
              ref={fileInputRef}
              type="file"
              accept={LAYOUT_VARIANT_AI_IMAGE_MIME_TYPES.join(",")}
              className="layout-variant-create-modal__file-input"
              disabled={busy}
              onChange={(e) => pickImageFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              className={`layout-variant-create-modal__upload${imagePreviewUrl ? " layout-variant-create-modal__upload--filled" : ""}`}
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
            >
              {imagePreviewUrl ? (
                <>
                  <img
                    className="layout-variant-create-modal__upload-preview"
                    src={imagePreviewUrl}
                    alt="设计图预览"
                  />
                  <span className="layout-variant-create-modal__upload-overlay">
                    {imageFile ? "点击更换图片" : "点击上传图片"}
                  </span>
                </>
              ) : (
                <span className="layout-variant-create-modal__upload-empty">
                  <span className="layout-variant-create-modal__upload-title">点击上传设计图</span>
                  <span className="layout-variant-create-modal__upload-meta">JPG · PNG · WebP，单张不超过 10MB</span>
                </span>
              )}
            </button>
          </Field>
        ) : null}

        {showProgress ? (
          <section className="layout-variant-create-modal__progress" aria-live="polite">
            <h3 className="layout-variant-create-modal__progress-title">生成进度</h3>
            <LayoutVariantAiStepList steps={aiPipelineSteps} />
          </section>
        ) : null}

        <p className="topbar__create-hint">{modeNote(isCopy, aiMode)}</p>

        {draftError ? (
          <span className="topbar__rename-error" role="alert">
            {draftError}
          </span>
        ) : null}
      </div>
    </ShopSectionModal>
  );
}
