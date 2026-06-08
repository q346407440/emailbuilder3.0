/** LLM 单步最长执行时间；超时视为该步失败并走重试。 */
export const AI_PIPELINE_STEP_TIMEOUT_MS = 60_000;

/**
 * 流式生成接口的客户端空闲超时（仅作兜底：长时间无任何 SSE 事件则断开）。
 * 正常进度由逐步 SSE 推送，不再使用整单 120s 截断。
 */
export const LAYOUT_VARIANT_AI_FROM_IMAGE_STREAM_IDLE_TIMEOUT_MS = 1_800_000;

/** 设计图上传：允许的图片 MIME（与 server 校验保持一致）。 */
export const LAYOUT_VARIANT_AI_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

/** 设计图上传：单文件最大字节（10MB）。 */
export const LAYOUT_VARIANT_AI_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

/** LLM 单阶段 Parse 失败后的最大重试次数（§6.2）。 */
export const AI_PIPELINE_LLM_MAX_RETRIES = 1;

/** 全局 LLM HTTP 并发上限（含各 stage 与重试，重试优先入队）。 */
export const AI_PIPELINE_LLM_MAX_CONCURRENCY = 5;
