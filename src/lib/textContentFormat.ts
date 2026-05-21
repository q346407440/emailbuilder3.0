function escapeHtml(raw: string): string {
  return raw
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function readNodeTextWithBreaks(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? "";
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return "";
  }
  const el = node as HTMLElement;
  if (el.tagName === "BR") {
    return "\n";
  }
  return Array.from(el.childNodes)
    .map((child) => readNodeTextWithBreaks(child))
    .join("");
}

/**
 * 将 HTML 内容转成适合文本域编辑的纯文本。
 * 约定：
 * - <p>/<div>/<li> 作为段落边界（换行分段）
 * - <br/> 作为段落内换行
 */
export function htmlToEditorPlainText(html: string): string {
  const source = typeof html === "string" ? html.trim() : "";
  if (!source) return "";

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${source}</div>`, "text/html");
  const root = doc.body.firstElementChild as HTMLElement | null;
  if (!root) return "";

  const blockTags = new Set(["P", "DIV", "LI"]);
  const parts: string[] = [];
  for (const node of Array.from(root.childNodes)) {
    if (node.nodeType === Node.ELEMENT_NODE && blockTags.has((node as HTMLElement).tagName)) {
      parts.push(readNodeTextWithBreaks(node).trim());
      continue;
    }
    const text = readNodeTextWithBreaks(node).trim();
    if (text) parts.push(text);
  }
  return parts.join("\n").trim();
}

/**
 * 将文本域输入回写为 HTML。
 * 约定：
 * - 连续空行切分段落（输出多个 <p>）
 * - 单行换行输出 <br/>
 */
export function editorPlainTextToHtml(plainText: string): string {
  const normalized = (plainText ?? "").replaceAll("\r\n", "\n").trim();
  if (!normalized) return "<p></p>";

  return normalized
    .split(/\n{2,}/)
    .map((paragraph) =>
      `<p>${paragraph
        .split("\n")
        .map((line) => escapeHtml(line))
        .join("<br/>")}</p>`
    )
    .join("");
}
