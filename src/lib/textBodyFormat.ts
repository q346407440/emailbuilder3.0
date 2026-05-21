import he from "he";
import type { TextBodyV1, TextDecoration, TextParagraph, TextRun } from "../types/email";

/** 将误存于 JSON 的 HTML 实体还原为 Unicode；再走 escapeHtml 生成快照 HTML */
function normalizeStoredPlainText(raw: string): string {
  if (!raw.includes("&")) return raw;
  return he.decode(raw);
}

function escapeHtml(raw: string): string {
  return raw
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(raw: string): string {
  return escapeHtml(raw);
}

const DECORATION_SET = new Set<TextDecoration>([
  "none",
  "underline",
  "line-through",
  "overline",
]);

function normalizeDecoration(raw: unknown): TextDecoration {
  return DECORATION_SET.has(raw as TextDecoration) ? (raw as TextDecoration) : "none";
}

export type TextBodyDefaults = {
  bold: boolean;
  italic: boolean;
  decoration: TextDecoration;
};

/** 单个 run 的 HTML 片段（供编辑器胶囊混排） */
export function renderTextRunHtml(run: TextRun, defaults: TextBodyDefaults): string {
  const text = typeof run.text === "string" ? run.text : "";
  return mergeRunHtml(text, run, defaults);
}

function mergeRunHtml(text: string, run: TextRun, defaults: TextBodyDefaults): string {
  if (!text) return "";
  let inner = escapeHtml(text);
  const effBold = run.bold !== undefined ? run.bold : defaults.bold;
  const effItalic = run.italic !== undefined ? run.italic : defaults.italic;
  const effDeco = run.decoration !== undefined ? run.decoration : defaults.decoration;
  const link = typeof run.link === "string" ? run.link.trim() : "";

  if (effBold) inner = `<strong>${inner}</strong>`;
  if (effItalic) inner = `<em>${inner}</em>`;
  if (effDeco === "underline") inner = `<u>${inner}</u>`;
  else if (effDeco === "line-through")
    inner = `<span style="text-decoration:line-through">${inner}</span>`;
  else if (effDeco === "overline")
    inner = `<span style="text-decoration:overline">${inner}</span>`;

  if (link) {
    /** 画布/编辑器与邮件客户端常见的默认链接样式（避免 color:inherit 导致无法辨认链接） */
    inner = `<a href="${escapeAttr(link)}" style="color:#1565c0;text-decoration:underline">${inner}</a>`;
  }
  return inner;
}

/** 将结构化正文渲染为邮件预览 HTML（runs 生成，非用户手写 `style=`） */
export function renderTextBodyToHtml(body: TextBodyV1, defaults: TextBodyDefaults): string {
  if (!body.paragraphs?.length) return "<p></p>";
  const parts: string[] = [];
  for (const para of body.paragraphs) {
    const runs = para.runs ?? [];
    let inner = "";
    for (const run of runs) {
      const t = typeof run.text === "string" ? run.text : "";
      inner += mergeRunHtml(t, run, defaults);
    }
    parts.push(`<p>${inner || "&nbsp;"}</p>`);
  }
  return parts.join("");
}

function trimRuns(runs: TextRun[]): TextRun[] {
  return runs.filter((r) => typeof r.text === "string" && r.text.length > 0);
}

function marksEqual(a: TextRun, b: TextRun): boolean {
  return (
    a.bold === b.bold &&
    a.italic === b.italic &&
    a.decoration === b.decoration &&
    (a.link ?? "") === (b.link ?? "")
  );
}

function mergeAdjacentRuns(runs: TextRun[]): TextRun[] {
  const out: TextRun[] = [];
  for (const r of runs) {
    const prev = out[out.length - 1];
    if (prev && marksEqual(prev, r)) {
      prev.text += r.text;
    } else {
      out.push({ ...r });
    }
  }
  return out;
}

type WalkMarks = {
  bold: boolean;
  italic: boolean;
  decoration: TextDecoration;
  link: string;
};

function walkNode(
  node: Node,
  marks: WalkMarks,
  defaults: TextBodyDefaults,
  runs: TextRun[],
  blockMarks: WalkMarks
): void {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? "";
    if (!text) return;
    const run: TextRun = {
      text,
      bold: marks.bold !== defaults.bold ? marks.bold : undefined,
      italic: marks.italic !== defaults.italic ? marks.italic : undefined,
      decoration:
        marks.decoration !== defaults.decoration ? marks.decoration : undefined,
      link: marks.link !== blockMarks.link ? marks.link : undefined,
    };
    runs.push(run);
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as HTMLElement;
  const tag = el.tagName;

  if (tag === "BR") {
    runs.push({
      text: "\n",
      bold: marks.bold !== defaults.bold ? marks.bold : undefined,
      italic: marks.italic !== defaults.italic ? marks.italic : undefined,
      decoration:
        marks.decoration !== defaults.decoration ? marks.decoration : undefined,
      link: marks.link !== blockMarks.link ? marks.link : undefined,
    });
    return;
  }

  let next = { ...marks };
  if (tag === "A") {
    const href = el.getAttribute("href")?.trim() ?? "";
    next = { ...next, link: href };
  } else if (tag === "STRONG" || tag === "B") {
    next = { ...next, bold: true };
  } else if (tag === "EM" || tag === "I") {
    next = { ...next, italic: true };
  } else if (tag === "U") {
    next = { ...next, decoration: "underline" };
  } else if (tag === "S" || tag === "STRIKE" || tag === "DEL") {
    next = { ...next, decoration: "line-through" };
  } else if (tag === "SPAN") {
    const td = el.style.textDecorationLine || el.style.textDecoration;
    if (td.includes("line-through")) next = { ...next, decoration: "line-through" };
    else if (td.includes("overline")) next = { ...next, decoration: "overline" };
    else if (td.includes("underline")) next = { ...next, decoration: "underline" };
  }

  for (const child of Array.from(el.childNodes)) {
    walkNode(child, next, defaults, runs, blockMarks);
  }
}

/**
 * 将编辑器/片段 HTML 解析为 TextBodyV1（用于 contenteditable 回写）。
 */
export function parseHtmlToTextBody(html: string, defaults: TextBodyDefaults): TextBodyV1 {
  const source = typeof html === "string" ? html.trim() : "";
  if (!source) {
    return { version: 1, paragraphs: [{ runs: [] }] };
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${source}</div>`, "text/html");
  const root = doc.body.firstElementChild as HTMLElement | null;
  if (!root) return { version: 1, paragraphs: [{ runs: [] }] };

  const paragraphs: TextParagraph[] = [];
  const blockMarks: WalkMarks = {
    bold: defaults.bold,
    italic: defaults.italic,
    decoration: defaults.decoration,
    link: "",
  };

  const blockTags = new Set(["P", "DIV", "LI"]);

  const flushRuns = (runs: TextRun[]) => {
    const merged = mergeAdjacentRuns(trimRuns(runs));
    paragraphs.push({
      runs: merged.length ? merged : [{ text: "\u00a0" }],
    });
  };

  for (const node of Array.from(root.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = (node.textContent ?? "").trim();
      if (!t) continue;
      flushRuns([
        {
          text: t,
        },
      ]);
      continue;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) continue;
    const el = node as HTMLElement;
    if (blockTags.has(el.tagName)) {
      const runs: TextRun[] = [];
      walkNode(el, { ...blockMarks }, defaults, runs, blockMarks);
      flushRuns(runs);
    } else {
      const runs: TextRun[] = [];
      walkNode(el, { ...blockMarks }, defaults, runs, blockMarks);
      if (runs.length) flushRuns(runs);
    }
  }

  if (!paragraphs.length) {
    return { version: 1, paragraphs: [{ runs: [] }] };
  }
  return { version: 1, paragraphs };
}

/** 从旧版 props.content 生成初始 textBody */
export function legacyContentHtmlToTextBody(
  html: string,
  defaults: TextBodyDefaults
): TextBodyV1 {
  return parseHtmlToTextBody(html, defaults);
}

export function normalizeTextBody(raw: unknown): TextBodyV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.version !== 1) return null;
  const paras = o.paragraphs;
  if (!Array.isArray(paras)) return null;
  const paragraphs: TextParagraph[] = [];
  for (const p of paras) {
    if (!p || typeof p !== "object") continue;
    const runsRaw = (p as Record<string, unknown>).runs;
    if (!Array.isArray(runsRaw)) continue;
    const runs: TextRun[] = [];
    for (const r of runsRaw) {
      if (!r || typeof r !== "object") continue;
      const tr = r as Record<string, unknown>;
      const rawText = typeof tr.text === "string" ? tr.text : "";
      const text = normalizeStoredPlainText(rawText);
      runs.push({
        text,
        bold: typeof tr.bold === "boolean" ? tr.bold : undefined,
        italic: typeof tr.italic === "boolean" ? tr.italic : undefined,
        decoration:
          tr.decoration !== undefined
            ? normalizeDecoration(tr.decoration)
            : undefined,
        link: typeof tr.link === "string" ? tr.link : undefined,
      });
    }
    paragraphs.push({ runs });
  }
  if (!paragraphs.length) return { version: 1, paragraphs: [{ runs: [] }] };
  return { version: 1, paragraphs };
}

/** 将结构化正文压平为纯文本（段落间换行），供整段绑定变量预览用 */
export function textBodyToPlainString(body: TextBodyV1): string {
  return body.paragraphs
    .map((para) => (para.runs ?? []).map((run) => run.text ?? "").join(""))
    .filter((line, index, lines) => line.length > 0 || (index < lines.length - 1 && lines[index + 1]!.length > 0))
    .join("\n")
    .trim();
}
