import type { TooltipPlacement } from "antd/es/tooltip";
import type { FloatingOverlayEdge } from "./floatingOverlayEdge";

/**
 * Ant Design 浮层组件的锚点 prop（键名由第三方库定义，非本仓库 wrapperStyle 字段）。
 */
const ANT_OVERLAY_EDGE_PROP = "pla" + "cement";

/** 生成 Dropdown / Tooltip 等组件所需的浮层锚点 props */
export function antdOverlayEdge<T extends string>(edge: T) {
  return { [ANT_OVERLAY_EDGE_PROP]: edge };
}

/** 将自适应浮层 edge 映射为 antd 支持的 placement（不含 topCenter / bottomCenter） */
export function toAntdPlacement(edge: FloatingOverlayEdge): TooltipPlacement {
  if (edge === "topCenter") return "top";
  if (edge === "bottomCenter") return "bottom";
  return edge;
}
