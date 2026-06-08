import type { EmailBlock } from "../types/email";

/** 允许「存为模块」的容器根类型（与插入子级父级能力对齐，不含邮件根）。 */
export const SECTION_SAVE_ROOT_TYPES = ["layout", "grid", "image"] as const;

export type SectionSaveRootType = (typeof SECTION_SAVE_ROOT_TYPES)[number];

export function isSectionSaveRootType(type: string): type is SectionSaveRootType {
  return (SECTION_SAVE_ROOT_TYPES as readonly string[]).includes(type);
}

export function canSaveAsSection(block: Pick<EmailBlock, "type"> | null | undefined): boolean {
  return block != null && isSectionSaveRootType(block.type);
}
