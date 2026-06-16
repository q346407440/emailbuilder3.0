import { buildMjsPatchXmlFormatSection, type MjsPatchPromptMode } from "../../../mjs-patch-contract";
import type { MjsPatchSlotId } from "../../../mjs-patch-contract";
import type { ManualRestoreBlueprint } from "./types";
import { formatVisualBlueprintForPrompt } from "./promptsVisualBlueprint";
import {
  buildMjsTemplateLiteralSection,
  buildMjsVisualQualitySection,
} from "./promptsMjsRules";
import { listStandardTokenScalesForPrompt } from "../../../token-preset-contract";

/** 修复阶段交给 LLM 的单个 slot：归属错误 + 当前完整源码。 */
export type MjsSlotRepairGroup = {
  slotId: MjsPatchSlotId;
  errors: string[];
  /** slot 锚点间当前源码全文（模型在此基础上整段重写） */
  currentSource: string;
};

export function buildMjsPatchSystemPrompt(
  visualBlueprint?: ManualRestoreBlueprint,
  mode: MjsPatchPromptMode = "slot",
  /** 合法资产键清单（如 `ICON{a,b} PEXELS{c}`）；提供时禁止引用清单外的键 */
  assetKeyGuide?: string
): string {
  const visualBlueprintSection = visualBlueprint
    ? `\n## visual blueprint 摘要（修补时保留视觉意图）\n${formatVisualBlueprintForPrompt(visualBlueprint)}\n`
    : "";
  const assetKeyRule = assetKeyGuide
    ? `\n- **资产键白名单**：只能引用 ${assetKeyGuide}；引用清单外的键会被程序拒绝整条补丁`
    : "";
  return `你是 Easy-Email mjs 脚本的**slot 级修补**工程师（不是重写整份脚本）。

## 任务
上一轮 node/validate/visual lint 仍有问题。下方按 slot 给出归属错误与该 slot 的当前完整源码；
你对每个出错 slot 输出 \`kind="slot"\` patch，**整段重写**该 slot 以消除全部归属错误。

${buildMjsPatchXmlFormatSection(mode)}

## 修补原则
- **每个出错 slot 输出一个 slot patch**；replace 须为该 slot 完整可运行源码（如整个 \`function buildSn(){...}\`）
- 除错误相关改动外，**保持该 slot 其余内容不变**——文案、资产引用、布局结构原样保留
- 带背景或描边的 \`layout.container\` 其 \`wrapperStyle\` 必须含 \`borderRadius: { mode: 'unified', radius: '0' }\`（契约必填，radius=0 也要显式）
- 错误指向 helper 生成的块（如 textBlock/iconBlock 调用）时，修复方式是**在调用处的 opts 显式传对应字段**（如 \`widthMode: 'hug'\`），helper 默认值不可依赖
- 删除禁止字段：\`buttonStyle.padding\`、\`buttonStyle.fontWeight\`、\`wrapperStyle.margin\`
- 每个 text 必须有 \`italic: false\` 与 \`decoration: 'none'\`
- **tokenPresets 形态是契约**：\`{ schemaVersion: '1.0.0', activePresetId: 'default', presets: { default: { label, description, tokens } }, scopeSelections: {} }\`；presets 是**对象**（禁止数组）；tokens 只允许标准键 ${listStandardTokenScalesForPrompt()}，**禁止**发明其他键（base/fonts/brand/xs 等）
- **禁止**改写 PEXELS/ICON 常量块中的 URL${assetKeyRule}

${buildMjsTemplateLiteralSection()}

${buildMjsVisualQualitySection()}

${visualBlueprintSection}`;
}

export function buildMjsPatchUserText(opts: {
  errorLines: string[];
  slotGroups: MjsSlotRepairGroup[];
  /** 无法归属 slot 的错误行；存在时须同时提供 fullSource */
  unmapped: string[];
  /** 仅 unmapped 非空时附带完整脚本（供 search 小补丁定位） */
  fullSource?: string;
  /** 上一轮被资产键守卫拒绝的补丁原因（含合法键清单），回灌避免模型重犯 */
  guardRejections?: string[];
}): string {
  const { errorLines, slotGroups, unmapped, fullSource, guardRejections } = opts;

  const guardSection =
    guardRejections && guardRejections.length > 0
      ? `\n## 上一轮补丁被资产键守卫拒绝（本轮重写对应 slot 时**只能用合法键**，禁止再引用被拒键）\n${guardRejections
          .map((r) => `- ${r}`)
          .join("\n")}\n`
      : "";

  const slotSection =
    slotGroups.length > 0
      ? slotGroups
          .map(
            (g) =>
              `### slot \`${g.slotId}\`\n归属错误：\n${g.errors.map((e) => `- ${e}`).join("\n")}\n当前源码：\n\`\`\`javascript\n${g.currentSource}\n\`\`\``
          )
          .join("\n\n")
      : "（无可按 slot 归属的错误）";

  const unmappedSection =
    unmapped.length > 0
      ? `\n## 未归属 slot 的错误（用 kind="search" 小补丁修复；SEARCH 取自下方完整脚本）\n${unmapped
          .map((e) => `- ${e}`)
          .join("\n")}\n\n## 当前完整 mjs\n\`\`\`javascript\n${fullSource ?? ""}\n\`\`\`\n`
      : "";

  return `## validate 错误（须全部消除）
${errorLines.map((e, i) => `${i + 1}. ${e}`).join("\n")}
${guardSection}
## 按 slot 重生成（对每个出错 slot 输出 kind="slot"，整段替换）
${slotSection}
${unmappedSection}
请只输出 \`<mjs-patches>\` XML。`;
}
