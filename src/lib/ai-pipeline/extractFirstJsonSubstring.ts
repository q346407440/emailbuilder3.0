/** 从含前后缀杂质的文本中提取第一段完整 JSON 对象/数组子串。 */
export function extractFirstJsonSubstring(text: string): string | null {
  const start = text.search(/[\[{]/);
  if (start < 0) return null;

  const stack: string[] = [];
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i += 1) {
    const ch = text[i]!;
    if (inString) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{" || ch === "[") {
      stack.push(ch);
      continue;
    }
    if (ch === "}") {
      if (stack.pop() !== "{") return null;
      if (stack.length === 0) return text.slice(start, i + 1);
      continue;
    }
    if (ch === "]") {
      if (stack.pop() !== "[") return null;
      if (stack.length === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}
