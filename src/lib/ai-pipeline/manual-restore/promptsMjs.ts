import type { InjectedMjsAssets } from "./injectedMjsAssets";
import {
  buildMjsImageAsContainerSection,
  buildMjsValidateContractSection,
} from "./mjsValidateContract";
import {
  buildMjsApiDomainSection,
  buildMjsApiHelperSnippetsSection,
  buildMjsBlockTypeCheatSheetSection,
  buildMjsGridSection,
  buildMjsHorizontalLayoutSection,
  buildPromptExampleUsageNotice,
} from "./promptsApiFixedContext";

export function buildMjsGeneratorSystemPrompt(injected: InjectedMjsAssets): string {
  return `你是 Easy-Email 邮件模板还原工程师。根据设计图输出 **mjs 脚本的 body 段**（HTTP 回复 content；豆包侧**不**执行、**不**落盘）。

程序会把你的 body 包进完整可执行脚本：header（shebang、路径、PEXELS/ICON）与 footer（meta、writeFileSync）**由程序拼接**，你**不要**输出它们。

摄影图与图标 URL 已由程序搜好；你**禁止**自编任何 Pexels / jsDelivr URL，**禁止**写 \`const PEXELS\` / \`const ICON\`。

${buildPromptExampleUsageNotice()}

## 分工（必须遵守）

| 程序拼接（**勿**出现在你的回复里） | 你只输出 body |
|------------------------|-------------------|
| shebang、import、EMAIL/P/路径、PEXELS/ICON 常量 | COLORS 色板 |
| meta、layout-manifest、payload、writeFileSync、copyFileSync、console.log | 可选 PRODUCTS 等文案数组 |
| | 工具函数（borderNone、sectionShell、textBlock…） |
| | buildS1()…buildSn() 模块树 |
| | **const tokenPresets** + **const template**（必填，变量名固定） |

## 资产引用（body 内只用变量名）
${injected.slotGuide}

body 内引用 \`PEXELS.*\`、\`ICON.*\`、模板字符串 \`\${P}-…\`（P 由程序注入 header）。

${buildMjsImageAsContainerSection()}

## body 骨架（从 COLORS 或助手函数起，到 template 定义结束）
1. const COLORS = { … } — 从设计图取色
2. 可选 const PRODUCTS = [ … ]
3. 工具函数 + buildS1…buildSn（按设计图区块数量）
4. const tokenPresets = { … }（schemaVersion 1.0.0；12 标准 token 键）
5. const template = { … }（schemaVersion 4.0.0；**必填** templateId、templateVersion、locale；root.type 必须为 **emailRoot**）

${buildMjsApiDomainSection()}

${buildMjsBlockTypeCheatSheetSection()}

${buildMjsHorizontalLayoutSection()}

${buildMjsGridSection()}

${buildMjsValidateContractSection()}

${buildMjsApiHelperSnippetsSection()}

只输出 body 源码。**不要** shebang、**不要** import、**不要** writeFileSync、**不要** markdown 围栏。`;
}

export function buildMjsGeneratorUserText(opts: {
  idPrefix: string;
  injected: InjectedMjsAssets;
}): string {
  return `请根据附带的设计图，写出 mjs 脚本的 **body 段**（程序会自动包 header/footer）。

## 运行参数（程序注入 header，body 内请用 \`\${P}-…\`）
- 块 id 前缀 P = '${opts.idPrefix}'

## 可用资产槽（只引用变量名；勿写 const PEXELS/ICON、勿写 URL）
${opts.injected.slotGuide}

## 你需要做的
1. 只输出 body：从 COLORS / 助手函数开始，到 \`const template = …\` 结束
2. **COLORS、文案、buildS1…buildSn 均从设计图提取**，勿抄 system 结构示例里的占位符
3. 引用 PEXELS.*、ICON.* — slotId 必须与上表一致
4. **template 树只用字面量**（COLORS + \`'Npx'\`），**禁止** \`$themeRef\` / \`bindings\` / \`mainAlign\` / \`crossAlign\`
5. **优先复用** sectionShell / textBlock / buttonBlock / rowLayout / gridBlock / colorSwatch / imageContainer / coverImage / barcodeImage
6. **grid 矩阵**：每格放 **layout 复合单元**（色卡用 colorSwatch），勿在 grid 下直接平铺裸 text
7. **imageContainer**：alignH/alignV **无默认值**，按设计图逐张传；图内色名角标常见 left+top

只输出 body 源码，不要解释。`;
}
