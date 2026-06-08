export type PipelineStageEvent = {
  pipelineRunId: string;
  stage: string;
  schemaVersion?: string;
  emailKey: string;
  layoutVariantId: string;
  sectionId?: string;
  model?: string;
  startedAt: string;
  durationMs?: number;
  tokenUsage?: { prompt: number; completion: number };
  errorCode?: string;
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
