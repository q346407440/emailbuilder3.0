/**
 * Compact IR 契约（AI 管线 LLM 输出 ↔ D 编译 ↔ E lowering 的唯一语义真源）。
 *
 * - Stage A/B/C prompt 的「格式 / 白名单 / 禁止项」须与本模块派生段落一致。
 * - Zod：`src/lib/ai-pipeline/schemas/*.ts` 与本模块枚举对齐。
 * - 落盘 template 必填字段：由 E lowering 表闭合，不在 prompt 中重复 validate.ts 全文。
 */

import { COMPACT_BLOCK_KINDS } from "../lib/ai-pipeline/compactTypes";

/** Compact IR 允许的 block kind（与 `COMPACT_BLOCK_KINDS` 同源）。 */
export const COMPACT_IR_BLOCK_KINDS = COMPACT_BLOCK_KINDS;

/** Stage C 根 payload 形态。 */
export const COMPACT_SECTION_ROOT_SHAPE = '{ "root": { "kind": "...", ... } }' as const;

/** LLM 各阶段禁止输出的顶层/持久化键（节选）。 */
export const COMPACT_IR_FORBIDDEN_OUTPUT_KEYS = [
  "schemaVersion",
  "sectionId",
  "compactSchemaVersion",
  "template",
  "templateId",
  "blocks",
  "rootBlockId",
  "$themeRef",
  "bindings",
] as const;

/** Compact wrapper 禁止键（与 render-defaults-contract 对齐，LLM 不得写入）。 */
export const COMPACT_WRAPPER_FORBIDDEN_KEYS = [
  "selfAlign",
  "crossAlign",
  "backgroundContentAlign",
  "overflow",
  "overlayInset",
] as const;

/** Compact props 常见禁止键（legacy / 已由 wrapper 表达的字段）。 */
export const COMPACT_PROPS_FORBIDDEN_KEYS = [
  "textBody",
  "src",
  "url",
  "iconType",
  "content",
  "textAlign",
  "columnsPerRow",
  "crossAlign",
  "minHeight",
] as const;

/** 配图容器角色（Stage A → D ImageContainerCompiler；§7.2.2）。 */
export const IMAGE_SLOT_ROLES = ["hero", "logo", "card", "background"] as const;
export type ImageSlotRole = (typeof IMAGE_SLOT_ROLES)[number];

/** hero 横幅高度档位（程序查表映射 px，AI 不直接写容器高度）。 */
export const IMAGE_HERO_LAYOUT_TIERS = ["compact", "standard", "tall"] as const;
export type ImageHeroLayoutTier = (typeof IMAGE_HERO_LAYOUT_TIERS)[number];

/** 区段级商品配图高度档位（Stage A layoutHints.cardImageTier；程序查表映射 px）。 */
export const IMAGE_CARD_IMAGE_TIERS = IMAGE_HERO_LAYOUT_TIERS;
export type ImageCardImageTier = ImageHeroLayoutTier;

/** card 配图容器高：compact / standard / tall → px（D/E ImageContainerCompiler 真源）。 */
export const CARD_IMAGE_HEIGHT_BY_TIER: Record<ImageCardImageTier, string> = {
  compact: "80px",
  standard: "120px",
  tall: "160px",
};

/** 将 cardImageTier 映射为配图 fixed 高度；缺省或非法 → standard（120px）。 */
export function resolveCardImageHeight(tier?: ImageCardImageTier | string): string {
  const raw = typeof tier === "string" ? tier.trim() : "";
  const key = IMAGE_CARD_IMAGE_TIERS.includes(raw as ImageCardImageTier)
    ? (raw as ImageCardImageTier)
    : "standard";
  return CARD_IMAGE_HEIGHT_BY_TIER[key];
}

/** contentAlign 合法枚举（双轴；vertical 可省略，D/E 默认 top）。 */
export const CONTENT_ALIGN_HORIZONTAL = ["left", "center", "right"] as const;
export const CONTENT_ALIGN_VERTICAL = ["top", "center", "bottom"] as const;

/** wrapper 宽高模式（非法 fitContent 由 D 归一化为 hug）。 */
export const WRAPPER_BOX_MODES = ["fill", "hug", "fixed"] as const;

/** Stage C system prompt：Compact IR 格式段（与 Zod compact-section 同构）。 */
export function buildCompactIrFormatPromptSection(): string {
  const kinds = COMPACT_IR_BLOCK_KINDS.join(" | ");
  const forbiddenTop = COMPACT_IR_FORBIDDEN_OUTPUT_KEYS.join("、");
  const forbiddenWrapper = COMPACT_WRAPPER_FORBIDDEN_KEYS.join("、");
  const forbiddenProps = COMPACT_PROPS_FORBIDDEN_KEYS.join("、");

  return `## Compact IR 格式（唯一合法中间表示）
- 输出形态：${COMPACT_SECTION_ROOT_SHAPE}
- 每个节点：kind（必填）、label（可选）、props、wrapper、children、styleKeys（可选；文本用顶层键+*Bind，按钮推荐嵌套 buttonStyle 对象，见 agentStyleKeys）
- kind 白名单：${kinds}

## 禁止输出（违反将被 sanitize 丢弃或 Stage C 重试）
- 顶层 / 持久化禁止：${forbiddenTop}
- wrapper 禁止键：${forbiddenWrapper}
- props 禁止键：${forbiddenProps}
- 禁止完整 URL（图片/图标地址由 B4 / 图标解析服务写入）
- 禁止 EmailBlock / nested template 字段（blockId、parentId、type、wrapperStyle 等）`;
}

/** Stage C：盒模型与对齐 — AI 只表达意图，程序在 D/E 闭合。 */
export function buildCompactIrLayoutIntentPromptSection(): string {
  return `## 盒模型与对齐（意图层；不必写完整 Easy-Email wrapper）
- **你只负责结构意图**；border、完整 contentAlign、缺省 widthMode/heightMode 由程序编译。
- wrapper 可选键：widthMode、heightMode、width、height、backgroundImageRef、contentAlign.horizontal、backgroundColor
- **禁止**写 wrapper.borderRadius（圆角由 B1 radius.panel/cta + E 编译按 block 类型写入）
- **例外**：hasOverlay=true 的 content.image 可写 wrapper.padding 作为叠加文案相对图边的内边距
- widthMode / heightMode 仅允许：${WRAPPER_BOX_MODES.join(" | ")}（禁止 fitContent）
- contentAlign.horizontal：${CONTENT_ALIGN_HORIZONTAL.join(" | ")}；vertical 可省略（程序默认 top）

### 对齐策略（避免 hug/fill 冲突）
- 区域整体居中：优先在**区域根 layout.container** 写 contentAlign.horizontal: "center"，根容器 widthMode 可不写（程序默认 fill）
- 居中标题/段落：可写 contentAlign.horizontal: "center"；**不要**在 widthMode=hug 的父 layout 下给子 text 写 widthMode: fill
- 居中图标行：外层 layout.container 用 widthMode: "hug" + contentAlign.horizontal: "center"（父级 fill 会居中该行）
- 按钮/图标：程序默认 wrapper widthMode=hug（随内容）；**内收 CTA**（左右留白、非贴边黑条）不要写 widthMode: fill，也不要写 wrapper.backgroundColor
- **全宽 CTA**（按钮背景贴满内容区宽）时 action.button 显式写 widthMode: "fill"；背景色只写 styleKeys.buttonStyle.backgroundColor，**禁止** wrapper.backgroundColor
- 竖排正文 content.text：程序默认 fill（栏宽内换行）；横排 layout 下 text 默认 hug

### content.image（只绑 slot，不写容器 px）
- 仅写 wrapper.backgroundImageRef = 本区 slotId
- **禁止**写 wrapper.height / wrapper.width 定容器（配图容器高由 Stage A 每条 imageSlot 的 containerHeight 如 280px 给出；D/E 仅 clamp）
- hasOverlay=true 时：在 content.image 的 children 里写叠加 text/button`;
}

/** Stage C：各 kind 要点。 */
export function buildCompactIrKindRulesPromptSection(): string {
  return `## 各 kind 要点
- layout.container：props.direction("vertical"|"horizontal")、gap；children 放子 block
- layout.grid：props.columns、gap、cellHeightMode（默认 content-max，按行取最高内容统一格高）、cellHeight（仅 cellHeightMode=fixed 时写）；children 为格子内容；**禁止 grid 嵌套 grid**
- content.text：props.textId 必须来自本区文案表；styleKeys 可写 fontSize/color/bold
- content.image：hasImage=true 时可用；wrapper.backgroundImageRef = 本区 slotId（多格 grid 每格不同 slotId）
- action.button：props.textId 引用本区按钮文案；**背景/文字色只写 styleKeys.buttonStyle.***（如 backgroundColor、textColor）；**禁止** wrapper.backgroundColor
- 内收居中按钮：wrapper 不写 widthMode（程序默认 hug）；全宽 CTA 才写 widthMode: "fill"
- content.icon：props.iconRef 引用本区图标 id（不要写 src）
- content.divider：分隔线，通常默认即可`;
}

/** Stage C：区块树展示名（写入 blockMeta.name，非 block 结构字段）。 */
export function buildCompactIrBlockNamingPromptSection(): string {
  return `## 区块树展示名（label，可选）
- 每个节点可写 **label**：2–8 字中文，编辑器区块树展示名（程序写入 blockMeta.name，**不是** block 结构字段）
- 优先写语义化名称：如「主标题」「CTA 按钮」「商品栅格」「社交图标行」
- 不写 label 时程序按文案 role / 配图 role / block 类型兜底
- **区段名称**由 Stage A 的 region 提供，不在 Stage C 重复写区段壳名`;
}

/** Stage A：imageSlots 字段说明（含 containerHeight px）。 */
export function buildGroundingImageSlotsPromptSection(): string {
  return `- imageSlots：**每张需 Pexels 填充的可见配图一条**（N 张图 = N 条，禁止整区一条糊弄多图）
  - imageQuery：该张图主题的英文关键词（2-5 词），供 Pexels 搜图
  - **containerHeight：必填**，配图容器固定高度，**直接写 px 字符串**（如 "280px"、"120px"），按设计图目测，与 B1 间距/字号一样信任视觉估值
  - role：可选，hero | card | background（仅影响搜图/叠放语义；**高度以 containerHeight 为准**）
    - **禁止 role=logo**：品牌 Logo / wordmark 不要写入 imageSlots
  - layoutTier / layoutHints.cardImageTier：**勿再使用**（旧版兼容）；统一用 containerHeight
  - slotId：可省略，程序生成 sN-img-0、sN-img-1…
  - imageWidth / imageHeight：可选数字，**仅用于 B4 搜图 orientation/选档**，与 containerHeight 无关`;
}

/** Stage A：layoutHints 中与商品配图相关的字段。 */
export function buildGroundingLayoutHintsPromptSection(): string {
  return `- layoutHints.gridColumns：**并列槽数提示（非铁律）**；数清本区独立配图/icon/文案列后填写（社交格常见 4、信任/认证区常见 4、金融卖点常见 2）
  - B 阶段后程序可能按 B2/B3/B4 抬高；Stage C 的 layout.grid columns 应以视觉并列数为准
- 配图高度：**不要**写 layoutHints.cardImageTier；在每条 imageSlots[].containerHeight 写 px`;
}

/** Stage A：Grounding 禁止项与职责边界。 */
export function buildGroundingOutputBoundaryPromptSection(): string {
  return `## 职责边界（Stage A 只输出布局语义，不输出 template）
- 你只描述：区域划分、layoutHints、文案/组件描述、配图查询；每条 imageSlot 须写 containerHeight（px 字符串）
- **禁止**输出：block 树、wrapperStyle、widthMode、contentAlign、URL、完整 template
- Stage C 不写配图容器 px；D/E 将 containerHeight clamp 后写入 template`;
}
