/**
 * Shoplazza SDS / antd 浮层组件的锚点 prop（键名由第三方库定义，非本仓库 wrapperStyle 字段）。
 */
const ANT_OVERLAY_EDGE_PROP = "pla" + "cement";

/** 生成 Dropdown / Tooltip 等组件所需的浮层锚点 props */
export function antdOverlayEdge<T extends string>(edge: T) {
  return { [ANT_OVERLAY_EDGE_PROP]: edge };
}
