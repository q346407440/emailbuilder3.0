import { ClearOutlined } from "@ant-design/icons";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEventHandler,
  type MouseEventHandler,
} from "react";
import { ColorPicker } from "antd";
import { toastError } from "../lib/appToast";
import type { AggregationColor } from "antd/es/color-picker/color";
import type { EmailPayload, TextBody } from "../types/email";
import type { ExternalVariableSlotInfo } from "../lib/payloadSlots";
import type { TextBodyDefaults } from "../lib/textBodyFormat";
import { TextBodyInlineVariableModal } from "./TextBodyInlineVariableModal";
import { parseHtmlToTextBody, renderTextBodyToHtml, normalizeTextBody } from "../lib/textBodyFormat";
import {
  parseEditorHtmlToTextBody,
  readLinkHrefFromVariablePill,
  renderTextBodyToEditorHtml,
  TEXT_BODY_VAR_PILL_BIND_ATTR,
  TEXT_BODY_VAR_PILL_CLASS,
  type TextBodyVariableRunMeta,
} from "../lib/textBodyEditorFormat";
import { ShopInput, ShopPrimaryButton, ShopSecondaryButton, ShopUnitInput, type InputRef } from "./ui/ShopFormControls";
import { ShopSectionModal } from "./ui/ShopSectionModal";
import { useAdaptiveOverlayEdge } from "../hooks/useAdaptiveOverlayEdge";
import { toAntdPlacement } from "../lib/antdOverlayEdge";
import { parseCssColorToRgba, rgbaForPicker, rgbaToCss } from "../lib/colorCss";

type Props = {
  /** 用于在外层模板变更时重置编辑器内容 */
  editorKey: string;
  textBody: TextBody;
  defaults: TextBodyDefaults;
  onCommit: (next: TextBody) => void;
  payload?: EmailPayload | null;
  externalVariableSlots?: ExternalVariableSlotInfo[];
  onInlineVariableFromSelection?: (args: {
    kind: "bind" | "create";
    slotId: string;
    label: string;
    defaultValue: string;
    nextTextBody: TextBody;
    valueType?: string;
  }) => void;
  /** 正文 run 级 variable 绑定：编辑器内以胶囊展示 */
  variableRuns?: TextBodyVariableRunMeta[];
  onVariablePillClick?: (meta: TextBodyVariableRunMeta) => void;
  onVariablePillDetach?: (meta: TextBodyVariableRunMeta) => void;
  onVariableRunLinkChange?: (meta: TextBodyVariableRunMeta, href: string) => void;
  onVariableRunLinkClear?: (meta: TextBodyVariableRunMeta) => void;
};

function findAncestorAnchor(node: Node | null, root: HTMLElement): HTMLAnchorElement | null {
  let n: Node | null = node;
  while (n && n !== root) {
    if (n.nodeType === Node.ELEMENT_NODE && (n as HTMLElement).tagName === "A") {
      return n as HTMLAnchorElement;
    }
    n = n.parentNode;
  }
  return null;
}

function rangeInsideEditor(range: Range, root: HTMLElement): boolean {
  const raw = range.commonAncestorContainer;
  const el = raw.nodeType === Node.ELEMENT_NODE ? (raw as Element) : raw.parentElement;
  return !!(el && root.contains(el));
}

/** 规范化用户输入的 URL；无效返回 null */
function normalizeUserHref(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  if (/^javascript:/i.test(s)) return null;
  if (/^(mailto:|tel:|sms:)/i.test(s)) return s;
  if (s.startsWith("/") || s.startsWith("./") || s.startsWith("../")) return s;
  try {
    const u = new URL(s);
    if (u.protocol === "http:" || u.protocol === "https:") return u.href;
  } catch {
    /* 继续尝试补全协议 */
  }
  try {
    const u = new URL(`https://${s}`);
    if (u.hostname.includes(".")) return u.href;
  } catch {
    return null;
  }
  return null;
}

/** 选区纯文本预览（用于链接对话框标题旁提示） */
function selectionPlainPreview(range: Range | null): string {
  if (!range) return "";
  try {
    const frag = range.cloneContents();
    const div = document.createElement("div");
    div.appendChild(frag);
    const t = (div.textContent ?? "").replace(/\s+/g, " ").trim();
    if (!t) return "";
    const maxLen = 80;
    return t.length <= maxLen ? t : `${t.slice(0, maxLen - 1)}…`;
  } catch {
    return "";
  }
}

function findVariablePillElement(node: Node | null, root: HTMLElement): HTMLElement | null {
  let n: Node | null = node;
  while (n && n !== root) {
    if (n.nodeType === Node.ELEMENT_NODE) {
      const el = n as HTMLElement;
      if (el.hasAttribute(TEXT_BODY_VAR_PILL_BIND_ATTR)) return el;
    }
    n = n.parentNode;
  }
  return null;
}

function metaFromPillElement(
  pill: HTMLElement,
  variableRuns: TextBodyVariableRunMeta[]
): TextBodyVariableRunMeta | null {
  const bindPath = pill.getAttribute(TEXT_BODY_VAR_PILL_BIND_ATTR);
  if (!bindPath) return null;
  return variableRuns.find((m) => m.textBindPath === bindPath) ?? null;
}

const TEXT_BODY_VAR_PILL_SELECTED_CLASS = "text-rich-editor__var-pill--selected";
const TEXT_COLOR_FALLBACK = "#000000";
const RUN_FONT_SIZE_FALLBACK = "14px";

function normalizeRunFontSizePx(raw: string): string | null {
  const t = raw.trim();
  if (/^\d+(\.\d+)?px$/i.test(t)) {
    const n = Math.round(Number(t.slice(0, -2)));
    if (!Number.isFinite(n) || n < 0) return null;
    return `${n}px`;
  }
  const numeric = t.toLowerCase().endsWith("px") ? t.slice(0, -2).trim() : t;
  if (!/^\d+(\.\d+)?$/.test(numeric)) return null;
  const n = Math.round(Number(numeric));
  if (!Number.isFinite(n) || n < 0) return null;
  return `${n}px`;
}

function styleHostFromNode(node: Node, root: HTMLElement): HTMLElement | null {
  const el = (node.nodeType === Node.TEXT_NODE ? node.parentElement : node) as HTMLElement | null;
  if (!el || !root.contains(el)) return null;
  return el;
}

function collectStyledTextHostsInRange(range: Range, root: HTMLElement): HTMLElement[] {
  if (range.collapsed) {
    const host = styleHostFromNode(range.startContainer, root);
    return host ? [host] : [];
  }
  const hosts: HTMLElement[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (!range.intersectsNode(node)) continue;
    const fullText = node.textContent ?? "";
    if (!fullText) continue;
    const startOffset = node === range.startContainer ? range.startOffset : 0;
    const endOffset = node === range.endContainer ? range.endOffset : fullText.length;
    if (endOffset <= startOffset) continue;
    const slice = fullText.slice(startOffset, endOffset);
    if (!slice.trim()) continue;
    hosts.push(node.parentElement ?? root);
  }
  return hosts;
}

function isBoldHost(el: HTMLElement): boolean {
  const weight = window.getComputedStyle(el).fontWeight;
  const n = Number(weight);
  return weight === "bold" || weight === "bolder" || (Number.isFinite(n) && n >= 700);
}

function isItalicHost(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el).fontStyle;
  return style === "italic" || style === "oblique";
}

function hasTextDecorationLine(el: HTMLElement, line: "underline" | "line-through"): boolean {
  return window.getComputedStyle(el).textDecorationLine.includes(line);
}

function readFormatEchoInRange(range: Range, root: HTMLElement): {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikeThrough: boolean;
} {
  const hosts = collectStyledTextHostsInRange(range, root);
  if (!hosts.length) {
    return { bold: false, italic: false, underline: false, strikeThrough: false };
  }
  const isUniformActive = (values: Set<boolean>) => values.size === 1 && [...values][0] === true;
  return {
    bold: isUniformActive(new Set(hosts.map(isBoldHost))),
    italic: isUniformActive(new Set(hosts.map(isItalicHost))),
    underline: isUniformActive(new Set(hosts.map((h) => hasTextDecorationLine(h, "underline")))),
    strikeThrough: isUniformActive(new Set(hosts.map((h) => hasTextDecorationLine(h, "line-through")))),
  };
}

function resolveFontSizeEchoInRange(range: Range, root: HTMLElement): string | null {
  const hosts = collectStyledTextHostsInRange(range, root);
  if (!hosts.length) return null;
  const sizes = new Set<string>();
  for (const host of hosts) {
    const computedSize = window.getComputedStyle(host).fontSize?.trim();
    const normalized = computedSize ? normalizeRunFontSizePx(computedSize) : null;
    if (!normalized) continue;
    sizes.add(normalized);
    if (sizes.size > 1) return null;
  }
  return sizes.size === 1 ? [...sizes][0]! : null;
}

function resolveSingleFontSizeInRange(range: Range, root: HTMLElement): string | null {
  if (range.collapsed) return null;
  return resolveFontSizeEchoInRange(range, root);
}

function applyFontSizeToRange(range: Range, fontSize: string): void {
  const frag = range.extractContents();
  const span = document.createElement("span");
  span.style.fontSize = fontSize;
  span.appendChild(frag);
  range.insertNode(span);
  const sel = window.getSelection();
  if (!sel) return;
  const nextRange = document.createRange();
  nextRange.selectNodeContents(span);
  sel.removeAllRanges();
  sel.addRange(nextRange);
}

function findVariablePillsInRange(range: Range, root: HTMLElement): HTMLElement[] {
  const pills: HTMLElement[] = [];
  root.querySelectorAll(`.${TEXT_BODY_VAR_PILL_CLASS}`).forEach((node) => {
    const pill = node as HTMLElement;
    try {
      if (range.intersectsNode(pill)) pills.push(pill);
    } catch {
      /* ignore */
    }
  });
  return pills;
}

function resolveVariablePillForRange(range: Range, root: HTMLElement): HTMLElement | null {
  const direct = findVariablePillElement(range.commonAncestorContainer, root);
  if (direct) return direct;
  const hits = findVariablePillsInRange(range, root);
  return hits.length === 1 ? hits[0]! : hits[0] ?? null;
}

function resolveLinkDraftForVariablePill(
  pill: HTMLElement,
  meta: TextBodyVariableRunMeta
): string {
  return (
    meta.displayLink.trim() ||
    readLinkHrefFromVariablePill(pill) ||
    meta.preservedRun.link?.trim() ||
    ""
  );
}

function syncVariablePillSelectionHighlight(root: HTMLElement | null) {
  if (!root) return;
  root.querySelectorAll(`.${TEXT_BODY_VAR_PILL_SELECTED_CLASS}`).forEach((el) => {
    el.classList.remove(TEXT_BODY_VAR_PILL_SELECTED_CLASS);
  });
  const sel = window.getSelection();
  if (!sel?.rangeCount) return;
  if (!root.contains(sel.anchorNode) && !root.contains(sel.focusNode)) return;
  let range: Range;
  try {
    range = sel.getRangeAt(0);
  } catch {
    return;
  }
  if (!rangeInsideEditor(range, root)) return;

  const pills = new Set<HTMLElement>();
  if (range.collapsed) {
    const pill = findVariablePillElement(range.startContainer, root);
    if (pill) pills.add(pill);
  } else {
    findVariablePillsInRange(range, root).forEach((p) => pills.add(p));
  }
  pills.forEach((p) => p.classList.add(TEXT_BODY_VAR_PILL_SELECTED_CLASS));
}

function anchorTextPreview(anchor: HTMLAnchorElement | null): string {
  if (!anchor) return "";
  const t = (anchor.textContent ?? "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  const maxLen = 80;
  return t.length <= maxLen ? t : `${t.slice(0, maxLen - 1)}…`;
}

function resolveTextColorEchoInRange(range: Range, root: HTMLElement): string | null {
  const hosts = collectStyledTextHostsInRange(range, root);
  if (!hosts.length) return null;
  const colors = new Set<string>();
  for (const host of hosts) {
    const rgba = parseCssColorToRgba(window.getComputedStyle(host).color);
    if (!rgba) continue;
    colors.add(rgbaToCss(rgba));
    if (colors.size > 1) return null;
  }
  return colors.size === 1 ? [...colors][0]! : null;
}

function textBodyJsonEqual(a: TextBody | null, b: TextBody | null): boolean {
  if (!a || !b) return a === b;
  return JSON.stringify(a) === JSON.stringify(b);
}

/** 聚焦编辑时：DOM 解析结果已与 props 一致则勿重绘 innerHTML，避免光标跳回段首 */
function editorDomSemanticallyMatchesProp(
  el: HTMLElement,
  propBody: TextBody,
  defaults: TextBodyDefaults,
  variableRuns: TextBodyVariableRunMeta[]
): boolean {
  const parsed = normalizeTextBody(
    variableRuns.length > 0
      ? parseEditorHtmlToTextBody(el.innerHTML, defaults, propBody, variableRuns)
      : parseHtmlToTextBody(el.innerHTML, defaults)
  );
  return textBodyJsonEqual(parsed, normalizeTextBody(propBody));
}

/**
 * 结构化正文编辑器：contenteditable + execCommand，字符级粗斜体/装饰/链接/字色/段内字号。
 */
export function TextRichEditor({
  editorKey,
  textBody,
  defaults,
  onCommit,
  payload = null,
  externalVariableSlots = [],
  onInlineVariableFromSelection,
  variableRuns = [],
  onVariablePillClick,
  onVariablePillDetach,
  onVariableRunLinkChange,
  onVariableRunLinkClear,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const selRange = useRef<Range | null>(null);
  const debounceId = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dirtyRef = useRef(false);
  /** IME 组合输入中：避免 flush / 外层 textBody 回写 innerHTML 打断拼音选字 */
  const composingRef = useRef(false);
  const linkInputRef = useRef<InputRef>(null);
  const colorTriggerWrapRef = useRef<HTMLDivElement>(null);
  const shakeWrapRef = useRef<HTMLDivElement>(null);
  const variableRunsKey = JSON.stringify(
    variableRuns.map((m) => [m.textBindPath, m.displayText, m.displayLink, m.slotId])
  );

  const linkTargetMetaRef = useRef<TextBodyVariableRunMeta | null>(null);

  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrlDraft, setLinkUrlDraft] = useState("");
  const [linkUrlError, setLinkUrlError] = useState("");
  const [linkSelectionPreview, setLinkSelectionPreview] = useState("");

  const [variableModalOpen, setVariableModalOpen] = useState(false);
  const [variableSelectionPreview, setVariableSelectionPreview] = useState("");
  const [runColorDraft, setRunColorDraft] = useState("#ff1f1f");
  const [runColorIndeterminate, setRunColorIndeterminate] = useState(false);
  const [runFontSizeDraft, setRunFontSizeDraft] = useState(RUN_FONT_SIZE_FALLBACK);
  const [runFontSizeIndeterminate, setRunFontSizeIndeterminate] = useState(false);
  const [formatEcho, setFormatEcho] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
  });
  const { open: colorPickerOpen, overlayEdge, overlayClassName, onVisibleChange } = useAdaptiveOverlayEdge({
    triggerRef: colorTriggerWrapRef,
    preferredEdge: "topLeft",
    estimatedPopupHeight: 292,
    estimatedPopupWidth: 258,
    overlayClassName: "color-field__dropdown-overlay",
  });

  const pickerColorValue = rgbaToCss(rgbaForPicker(runColorDraft));

  const editorAreaStyle = useMemo((): CSSProperties => {
    const style: CSSProperties = {};
    const fontSize = defaults.fontSize?.trim();
    if (fontSize) {
      style.fontSize = normalizeRunFontSizePx(fontSize) ?? fontSize;
    }
    const color = defaults.color?.trim();
    if (color) style.color = color;
    return style;
  }, [defaults.color, defaults.fontSize]);

  useEffect(() => {
    dirtyRef.current = false;
    composingRef.current = false;
    setFormatEcho({ bold: false, italic: false, underline: false, strikeThrough: false });
    setRunFontSizeIndeterminate(false);
    setRunColorIndeterminate(false);
    setRunFontSizeDraft(
      normalizeRunFontSizePx(defaults.fontSize?.trim() ?? "") ?? RUN_FONT_SIZE_FALLBACK
    );
    setRunColorDraft(TEXT_COLOR_FALLBACK);
  }, [editorKey, defaults.fontSize]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (composingRef.current || dirtyRef.current) return;
    const html =
      variableRuns.length > 0
        ? renderTextBodyToEditorHtml(textBody, defaults, variableRuns)
        : renderTextBodyToHtml(textBody, defaults);
    if (document.activeElement === el) {
      if (editorDomSemanticallyMatchesProp(el, textBody, defaults, variableRuns)) {
        return;
      }
    }
    if (el.innerHTML !== html) {
      el.innerHTML = html;
    }
    dirtyRef.current = false;
  }, [editorKey, textBody, defaults.bold, defaults.italic, defaults.decoration, variableRunsKey]);

  useEffect(() => {
    if (!linkModalOpen) return;
    const id = window.setTimeout(() => {
      linkInputRef.current?.focus?.({ preventScroll: true } as unknown as undefined);
    }, 80);
    return () => window.clearTimeout(id);
  }, [linkModalOpen]);

  useEffect(() => {
    const onSelectionChange = () => {
      requestAnimationFrame(() => {
        syncVariablePillSelectionHighlight(ref.current);
        syncToolbarFromSelection();
      });
    };
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, [variableRunsKey, defaults.fontSize, defaults.color, defaults.bold, defaults.italic]);

  const blockFontSizeFallback = () =>
    normalizeRunFontSizePx(defaults.fontSize?.trim() ?? "") ?? RUN_FONT_SIZE_FALLBACK;

  const syncToolbarFromSelection = () => {
    const root = ref.current;
    if (!root) return;
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;
    let range: Range;
    try {
      range = sel.getRangeAt(0);
    } catch {
      return;
    }
    if (!rangeInsideEditor(range, root)) return;
    selRange.current = range.cloneRange();

    const blockFallback = blockFontSizeFallback();
    const fontSizeEcho = resolveFontSizeEchoInRange(range, root);
    const fontSizeIndeterminate = !range.collapsed && fontSizeEcho === null;
    const colorEcho = resolveTextColorEchoInRange(range, root);
    const colorIndeterminate = !range.collapsed && colorEcho === null;

    setFormatEcho(readFormatEchoInRange(range, root));
    setRunFontSizeIndeterminate(fontSizeIndeterminate);
    setRunFontSizeDraft(fontSizeIndeterminate ? "" : fontSizeEcho ?? blockFallback);
    setRunColorIndeterminate(colorIndeterminate);
    if (!colorIndeterminate) {
      setRunColorDraft(colorEcho ?? TEXT_COLOR_FALLBACK);
    }
  };

  const captureSelection = () => {
    const sel = window.getSelection();
    const root = ref.current;
    if (!sel?.rangeCount || !root || !root.contains(sel.anchorNode)) return;
    selRange.current = sel.getRangeAt(0).cloneRange();
  };

  const flush = () => {
    const el = ref.current;
    if (!el) return;
    if (composingRef.current) return;
    if (!dirtyRef.current) return;
    if (debounceId.current) {
      clearTimeout(debounceId.current);
      debounceId.current = undefined;
    }
    dirtyRef.current = false;
    const next =
      variableRuns.length > 0
        ? parseEditorHtmlToTextBody(el.innerHTML, defaults, textBody, variableRuns)
        : parseHtmlToTextBody(el.innerHTML, defaults);
    onCommit(next);
  };

  const scheduleFlush = () => {
    if (composingRef.current) {
      dirtyRef.current = true;
      return;
    }
    dirtyRef.current = true;
    if (debounceId.current) clearTimeout(debounceId.current);
    debounceId.current = setTimeout(() => {
      flush();
      debounceId.current = undefined;
    }, 250);
  };

  const restoreSelection = () => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (!sel) return;
    if (selRange.current && rangeInsideEditor(selRange.current, el)) {
      try {
        sel.removeAllRanges();
        sel.addRange(selRange.current);
      } catch {
        /* ignore */
      }
    }
  };

  const syncRunColorDraftFromSelection = () => {
    syncToolbarFromSelection();
  };

  const applyRunFontSize = (raw: string) => {
    const normalized = normalizeRunFontSizePx(raw);
    if (!normalized) return;
    const root = ref.current;
    if (!root) return;
    restoreSelection();
    const rng = selRange.current;
    if (!rng || !rangeInsideEditor(rng, root) || rng.collapsed) {
      toastError("请先在正文中选中要改字号的文字。");
      return;
    }
    const current = resolveSingleFontSizeInRange(rng, root);
    if (current === normalized) return;
    applyFontSizeToRange(rng, normalized);
    selRange.current = null;
    dirtyRef.current = true;
    flush();
    syncToolbarFromSelection();
  };

  const exec = (command: string, value?: string) => {
    restoreSelection();
    document.execCommand(command, false, value);
    selRange.current = null;
    dirtyRef.current = true;
    flush();
    syncToolbarFromSelection();
  };

  const triggerLinkInputShake = () => {
    requestAnimationFrame(() => {
      const wrap = shakeWrapRef.current;
      if (!wrap) return;
      wrap.classList.remove("text-rich-editor__link-input-wrap--shake");
      void wrap.offsetWidth;
      wrap.classList.add("text-rich-editor__link-input-wrap--shake");
    });
  };

  const setValidateError = (msg: string) => {
    setLinkUrlError(msg);
    triggerLinkInputShake();
  };

  const closeLinkModal = () => {
    setLinkModalOpen(false);
    setLinkUrlError("");
    setLinkSelectionPreview("");
    linkTargetMetaRef.current = null;
  };

  const openLinkModal = () => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    restoreSelection();
    const sel = window.getSelection();
    if (sel?.rangeCount && el.contains(sel.anchorNode)) {
      selRange.current = sel.getRangeAt(0).cloneRange();
    }
    const rng = selRange.current;
    if (!rng || !rangeInsideEditor(rng, el)) {
      linkTargetMetaRef.current = null;
      setLinkUrlError("");
      setLinkUrlDraft("");
      setLinkSelectionPreview("");
      setLinkModalOpen(true);
      return;
    }
    const pill = resolveVariablePillForRange(rng, el);
    const pillMeta = pill ? metaFromPillElement(pill, variableRuns) : null;
    if (pillMeta && pill) {
      linkTargetMetaRef.current = pillMeta;
      setLinkSelectionPreview(pillMeta.displayText);
      setLinkUrlDraft(resolveLinkDraftForVariablePill(pill, pillMeta));
      setLinkUrlError("");
      setLinkModalOpen(true);
      return;
    }
    linkTargetMetaRef.current = null;
    const anchor = findAncestorAnchor(rng.commonAncestorContainer, el);
    const initial = anchor?.getAttribute("href")?.trim() ?? "";
    let preview = selectionPlainPreview(rng);
    if (!preview && anchor) preview = anchorTextPreview(anchor);
    setLinkSelectionPreview(preview);
    setLinkUrlDraft(initial);
    setLinkUrlError("");
    setLinkModalOpen(true);
  };

  const applyLinkFromModal = () => {
    const el = ref.current;
    if (!el) return;
    const trimmed = linkUrlDraft.trim();
    if (!trimmed) {
      setValidateError("请输入链接地址；若要移除链接请使用「移除链接」。");
      return;
    }
    const href = normalizeUserHref(trimmed);
    if (!href) {
      setValidateError("链接格式无效。支持 https://、mailto:、tel: 或以 / 开头的站内路径。");
      return;
    }
    const pillMeta = linkTargetMetaRef.current;
    if (pillMeta && onVariableRunLinkChange) {
      onVariableRunLinkChange(pillMeta, href);
      closeLinkModal();
      return;
    }
    restoreSelection();
    const rng = selRange.current;
    if (!rng || !rangeInsideEditor(rng, el)) {
      setValidateError("请先在正文中选中一段文字，或将光标放在已有链接内再保存。");
      return;
    }
    if (rng.collapsed && !findAncestorAnchor(rng.startContainer, el)) {
      setValidateError("请先选中要设为链接的文字。");
      return;
    }
    document.execCommand("createLink", false, href);
    selRange.current = null;
    closeLinkModal();
    dirtyRef.current = true;
    flush();
  };

  const removeLinkFromModal = () => {
    const pillMeta = linkTargetMetaRef.current;
    if (pillMeta && onVariableRunLinkClear) {
      onVariableRunLinkClear(pillMeta);
      closeLinkModal();
      return;
    }
    restoreSelection();
    document.execCommand("unlink", false);
    selRange.current = null;
    closeLinkModal();
    setLinkUrlDraft("");
    dirtyRef.current = true;
    flush();
  };

  const closeVariableModal = () => {
    setVariableModalOpen(false);
    setVariableSelectionPreview("");
  };

  const openInlineVariableModal = () => {
    const root = ref.current;
    if (!root) return;
    root.focus();
    restoreSelection();
    const sel = window.getSelection();
    if (sel?.rangeCount && root.contains(sel.anchorNode)) {
      selRange.current = sel.getRangeAt(0).cloneRange();
    }
    const rng = selRange.current;
    if (!rng || !rangeInsideEditor(rng, root) || rng.collapsed) {
      toastError("请先在正文中选中要设为变量的文字。");
      return;
    }
    const selectedText = selectionPlainPreview(rng);
    if (!selectedText) {
      toastError("当前选区没有可转换为变量的文字。");
      return;
    }
    setVariableSelectionPreview(selectedText);
    setVariableModalOpen(true);
  };

  const commitInlineVariable = (slotId: string, label: string, kind: "bind" | "create", valueType?: string) => {
    const root = ref.current;
    if (!root || !onInlineVariableFromSelection) return;
    const selectedText = variableSelectionPreview.trim();
    restoreSelection();
    const rng = selRange.current;
    if (!rng || !rangeInsideEditor(rng, root) || rng.collapsed) {
      toastError("请先在正文中选中要设为变量的文字。");
      return;
    }
    document.execCommand("insertText", false, `{{ ${slotId} }}`);
    const nextTextBody = parseHtmlToTextBody(root.innerHTML, defaults);
    selRange.current = null;
    closeVariableModal();
    onInlineVariableFromSelection({
      kind,
      slotId,
      label,
      defaultValue: selectedText,
      nextTextBody,
      valueType,
    });
  };

  const onEditorClick: MouseEventHandler<HTMLDivElement> = (ev) => {
    const root = ref.current;
    if (!root) return;
    const pill = findVariablePillElement(ev.target as Node, root);
    if (!pill) return;
    const meta = metaFromPillElement(pill, variableRuns);
    if (!meta || !onVariablePillClick) return;
    ev.preventDefault();
    ev.stopPropagation();
    onVariablePillClick(meta);
  };

  const onEditorDoubleClick: MouseEventHandler<HTMLDivElement> = (ev) => {
    const t = ev.target as HTMLElement | null;
    const root = ref.current;
    if (!root) return;
    const pill = findVariablePillElement(t, root);
    if (pill) {
      ev.preventDefault();
      const meta = metaFromPillElement(pill, variableRuns);
      if (meta) onVariablePillClick?.(meta);
      return;
    }
    const a = t?.closest?.("a");
    if (!a || !root.contains(a)) return;
    ev.preventDefault();
    ev.stopPropagation();
    const rng = document.createRange();
    rng.selectNodeContents(a);
    selRange.current = rng;
    root.focus();
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(rng);
    setLinkUrlDraft(a.getAttribute("href")?.trim() ?? "");
    setLinkUrlError("");
    setLinkSelectionPreview(selectionPlainPreview(rng));
    setLinkModalOpen(true);
  };

  const onEditorKeyDown: KeyboardEventHandler<HTMLDivElement> = (ev) => {
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "k") {
      ev.preventDefault();
      const sel = window.getSelection();
      const root = ref.current;
      if (!root || !sel?.rangeCount || !root.contains(sel.anchorNode)) return;
      selRange.current = sel.getRangeAt(0).cloneRange();
      openLinkModal();
      return;
    }
    if (ev.key !== "Backspace" && ev.key !== "Delete") return;
    const root = ref.current;
    if (!root || !onVariablePillDetach) return;
    const sel = window.getSelection();
    if (!sel?.rangeCount || !root.contains(sel.anchorNode)) return;
    const rng = sel.getRangeAt(0);
    let pill: HTMLElement | null = null;
    if (!rng.collapsed) {
      pill = findVariablePillElement(rng.commonAncestorContainer, root);
    } else {
      pill = findVariablePillElement(rng.startContainer, root);
      if (!pill && ev.key === "Backspace") {
        const probe = document.createRange();
        probe.setStart(rng.startContainer, Math.max(0, rng.startOffset - 1));
        probe.collapse(true);
        pill = findVariablePillElement(probe.startContainer, root);
      }
      if (!pill && ev.key === "Delete") {
        const probe = document.createRange();
        probe.setStart(rng.startContainer, rng.startOffset);
        probe.collapse(true);
        pill = findVariablePillElement(probe.startContainer, root);
      }
    }
    if (!pill) return;
    const meta = metaFromPillElement(pill, variableRuns);
    if (!meta) return;
    ev.preventDefault();
    onVariablePillDetach(meta);
  };

  const linkFormId = `text-rich-link-form-${editorKey}`;

  return (
    <div className="text-rich-editor">
      <div
        className="inspector-rich-toolbar inspector-rich-toolbar--rich"
        aria-label="富文本样式工具条"
        onMouseDown={captureSelection}
      >
        <div
          className="inspector-rich-toolbar__group inspector-rich-toolbar__group--wrap"
          role="group"
          aria-label="正文样式"
        >
          <div
            className={
              runFontSizeIndeterminate
                ? "inspector-rich-toolbar__font-size inspector-rich-toolbar__font-size--indeterminate"
                : "inspector-rich-toolbar__font-size"
            }
            title="段内字号（选中文字后修改）"
            onMouseDown={captureSelection}
          >
            <ShopUnitInput
              value={runFontSizeIndeterminate ? "" : runFontSizeDraft}
              unit="px"
              aria-label="段内字号"
              placeholder={runFontSizeIndeterminate ? "—" : undefined}
              onChange={(next) => {
                setRunFontSizeIndeterminate(false);
                setRunFontSizeDraft(next);
              }}
              onBlur={() => applyRunFontSize(runFontSizeDraft)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                applyRunFontSize(runFontSizeDraft);
                ref.current?.focus();
              }}
            />
          </div>
          <ShopSecondaryButton
            className={
              formatEcho.bold
                ? "inspector-rich-toolbar__btn inspector-rich-toolbar__btn--active"
                : "inspector-rich-toolbar__btn"
            }
            title="加粗"
            aria-label="加粗"
            aria-pressed={formatEcho.bold}
            onMouseDown={captureSelection}
            onClick={() => exec("bold")}
          >
            <span className="inspector-rich-toolbar__icon inspector-rich-toolbar__icon--bold">B</span>
          </ShopSecondaryButton>
          <ShopSecondaryButton
            className={
              formatEcho.italic
                ? "inspector-rich-toolbar__btn inspector-rich-toolbar__btn--active"
                : "inspector-rich-toolbar__btn"
            }
            title="斜体"
            aria-label="斜体"
            aria-pressed={formatEcho.italic}
            onMouseDown={captureSelection}
            onClick={() => exec("italic")}
          >
            <span className="inspector-rich-toolbar__icon inspector-rich-toolbar__icon--italic">I</span>
          </ShopSecondaryButton>
          <ShopSecondaryButton
            className={
              formatEcho.underline
                ? "inspector-rich-toolbar__btn inspector-rich-toolbar__btn--active"
                : "inspector-rich-toolbar__btn"
            }
            title="下划线"
            aria-label="下划线"
            aria-pressed={formatEcho.underline}
            onMouseDown={captureSelection}
            onClick={() => exec("underline")}
          >
            <span className="inspector-rich-toolbar__icon inspector-rich-toolbar__icon--underline">U</span>
          </ShopSecondaryButton>
          <ShopSecondaryButton
            className={
              formatEcho.strikeThrough
                ? "inspector-rich-toolbar__btn inspector-rich-toolbar__btn--active"
                : "inspector-rich-toolbar__btn"
            }
            title="删除线"
            aria-label="删除线"
            aria-pressed={formatEcho.strikeThrough}
            onMouseDown={captureSelection}
            onClick={() => exec("strikeThrough")}
          >
            <span className="inspector-rich-toolbar__icon inspector-rich-toolbar__icon--line-through">S</span>
          </ShopSecondaryButton>
          <ShopSecondaryButton
            className="inspector-rich-toolbar__btn"
            title="上划线（插入片段）"
            aria-label="上划线"
            onMouseDown={captureSelection}
            onClick={() => {
              restoreSelection();
              const sel = window.getSelection();
              if (!sel?.rangeCount) return;
              const range = sel.getRangeAt(0);
              const frag = range.extractContents();
              const span = document.createElement("span");
              span.style.textDecoration = "overline";
              span.appendChild(frag);
              range.insertNode(span);
              selRange.current = null;
              dirtyRef.current = true;
              flush();
              syncToolbarFromSelection();
            }}
          >
            <span className="inspector-rich-toolbar__icon inspector-rich-toolbar__icon--overline">O</span>
          </ShopSecondaryButton>
          <ShopSecondaryButton
            className="inspector-rich-toolbar__btn"
            title="插入或编辑链接（⌘K / Ctrl+K）"
            aria-label="插入或编辑链接"
            onMouseDown={captureSelection}
            onClick={() => openLinkModal()}
          >
            <span className="inspector-rich-toolbar__icon">链</span>
          </ShopSecondaryButton>
          <ShopSecondaryButton
            className="inspector-rich-toolbar__btn inspector-rich-toolbar__btn--color"
            title="设置字色"
            aria-label="设置字色"
            onMouseDown={captureSelection}
            onClick={() => syncRunColorDraftFromSelection()}
          >
            <ColorPicker
              value={pickerColorValue}
              disabledAlpha={false}
              open={colorPickerOpen}
              onChange={(c: AggregationColor) => {
                const { r, g, b, a } = c.toRgb();
                const next = rgbaToCss({ r, g, b, a });
                setRunColorDraft(next);
                exec("foreColor", next);
              }}
              onOpenChange={(visible: boolean) => {
                if (visible) syncRunColorDraftFromSelection();
                onVisibleChange(visible);
              }}
              placement={toAntdPlacement(overlayEdge)}
              rootClassName={overlayClassName}
              destroyOnHidden
              getPopupContainer={(triggerNode) =>
                triggerNode.ownerDocument?.body ?? triggerNode
              }
            >
              <div
                ref={colorTriggerWrapRef}
                className="inspector-rich-toolbar__color-trigger-shell"
                aria-expanded={colorPickerOpen}
              >
                <span
                  className={
                    runColorIndeterminate
                      ? "inspector-rich-toolbar__color-swatch inspector-rich-toolbar__color-swatch--indeterminate"
                      : "inspector-rich-toolbar__color-swatch"
                  }
                  style={runColorIndeterminate ? undefined : { backgroundColor: runColorDraft }}
                />
              </div>
            </ColorPicker>
          </ShopSecondaryButton>
          <ShopSecondaryButton
            className="inspector-rich-toolbar__btn"
            title="清除格式"
            aria-label="清除格式"
            onMouseDown={captureSelection}
            onClick={() => exec("removeFormat")}
          >
            <ClearOutlined
              className="inspector-rich-toolbar__icon inspector-rich-toolbar__icon--antd"
              aria-hidden
            />
          </ShopSecondaryButton>
          {onInlineVariableFromSelection && payload ? (
            <ShopSecondaryButton
              className="inspector-rich-toolbar__btn"
              title="将选中文字设为文中变量"
              aria-label="设为文中变量"
              onMouseDown={captureSelection}
              onClick={openInlineVariableModal}
            >
              <span className="inspector-rich-toolbar__icon">变量</span>
            </ShopSecondaryButton>
          ) : null}
        </div>
      </div>
      <div
        key={editorKey}
        ref={ref}
        className="text-rich-editor__area"
        style={editorAreaStyle}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        onInput={scheduleFlush}
        onCompositionStart={() => {
          composingRef.current = true;
        }}
        onCompositionEnd={() => {
          composingRef.current = false;
          scheduleFlush();
        }}
        onBlur={flush}
        onClick={onEditorClick}
        onDoubleClick={onEditorDoubleClick}
        onKeyDown={onEditorKeyDown}
        onMouseUp={() => {
          captureSelection();
          syncToolbarFromSelection();
          syncVariablePillSelectionHighlight(ref.current);
        }}
        onSelect={() => {
          captureSelection();
          syncToolbarFromSelection();
        }}
        onKeyUp={() => {
          syncToolbarFromSelection();
          syncVariablePillSelectionHighlight(ref.current);
        }}
      />

      <ShopSectionModal
        title="插入或编辑链接"
        visible={linkModalOpen}
        centered
        destroyOnClose
        maskClosable={false}
        keyboard
        onCancel={closeLinkModal}
        footer={
          <>
            <ShopSecondaryButton htmlType="button" onClick={removeLinkFromModal}>
              移除链接
            </ShopSecondaryButton>
            <div className="shop-section-modal__footer-actions">
              <ShopSecondaryButton htmlType="button" onClick={closeLinkModal}>
                取消
              </ShopSecondaryButton>
              <ShopPrimaryButton htmlType="submit" form={linkFormId}>
                保存
              </ShopPrimaryButton>
            </div>
          </>
        }
      >
        <form
          id={linkFormId}
          className="text-rich-editor__link-form"
          onSubmit={(e) => {
            e.preventDefault();
            applyLinkFromModal();
          }}
        >
          <div
            className={
              linkSelectionPreview
                ? "shop-section-modal__selection-banner"
                : "shop-section-modal__selection-banner shop-section-modal__selection-banner--placeholder"
            }
            title={linkSelectionPreview ? linkSelectionPreview : undefined}
          >
            {linkSelectionPreview ? (
              <>当前选区：{linkSelectionPreview}</>
            ) : (
              <>当前选区：（打开对话框前请在正文中选中文字或置于链接上）</>
            )}
          </div>
          <label className="text-rich-editor__link-label" htmlFor={`text-rich-link-url-${editorKey}`}>
            链接地址
          </label>
          <div
            ref={shakeWrapRef}
            className="text-rich-editor__link-input-wrap"
            onAnimationEnd={(e) => {
              if (e.target !== e.currentTarget) return;
              shakeWrapRef.current?.classList.remove("text-rich-editor__link-input-wrap--shake");
            }}
          >
            <ShopInput
              id={`text-rich-link-url-${editorKey}`}
              ref={linkInputRef}
              value={linkUrlDraft}
              placeholder="https:// 或 mailto:、相对路径 /help"
              aria-invalid={!!linkUrlError}
              aria-describedby={
                linkUrlError ? `text-rich-link-err-${editorKey}` : `text-rich-link-tip-${editorKey}`
              }
              onChange={(e) => {
                setLinkUrlDraft(e.target.value);
                if (linkUrlError) setLinkUrlError("");
              }}
            />
          </div>
          {linkUrlError ? (
            <p
              id={`text-rich-link-err-${editorKey}`}
              className="text-rich-editor__link-error"
              role="alert"
            >
              {linkUrlError}
            </p>
          ) : (
            <p id={`text-rich-link-tip-${editorKey}`} className="text-rich-editor__link-tip">
              保存前请先在正文中选中文字，或将光标放在已有链接内。无 scheme 的域名会自动补全 https://。
            </p>
          )}
        </form>
      </ShopSectionModal>

      {onInlineVariableFromSelection && payload ? (
        <TextBodyInlineVariableModal
          visible={variableModalOpen}
          selectionPreview={variableSelectionPreview}
          slots={externalVariableSlots}
          payload={payload}
          onClose={closeVariableModal}
          onConfirmBind={(slot) => {
            commitInlineVariable(slot.slotId, slot.label ?? slot.slotId, "bind", slot.valueType);
          }}
        />
      ) : null}
    </div>
  );
}
