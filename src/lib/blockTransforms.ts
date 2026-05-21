import type { EmailBlock, EmailTemplate } from "../types/email";
import { pickImageOverlayStackProps } from "./imageBlockWrapperBackground";

type ConvertToImageOptions = {
  /** 为 true 时删除所有子区块及其子树，还原为无叠放内容的纯图片块 */
  forceFlattenChildren?: boolean;
};

function clone<T>(v: T): T {
  return structuredClone(v);
}

function collectSubtreeIds(
  template: EmailTemplate,
  blockId: string,
  out: Set<string> = new Set()
): Set<string> {
  const block = template.blocks[blockId];
  if (!block || out.has(blockId)) return out;
  out.add(blockId);
  for (const childId of block.children) {
    collectSubtreeIds(template, childId, out);
  }
  return out;
}

function removeBackgroundSuffix(name: string | undefined): string | undefined {
  if (!name) return name;
  return name.replace(/（可叠加）$/, "").replace(/（容器背景图）$/, "");
}

/**
 * 带容器背景图的 layout → `type: "image"`（保留 `wrapperStyle.backgroundImage` 与子树）。
 *
 * 说明：画布上 layout / image 对「仅 wrapperStyle 底图」走同一套预览实现，从用户视角几乎无差别；
 * 故 Inspector 已移除「还原为普通图片」入口；若仍需类型转换可脚本调用本函数。
 */
export function convertLayoutBackgroundToImage(
  template: EmailTemplate,
  blockId: string,
  options: ConvertToImageOptions = {}
): EmailTemplate {
  const next = clone(template);
  const block = next.blocks[blockId];
  if (!block) {
    throw new Error("目标区块不存在，无法还原为图片。");
  }
  if (block.type !== "layout") {
    throw new Error("仅布局区块支持从容器背景图还原为图片。");
  }
  const bg = block.wrapperStyle?.backgroundImage;
  if (!bg || typeof bg.src !== "string" || !bg.src.trim()) {
    throw new Error("该布局未设置容器背景图，无法还原为图片区块。");
  }

  let nextChildren = [...block.children];
  if (options.forceFlattenChildren === true && block.children.length > 0) {
    for (const childId of block.children) {
      const subtree = collectSubtreeIds(next, childId);
      for (const id of subtree) {
        delete next.blocks[id];
        if (next.blockMeta) delete next.blockMeta[id];
      }
    }
    nextChildren = [];
  }

  const convertedBlock: EmailBlock = {
    ...block,
    type: "image",
    children: nextChildren,
    wrapperStyle: block.wrapperStyle,
    props: pickImageOverlayStackProps(block.props as Record<string, unknown>),
    bindings: block.bindings,
  };
  next.blocks[blockId] = convertedBlock;

  if (!next.blockMeta) next.blockMeta = {};
  const oldMeta = next.blockMeta[blockId] ?? {};
  next.blockMeta[blockId] = {
    ...oldMeta,
    blockType: "content.image",
    name: removeBackgroundSuffix(oldMeta.name),
  };

  return next;
}
