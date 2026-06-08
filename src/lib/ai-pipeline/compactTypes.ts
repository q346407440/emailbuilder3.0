/** 紧凑 IR schema 版本（破坏性变更时递增）。 */
export const COMPACT_SCHEMA_VERSION = "1" as const;

/** 阶段 A/B1/B2/B3 schema 版本。 */
export const PIPELINE_IR_SCHEMA_VERSION = "1" as const;

/** 邮件版心固定宽度（§7.2.1）。 */
export const EMAIL_ROOT_FIXED_WIDTH = "600px";

/** Pexels 搜图目标宽度默认值（版心宽；分区有 imageWidth 时优先用分区值）。 */
export const PEXELS_SEARCH_TARGET_WIDTH = 600;

/** 紧凑 IR 允许的 block kind 白名单（§14.6）。 */
export const COMPACT_BLOCK_KINDS = [
  "layout.container",
  "layout.grid",
  "content.text",
  "content.image",
  "action.button",
  "content.icon",
  "content.divider",
] as const;

export type CompactBlockKind = (typeof COMPACT_BLOCK_KINDS)[number];

/** kind → 编辑器 runtime type。 */
export const COMPACT_KIND_TO_RUNTIME_TYPE: Record<CompactBlockKind, string> = {
  "layout.container": "layout",
  "layout.grid": "grid",
  "content.text": "text",
  "content.image": "image",
  "action.button": "button",
  "content.icon": "icon",
  "content.divider": "divider",
};

/** 图片 orientation（B4 Pexels）。 */
export const IMAGE_ORIENTATIONS = ["landscape", "portrait", "square"] as const;
export type ImageOrientation = (typeof IMAGE_ORIENTATIONS)[number];

/** A 阶段 primaryAsset 枚举。 */
export const PRIMARY_ASSET_HINTS = [
  "content-image",
  "content-icon",
  "content-text",
  "mixed",
] as const;
export type PrimaryAssetHint = (typeof PRIMARY_ASSET_HINTS)[number];

/** B2 icon pack。 */
export const ICON_PACKS = ["simple-icons", "tabler", "lucide"] as const;
export type IconPack = (typeof ICON_PACKS)[number];

/** B3 text role。 */
export const TEXT_EXTRACT_ROLES = ["heading", "body", "caption", "footer", "button"] as const;
export type TextExtractRole = (typeof TEXT_EXTRACT_ROLES)[number];

/** wrapper 宽高模式。 */
export const BOX_MODES = ["fill", "hug", "fixed"] as const;
export type BoxMode = (typeof BOX_MODES)[number];
