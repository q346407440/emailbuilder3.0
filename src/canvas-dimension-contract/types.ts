/** wrapper 宽/高模式（与 template wrapperStyle 一致） */
export type WrapperDimensionMode = "hug" | "fill" | "fixed";

export type CanvasDimensionRuleKind =
  | "strictFixed"
  | "adaptive"
  | "clip"
  | "viewport";

export type CanvasDimensionRule = {
  /** 稳定 id，供测试与实现索引引用 */
  id: string;
  kind: CanvasDimensionRuleKind;
  title: string;
  summary: string;
  /** 实现入口（相对仓库根） */
  implementation: string;
};
