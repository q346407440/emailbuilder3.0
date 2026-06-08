import { listPexelsImageSlots } from "./groundingImage";
import type {
  AssetManifest,
  CompactNode,
  GroundingSection,
  IconQueryItem,
  TextExtractResult,
} from "./types";

/** 单区 Stage C 允许引用的 textId / iconRef / 图片 slot。 */
export type SectionAllowlists = {
  textIds: Set<string>;
  iconRefs: Set<string>;
  imageSlotIds: Set<string>;
};

export function buildSectionAllowlists(
  sectionId: string,
  section: GroundingSection,
  textExtract: TextExtractResult,
  iconQueries: IconQueryItem[],
  _assetManifest: AssetManifest
): SectionAllowlists {
  const textIds = new Set<string>();
  const region = textExtract.regions.find((r) => r.regionId === sectionId);
  for (const p of region?.paragraphs ?? []) {
    textIds.add(p.textId);
  }

  const iconRefs = new Set(
    iconQueries.filter((q) => q.regionId === sectionId).map((q) => q.id)
  );

  const imageSlotIds = new Set<string>();
  if (section.hasImage) {
    for (const slot of listPexelsImageSlots(section)) {
      imageSlotIds.add(slot.slotId);
    }
  }

  return { textIds, iconRefs, imageSlotIds };
}

function walkCompact(node: CompactNode, visit: (node: CompactNode) => void): void {
  visit(node);
  for (const child of node.children ?? []) {
    walkCompact(child, visit);
  }
}

function formatAllowlist(values: Set<string>, emptyLabel: string): string {
  if (values.size === 0) return emptyLabel;
  return [...values].join(", ");
}

/** Stage C 重试门禁：引用 id 必须在白名单内。 */
export function validateCompactSectionRoot(
  root: CompactNode,
  allowlists: SectionAllowlists,
  section: GroundingSection
): string[] {
  const errors: string[] = [];

  walkCompact(root, (node) => {
    if (node.kind === "content.text") {
      const textId = node.props?.textId;
      if (typeof textId !== "string" || !allowlists.textIds.has(textId)) {
        errors.push(
          `content.text 的 textId 非法（${String(textId)}）；本区只允许：${formatAllowlist(allowlists.textIds, "（无文案，禁止 content.text）")}`
        );
      }
    }

    if (node.kind === "action.button") {
      const textId = node.props?.textId;
      if (typeof textId !== "string" || !allowlists.textIds.has(textId)) {
        errors.push(
          `action.button 的 textId 非法（${String(textId)}）；本区只允许：${formatAllowlist(allowlists.textIds, "（无按钮文案）")}`
        );
      }
    }

    if (node.kind === "content.icon") {
      const iconRef = node.props?.iconRef;
      if (typeof iconRef !== "string" || !allowlists.iconRefs.has(iconRef)) {
        errors.push(
          `content.icon 的 iconRef 非法（${String(iconRef)}）；本区只允许：${formatAllowlist(allowlists.iconRefs, "（无图标，禁止 content.icon）")}`
        );
      }
    }

    if (node.kind === "content.image") {
      if (!section.hasImage) {
        errors.push("本区 hasImage=false，禁止输出 content.image");
        return;
      }
      const ref = node.wrapper?.backgroundImageRef;
      if (typeof ref !== "string" || !allowlists.imageSlotIds.has(ref)) {
        errors.push(
          `content.image 的 backgroundImageRef 必须为 ${formatAllowlist(allowlists.imageSlotIds, "（无配图 slot）")}；多格 grid 须按格子选用不同 slotId`
        );
      }
    }
  });

  return errors;
}

/** 阶段 D：丢弃非法引用节点（保留合法 backgroundImageRef，不再强制归一化为单一 slot）。 */
export function sanitizeCompactSectionRoot(
  root: CompactNode,
  allowlists: SectionAllowlists,
  section: GroundingSection
): CompactNode | null {
  const walk = (node: CompactNode): CompactNode | null => {
    if (node.kind === "content.icon") {
      const iconRef = node.props?.iconRef;
      if (typeof iconRef !== "string" || !allowlists.iconRefs.has(iconRef)) {
        return null;
      }
    }

    if (node.kind === "content.text") {
      const textId = node.props?.textId;
      if (typeof textId !== "string" || !allowlists.textIds.has(textId)) {
        return null;
      }
    }

    if (node.kind === "action.button") {
      const textId = node.props?.textId;
      if (typeof textId !== "string" || !allowlists.textIds.has(textId)) {
        return null;
      }
    }

    if (node.kind === "content.image") {
      if (!section.hasImage) return null;
      const ref = node.wrapper?.backgroundImageRef;
      if (typeof ref !== "string" || !allowlists.imageSlotIds.has(ref)) {
        return null;
      }
    }

    let next: CompactNode = { ...node };

    if (Array.isArray(node.children)) {
      const children = node.children
        .map((child) => walk(child))
        .filter((child): child is CompactNode => child != null);
      next = { ...next, children: children.length > 0 ? children : undefined };
    }

    return next;
  };

  return walk(root);
}
