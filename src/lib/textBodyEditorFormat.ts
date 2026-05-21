import type { BindingSpec, EmailBlock } from "../types/email";
import type { TextBodyDefaults } from "./textBodyFormat";
import { parseHtmlToTextBody, renderTextRunHtml } from "./textBodyFormat";
import type { TextBodyV1, TextRun } from "../types/email";

const TEXT_RUN_TEXT_BIND_RE = /^props\.textBody\.paragraphs\.(\d+)\.runs\.(\d+)\.text$/;
const TEXT_RUN_LINK_BIND_RE = /^props\.textBody\.paragraphs\.(\d+)\.runs\.(\d+)\.link$/;

export const TEXT_BODY_VAR_PILL_CLASS = "text-rich-editor__var-pill";
export const TEXT_BODY_VAR_PILL_TEXT_CLASS = "text-rich-editor__var-pill__text";
export const TEXT_BODY_VAR_PILL_INNER_LINK_CLASS = "text-rich-editor__var-pill__link";
/** @deprecated 使用 TEXT_BODY_VAR_PILL_INNER_LINK_CLASS */
export const TEXT_BODY_VAR_PILL_LINK_CLASS = TEXT_BODY_VAR_PILL_INNER_LINK_CLASS;
export const TEXT_BODY_VAR_PILL_BIND_ATTR = "data-ee-text-bind";

/** 正文中单个 run 的 variable 绑定（text + 可选 link） */
export type TextBodyVariableRunMeta = {
  paragraphIndex: number;
  runIndex: number;
  textBindPath: string;
  linkBindPath?: string;
  slotId: string;
  label: string;
  displayText: string;
  displayLink: string;
  preservedRun: TextRun;
};

function parseRunIndexFromBindPath(bindPath: string, re: RegExp): { pi: number; ri: number } | null {
  const m = bindPath.match(re);
  if (!m) return null;
  return { pi: Number(m[1]), ri: Number(m[2]) };
}

function readRun(body: TextBodyV1, pi: number, ri: number): TextRun | null {
  const run = body.paragraphs[pi]?.runs?.[ri];
  if (!run || typeof run.text !== "string") return null;
  return run;
}

/** 收集 textBody 上 mode=variable 的 run 级绑定，供编辑器胶囊渲染 */
export function collectTextBodyVariableRuns(
  body: TextBodyV1,
  bindings: EmailBlock["bindings"] | undefined,
  resolveDisplay: (bindPath: string) => string
): TextBodyVariableRunMeta[] {
  const linkByRun = new Map<string, { bindPath: string; spec: BindingSpec }>();
  for (const [bindPath, spec] of Object.entries(bindings ?? {})) {
    if (spec.mode !== "variable") continue;
    const idx = parseRunIndexFromBindPath(bindPath, TEXT_RUN_LINK_BIND_RE);
    if (!idx) continue;
    linkByRun.set(`${idx.pi}:${idx.ri}`, { bindPath, spec });
  }

  const out: TextBodyVariableRunMeta[] = [];
  for (const [bindPath, spec] of Object.entries(bindings ?? {})) {
    if (spec.mode !== "variable") continue;
    const idx = parseRunIndexFromBindPath(bindPath, TEXT_RUN_TEXT_BIND_RE);
    if (!idx) continue;
    const preserved = readRun(body, idx.pi, idx.ri);
    if (!preserved) continue;
    const linkEntry = linkByRun.get(`${idx.pi}:${idx.ri}`);
    const displayText = resolveDisplay(bindPath) || preserved.text;
    const resolvedLink = linkEntry ? resolveDisplay(linkEntry.bindPath) : "";
    const displayLink =
      (typeof resolvedLink === "string" && resolvedLink.trim()) ||
      preserved.link?.trim() ||
      "";
    out.push({
      paragraphIndex: idx.pi,
      runIndex: idx.ri,
      textBindPath: bindPath,
      linkBindPath: linkEntry?.bindPath,
      slotId: spec.slotId,
      label: spec.label?.trim() || spec.slotId,
      displayText,
      displayLink,
      preservedRun: { ...preserved },
    });
  }
  out.sort((a, b) => a.paragraphIndex - b.paragraphIndex || a.runIndex - b.runIndex);
  return out;
}

function escapeAttr(raw: string): string {
  return raw
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");
}

function renderVariablePill(meta: TextBodyVariableRunMeta): string {
  const hasLink = !!meta.displayLink.trim();
  const title = hasLink
    ? `${meta.label}（${meta.slotId}）· ${meta.displayLink}`
    : `${meta.label}（${meta.slotId}）`;
  const inner = meta.displayText.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const shellAttrs =
    `${TEXT_BODY_VAR_PILL_BIND_ATTR}="${escapeAttr(meta.textBindPath)}"` +
    ` contenteditable="false" title="${escapeAttr(title)}"` +
    ` data-ee-slot="${escapeAttr(meta.slotId)}"` +
    ` data-ee-pi="${meta.paragraphIndex}" data-ee-ri="${meta.runIndex}"`;

  const shellAttrsWithLink = hasLink ? `${shellAttrs} data-ee-link="${escapeAttr(meta.displayLink)}"` : shellAttrs;

  const innerHtml = hasLink
    ? `<a href="${escapeAttr(meta.displayLink)}" class="${TEXT_BODY_VAR_PILL_INNER_LINK_CLASS}">${inner}</a>`
    : `<span class="${TEXT_BODY_VAR_PILL_TEXT_CLASS}">${inner}</span>`;

  return `<span class="${TEXT_BODY_VAR_PILL_CLASS}" ${shellAttrsWithLink}>${innerHtml}</span>`;
}

/** 编辑器专用 HTML：variable 绑定的 run 渲染为不可编辑胶囊 */
export function renderTextBodyToEditorHtml(
  body: TextBodyV1,
  defaults: TextBodyDefaults,
  variableRuns: TextBodyVariableRunMeta[]
): string {
  if (!body.paragraphs?.length) return "<p></p>";
  const varAt = new Map<string, TextBodyVariableRunMeta>();
  for (const meta of variableRuns) {
    varAt.set(`${meta.paragraphIndex}:${meta.runIndex}`, meta);
  }

  const parts: string[] = [];
  body.paragraphs.forEach((para, pi) => {
    const runs = para.runs ?? [];
    let inner = "";
    runs.forEach((run, ri) => {
      const meta = varAt.get(`${pi}:${ri}`);
      if (meta) {
        inner += renderVariablePill(meta);
        return;
      }
      inner += renderTextRunHtml(run, defaults);
    });
    parts.push(`<p>${inner || "&nbsp;"}</p>`);
  });
  return parts.join("");
}

function mergePreservedVariableRuns(
  parsed: TextBodyV1,
  sourceBody: TextBodyV1,
  variableRuns: TextBodyVariableRunMeta[]
): TextBodyV1 {
  if (!variableRuns.length) return parsed;

  const paragraphs = parsed.paragraphs.map((para, pi) => {
    const runs = (para.runs ?? []).map((run, ri) => {
      const meta = variableRuns.find((m) => m.paragraphIndex === pi && m.runIndex === ri);
      if (meta) return { ...meta.preservedRun };
      return run;
    });
    return { runs };
  });

  return { version: 1, paragraphs };
}

/**
 * 解析编辑器 HTML；variable 胶囊对应 run 保留模板内原文（避免把 payload 预览值写回 template）。
 */
export function parseEditorHtmlToTextBody(
  html: string,
  defaults: TextBodyDefaults,
  sourceBody: TextBodyV1,
  variableRuns: TextBodyVariableRunMeta[]
): TextBodyV1 {
  const parsed = parseHtmlToTextBody(html, defaults);
  if (!variableRuns.length) return parsed;
  return mergePreservedVariableRuns(parsed, sourceBody, variableRuns);
}

/** 从编辑器 DOM 胶囊读取当前展示用的链接（与 render 的 data-ee-link / 内层 a 一致） */
export function readLinkHrefFromVariablePill(pill: HTMLElement): string {
  const fromData = pill.getAttribute("data-ee-link")?.trim();
  if (fromData) return fromData;
  const inner = pill.querySelector(`.${TEXT_BODY_VAR_PILL_INNER_LINK_CLASS}`);
  return inner?.getAttribute("href")?.trim() ?? "";
}
