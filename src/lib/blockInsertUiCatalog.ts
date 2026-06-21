import type { BlockCatalogEntry } from "./blockDefaults";

/** 与 PRD §8.5 一致的展示顺序（非字母序，便于运营扫读）。 */
export const BLOCK_INSERT_UI_ORDER: readonly string[] = [
  "action.button",
  "separator.divider",
  "indicator.progress",
  "layout.grid",
  "content.icon",
  "content.image",
  "content.text",
  "layout.container",
];

export const BLOCK_TYPE_SHORT: Record<string, string> = {
  "action.button": "按钮",
  "separator.divider": "分割",
  "indicator.progress": "进度",
  "layout.grid": "栅格",
  "content.icon": "图标",
  "content.image": "图片",
  "content.text": "文本",
  "layout.container": "容器",
};

export function sortBlockCatalogEntriesForInsertUi(
  entries: readonly BlockCatalogEntry[]
): BlockCatalogEntry[] {
  const order = new Map(BLOCK_INSERT_UI_ORDER.map((id, i) => [id, i]));
  return [...entries].sort((a, b) => {
    const ai = order.get(a.masterId) ?? 99;
    const bi = order.get(b.masterId) ?? 99;
    if (ai !== bi) return ai - bi;
    return a.name.localeCompare(b.name, "zh-CN");
  });
}
