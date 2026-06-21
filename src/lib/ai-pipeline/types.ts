import type { LlmClient } from "./ports/LlmClient";
import type { AssetResolver } from "./ports/AssetResolver";
import type { PipelineLogger } from "./ports/PipelineLogger";
import type { PipelineProgressReporter } from "./ports/PipelineProgressReporter";

export type PipelineRunInput = {
  emailKey: string;
  layoutVariantId: string;
  imageBuffer: Buffer;
  mimeType: string;
};

export type PipelineRunResult = {
  template: import("../../types/email").EmailTemplate;
  tokenPresets: import("../../types/tokenPreset").TokenPresets;
};

export type PipelinePorts = {
  llm: LlmClient;
  assets: AssetResolver;
  logger: PipelineLogger;
  progress?: PipelineProgressReporter;
};

export type PipelineRunContext = PipelineRunInput & {
  pipelineRunId: string;
  imageDataUrl: string;
};

/** Stage A 单张配图的查询规格（slotId 可由 normalize 补全）。 */
export type ImageSlotSpec = {
  slotId: string;
  imageQuery: string;
  /** 容器角色：hero / logo / card / background（D 阶段 ImageContainerCompiler 查表）。 */
  role?: import("../../layout-variant-ai-contract/compactIr").ImageSlotRole;
  /** hero 横幅高度档位；无 containerHeight 时 D 兜底（旧版兼容）。 */
  layoutTier?: import("../../layout-variant-ai-contract/compactIr").ImageHeroLayoutTier;
  /** 配图容器固定高度（如 `280px`）；Stage A 主输出，D/E 仅 clamp。 */
  containerHeight?: string;
  /** 仅 B4 搜图 orientation / 选档，不写入 template 盒模型。 */
  imageWidth?: number;
  imageHeight?: number;
};

export type GroundingSection = {
  sectionId: string;
  name: string;
  order: number;
  /** Stage A 区域元素描述（仅 prompt 用，不写入 template）。 */
  components?: string;
  layoutHints?: {
    fullWidth?: boolean;
    gridColumns?: number;
    /** Stage A layoutHints.align：left | center | right */
    align?: "left" | "center" | "right";
    /** 与上一区之间的视觉间距（px）；D/E 编译为区段壳 padding-top */
    gapAbove?: string;
    /** 与下一区之间的视觉间距（px）；D/E 编译为区段壳 padding-bottom */
    gapBelow?: string;
    /** 区段级商品配图高度档（role=card）；程序查表映射 fixed 容器高。 */
    cardImageTier?: import("../../layout-variant-ai-contract/compactIr").ImageCardImageTier;
  };
  hasOverlay?: boolean;
  /** 本区是否需要 Pexels 配图（对齐 2.0 hasImage）。 */
  hasImage?: boolean;
  /** @deprecated 单图兼容；多图请用 imageSlots */
  imageQuery?: string;
  /** 每张配图一条查询（Stage A 按图片数输出；B4 逐条搜 Pexels）。 */
  imageSlots?: ImageSlotSpec[];
  /** 仅用于 B4 搜图 orientation / pickPexelsSrc，不写入 template 盒模型。 */
  imageWidth?: number;
  imageHeight?: number;
  assetHints?: {
    primaryAsset?: string;
  };
};

export type GroundingResult = {
  schemaVersion: string;
  order: string[];
  sections: GroundingSection[];
};

/** 阶段 B1 输出。 */
export type StyleTokensResult = {
  schemaVersion: string;
  tokens: {
    colors: { primary: string; accent: string; secondary: string; surface: string };
    spacing: { section: string; gap: string; pageInline: string };
    typography: { display: string; h1: string; body: string; caption: string };
    radius: { panel: string; cta: string };
  };
  canvas: {
    width: string;
    emailBackground: string;
    contentSurface: string;
  };
};

export type NormalizedStyleTokens = StyleTokensResult["tokens"];

/** 阶段 B2 输出。 */
export type IconQueryItem = {
  id: string;
  regionId: string;
  pack: import("./compactTypes").IconPack;
  iconQuery: string;
  colorHex: string;
  label?: string;
};

/** 阶段 B3 输出。 */
export type TextExtractParagraph = {
  textId: string;
  role: import("./compactTypes").TextExtractRole;
  textBody: {
    paragraphs: Array<{ runs: Array<{ text: string; bold?: boolean; italic?: boolean }> }>;
  };
};

export type TextExtractResult = {
  schemaVersion: string;
  regions: Array<{
    regionId: string;
    paragraphs: TextExtractParagraph[];
  }>;
};

/** 阶段 B4 输出。 */
export type ImageResolved = {
  slotId: string;
  regionId: string;
  url: string;
  alt?: string;
  photographer?: string;
};

/** 紧凑 IR 节点（阶段 C）。 */
export type CompactWrapper = {
  widthMode?: import("./compactTypes").BoxMode;
  heightMode?: import("./compactTypes").BoxMode;
  width?: string;
  height?: string;
  backgroundImageRef?: string;
  contentAlign?: { horizontal: string; vertical: string };
  padding?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  backgroundColor?: string;
  borderRadius?: {
    topLeft?: string;
    topRight?: string;
    bottomRight?: string;
    bottomLeft?: string;
  };
};

export type CompactNode = {
  kind: import("./compactTypes").CompactBlockKind;
  /** Stage C 可选：区块树展示名（E 写入 blockMeta.name，非 block 结构字段）。 */
  label?: string;
  props?: Record<string, unknown>;
  wrapper?: CompactWrapper;
  children?: CompactNode[];
  styleKeys?: Record<
    string,
    import("../../layout-variant-ai-contract/agentStyleKeys").CompactStyleRawValue
  >;
};

export type CompactSectionTree = {
  compactSchemaVersion: string;
  sectionId: string;
  root: CompactNode;
};

/** 统一资产表（§15.4）。 */
export type AssetManifest = {
  images: Record<
    string,
    { url: string; alt?: string; fit?: string; position?: string }
  >;
  icons: Record<
    string,
    { src: string; colorHex: string; tintable?: boolean }
  >;
};

/** 阶段 D 输出。 */
export type MergedEmailDraft = {
  sectionOrder: string[];
  sections: CompactSectionTree[];
  canvas: StyleTokensResult["canvas"];
  styleTokens: NormalizedStyleTokens;
  textExtract: TextExtractResult;
  assetManifest: AssetManifest;
  grounding: GroundingResult;
  emailKey: string;
  layoutVariantId: string;
};

export type MapPipelineInput = MergedEmailDraft;

export type MapPipelineOutput = {
  template: import("../../types/email").EmailTemplate;
  tokenPresets: import("../../types/tokenPreset").TokenPresets;
  /** E lowering 使用语义缺省（非 C 显式 styleKeys）的计数，供管线日志观测。 */
  loweringSemantic?: import("./semanticStyleDefaults").LoweringSemanticStats;
};
