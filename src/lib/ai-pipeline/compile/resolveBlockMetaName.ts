import type { ImageSlotRole } from "../../../layout-variant-ai-contract/compactIr";
import type { CompactBlockKind, TextExtractRole } from "../compactTypes";
import type { CompactNode } from "../types";

/** Stage C label / blockMeta.name 最大长度。 */
export const COMPACT_NODE_LABEL_MAX_LEN = 32;

export function normalizeCompactNodeLabel(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  return trimmed.length > COMPACT_NODE_LABEL_MAX_LEN
    ? trimmed.slice(0, COMPACT_NODE_LABEL_MAX_LEN)
    : trimmed;
}

const TEXT_ROLE_FALLBACK: Partial<Record<TextExtractRole, string>> = {
  heading: "标题",
  body: "正文",
  caption: "说明",
  footer: "页脚",
  button: "按钮文案",
};

const IMAGE_ROLE_FALLBACK: Partial<Record<ImageSlotRole, string>> = {
  hero: "头图",
  logo: "Logo",
  card: "配图",
  background: "底图",
};

const KIND_FALLBACK: Record<CompactBlockKind, string> = {
  "layout.container": "布局",
  "layout.grid": "栅格",
  "content.text": "文本",
  "content.image": "图片",
  "action.button": "按钮",
  "content.icon": "图标",
  "content.divider": "分割线",
};

/** E：blockMeta.name ← Stage C label；缺省按 B3 role / 配图 role / kind。 */
export function resolveBlockMetaDisplayName(input: {
  kind: CompactBlockKind;
  label?: string;
  textRole?: TextExtractRole;
  imageSlotRole?: ImageSlotRole;
}): string {
  const fromLabel = normalizeCompactNodeLabel(input.label);
  if (fromLabel) return fromLabel;

  if (input.kind === "content.text" && input.textRole) {
    return TEXT_ROLE_FALLBACK[input.textRole] ?? KIND_FALLBACK["content.text"];
  }
  if (input.kind === "action.button") {
    return "按钮";
  }
  if (input.kind === "content.image" && input.imageSlotRole) {
    return IMAGE_ROLE_FALLBACK[input.imageSlotRole] ?? KIND_FALLBACK["content.image"];
  }

  return KIND_FALLBACK[input.kind];
}

export function resolveSectionShellDisplayName(sectionName: string, sectionId: string): string {
  const name = sectionName.trim();
  return name || sectionId;
}

/** D：规范化 compact 节点 label 字段。 */
export function normalizeCompactNodeLabelField(node: CompactNode): CompactNode {
  const label = normalizeCompactNodeLabel(node.label);
  if (label === node.label) return node;
  if (!label) {
    const { label: _removed, ...rest } = node;
    return rest;
  }
  return { ...node, label };
}
