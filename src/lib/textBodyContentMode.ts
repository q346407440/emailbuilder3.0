import type { TextBlock, TextBodyV1, TextRun } from "../types/email";

/** 结构化正文在 Inspector 中的三种内容态 */
export type TextBodyContentMode = "literal" | "inlineVariable" | "wholeVariable";

const TEXT_RUN_TEXT_BIND_RE = /^props\.textBody\.paragraphs\.(\d+)\.runs\.(\d+)\.text$/;
const WHOLE_INTERPOLATE_RE = /^\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}$/;

function listNonEmptyRuns(body: TextBodyV1): Array<{ paragraphIndex: number; runIndex: number; run: TextRun }> {
  const out: Array<{ paragraphIndex: number; runIndex: number; run: TextRun }> = [];
  body.paragraphs.forEach((para, paragraphIndex) => {
    (para.runs ?? []).forEach((run, runIndex) => {
      if (typeof run.text === "string" && run.text.trim()) {
        out.push({ paragraphIndex, runIndex, run });
      }
    });
  });
  return out;
}

/** 整段正文由单一变量/interpolate 占位承载时的绑定路径 */
export function getWholeTextBodyVariableBindPath(
  block: TextBlock,
  body: TextBodyV1 | null
): string | null {
  if (block.bindings?.["props.textBody"]?.mode === "variable") return "props.textBody";
  if (!body) return null;

  const runs = listNonEmptyRuns(body);
  if (runs.length !== 1) return null;

  const { paragraphIndex, runIndex, run } = runs[0]!;
  const textPath = `props.textBody.paragraphs.${paragraphIndex}.runs.${runIndex}.text`;
  const spec = block.bindings?.[textPath];
  if (!spec) return null;
  if (spec.mode === "variable") return textPath;
  if (spec.mode === "interpolate" && WHOLE_INTERPOLATE_RE.test(run.text.trim())) return textPath;
  return null;
}

/** 判定正文（结构化）字段当前处于自由 / 文中变量 / 整段变量 */
export function getTextBodyContentMode(block: TextBlock, body: TextBodyV1 | null): TextBodyContentMode {
  if (getWholeTextBodyVariableBindPath(block, body)) return "wholeVariable";

  const hasInline = Object.entries(block.bindings ?? {}).some(([bindPath, spec]) => {
    if (!bindPath.startsWith("props.textBody.")) return false;
    if (spec.mode === "interpolate") return true;
    return spec.mode === "variable" && TEXT_RUN_TEXT_BIND_RE.test(bindPath);
  });
  if (hasInline) return "inlineVariable";
  return "literal";
}

/** 标题旁来源胶囊菜单所依附的代表性绑定路径（整段仅一个胶囊） */
export function getTextBodyFieldSourceBindPath(
  block: TextBlock,
  body: TextBodyV1 | null,
  mode: TextBodyContentMode
): string {
  if (mode === "wholeVariable") {
    return getWholeTextBodyVariableBindPath(block, body) ?? "props.textBody";
  }

  if (mode === "inlineVariable") {
    for (const [bindPath, spec] of Object.entries(block.bindings ?? {})) {
      if (bindPath.startsWith("props.textBody.") && spec.mode === "interpolate") return bindPath;
    }
    for (const [bindPath, spec] of Object.entries(block.bindings ?? {})) {
      if (spec.mode === "variable" && TEXT_RUN_TEXT_BIND_RE.test(bindPath)) return bindPath;
    }
  }

  if (body) {
    for (let pi = 0; pi < body.paragraphs.length; pi++) {
      const runs = body.paragraphs[pi]?.runs ?? [];
      for (let ri = 0; ri < runs.length; ri++) {
        if (typeof runs[ri]?.text === "string" && runs[ri]!.text.trim()) {
          return `props.textBody.paragraphs.${pi}.runs.${ri}.text`;
        }
      }
    }
  }
  return "props.textBody.paragraphs.0.runs.0.text";
}
