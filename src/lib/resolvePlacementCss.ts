import type { CSSProperties } from "react";
import type { WrapperHeightMode, WrapperStyle, WrapperWidthMode } from "../types/email";
import {
  buildPlacementResolveInputFromWrapper,
  effectivePlacementAxes,
  type PlacementParentKind,
} from "./resolvePlacement";

/**
 * 主轴为横向时，用 margin + `auto` 在父内容区实现 start/center/end（与 tableMatrixCell 水平策略一致）。
 * 子项 `widthMode: fill` 时主轴上无剩余空间可分配，不输出 margin（与 resolvePlacementSemantics 一致）。
 */
function mainAxisHorizontalMarginsForPlacement(
  rh: "start" | "center" | "end",
  wm: WrapperWidthMode
): Pick<CSSProperties, "marginLeft" | "marginRight"> | undefined {
  if (wm === "fill") return undefined;
  if (rh === "end") return { marginLeft: "auto", marginRight: "0" };
  if (rh === "start") return { marginLeft: "0", marginRight: "auto" };
  return { marginLeft: "auto", marginRight: "auto" };
}

/**
 * 交叉轴为竖直时，用 margin + `auto` 在单元格内实现上/中/下。
 * `td` 默认非 flex 子项，`align-self` 会被忽略，故与 `tableMatrixCell` 一致改用竖直 margin。
 */
function crossAxisVerticalMarginsForPlacement(
  rv: "start" | "center" | "end",
  hm: WrapperHeightMode
): Pick<CSSProperties, "marginTop" | "marginBottom"> | undefined {
  if (hm === "fill") return undefined;
  if (rv === "end") return { marginTop: "auto", marginBottom: "0" };
  if (rv === "center") return { marginTop: "auto", marginBottom: "auto" };
  return undefined;
}

/**
 * 表格槽位上，由 placement 派生的 margin（及少量宽高补全）。
 * 不含 padding/边框等，仅相对父级的放置实现层。
 */
export function resolvePlacementToCss(
  ws: WrapperStyle | undefined,
  parentKind: PlacementParentKind
): CSSProperties {
  if (parentKind === "none") return {};

  const input = buildPlacementResolveInputFromWrapper(ws, parentKind);
  const { horizontal: rh, vertical: rv } = effectivePlacementAxes(input);
  const wm = input.widthMode;
  const hm = input.heightMode;

  const out: CSSProperties = {};

  if (parentKind === "tableRowCell") {
    if (rh === "start" || rh === "center" || rh === "end") {
      const mx = mainAxisHorizontalMarginsForPlacement(rh, wm);
      if (mx) Object.assign(out, mx);
    }
    if (hm !== "fill" && rv) {
      const my = crossAxisVerticalMarginsForPlacement(rv, hm);
      if (my) Object.assign(out, my);
    }
    return out;
  }

  if (parentKind === "tableStackCell") {
    if (wm !== "fill") {
      if (rh === "start" || rh === "center" || rh === "end") {
        const mx = mainAxisHorizontalMarginsForPlacement(rh, wm);
        if (mx) Object.assign(out, mx);
      }
    }

    if (hm !== "fill" && rv) {
      if (rv === "end") {
        out.marginTop = "auto";
        out.marginBottom = "0";
      } else if (rv === "center") {
        out.marginTop = "auto";
        out.marginBottom = "auto";
      }
    }

    return out;
  }

  // tableMatrixCell：块级边距近似水平放置；垂直向仅做 margin 近似（水平与 tableRowCell 同源）
  if (rh === "start" || rh === "center" || rh === "end") {
    const mx = mainAxisHorizontalMarginsForPlacement(rh, wm);
    if (mx) Object.assign(out, mx);
  }
  if (hm !== "fill" && rv) {
    if (rv === "end") {
      out.marginTop = "auto";
      out.marginBottom = "0";
    } else if (rv === "center") {
      out.marginTop = "auto";
      out.marginBottom = "auto";
    }
  }

  return out;
}
