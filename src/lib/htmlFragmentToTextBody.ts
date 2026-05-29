/**
 * 将遗留 HTML 片段（通常为 props.content）解析为结构化正文，供迁移脚本与 YAML 展开器共用。
 */
import { NodeType, parse, TextNode } from "node-html-parser";
import type { TextBody, TextDecoration } from "../types/email";
import type { TextBodyDefaults } from "./textBodyFormat";

type RunLike = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  decoration?: TextDecoration;
  link?: string;
};

type WalkMarks = {
  bold: boolean;
  italic: boolean;
  decoration: TextDecoration;
  link: string;
};

function marksToRun(text: string, marks: WalkMarks, defaults: TextBodyDefaults): RunLike {
  const run: RunLike = { text };
  if (marks.bold !== defaults.bold) run.bold = marks.bold;
  if (marks.italic !== defaults.italic) run.italic = marks.italic;
  if (marks.decoration !== defaults.decoration) run.decoration = marks.decoration;
  const link = marks.link?.trim();
  if (link) run.link = link;
  return run;
}

function sameMarks(a: RunLike, b: RunLike): boolean {
  return (
    a.bold === b.bold &&
    a.italic === b.italic &&
    a.decoration === b.decoration &&
    (a.link ?? "") === (b.link ?? "")
  );
}

function pushRun(runs: RunLike[], next: RunLike) {
  if (!next.text) return;
  const last = runs[runs.length - 1];
  if (last && sameMarks(last, next)) {
    last.text += next.text;
    return;
  }
  runs.push(next);
}

function walkNode(
  node: import("node-html-parser").Node,
  marks: WalkMarks,
  defaults: TextBodyDefaults,
  runs: RunLike[]
) {
  if (node.nodeType === NodeType.TEXT_NODE) {
    /** 使用解码后的文本（&#39; → '），避免 rawText 把实体原样写入 runs */
    const text = (node as TextNode).text ?? "";
    if (!text) return;
    pushRun(runs, marksToRun(text, marks, defaults));
    return;
  }
  if (node.nodeType !== NodeType.ELEMENT_NODE) return;

  const el = node as import("node-html-parser").HTMLElement;
  const tag = el.tagName.toUpperCase();
  if (tag === "BR") {
    pushRun(runs, marksToRun("\n", marks, defaults));
    return;
  }

  const next = { ...marks };
  if (tag === "A") {
    next.link = el.getAttribute("href")?.trim() ?? "";
  } else if (tag === "STRONG" || tag === "B") {
    next.bold = true;
  } else if (tag === "EM" || tag === "I") {
    next.italic = true;
  } else if (tag === "U") {
    next.decoration = "underline";
  } else if (tag === "S" || tag === "STRIKE" || tag === "DEL") {
    next.decoration = "line-through";
  } else if (tag === "SPAN") {
    const style = (el.getAttribute("style") ?? "").toLowerCase();
    if (style.includes("line-through")) next.decoration = "line-through";
    else if (style.includes("overline")) next.decoration = "overline";
    else if (style.includes("underline")) next.decoration = "underline";
  }

  for (const child of el.childNodes) {
    walkNode(child, next, defaults, runs);
  }
}

const EMPTY_TEXT_BODY: TextBody = { paragraphs: [{ runs: [] }] };

/** 从 HTML 片段生成 textBody（段落拆分规则与 migrate:text-body 一致）。 */
export function htmlFragmentToTextBody(html: string, defaults: TextBodyDefaults): TextBody {
  const source = typeof html === "string" ? html.trim() : "";
  const baseMarks: WalkMarks = {
    bold: defaults.bold,
    italic: defaults.italic,
    decoration: defaults.decoration,
    link: "",
  };
  if (!source) return EMPTY_TEXT_BODY;

  const root = parse(`<div>${source}</div>`);
  const container = root.firstElementChild;
  if (!container) return EMPTY_TEXT_BODY;

  const paragraphs: Array<{ runs: RunLike[] }> = [];
  const blockTags = new Set(["P", "DIV", "LI"]);
  const flush = (runs: RunLike[]) => {
    const normalized = runs.filter((r) => typeof r.text === "string" && r.text.length > 0);
    paragraphs.push({ runs: normalized.length ? normalized : [{ text: "\u00a0" }] });
  };

  for (const node of container.childNodes) {
    if (node.nodeType === NodeType.TEXT_NODE) {
      const text = ((node as TextNode).text ?? "").trim();
      if (!text) continue;
      flush([marksToRun(text, baseMarks, defaults)]);
      continue;
    }
    if (node.nodeType !== NodeType.ELEMENT_NODE) continue;
    const el = node as import("node-html-parser").HTMLElement;
    const runs: RunLike[] = [];
    if (blockTags.has(el.tagName.toUpperCase())) {
      for (const child of el.childNodes) {
        walkNode(child, { ...baseMarks }, defaults, runs);
      }
      flush(runs);
      continue;
    }
    walkNode(el, { ...baseMarks }, defaults, runs);
    if (runs.length) flush(runs);
  }

  if (!paragraphs.length) return EMPTY_TEXT_BODY;
  return { paragraphs };
}
