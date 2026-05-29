/**
 * 测试邮件构建脚本共用：将带 \n 的演示文案展开为多段落 textBody。
 * HTML 会折叠单段落内的换行符，导致标签/说明两行文案被压成一行。
 */

/** @param {unknown} body */
export function textBodyFromString(body) {
  return {
    paragraphs: String(body)
      .split("\n")
      .map((line) => ({ runs: [{ text: line }] })),
  };
}
