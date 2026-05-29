import type { PayloadSlotDefinition } from "../types/email";

/** 场景内置列表变量（由 API 提供目录与预览数据，非手贴 JSON） */
export function isSceneCollectionPresetManagedSlot(
  def: PayloadSlotDefinition | undefined
): boolean {
  return Boolean(def?.sceneCollectionPresetId?.trim());
}

/** 仅「自定义列表 + 手贴样本」才展示配置数据源弹窗中的 JSON 粘贴 */
export function collectionSlotUsesJsonPasteDataSource(
  def: PayloadSlotDefinition | undefined
): boolean {
  if (isSceneCollectionPresetManagedSlot(def)) return false;
  if (def?.dataSource?.type === "remote" && def.dataSource.provider === "builtin") {
    return false;
  }
  return true;
}
