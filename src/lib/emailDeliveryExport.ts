import {
  DELIVERY_EXPORT_HEIGHT_MODE_ATTR,
  DELIVERY_EXPORT_STRIP_ATTRS,
  DELIVERY_EXPORT_STRIP_CLASSES,
  DELIVERY_EXPORT_WIDTH_MODE_ATTR,
  type DeliveryExportBoxMode,
} from "../render-defaults-contract/deliveryExport";
import {
  EMAIL_PRESENTATION_FORBIDDEN_DISPLAY_VALUES,
  EMAIL_PRESENTATION_FORBIDDEN_INLINE_STYLE_PROPERTIES,
  EMAIL_PRESENTATION_FORBIDDEN_POSITION_VALUES,
  EMAIL_PRESENTATION_TABLE_HTML_ATTRS,
} from "../render-defaults-contract/emailPresentation";
import {
  EMAIL_PRESENTATION_TD_ANTI_STRUT_STYLE,
  normalizePresentationHeightMode,
  stripPresentationLeafShellOuterChromeFromElement,
} from "./emailPresentationLayout";

export type MeasuredBoxPx = { width: number; height: number };

/** inline style 是否已含可用于邮件的显式长度（非 auto / fit-content 等） */
export function hasExplicitCssLength(value: string | undefined | null): boolean {
  const v = (value ?? "").trim().toLowerCase();
  if (!v || v === "auto" || v === "fit-content" || v === "max-content" || v === "min-content") {
    return false;
  }
  return true;
}

/** 纯函数：按契约决定发信前需写入 target 的宽高补丁（便于单测） */
export function computeDeliveryExportMeasuredBoxPatch(
  modes: { heightMode?: DeliveryExportBoxMode; widthMode?: DeliveryExportBoxMode },
  measured: MeasuredBoxPx,
  existing: { height?: string; width?: string }
): { height?: string; width?: string } {
  const patch: { height?: string; width?: string } = {};
  if (modes.heightMode === "hug" && !hasExplicitCssLength(existing.height)) {
    const h = Math.round(measured.height);
    if (h > 0) patch.height = `${h}px`;
  }
  if (modes.widthMode === "hug" && !hasExplicitCssLength(existing.width)) {
    const w = Math.round(measured.width);
    if (w > 0) patch.width = `${w}px`;
  }
  return patch;
}

function queryDeliveryExportMarked(scope: ParentNode): Element[] {
  return Array.from(
    scope.querySelectorAll(
      `[${DELIVERY_EXPORT_HEIGHT_MODE_ATTR}], [${DELIVERY_EXPORT_WIDTH_MODE_ATTR}]`
    )
  );
}

function readBoxModes(el: Element): {
  heightMode?: DeliveryExportBoxMode;
  widthMode?: DeliveryExportBoxMode;
} {
  const heightMode = el.getAttribute(DELIVERY_EXPORT_HEIGHT_MODE_ATTR);
  const widthMode = el.getAttribute(DELIVERY_EXPORT_WIDTH_MODE_ATTR);
  return {
    heightMode:
      heightMode === "hug" || heightMode === "fill" || heightMode === "fixed" ? heightMode : undefined,
    widthMode:
      widthMode === "hug" || widthMode === "fill" || widthMode === "fixed" ? widthMode : undefined,
  };
}

function presentationLeafShellInnerTd(root: HTMLElement): HTMLTableCellElement | null {
  const role = EMAIL_PRESENTATION_TABLE_HTML_ATTRS.role;
  const table = root.querySelector(`:scope > table[role="${role}"]`);
  const td = table?.querySelector(":scope > tbody > tr > td");
  return td instanceof HTMLTableCellElement ? td : null;
}

function tdHasVisibleBackground(td: HTMLTableCellElement): boolean {
  const inline = td.style.backgroundColor?.trim();
  if (inline) {
    const v = inline.toLowerCase();
    if (v !== "transparent" && v !== "rgba(0, 0, 0, 0)") return true;
  }
  if (typeof document !== "undefined") {
    const bg = getComputedStyle(td).backgroundColor;
    if (bg && bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)") return true;
  }
  return false;
}

/** 带背景色的叶壳以 inner `<td>` 为实测与烘焙目标（发信客户端以 td 背景盒为准）。 */
function resolveDeliveryExportMeasureElement(live: HTMLElement): HTMLElement {
  const td = presentationLeafShellInnerTd(live);
  if (td && tdHasVisibleBackground(td)) return td;
  return live;
}

function applyDeliveryExportBoxPatch(target: HTMLElement, patch: { height?: string; width?: string }): void {
  if (patch.height) target.style.height = patch.height;
  if (patch.width) target.style.width = patch.width;
}

function syncPresentationLeafShellTdPatch(
  liveRoot: HTMLElement,
  cloneRoot: HTMLElement,
  patch: { height?: string; width?: string }
): void {
  const liveTd = presentationLeafShellInnerTd(liveRoot);
  const cloneTd = presentationLeafShellInnerTd(cloneRoot);
  if (!liveTd || !cloneTd || !tdHasVisibleBackground(liveTd)) return;
  applyDeliveryExportBoxPatch(cloneTd, patch);
  Object.assign(cloneTd.style, EMAIL_PRESENTATION_TD_ANTI_STRUT_STYLE);
  stripPresentationLeafShellOuterChromeFromElement(cloneRoot);
}

/** 发信 HTML：`.email-text-content` 内段落须内联 margin/padding 归零（画布 CSS 不会进邮件） */
export function applyEmailTextContentParagraphReset(root: Element): void {
  for (const p of root.querySelectorAll(".email-text-content p")) {
    if (p instanceof HTMLElement) {
      p.style.margin = "0";
      p.style.padding = "0";
    }
  }
}

/**
 * 烘焙后补强：带背景叶壳以 live inner `<td>` 为准同步 anti-strut、实测 hug 盒，并去掉外层重复 appearance。
 */
export function finalizePresentationLeafShellsForDelivery(liveScope: Element, clone: Element): void {
  const liveMarked = queryDeliveryExportMarked(liveScope);
  const cloneMarked = queryDeliveryExportMarked(clone);
  const count = Math.min(liveMarked.length, cloneMarked.length);
  for (let i = 0; i < count; i++) {
    const live = liveMarked[i] as HTMLElement;
    const target = cloneMarked[i] as HTMLElement;
    const liveTd = presentationLeafShellInnerTd(live);
    const cloneTd = presentationLeafShellInnerTd(target);
    if (!liveTd || !cloneTd || !tdHasVisibleBackground(liveTd)) continue;

    Object.assign(cloneTd.style, EMAIL_PRESENTATION_TD_ANTI_STRUT_STYLE);
    stripPresentationLeafShellOuterChromeFromElement(target);

    const modes = readBoxModes(live);
    const rect = liveTd.getBoundingClientRect();
    const tdPatch = computeDeliveryExportMeasuredBoxPatch(modes, rect, {
      height: cloneTd.style.height,
      width: cloneTd.style.width,
    });
    if (tdPatch.height || tdPatch.width) {
      applyDeliveryExportBoxPatch(cloneTd, tdPatch);
      const outerPatch: { height?: string; width?: string } = {};
      if (tdPatch.height) outerPatch.height = tdPatch.height;
      if (tdPatch.width) outerPatch.width = tdPatch.width;
      applyDeliveryExportBoxPatch(target, outerPatch);
    }
    if (normalizePresentationHeightMode(modes.heightMode) === "hug") {
      Object.assign(target.style, EMAIL_PRESENTATION_TD_ANTI_STRUT_STYLE);
    }
  }
}

/** 用画布实测尺寸补丁 clone 上对应节点（live 与 clone 按标记节点顺序对齐） */
export function bakeDeliveryExportMeasuredBoxes(scope: Element, clone: Element): void {
  const liveMarked = queryDeliveryExportMarked(scope);
  const cloneMarked = queryDeliveryExportMarked(clone);
  const count = Math.min(liveMarked.length, cloneMarked.length);
  for (let i = 0; i < count; i++) {
    const live = liveMarked[i] as HTMLElement;
    const target = cloneMarked[i] as HTMLElement;
    const measureEl = resolveDeliveryExportMeasureElement(live);
    const rect = measureEl.getBoundingClientRect();
    const modes = readBoxModes(live);
    const patch = computeDeliveryExportMeasuredBoxPatch(modes, rect, {
      height: target.style.height,
      width: target.style.width,
    });
    if (patch.height || patch.width) {
      applyDeliveryExportBoxPatch(target, patch);
      syncPresentationLeafShellTdPatch(live, target, patch);
    }
  }
}

/**
 * 发信防御性剥离：契约禁止的内联样式（画布应已不产出）。
 * 真源：`render-defaults-contract/emailPresentation.ts`
 */
export function stripForbiddenEmailPresentationInlineStyles(root: Element): void {
  const forbiddenProps = new Set<string>(EMAIL_PRESENTATION_FORBIDDEN_INLINE_STYLE_PROPERTIES);
  const forbiddenDisplay = new Set<string>(EMAIL_PRESENTATION_FORBIDDEN_DISPLAY_VALUES);
  const forbiddenPosition = new Set<string>(EMAIL_PRESENTATION_FORBIDDEN_POSITION_VALUES);
  const walk = (node: Element) => {
    if (node instanceof HTMLElement) {
      const s = node.style;
      if (forbiddenDisplay.has(s.display)) {
        s.removeProperty("display");
      }
      if (forbiddenPosition.has(s.position)) {
        s.removeProperty("position");
        s.removeProperty("top");
        s.removeProperty("right");
        s.removeProperty("bottom");
        s.removeProperty("left");
      }
      for (const prop of forbiddenProps) {
        s.removeProperty(prop);
      }
      if (s.minWidth === "0px" || s.minWidth === "0") {
        s.removeProperty("min-width");
      }
      const w = s.width?.trim().toLowerCase();
      if (w === "fit-content" || w === "max-content" || w === "min-content") {
        s.removeProperty("width");
      }
    }
    for (const child of node.children) walk(child);
  };
  walk(root);
}

/** 剥离画布专用 data-* 与选中态 class，避免进入投递 HTML */
export function stripPreviewOnlyAttributes(root: Element): void {
  const stripAttrSet = new Set<string>(DELIVERY_EXPORT_STRIP_ATTRS);
  const stripClassSet = new Set<string>(DELIVERY_EXPORT_STRIP_CLASSES);
  const walk = (node: Element) => {
    for (const attr of [...node.attributes]) {
      if (stripAttrSet.has(attr.name)) node.removeAttribute(attr.name);
    }
    if (node.classList.length) {
      for (const cls of [...node.classList]) {
        if (stripClassSet.has(cls)) node.classList.remove(cls);
      }
      if (node.classList.length === 0) node.removeAttribute("class");
    }
    for (const child of node.children) walk(child);
  };
  walk(root);
}

/**
 * 从 `.email-preview-scope` 生成可投递 innerHTML：
 * 1. 深拷贝 2. 按 data-ee-*Mode 烘焙 hug 实测盒 3. 防御性剥离契约禁止样式 4. 剥离画布专用属性
 */
export function prepareEmailPreviewInnerHtmlForDelivery(scope: Element): string {
  const clone = scope.cloneNode(true) as Element;
  bakeDeliveryExportMeasuredBoxes(scope, clone);
  finalizePresentationLeafShellsForDelivery(scope, clone);
  applyEmailTextContentParagraphReset(clone);
  stripForbiddenEmailPresentationInlineStyles(clone);
  stripPreviewOnlyAttributes(clone);
  return clone.innerHTML.trim();
}
