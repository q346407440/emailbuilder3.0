export type PipelineStageEvent = {
  pipelineRunId: string;
  stage: string;
  schemaVersion?: string;
  emailKey: string;
  layoutVariantId: string;
  sectionId?: string;
  model?: string;
  /** 遥测型事件的开始时间；信息型(message/detail)事件可省略。 */
  startedAt?: string;
  durationMs?: number;
  tokenUsage?: { prompt: number; completion: number };
  errorCode?: string;
  /** 信息型阶段事件的可读消息（非遥测必填）。 */
  message?: string;
  /** 信息型阶段事件的结构化附加数据。 */
  detail?: unknown;
};

/** 管线结构化日志端口。 */
export type PipelineLogger = {
  logStageEvent(event: PipelineStageEvent): void;
};

export function createConsolePipelineLogger(): PipelineLogger {
  return {
    logStageEvent(event) {
      console.info("[ai-pipeline]", JSON.stringify(event));
    },
  };
}
