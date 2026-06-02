/** 生成面向用户的版式落盘路径说明（不含仓库绝对路径） */
export function layoutVariantTokenPresetsPathHint(
  emailKey: string,
  layoutVariantId: string
): string {
  const key = emailKey.trim();
  const layoutId = layoutVariantId.trim();
  return `data/emails/${key}/layouts/${layoutId}/tokenPresets.json`;
}

export function layoutVariantTemplatePathHint(
  emailKey: string,
  layoutVariantId: string
): string {
  const key = emailKey.trim();
  const layoutId = layoutVariantId.trim();
  return `data/emails/${key}/layouts/${layoutId}/template.json`;
}
