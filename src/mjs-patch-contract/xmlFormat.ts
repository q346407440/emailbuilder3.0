import { listMjsPatchSlotIdsForPrompt } from "./slots";

export type MjsPatchPromptMode = "slot" | "search" | "both";

/** 统一 XML patch 输出格式（prompt 真源；解析见 mjsPatchParse.ts）。 */
export function buildMjsPatchXmlFormatSection(mode: MjsPatchPromptMode): string {
  const slotBlock = `### slot 补丁（mother 底稿 / 带 @mjs-slot 锚点的 body）
- 只写 \`<replace>\` 内的新源码，**勿**抄锚点注释
- 删除模块：\`<replace></replace>\` 留空
- 合法 \`id\`：${listMjsPatchSlotIdsForPrompt()}

\`\`\`xml
<mjs-patches>
  <patch kind="slot" id="COLORS">
    <replace><![CDATA[
const COLORS = { primary: '#111', secondary: '#222', surface: '#F5F5F5' };
    ]]></replace>
  </patch>
  <patch kind="slot" id="buildS1">
    <replace><![CDATA[
function buildS1() {
  const sec = sectionShell(\`\${P}-s1\`, '首屏', { bg: COLORS.surface });
  sec.children = [textBlock(\`\${P}-s1-title\`, '标题', 'Hello')];
  return sec;
}
    ]]></replace>
  </patch>
  <patch kind="slot" id="buildS8">
    <replace></replace>
  </patch>
</mjs-patches>
\`\`\``;

  const searchBlock = `### search 补丁（完整 mjs validate 失败时）
- \`<search>\` 须与当前脚本逐字符一致（含缩进）
- 优先小范围修改；1～8 个 \`<patch kind="search">\`
- **同一 search 文本会在 merge 时全部替换**（replaceAll）；一条 patch 可修多处相同写法

\`\`\`xml
<mjs-patches>
  <patch kind="search">
    <search><![CDATA[
padding: { mode: 'unified' },
    ]]></search>
    <replace><![CDATA[
    ]]></replace>
  </patch>
</mjs-patches>
\`\`\``;

  const header = `## 输出格式（统一 XML patch 契约）
- **只输出** \`<mjs-patches>...</mjs-patches>\` XML，禁止 markdown 围栏、禁止整份 mjs
- 代码放 \`<![CDATA[ ... ]]>\` 内，避免转义
- **禁止**输出 shebang / import / writeFileSync`;

  if (mode === "slot") {
    return `${header}\n\n${slotBlock}`;
  }
  if (mode === "search") {
    return `${header}\n\n${searchBlock}`;
  }
  return `${header}\n\n${slotBlock}\n\n${searchBlock}`;
}
