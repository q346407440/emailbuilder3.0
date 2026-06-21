import type { LayoutVariantAiFromImagePipeline } from "../../layout-variant-ai-contract/aiFromImagePipeline";
import type { LlmProfileSelection } from "../../layout-variant-ai-contract/llmProfileCatalog";

type LayoutVariantCreateLockedSummaryProps = {
  layoutName: string;
  pipelineTitle: string;
  llmProfile: LlmProfileSelection;
  vendorLabel: string;
  modelLabel: string;
  thinkingLabel?: string;
  imagePreviewUrl: string | null;
  imageFileName: string | null;
};

/** 生成进行中：左侧只读配置摘要（避免与右侧进度纵向叠高）。 */
export function LayoutVariantCreateLockedSummary({
  layoutName,
  pipelineTitle,
  llmProfile,
  vendorLabel,
  modelLabel,
  thinkingLabel,
  imagePreviewUrl,
  imageFileName,
}: LayoutVariantCreateLockedSummaryProps) {
  return (
    <div className="layout-variant-create-modal__locked-summary">
      <dl className="layout-variant-create-modal__locked-list">
        <div className="layout-variant-create-modal__locked-row">
          <dt>版式名称</dt>
          <dd>{layoutName}</dd>
        </div>
        <div className="layout-variant-create-modal__locked-row">
          <dt>AI 方案</dt>
          <dd>{pipelineTitle}</dd>
        </div>
        <div className="layout-variant-create-modal__locked-row">
          <dt>模型</dt>
          <dd>
            {vendorLabel} · {modelLabel || llmProfile.model}
          </dd>
        </div>
        {thinkingLabel ? (
          <div className="layout-variant-create-modal__locked-row">
            <dt>Thinking</dt>
            <dd>{thinkingLabel}</dd>
          </div>
        ) : null}
      </dl>
      {imagePreviewUrl ? (
        <figure className="layout-variant-create-modal__locked-thumb">
          <img src={imagePreviewUrl} alt="设计图预览" />
          {imageFileName ? (
            <figcaption className="layout-variant-create-modal__locked-thumb-name">{imageFileName}</figcaption>
          ) : null}
        </figure>
      ) : null}
    </div>
  );
}

export function pipelineTitleFor(
  pipeline: LayoutVariantAiFromImagePipeline
): string {
  return pipeline === "restore-ast" ? "方案 2 · RestoreAst" : "方案 1 · patch（暂留）";
}
