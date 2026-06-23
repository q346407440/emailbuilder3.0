/** 组装 textBody.paragraphs 时的单段 run（与 template textBody 形态对齐）。 */
export type TextParagraphDraft = {
  runs: Array<{ text: string; bold?: boolean }>;
};

/**
 * 将 RestoreAst `text.content` 展开为 textBody.paragraphs。
 * JSON 字符串内的 `\n` 表示设计稿刻意断行（一段 text 节点、多段落）；勿在 content 里写 HTML。
 */
export function splitTextContentToParagraphs(
  content: string,
  runMarks: { bold?: boolean }
): TextParagraphDraft[] {
  const normalized = content.replace(/\r\n?/g, "\n");
  if (!normalized.includes("\n")) {
    return [
      {
        runs: [{ text: content, ...(runMarks.bold ? { bold: true } : {}) }],
      },
    ];
  }
  return normalized.split("\n").map((line) => ({
    runs: [{ text: line, ...(runMarks.bold ? { bold: true } : {}) }],
  }));
}
