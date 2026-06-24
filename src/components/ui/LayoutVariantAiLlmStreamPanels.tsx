import { useCallback, useLayoutEffect, useRef } from "react";
import type { AiLlmStreamUiState, AiStepUiState } from "../../layout-variant-ai-contract/progress";

const RESTORE_AST_GENERATE_STEP_ID = "RA:GenerateAst";
/** 距底部在此範圍內視為「貼底」，新 chunk 會自動跟隨滾動。 */
const STICK_TO_BOTTOM_THRESHOLD_PX = 32;

type LlmStreamScrollPanelProps = {
  title: string;
  content: string;
};

/** 單一流式預覽窗：內容增長時貼底跟隨；使用者上滑閱讀時暫停跟隨。 */
function LlmStreamScrollPanel({ title, content }: LlmStreamScrollPanelProps) {
  const bodyRef = useRef<HTMLPreElement>(null);
  const stickToBottomRef = useRef(true);
  const prevContentLengthRef = useRef(0);

  const handleScroll = useCallback(() => {
    const el = bodyRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom <= STICK_TO_BOTTOM_THRESHOLD_PX;
  }, []);

  useLayoutEffect(() => {
    if (content.length < prevContentLengthRef.current) {
      stickToBottomRef.current = true;
    }
    prevContentLengthRef.current = content.length;

    const el = bodyRef.current;
    if (!el || !stickToBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [content]);

  return (
    <div className="layout-variant-ai-llm-stream__panel">
      <div className="layout-variant-ai-llm-stream__title">{title}</div>
      <pre ref={bodyRef} className="layout-variant-ai-llm-stream__body" onScroll={handleScroll}>
        {content}
      </pre>
    </div>
  );
}

type LayoutVariantAiLlmStreamPanelsProps = {
  steps: AiStepUiState[];
  stream: AiLlmStreamUiState | null;
};

/** RestoreAst 生成步：think / content 双流式预览窗。 */
export function LayoutVariantAiLlmStreamPanels({
  steps,
  stream,
}: LayoutVariantAiLlmStreamPanelsProps) {
  const generateStep = steps.find((s) => s.id === RESTORE_AST_GENERATE_STEP_ID);
  const generateActive = generateStep?.status === "running";
  if (!generateActive || !stream || stream.stepId !== RESTORE_AST_GENERATE_STEP_ID) {
    return null;
  }

  const showThink = stream.think.length > 0;
  const showContent = stream.content.length > 0;
  if (!showThink && !showContent) {
    return (
      <div className="layout-variant-ai-llm-stream layout-variant-ai-llm-stream--waiting">
        正在等待模型输出…
      </div>
    );
  }

  return (
    <div className="layout-variant-ai-llm-stream">
      {showThink ? <LlmStreamScrollPanel title="推理（think）" content={stream.think} /> : null}
      {showContent ? (
        <LlmStreamScrollPanel title="输出（content）" content={stream.content} />
      ) : null}
    </div>
  );
}
