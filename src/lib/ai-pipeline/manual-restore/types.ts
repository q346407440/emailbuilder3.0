import { z } from "zod";
import type { EmailBlock } from "../../../types/email";
import type { PipelineProgressReporter } from "../ports/PipelineProgressReporter";

/** CLI：新建整封邮件场景；HTTP 以图创建版式：仅写 staging 目录 template + tokenPresets。 */
export type ManualRestorePersistMode = "full-email" | "layout-only";

export const ManualRestoreImageSlotSchema = z.object({
  slotId: z.string().min(1),
  query: z.string().min(1),
  targetWidth: z.number().int().positive().optional(),
  height: z.string().optional(),
  required: z.boolean().optional(),
  usage: z.string().optional(),
});

export const ManualRestoreIconSlotSchema = z.object({
  slotId: z.string().min(1),
  pack: z.enum(["tabler", "simple-icons", "lucide"]),
  iconQuery: z.string().min(1),
  colorHex: z.string().optional(),
  required: z.boolean().optional(),
  usage: z.string().optional(),
  hasBox: z.boolean().optional(),
});

/** 阶段① MR:AssetSlots（mjs demo）：仅需搜图槽位，不含 colors/sections。 */
export const AssetSlotsBlueprintSchema = z.object({
  imageSlots: z.array(ManualRestoreImageSlotSchema).default([]),
  iconSlots: z.array(ManualRestoreIconSlotSchema).default([]),
});

export type AssetSlotsBlueprint = z.infer<typeof AssetSlotsBlueprintSchema>;

export const ManualRestoreDividerBlueprintSchema = z.object({
  target: z.string().min(1),
  kind: z.enum(["top-divider", "bottom-divider", "box-border"]),
  color: z.string().optional(),
  width: z.string().optional(),
  height: z.string().optional(),
});

export const ManualRestoreSectionBlueprintSchema = z.object({
  sectionId: z.string().regex(/^s\d+$/),
  name: z.string().min(1),
  backgroundColor: z.string().optional(),
  pageInline: z.boolean().optional(),
  padTop: z.string().optional(),
  padBottom: z.string().optional(),
  targetHeight: z.string().optional(),
  gap: z.string().optional(),
  summary: z.string().min(1),
  texts: z.array(z.string()).default([]),
  imageSlotIds: z.array(z.string()).default([]),
  iconSlotIds: z.array(z.string()).default([]),
  visualChecks: z.array(z.string()).default([]),
});

export const ManualRestoreBlueprintSchema = z.object({
  emailKey: z.string().min(1),
  displayName: z.string().min(1),
  idPrefix: z.string().min(1),
  description: z.string().optional(),
  colors: z.object({
    primary: z.string(),
    secondary: z.string(),
    surface: z.string(),
  }),
  spacing: z.object({
    section: z.string(),
    gap: z.string(),
    pageInline: z.string(),
  }),
  typography: z.object({
    display: z.string(),
    h1: z.string(),
    body: z.string(),
    caption: z.string(),
  }),
  canvas: z
    .object({
      sourceImageWidth: z.number().int().positive().optional(),
      sourceImageHeight: z.number().int().positive().optional(),
      emailRootWidth: z.string().default("600px"),
      scalePolicy: z.string().optional(),
    })
    .default({ emailRootWidth: "600px" }),
  emailRootBackground: z.string(),
  imageSlots: z.array(ManualRestoreImageSlotSchema).default([]),
  iconSlots: z.array(ManualRestoreIconSlotSchema).default([]),
  dividers: z.array(ManualRestoreDividerBlueprintSchema).default([]),
  visualChecks: z.array(z.string()).default([]),
  sections: z.array(ManualRestoreSectionBlueprintSchema).min(1),
});

export type ManualRestoreBlueprint = z.infer<typeof ManualRestoreBlueprintSchema>;

export const MjsVisualLintIssueCodeSchema = z.enum([
  "asset.placeholderSrc",
  "asset.missingRequiredLogo",
  "asset.missingRequiredIcon",
  "typography.footerTooLarge",
  "layout.heroTooTall",
  "layout.defaultSizeLikelyCopied",
  "layout.unsupportedAutoGap",
  "icon.missingBox",
  "icon.emptyAppGlyph",
  "divider.strokeUsedAsDivider",
]);

export const MjsVisualLintIssueSchema = z.object({
  severity: z.enum(["error", "warning"]),
  code: MjsVisualLintIssueCodeSchema,
  path: z.string().optional(),
  message: z.string().min(1),
  suggestion: z.string().optional(),
});

export type MjsVisualLintIssue = z.infer<typeof MjsVisualLintIssueSchema>;

export type ResolvedManualRestoreAssets = {
  images: Record<string, { url: string; alt: string }>;
  icons: Record<string, { url: string; colorHex: string; tintable?: boolean }>;
};

export type ManualRestoreSectionNode = {
  sectionId: string;
  section: EmailBlock;
};

/** 与 generate-manual-*.mjs 落盘形态一致（mjs 执行后的 JSON 包）。 */
export type ManualRestoreDeliverable = {
  meta: {
    schemaVersion: "1.0.0";
    displayName: string;
    description: string;
    source: "ai-manual-restore";
    createdAt: string;
    updatedAt: string;
    defaultStylePresetSelection: "local";
    publishStatus: "published" | "draft";
  };
  layoutManifest: {
    schemaVersion: "1.0.0";
    activeLayoutVariantId: "default";
    variants: Array<{
      id: "default";
      label: string;
      description: string;
      publishStatus: "published" | "draft";
    }>;
  };
  payload: {
    schemaVersion: "1.0.0";
    slots: Record<string, never>;
    values: Record<string, never>;
  };
  tokenPresets: Record<string, unknown>;
  template: Record<string, unknown>;
};

/**
 * 手工 mjs 还原入参（CLI / 未来前端 HTTP 共用）。
 * 落盘目标由 outputEmailKey 决定，不是写死的 demo 场景。
 */
export type ManualRestoreRunInput = {
  /** 用户设计图：前端上传后服务端落盘的绝对路径 */
  imagePath: string;
  /** 写入 data/emails/<outputEmailKey>/layouts/default/ 的目标邮件场景 */
  outputEmailKey: string;
  /** meta.displayName；未传则用 outputEmailKey */
  displayName?: string;
  /** 设计图副本路径；未传则 public/test-assets/<outputEmailKey>-design.png */
  designCopyPath?: string;
  /** 默认 full-email（CLI）；HTTP 以图创建版式用 layout-only */
  persistMode?: ManualRestorePersistMode;
  /** layout-only：mjs 输出目录（绝对路径 staging） */
  stagingDir?: string;
  /** layout-only：新版式 id（用于 mjs 文件名） */
  layoutVariantId?: string;
  /** HTTP SSE 分步进度 */
  progress?: PipelineProgressReporter;
  /** layout-only：覆盖默认 scripts/ 下 mjs 路径 */
  mjsPath?: string;
};

/** 豆包一次性写 mjs → node 执行 的 demo 结果。 */
export type ManualRestoreRunResult = {
  emailKey: string;
  mjsPath: string;
  outputDir: string;
  mjsStdout: string;
  validationOk: boolean;
  validationIssues: string[];
  logDir: string;
};
