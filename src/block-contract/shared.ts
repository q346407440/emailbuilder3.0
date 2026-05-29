/** 每个 block 在 template 树中的固定壳字段 */
export const BLOCK_SHELL_KEYS = [
  "id",
  "type",
  "parentId",
  "children",
  "wrapperStyle",
  "props",
  "bindings",
  "repeat",
  /** 条件显隐规则；与 bindings / repeat 并列的壳层字段 */
  "visibility",
] as const;

/** 多数容器 / 内容块共用的 wrapperStyle 前缀 */
export const WRAPPER_CONTAINER_PREFIXES = [
  "wrapperStyle.contentAlign",
  "wrapperStyle.widthMode",
  "wrapperStyle.heightMode",
  "wrapperStyle.width",
  "wrapperStyle.height",
  "wrapperStyle.padding",
  "wrapperStyle.border",
  "wrapperStyle.borderRadius",
  "wrapperStyle.backgroundColor",
] as const;

/** layout / image 底图与叠放 */
export const WRAPPER_BACKGROUND_IMAGE_PREFIXES = [
  "wrapperStyle.backgroundImage",
] as const;
