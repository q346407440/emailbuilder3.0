import type {
  PlacementAxis,
  WrapperHeightMode,
  WrapperPlacement,
  WrapperStyle,
  WrapperWidthMode,
} from "../types/email";

/** 画布侧父级上下文：与 EmailPreview 中表格槽位（td）语义对齐 */
export type PlacementParentKind =
  | "tableRowCell"
  | "tableStackCell"
  | "tableMatrixCell"
  /** 非表格槽位子项（当前不应用相对父级放置） */
  | "none";

export type PlacementResolveInput = {
  parentKind: PlacementParentKind;
  widthMode: WrapperWidthMode;
  heightMode: WrapperHeightMode;
  placement?: WrapperPlacement;
};

export type PlacementAxisEffect = {
  effective: boolean;
  /** 用户可读降级说明（Inspector / 校验可复用） */
  degradeReason?: string;
};

export type PlacementResolveResult = {
  horizontal: PlacementAxisEffect;
  vertical: PlacementAxisEffect;
  resolvedHorizontal?: PlacementAxis;
  resolvedVertical?: PlacementAxis;
};

function normalizeWidthMode(raw: unknown): WrapperWidthMode {
  if (raw === "hug" || raw === "fill" || raw === "fixed") return raw;
  return "fill";
}

function normalizeHeightMode(raw: unknown): WrapperHeightMode {
  if (raw === "hug" || raw === "fill" || raw === "fixed") return raw;
  return "hug";
}

function normalizePlacementAxis(raw: unknown): PlacementAxis | undefined {
  if (raw === "start" || raw === "center" || raw === "end") return raw;
  return undefined;
}

/** 从 wrapperStyle.placement 读取放置轴（不再读取 selfAlign） */
export function effectivePlacementAxes(input: PlacementResolveInput): {
  horizontal?: PlacementAxis;
  vertical?: PlacementAxis;
} {
  const p = input.placement ?? {};
  return {
    horizontal: normalizePlacementAxis(p.horizontal),
    vertical: normalizePlacementAxis(p.vertical),
  };
}

function axisWeakOnFill(
  axis: "horizontal" | "vertical",
  mode: WrapperWidthMode | WrapperHeightMode
): { effective: boolean; reason?: string } {
  if (mode === "fill") {
    return {
      effective: false,
      reason:
        axis === "horizontal"
          ? "宽度为铺满（fill）时，水平相对放置对整块容器几乎无可见效果"
          : "高度为铺满（fill）时，垂直相对放置对整块容器几乎无可见效果",
    };
  }
  return { effective: true };
}

/**
 * 解释 placement 在当前父级与尺寸模式下是否「语义生效」，供 Inspector 提示与校验复用。
 */
export function resolvePlacementSemantics(
  input: PlacementResolveInput
): PlacementResolveResult {
  const { horizontal: rh, vertical: rv } = effectivePlacementAxes(input);
  const wm = input.widthMode;
  const hm = input.heightMode;

  const hEffect = axisWeakOnFill("horizontal", wm);
  const vEffect = axisWeakOnFill("vertical", hm);

  if (input.parentKind === "none") {
    return {
      horizontal: { effective: false, degradeReason: "当前父级非表格槽位上下文，水平放置不应用" },
      vertical: { effective: false, degradeReason: "当前父级非表格槽位上下文，垂直放置不应用" },
      resolvedHorizontal: rh,
      resolvedVertical: rv,
    };
  }

  let horizontal = hEffect.effective
    ? ({ effective: true } as PlacementAxisEffect)
    : { effective: false, degradeReason: hEffect.reason };
  let vertical = vEffect.effective
    ? ({ effective: true } as PlacementAxisEffect)
    : { effective: false, degradeReason: vEffect.reason };

  if (input.parentKind === "tableMatrixCell" && rv && rv !== "start") {
    vertical = {
      effective: false,
      degradeReason: "矩阵单元格内垂直相对放置为受限场景，预览可能近似",
    };
  }

  return {
    horizontal,
    vertical,
    resolvedHorizontal: rh,
    resolvedVertical: rv,
  };
}

export function buildPlacementResolveInputFromWrapper(
  ws: WrapperStyle | undefined,
  parentKind: PlacementParentKind
): PlacementResolveInput {
  return {
    parentKind,
    widthMode: normalizeWidthMode(ws?.widthMode),
    heightMode: normalizeHeightMode(ws?.heightMode),
    placement: ws?.placement,
  };
}
