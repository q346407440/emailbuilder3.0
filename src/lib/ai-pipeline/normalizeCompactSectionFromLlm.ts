import { COMPACT_BLOCK_KINDS, type CompactBlockKind } from "./compactTypes";
import type { CompactNode } from "./types";
import type { CompactSectionRootPayloadParsed } from "./schemas/compact-section";

const MAX_NODES = 60;

const KIND_ALIASES: Record<string, CompactBlockKind> = {
  layout: "layout.container",
  container: "layout.container",
  "layout.container": "layout.container",
  grid: "layout.grid",
  "layout.grid": "layout.grid",
  text: "content.text",
  "content.text": "content.text",
  image: "content.image",
  "content.image": "content.image",
  button: "action.button",
  "action.button": "action.button",
  icon: "content.icon",
  "content.icon": "content.icon",
  divider: "content.divider",
  "content.divider": "content.divider",
};

/** 将 LLM 输出规范化为 { root }；非法节点丢弃，kind 别名映射。 */
export function normalizeCompactSectionFromLlm(
  parsed: unknown
): CompactSectionRootPayloadParsed | null {
  const rootRaw = unwrapRoot(parsed);
  if (!rootRaw) return null;

  let nodeCount = 0;
  const root = sanitizeNode(rootRaw, () => {
    nodeCount += 1;
    return nodeCount <= MAX_NODES;
  });
  if (!root) return null;
  return { root };
}

function unwrapRoot(parsed: unknown): unknown | null {
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;

  if (obj.root && typeof obj.root === "object") return obj.root;
  if (obj.component && typeof obj.component === "object") return obj.component;

  if (typeof obj.kind === "string" || typeof obj.type === "string") return obj;

  if (Array.isArray(parsed) && parsed.length > 0) {
    return {
      kind: "layout.container",
      props: { direction: "vertical", gap: "0" },
      children: parsed,
    };
  }

  return null;
}

function sanitizeNode(raw: unknown, allowNode: () => boolean): CompactNode | null {
  if (!allowNode()) return null;
  if (!raw || typeof raw !== "object") return null;

  const obj = raw as Record<string, unknown>;
  const kind = normalizeKind(obj.kind ?? obj.type);
  if (!kind) return null;

  const node: CompactNode = { kind };

  if (obj.props && typeof obj.props === "object") {
    node.props = { ...(obj.props as Record<string, unknown>) };
    stripForbiddenProps(node.props, kind);
  }

  if (obj.wrapper && typeof obj.wrapper === "object") {
    node.wrapper = sanitizeWrapper(obj.wrapper as Record<string, unknown>, kind);
  }

  if (obj.styleKeys && typeof obj.styleKeys === "object") {
    node.styleKeys = obj.styleKeys as CompactNode["styleKeys"];
  }

  if (Array.isArray(obj.children)) {
    const children: CompactNode[] = [];
    for (const child of obj.children) {
      const sanitized = sanitizeNode(child, allowNode);
      if (sanitized) children.push(sanitized);
    }
    if (children.length > 0) node.children = children;
  }

  return node;
}

function normalizeKind(value: unknown): CompactBlockKind | null {
  if (typeof value !== "string") return null;
  const key = value.trim().toLowerCase();
  const mapped = KIND_ALIASES[key];
  if (mapped) return mapped;
  if ((COMPACT_BLOCK_KINDS as readonly string[]).includes(value)) {
    return value as CompactBlockKind;
  }
  return null;
}

function sanitizeWrapper(wrapper: Record<string, unknown>, _kind: CompactBlockKind) {
  return { ...wrapper };
}

function stripForbiddenProps(props: Record<string, unknown>, kind: CompactBlockKind) {
  if (kind === "content.text") {
    delete props.text;
    delete props.content;
  }
  if (kind === "content.image") {
    delete props.src;
    delete props.url;
  }
}
