import { buildMjsValidateContractSection } from "./mjsValidateContract";
import type { MjsErrorSnippet } from "./mjsLocateSnippets";

export function buildMjsPatchSystemPrompt(): string {
  return `你是 Easy-Email mjs 脚本的**局部修补**工程师（类似 Cursor 改文件，不是重写整份脚本）。

## 任务
上一轮 node 执行成功，但 template validate 未通过。你只输出**少量 SEARCH/REPLACE 补丁**消除下列错误。

## 输出格式（严格遵守）
- **禁止**输出完整 mjs、禁止 markdown 解释
- 只输出 1～8 个补丁块，格式如下（SEARCH 必须与当前脚本逐字符一致，含缩进与引号）：

<<<<<<< SEARCH
（原文连续多行）
=======
（替换后连续多行）
>>>>>>> REPLACE

## 修补原则
- **优先改助手函数**（\`sectionShell\`、\`textBlock\`、\`buttonBlock\`、\`rowLayout\`、\`coverImage\`）一处修多处
- **删除** \`props.mainAlign\`、\`props.crossAlign\`；横排改用 \`direction:'horizontal'\` + \`contentAlign\`
- **删除** template 内 \`bindings\`、\`themeRef()\`、\`$themeRef\` → 改为 COLORS / 字面量 px（程序也会自动 literalize）
- **emailRoot**：补 \`padding: { mode: 'unified', unified: '0' }\`；删 \`props.borderRadius\`
- 删除禁止字段：\`buttonStyle.padding\`、\`buttonStyle.fontWeight\`、\`wrapperStyle.margin\`
- 缺 \`backgroundImage\` 的 image → 补 \`coverImage\` / \`barcodeImage\` 形态
- 非法 \`border\`（无 mode 但含 width/style/color）→ 补 \`mode: 'unified'\` 保留描边；完全无法解析或校验要求补字段 → \`border: borderNone()\`
- 每个 text 必须有 \`italic: false\` 与 \`decoration: 'none'\`
- **禁止**改写 PEXELS/ICON 常量块中的 URL

${buildMjsValidateContractSection()}`;
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

  return `## validate 错误（须全部消除）
${errorLines.map((e, i) => `${i + 1}. ${e}`).join("\n")}

## 错误定位片段
${snippetSection}

## 当前完整 mjs（在此基础上打补丁，勿整文件重写）
\`\`\`javascript
${mjsSource}
\`\`\`

请只输出 SEARCH/REPLACE 补丁块。`;
}
