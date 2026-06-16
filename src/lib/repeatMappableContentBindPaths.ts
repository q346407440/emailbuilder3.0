import type { EmailBlock, EmailTemplate, TextBlock } from "../types/email";
import { classifyField } from "./blockFieldClassification";
import { normalizeTextBody } from "./textBodyFormat";
import { getTextBodyFieldSourceBindPath } from "./textBodyContentMode";

/** 列表 repeat 字段映射 UI 用的可读字段名（不含 props.* 路径） */
export function repeatMappingFieldShortLabel(bindPath: string): string {
  if (bindPath === "props.content" || bindPath.startsWith("props.textBody")) return "正文";
  if (bindPath === "props.text") return "文案";
  if (bindPath === "props.link" || bindPath.endsWith(".link")) return "链接";
  if (bindPath.endsWith(".src") || bindPath === "props.src") return "图片地址";
  if (bindPath.endsWith(".alt")) return "替代文本";
  if (bindPath === "props.value") return "数值";
  if (bindPath === "props.max") return "上限";
  const leaf = bindPath.split(".").slice(-1)[0] ?? bindPath;
  return leaf;
}

export function repeatMappingBlockDisplayName(template: EmailTemplate, blockId: string): string {
  return template.blockMeta?.[blockId]?.name?.trim() || blockId;
}

/** 映射目标完整可读标签（区块名 + 字段短名，无「·」分隔） */
export function repeatMappingTargetLabel(
  template: EmailTemplate,
  blockId: string,
  bindPath: string
): string {
  const name = repeatMappingBlockDisplayName(template, blockId);
  const short = repeatMappingFieldShortLabel(bindPath);
  return short && short !== name ? `${name} ${short}` : name;
}

/**
 * 字段映射左侧 Tab：同区块仅一个映射目标时只显示区块名；多个目标时「区块名 字段短名」。
 */
export function repeatMappingTabLabel(
  template: EmailTemplate,
  blockId: string,
  bindPath: string,
  allTargets: ReadonlyArray<{ blockId: string; bindPath: string }>
): string {
  const name = repeatMappingBlockDisplayName(template, blockId);
  const sameBlockCount = allTargets.filter((target) => target.blockId === blockId).length;
  if (sameBlockCount <= 1) return name;
  return `${name} ${repeatMappingFieldShortLabel(bindPath)}`;
}

/** text 块是否以 textBody v1 为正文真源（与 block-contract content.text 一致） */
export function hasAuthoritativeTextBody(block: EmailBlock): boolean {
  if (block.type !== "text") return false;
  const body = normalizeTextBody((block as TextBlock).props?.textBody);
  return Array.isArray(body?.paragraphs);
}

/**
 * 列表 repeat「字段映射」可绑定的内容路径。
 * text 块仅允许 props.textBody 及其子路径。
 */
export function listRepeatMappableContentBindPaths(block: EmailBlock): string[] {
  const paths = new Set<string>();
  const textBodyAuthoritative = hasAuthoritativeTextBody(block);

  Object.entries(block.bindings ?? {}).forEach(([bindPath, spec]) => {
    if (bindPath === "props.content") return;
    if (spec.fieldKind === "content" || classifyField(block.type, bindPath) === "content") {
      paths.add(bindPath);
    }
  });

  if (block.type === "text") {
    if (textBodyAuthoritative) {
      const hasTextBodyPath = [...paths].some((p) => p.startsWith("props.textBody."));
      if (!hasTextBodyPath) {
        const body = normalizeTextBody((block as TextBlock).props?.textBody);
        paths.add(getTextBodyFieldSourceBindPath(block as TextBlock, body, "literal"));
      }
    }
  }
  if (block.type === "button") {
    paths.add("props.text");
    paths.add("props.link");
  }
  if (block.type === "image") {
    paths.add("wrapperStyle.backgroundImage.src");
    paths.add("wrapperStyle.backgroundImage.link");
  }
  if (block.type === "emailRoot" && block.wrapperStyle?.backgroundImage) {
    paths.add("wrapperStyle.backgroundImage.src");
    paths.add("wrapperStyle.backgroundImage.link");
  }
  if (
    (block.type === "layout" || block.type === "grid" || block.type === "image") &&
    block.wrapperStyle?.backgroundImage
  ) {
    paths.add("wrapperStyle.backgroundImage.src");
    paths.add("wrapperStyle.backgroundImage.link");
  }
  if (block.type === "icon") {
    paths.add("props.src");
    paths.add("props.link");
  }
  if (block.type === "progress") {
    paths.add("props.value");
    paths.add("props.max");
  }

  return [...paths].filter((bindPath) => classifyField(block.type, bindPath) === "content");
}
