import type { BindingCollectionField } from "../types/email";
import { isCollectionField } from "../payload-contract/collection-item-fields";

/** 用户可见文案：去掉区块名等遗留的 repeat 英文标记 */
export function sanitizeListRepeatUserLabel(text: string): string {
  return text
    .replace(/[（(]\s*repeat\s*[）)]/gi, "")
    .replace(/\brepeat\b/gi, "")
    .trim()
    .replace(/\s{2,}/g, " ");
}

/** 列表字段映射表仅展示标量列（子列表由子级循环容器单独绑定，不在父级映射里出现） */
export function parentScalarItemFieldsFromItemFields(
  itemFields: BindingCollectionField[]
): BindingCollectionField[] {
  return itemFields.filter((field) => !isCollectionField(field));
}
