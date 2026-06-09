import { buildMjsPatchXmlFormatSection } from "../../../mjs-patch-contract";
import type { MjsErrorSnippet } from "./mjsLocateSnippets";
import type { ManualRestoreBlueprint } from "./types";
import { formatVisualBlueprintForPrompt } from "./promptsVisualBlueprint";
import { buildMjsVisualQualitySection } from "./promptsMjsRules";

export function buildMjsPatchSystemPrompt(visualBlueprint?: ManualRestoreBlueprint): string {
  const visualBlueprintSection = visualBlueprint
    ? `\n## visual blueprint 摘要（修补时保留视觉意图）\n${formatVisualBlueprintForPrompt(visualBlueprint)}\n`
    : "";
  return `你是 Easy-Email mjs 脚本的**局部修补**工程师（不是重写整份脚本）。

## 任务
上一轮 node/validate/visual lint 仍有问题。你只输出**少量 XML search patch** 消除下列错误。

${buildMjsPatchXmlFormatSection("search")}

## 修补原则
- **优先改助手函数**（\`sectionShell\`、\`textBlock\`、\`buttonBlock\`、\`rowLayout\`、\`gridBlock\`、\`coverImage\`）一处修多处
- **rowLayout/gridBlock** 的 \`wrapperStyle\` 须含 \`borderRadius: { mode: 'unified', radius: '0' }\`（契约必填）；**禁止**用全局 search 删除所有 \`borderRadius\` 行
- **ICON 连字符槽**：\`ICON["icon-instagram"]\`；**禁止** \`ICON.icon-instagram\`（运行失败）
- **删除** \`props.mainAlign\`、\`props.crossAlign\`；横排改用 \`direction:'horizontal'\` + \`contentAlign\`
- **删除** template 内 \`bindings\`、\`themeRef()\`、\`$themeRef\` → 改为 COLORS / 字面量 px（程序也会自动 literalize）
- **emailRoot**：补 \`padding: { mode: 'unified', unified: '0' }\`；删 \`props.borderRadius\`
- 删除禁止字段：\`buttonStyle.padding\`、\`buttonStyle.fontWeight\`、\`wrapperStyle.margin\`
- 缺 \`backgroundImage\` 的 image → 补 \`coverImage\` / \`barcodeImage\` 形态
- 非法 \`border\`（无 mode 但含 width/style/color）→ 补 \`mode: 'unified'\` 保留描边；完全无法解析或校验要求补字段 → \`border: borderNone()\`
- 每个 text 必须有 \`italic: false\` 与 \`decoration: 'none'\`
- **禁止**改写 PEXELS/ICON 常量块中的 URL

${buildMjsVisualQualitySection()}

${visualBlueprintSection}`;
}

export function buildMjsPatchUserText(
  mjsSource: string,
  errorLines: string[],
  snippets: MjsErrorSnippet[]
): string {
  const snippetSection =
    snippets.length > 0
      ? snippets
          .map(
            (s) =>
              `### block \`${s.blockId}\`（约 L${s.lineStart}）\n错误：${s.errorLine}\n\`\`\`javascript\n${s.snippet}\n\`\`\``
          )
          .join("\n\n")
      : "（未能自动定位到 block 片段，请根据错误路径在完整脚本中搜索 id）";
  const sourceSection =
    snippets.length > 0
      ? "## 当前 mjs\n已提供错误定位片段；SEARCH 必须来自上述片段，勿整文件重写。"
      : `## 当前完整 mjs（仅定位不到片段时兜底提供）\n\`\`\`javascript\n${mjsSource}\n\`\`\``;

  return `## validate 错误（须全部消除）
${errorLines.map((e, i) => `${i + 1}. ${e}`).join("\n")}

## 错误定位片段
${snippetSection}

${sourceSection}

请只输出 \`<mjs-patches>\` XML（kind="search"）。`;
}
