import type { EmailBlock } from "../../../types/email";
import type { ManualRestoreBlueprint, ManualRestoreDeliverable } from "./types";

const DEFAULT_NAMES: Record<string, string> = {
  emailRoot: "画布根",
  layout: "布局",
  text: "文本",
  image: "配图",
  button: "按钮",
  icon: "图标",
  divider: "分隔线",
  grid: "栅格",
};

function clampSpacingPx(value: string, maxPx: number): string {
  const m = /^(\d+(?:\.\d+)?)px$/.exec(value.trim());
  if (!m) return value;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= maxPx) return value;
  return `${maxPx}px`;
}

export function sanitizeDeliverable(
  deliverable: ManualRestoreDeliverable,
  blueprint: ManualRestoreBlueprint
): ManualRestoreDeliverable {
  const next = structuredClone(deliverable) as ManualRestoreDeliverable;
  const preset = (next.tokenPresets as { presets?: { default?: { tokens?: { spacing?: Record<string, string> } } } })
    .presets?.default?.tokens?.spacing;
  if (preset) {
    if (preset.section) preset.section = clampSpacingPx(preset.section, 24);
    if (preset.pageInline) preset.pageInline = clampSpacingPx(preset.pageInline, 24);
  }

  const root = (next.template as { root?: EmailBlock }).root;
  if (root) {
    walkBlock(root, blueprint.idPrefix);
    stripDeprecatedFields(root);
  }

  next.meta.displayName = blueprint.displayName;
  return next;
}

const DEPRECATED_PROP_KEYS = new Set([
  "fontWeight",
  "lineHeight",
  "fontStyle",
  "fontMode",
  "textDecoration",
]);

function stripDeprecatedFields(node: unknown): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) stripDeprecatedFields(item);
    return;
  }
  const o = node as Record<string, unknown>;
  if (o.props && typeof o.props === "object" && !Array.isArray(o.props)) {
    const props = o.props as Record<string, unknown>;
    for (const key of DEPRECATED_PROP_KEYS) {
      delete props[key];
    }
    if (props.buttonStyle && typeof props.buttonStyle === "object") {
      delete (props.buttonStyle as Record<string, unknown>).padding;
    }
  }
  for (const value of Object.values(o)) {
    stripDeprecatedFields(value);
  }
}

let idSeq = 0;

function walkBlock(block: EmailBlock, idPrefix: string): void {
  const props = block.props as Record<string, unknown> | undefined;
  if (props?.wrapperStyle && typeof props.wrapperStyle === "object") {
    block.wrapperStyle = {
      ...(block.wrapperStyle as object | undefined),
      ...(props.wrapperStyle as object),
    };
    delete props.wrapperStyle;
  }
  if (props) {
    if (block.type === "layout") {
      const ws = { ...(block.wrapperStyle as object | undefined) } as Record<string, unknown>;
      if (typeof props.backgroundColor === "string") {
        ws.backgroundColor = props.backgroundColor;
        delete props.backgroundColor;
      }
      if (props.padding && typeof props.padding === "object") {
        ws.padding = props.padding;
        delete props.padding;
      }
      block.wrapperStyle = ws as EmailBlock["wrapperStyle"];
    }
    delete props.width;
    delete props.margin;
    delete props.justifyContent;
    delete props.alignItems;
    if (props.contentAlign && typeof props.contentAlign === "object") {
      const ws = { ...(block.wrapperStyle as object | undefined) } as Record<string, unknown>;
      ws.contentAlign = props.contentAlign;
      block.wrapperStyle = ws as EmailBlock["wrapperStyle"];
      delete props.contentAlign;
    }
    if (typeof props.columns === "number" || typeof props.columns === "string") {
      block.type = "grid";
      block.blockMeta = {
        ...block.blockMeta,
        blockType: "layout.grid",
        name: block.blockMeta?.name ?? "栅格",
      };
      // columns stays in props for grid
    }
    if (block.type === "text" && typeof props.textAlign === "string") {
      const align = props.textAlign as string;
      const ws = (block.wrapperStyle ?? {}) as Record<string, unknown>;
      const ca = (ws.contentAlign ?? {}) as Record<string, string>;
      if (align === "center" || align === "left" || align === "right") {
        ca.horizontal = align;
      }
      ws.contentAlign = ca;
      block.wrapperStyle = ws as EmailBlock["wrapperStyle"];
      delete props.textAlign;
    }
  }

  if (!block.id || typeof block.id !== "string") {
    idSeq += 1;
    block.id = `${idPrefix}-n${idSeq}`;
  }
  if (!block.blockMeta?.name || typeof block.blockMeta.name !== "string") {
    block.blockMeta = {
      ...block.blockMeta,
      blockType: block.blockMeta?.blockType ?? "layout.container",
      name: DEFAULT_NAMES[block.type] ?? "区块",
    };
  }
  if (Array.isArray(block.children)) {
    for (const child of block.children) {
      walkBlock(child, idPrefix);
    }
  }
}
