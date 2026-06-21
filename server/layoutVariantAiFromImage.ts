import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { EmailTemplate } from "../src/types/email";
import type { TokenPresets } from "../src/types/tokenPreset";
import {
  LAYOUT_VARIANT_AI_IMAGE_MAX_BYTES,
  LAYOUT_VARIANT_AI_IMAGE_MIME_TYPES,
} from "../src/layout-variant-ai-contract/constants";
import {
  AiPipelineError,
  isAiPipelineError,
} from "../src/layout-variant-ai-contract/errors";
import {
  MJS_PATCH_PIPELINE_RESERVED_MESSAGE,
  type LayoutVariantAiFromImagePipeline,
} from "../src/layout-variant-ai-contract/aiFromImagePipeline";
import { runRestoreAstFromDesignImage } from "../src/lib/ai-pipeline/restore-ast/runRestoreAstFromDesignImage";
import type { LlmProfileSelection } from "../src/layout-variant-ai-contract/llmProfileCatalog";
import { LlmStageFailure } from "../src/lib/ai-pipeline/llmRetryFeedback";
import type { PipelineProgressReporter } from "../src/lib/ai-pipeline/ports/PipelineProgressReporter";

export type LayoutVariantAiGenerateInput = {
  emailKey: string;
  layoutVariantId: string;
  layoutLabel: string;
  imageBuffer: Buffer;
  mimeType: string;
  emailBaseDir: string;
  pipeline?: LayoutVariantAiFromImagePipeline;
  llmProfile?: LlmProfileSelection;
};

export type LayoutVariantAiGenerateOptions = {
  progress?: PipelineProgressReporter;
};

export type LayoutVariantAiGenerateResult = {
  template: EmailTemplate;
  tokenPresets: TokenPresets;
  logDir?: string;
  pipeline: LayoutVariantAiFromImagePipeline;
  /** 保底交付时未消除的 validate/视觉门问题（全过为空数组） */
  validationIssues: string[];
};

const ALLOWED_MIME = new Set<string>(LAYOUT_VARIANT_AI_IMAGE_MIME_TYPES);

export function validateDesignImageUpload(file: File): string | null {
  if (!ALLOWED_MIME.has(file.type)) {
    return "仅支持 JPG、PNG、WebP 格式的设计图";
  }
  if (file.size > LAYOUT_VARIANT_AI_IMAGE_MAX_BYTES) {
    return "设计图不能超过 10MB";
  }
  return null;
}

export function validateDesignImageBuffer(buffer: Buffer, mimeType: string): string | null {
  const normalized = mimeType.trim().toLowerCase();
  if (!ALLOWED_MIME.has(normalized)) {
    return "仅支持 JPG、PNG、WebP 格式的设计图";
  }
  if (buffer.length > LAYOUT_VARIANT_AI_IMAGE_MAX_BYTES) {
    return "设计图不能超过 10MB";
  }
  if (buffer.length === 0) {
    return "设计图为空";
  }
  return null;
}

function mimeToExtension(mimeType: string): string {
  const normalized = mimeType.trim().toLowerCase();
  if (normalized.includes("jpeg") || normalized.includes("jpg")) return ".jpg";
  if (normalized.includes("webp")) return ".webp";
  return ".png";
}

function wrapPipelineError(e: unknown): Error {
  if (isAiPipelineError(e)) {
    const err = new Error(e.message);
    (err as Error & { code?: string }).code =
      e.code === "AI_PIPELINE_ALL_SECTIONS_FAILED" ||
      e.code === "LLM_PARSE_FAILED" ||
      e.code === "VALIDATE_TEMPLATE_FAILED"
        ? "AI_GENERATION_FAILED"
        : e.code;
    return err;
  }
  if (e instanceof LlmStageFailure) {
    const err = new Error(e.message || "生成失败，请稍后重试");
    (err as Error & { code?: string }).code = "AI_GENERATION_FAILED";
    return err;
  }
  if (e instanceof Error && /DOUBAO_API_KEY|LLM_PIPELINE_MODEL|GEMINI_API_KEY|PEXELS_API_KEY/.test(e.message)) {
    const err = new Error("AI 生成服务未配置，请联系管理员");
    (err as Error & { code?: string }).code = "AI_GENERATION_FAILED";
    return err;
  }
  if (e instanceof Error) {
    const err = new Error(e.message || "生成失败，请稍后重试");
    (err as Error & { code?: string }).code = "AI_GENERATION_FAILED";
    return err;
  }
  const err = new Error("生成失败，请稍后重试");
  (err as Error & { code?: string }).code = "AI_GENERATION_FAILED";
  return err;
}

/** 根据设计图生成版式 template + tokenPresets（RestoreAst 三步骤管线；方案 1 暂留未实现）。 */
export async function generateLayoutVariantFromDesignImage(
  input: LayoutVariantAiGenerateInput,
  options: LayoutVariantAiGenerateOptions = {}
): Promise<LayoutVariantAiGenerateResult> {
  const pipeline = input.pipeline ?? "restore-ast";
  if (pipeline === "mjs-patch") {
    throw new AiPipelineError("AI_GENERATION_FAILED", MJS_PATCH_PIPELINE_RESERVED_MESSAGE);
  }

  const runId = randomUUID();
  const stagingRoot = path.join(input.emailBaseDir, ".ai-staging-restore-ast", runId);
  const stagingDir = path.join(stagingRoot, "layout-out");
  const imagePath = path.join(stagingRoot, `design${mimeToExtension(input.mimeType)}`);

  await fs.mkdir(stagingDir, { recursive: true });
  await fs.writeFile(imagePath, input.imageBuffer);

  try {
    const restored = await runRestoreAstFromDesignImage(
      {
        emailKey: input.emailKey,
        layoutVariantId: input.layoutVariantId,
        layoutLabel: input.layoutLabel.trim() || input.layoutVariantId,
        imagePath,
        imageBuffer: input.imageBuffer,
        mimeType: input.mimeType,
        stagingDir,
      },
      { progress: options.progress, llmProfile: input.llmProfile }
    );

    return {
      template: restored.template,
      tokenPresets: restored.tokenPresets,
      logDir: restored.logDir,
      pipeline,
      validationIssues: restored.validationIssues,
    };
  } catch (e) {
    throw wrapPipelineError(e);
  } finally {
    await fs.rm(stagingRoot, { recursive: true, force: true }).catch(() => {
      /* 清理临时 staging；核验材料在 logs/restore-ast-* */
    });
  }
}

export function layoutVariantAiGenerationTimeoutError(): Error {
  const err = new Error("生成超时，请稍后重试");
  (err as Error & { code?: string }).code = "AI_GENERATION_TIMEOUT";
  return err;
}

export async function withLayoutVariantAiTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(layoutVariantAiGenerationTimeoutError()), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

export { AiPipelineError, isAiPipelineError };
