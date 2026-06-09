import type { InjectedMjsAssets } from "./injectedMjsAssets";
import type { ManualRestoreBlueprint } from "./types";
import { buildMjsPatchXmlFormatSection, listMjsPatchSlotIdsForPrompt } from "../../../mjs-patch-contract";
import { formatVisualBlueprintForPrompt } from "./promptsVisualBlueprint";
import { buildMjsTemplateLiteralSection, buildMjsVisualQualitySection } from "./promptsMjsRules";

/** 首次生成：在程序底稿上只输出 XML slot patch。 */
export function buildMjsDeltaSystemPrompt(
  injected: InjectedMjsAssets,
  visualBlueprint?: ManualRestoreBlueprint
): string {
  const blueprintSection = visualBlueprint
    ? `## visual blueprint 摘要\n${formatVisualBlueprintForPrompt(visualBlueprint)}`
    : "## visual blueprint 摘要\n未注入；按设计图估算，禁止照抄底稿默认大值。";
  return `你是 Easy-Email 邮件模板还原工程师。程序已提供一份**可运行的 mjs body 底稿**（助手函数 + 带 @mjs-slot 锚点的占位模块）；你根据设计图**只输出 XML patch**，把各 slot 换成真实设计，**不要**重写整份 body。

${buildMjsPatchXmlFormatSection("slot")}

## 你必须 patch 的 slot（按设计图）
1. **COLORS** — 设计图色板（可含额外 swatch 键）
2. **buildS1 … buildSn** — 每个模块整段 \`function buildSn(){...}\`；设计图模块数 n ≤ 8 时只改前 n 个；unused 的 buildS* 用空 \`<replace></replace>\` 删除
3. **tokenPresets** — description、tokens 数值与 COLORS 对齐
4. **template** — locale、root.children 只保留实际用到的 buildS1…buildSn

## 禁止 patch
- **助手函数**（borderNone、sectionShell…）— 底稿已完整
- **禁止**写 \`const PEXELS\` / \`const ICON\` / 任何 https:// URL

## 资产引用
${injected.slotGuide}

引用 \`PEXELS.*\`、\`ICON["…"]\`（连字符槽 **禁止** \`ICON.icon-xxx\` 点号）、模板字符串 \`\${P}-…\`（P 由程序 header 注入）。

${blueprintSection}

## 本阶段结构硬规则
- 设计图有 **顶栏 / wordmark / 品牌 Logo 条** 时，**第一个模块**须建导航壳（Logo + 导航文案或图标），勿从首屏大图直接开始
- grid 每格须 layout 复合单元（色卡用 colorSwatch），禁止裸 text
- 摄影图用 \`coverImage\` 或 \`imageContainer\`；图内叠字才用 image children；图外说明写成兄弟 text
- 产品宫格用 \`productCard(..., PEXELS['slot-id'], '英文 alt', imgWidth, imgHeight)\` 七参数；禁止灰块占位
- \`coverImage\` / \`imageContainer\` / \`barcodeImage\` 高度和 productCard 宽高只在 buildS* 调用处按设计图填写
- imageContainer 的 alignH/alignV 每次显式传入

${buildMjsTemplateLiteralSection()}

${buildMjsVisualQualitySection()}`;
}

export function buildMjsDeltaUserText(opts: {
  idPrefix: string;
  motherBody: string;
}): string {
  return `请根据附带的设计图，对底稿各 slot 输出 XML patch（只输出 \`<mjs-patches>\`，勿输出底稿全文）。

## 运行参数
- 块 id 前缀 P = '${opts.idPrefix}'
- 可用 slot id：${listMjsPatchSlotIdsForPrompt()}

## 底稿（仅供对照；patch 用 slot id，勿 SEARCH 全文）
\`\`\`javascript
${opts.motherBody}
\`\`\`

## 你需要做的
1. 从设计图提取 COLORS、文案、模块结构，按 slot id 输出 patch
2. 模块数与设计图一致：unused buildS* 空 replace 删除，并更新 template.children
3. 只输出 \`<mjs-patches>...</mjs-patches>\` XML`;
}
