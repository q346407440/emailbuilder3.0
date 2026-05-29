import type { EmailBlock } from "../types/email";

/** 可作为列表重复宿主的 runtime block 类型（与 layout 容器叠放语义对齐，含 image） */
export const REPEAT_HOST_BLOCK_TYPES = ["layout", "grid", "image"] as const;

export type RepeatHostBlock = Extract<
  EmailBlock,
  { type: (typeof REPEAT_HOST_BLOCK_TYPES)[number] }
>;

export function isRepeatHostBlockType(type: EmailBlock["type"] | undefined): boolean {
  return type === "layout" || type === "grid" || type === "image";
}

export function isRepeatHostBlock(block: EmailBlock | undefined): block is RepeatHostBlock {
  return isRepeatHostBlockType(block?.type);
}
