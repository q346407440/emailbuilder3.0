/** MR:MjsGenerate 整段重写时追加到 user 文本末尾的说明。 */
export function buildMjsFullRegenHint(feedback: {
  previousOutput: string;
  errors: string[];
}): string {
  const tail = feedback.previousOutput.slice(-4000);
  return `

---
上一轮 body 无效、被截断或 node 执行失败，请重新输出 **body 段**（从 COLORS/助手函数到 const template 结束）。
**不要** shebang/import/路径/writeFileSync；**禁止**自编 URL；用 PEXELS.* / ICON.* 与 \`\${P}-…\` 引用。
请针对下列错误逐条消除后再输出完整 body。

错误：
${feedback.errors.map((e, i) => `${i + 1}. ${e}`).join("\n")}

上一轮 body 末尾片段（供对照补全）：
\`\`\`javascript
${tail}
\`\`\``;
}
