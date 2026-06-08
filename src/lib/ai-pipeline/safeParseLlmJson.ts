/** 宽松 JSON 解析：兼容 markdown 包裹、前后缀说明、尾逗号等。 */
export function safeParseLlmJson(raw: string): unknown | null {
  let text = raw.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)```\s*$/i.exec(text);
  if (fenced) text = fenced[1]!.trim();

  try {
    return JSON.parse(text);
  } catch {
    /* continue */
  }

  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    const parsed = tryParseJson(arrayMatch[0]);
    if (parsed != null) return parsed;
  }

  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    const parsed = tryParseJson(objectMatch[0]);
    if (parsed != null) return parsed;
  }

  return null;
}

function tryParseJson(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    const fixed = fixCommonJsonErrors(text);
    try {
      return JSON.parse(fixed);
    } catch {
      return null;
    }
  }
}

function fixCommonJsonErrors(text: string): string {
  return text
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/'/g, '"');
}
