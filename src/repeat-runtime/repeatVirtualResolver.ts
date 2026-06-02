import type { VirtualBlockRef } from "../repeat-binding-contract";
import type { EmailTemplate } from "../types/email";
import { isRepeatHostBlock } from "../lib/repeatHostBlock";
import type { ResolvedRepeatContext } from "../lib/repeatRegion";

/** 虚拟 ref 的稳定字符串键（React key、DOM data 属性、预览 block.id） */
export function refToStableKey(ref: VirtualBlockRef): string {
  if (ref.kind === "physical") {
    return `physical:${ref.blockId}`;
  }
  const ctxKey = ref.contextStack
    .map((c) => `${c.slotId}@${c.itemPath}`)
    .join("|");
  return `repeat-item:${ref.hostId}:${ref.prototypeRootId}:${ref.itemIndex}:${ctxKey}`;
}

/** 两虚拟 ref 是否指向同一预览节点 */
export function refsEqual(a: VirtualBlockRef, b: VirtualBlockRef): boolean {
  return refToStableKey(a) === refToStableKey(b);
}

/** 虚拟 ref 对应的物理 template blockId（repeat-item 取 prototypeRootId） */
export function resolvePhysicalBlockId(ref: VirtualBlockRef): string {
  return ref.kind === "physical" ? ref.blockId : ref.prototypeRootId;
}

/**
 * 解析虚拟 ref 所处的列表 repeat 上下文。
 * physical ref 等价于 `{ kind: "physical", blockId }` 传入本函数。
 */
export function resolveRepeatContextForRef(
  template: EmailTemplate,
  ref: VirtualBlockRef
): ResolvedRepeatContext | null {
  const blockId = resolvePhysicalBlockId(ref);
  const block = template.blocks[blockId];
  if (!block) return null;

  if (block.repeat?.mode === "collection" && isRepeatHostBlock(block)) {
    const prototypeRootId = block.repeat.prototypeChildIds[0];
    if (!prototypeRootId) return null;
    return {
      hostId: blockId,
      repeat: block.repeat,
      relation: "host",
      prototypeRootId,
      fieldMappingsOnBlock: [],
    };
  }

  let hostId: string | null = block.parentId;
  while (hostId) {
    const host = template.blocks[hostId];
    const repeat = host?.repeat;
    if (repeat?.mode === "collection" && isRepeatHostBlock(host)) {
      const prototypeRootId = repeat.prototypeChildIds.find((pid) => {
        let cur: string | null = blockId;
        while (cur) {
          if (cur === pid) return true;
          cur = template.blocks[cur]?.parentId ?? null;
        }
        return false;
      });
      if (prototypeRootId) {
        const fieldMappingsOnBlock =
          repeat.fieldMappings?.filter((mapping) => mapping.targetBlockId === blockId) ?? [];
        return {
          hostId,
          repeat,
          relation: fieldMappingsOnBlock.length > 0 ? "mapped-field" : "row-template",
          prototypeRootId,
          fieldMappingsOnBlock,
        };
      }
    }
    hostId = host?.parentId ?? null;
  }

  if (ref.kind === "repeat-item") {
    const host = template.blocks[ref.hostId];
    const repeat = host?.repeat;
    if (repeat?.mode === "collection" && isRepeatHostBlock(host)) {
      const fieldMappingsOnBlock =
        repeat.fieldMappings?.filter((mapping) => mapping.targetBlockId === ref.prototypeRootId) ??
        [];
      return {
        hostId: ref.hostId,
        repeat,
        relation:
          ref.prototypeRootId === blockId && fieldMappingsOnBlock.length > 0
            ? "mapped-field"
            : "row-template",
        prototypeRootId: ref.prototypeRootId,
        fieldMappingsOnBlock,
      };
    }
  }

  return null;
}
