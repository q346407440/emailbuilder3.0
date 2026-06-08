import {
  COMPACT_PROPS_FORBIDDEN_KEYS,
  COMPACT_WRAPPER_FORBIDDEN_KEYS,
} from "../../../layout-variant-ai-contract/compactIr";
import type { CompactNode } from "../types";
import { normalizeCompactNodeLabelField } from "./resolveBlockMetaName";

const FORBIDDEN_WRAPPER = new Set<string>(COMPACT_WRAPPER_FORBIDDEN_KEYS);
const FORBIDDEN_PROPS = new Set<string>(COMPACT_PROPS_FORBIDDEN_KEYS);

function stripRecordKeys(
  record: Record<string, unknown> | undefined,
  forbidden: Set<string>
): Record<string, unknown> | undefined {
  if (!record) return undefined;
  const next: Record<string, unknown> = {};
  let touched = false;
  for (const [key, value] of Object.entries(record)) {
    if (forbidden.has(key)) {
      touched = true;
      continue;
    }
    next[key] = value;
  }
  return touched ? next : record;
}

function normalizeBoxMode(raw: unknown): "fill" | "hug" | "fixed" | undefined {
  if (raw === "fill" || raw === "hug" || raw === "fixed") return raw;
  if (raw === "fitContent") return "hug";
  return undefined;
}

/** action.button 的 wrapper 禁止 backgroundColor（背景只在 buttonStyle）。 */
function stripButtonWrapperBackground(node: CompactNode): CompactNode {
  if (node.kind !== "action.button" || !node.wrapper?.backgroundColor) return node;
  const { backgroundColor: _bg, ...restWrapper } = node.wrapper;
  return {
    ...node,
    wrapper: Object.keys(restWrapper).length > 0 ? restWrapper : undefined,
  };
}

/** D-REF-2：剥离 compact wrapper/props 禁止键；fitContent → hug。 */
export function sanitizeCompactIrNode(node: CompactNode): CompactNode {
  const working = stripButtonWrapperBackground(node);
  const wrapperRaw = working.wrapper ? { ...working.wrapper } : undefined;
  if (wrapperRaw) {
    const wm = normalizeBoxMode(wrapperRaw.widthMode);
    const hm = normalizeBoxMode(wrapperRaw.heightMode);
    if (wm) wrapperRaw.widthMode = wm;
    else if (wrapperRaw.widthMode === "fitContent") delete wrapperRaw.widthMode;
    if (hm) wrapperRaw.heightMode = hm;
    else if (wrapperRaw.heightMode === "fitContent") delete wrapperRaw.heightMode;
  }

  const propsRaw =
    working.props && typeof working.props === "object"
      ? stripRecordKeys({ ...working.props }, FORBIDDEN_PROPS)
      : undefined;

  const wrapper = wrapperRaw
    ? (stripRecordKeys(wrapperRaw as Record<string, unknown>, FORBIDDEN_WRAPPER) as
        | CompactNode["wrapper"]
        | undefined)
    : undefined;

  const children = working.children?.map((child) => sanitizeCompactIrNode(child));

  const normalized = normalizeCompactNodeLabelField({
    ...working,
    ...(propsRaw ? { props: propsRaw } : {}),
    ...(wrapper !== undefined ? { wrapper } : {}),
    ...(children?.length ? { children } : {}),
  });

  return normalized;
}

export function sanitizeCompactIrTree(root: CompactNode): CompactNode {
  return sanitizeCompactIrNode(root);
}
