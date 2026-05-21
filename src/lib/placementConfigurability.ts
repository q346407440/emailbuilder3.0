/**
 * 「容器相对父级摆放」产品规则唯一真源（Inspector / validateTemplate / 迁移脚本均引用本模块）。
 *
 * | 父级槽位 | 子块尺寸 | 水平 placement | 竖直 placement |
 * |----------|----------|----------------|----------------|
 * | 纵排 tableStackCell | 宽 fill | 整块禁止 | 整块禁止 |
 * | 纵排 | 宽 hug/fixed | 可配 center/end | 看子高是否 fill |
 * | 横排 tableRowCell | 高 fill | 整块禁止 | 整块禁止 |
 * | 横排 | 高 hug/fixed | 看子宽是否 fill | 可配 center/end |
 *
 * 单轴 fill 时该轴不可配（无可见效果），但另一轴仍可能可配；矩阵/非表格父级见 resolvePlacementSemantics。
 */
import type { EmailBlock, EmailTemplate, WrapperPlacement, WrapperStyle } from "../types/email";
import { placementParentKindForBlock } from "./placementParentContext";
import {
  buildPlacementResolveInputFromWrapper,
  type PlacementAxis,
  type PlacementParentKind,
  type PlacementResolveInput,
  resolvePlacementSemantics,
} from "./resolvePlacement";

export type PlacementAxisConfigurability = {
  configurable: boolean;
  degradeReason?: string;
};

export type PlacementConfigurability = {
  horizontal: PlacementAxisConfigurability;
  vertical: PlacementAxisConfigurability;
};

const FILL_WIDTH_BLOCKS_STACK_PLACEMENT =
  "父级为纵排布局且本块宽度为铺满（fill）时，不支持相对父级摆放；请改父级「容器内内容摆放」（contentAlign）";
const FILL_HEIGHT_BLOCKS_ROW_PLACEMENT =
  "父级为横排布局且本块高度为铺满（fill）时，不支持相对父级摆放；请改父级「容器内内容摆放」（contentAlign）";

/** 纵排 + fill 宽、横排 + fill 高：整块 placement 禁止持久化（含 start）。 */
export function unsupportedRelativePlacementReason(
  input: PlacementResolveInput
): string | null {
  if (input.parentKind === "tableStackCell" && input.widthMode === "fill") {
    return FILL_WIDTH_BLOCKS_STACK_PLACEMENT;
  }
  if (input.parentKind === "tableRowCell" && input.heightMode === "fill") {
    return FILL_HEIGHT_BLOCKS_ROW_PLACEMENT;
  }
  return null;
}

function fillBlocksAxisReason(
  axis: "horizontal" | "vertical",
  input: PlacementResolveInput
): string | null {
  if (axis === "horizontal" && input.widthMode === "fill") {
    return "宽度为铺满（fill）时，水平相对父级摆放对整块容器几乎无可见效果；请改父级或本块「容器内内容摆放」（contentAlign）";
  }
  if (axis === "vertical" && input.heightMode === "fill") {
    return "高度为铺满（fill）时，竖直相对父级摆放对整块容器几乎无可见效果；请改父级或本块「容器内内容摆放」（contentAlign）";
  }
  return null;
}

/**
 * 单轴是否可配置「容器相对父级摆放」。
 * 纵排父：子宽非 fill → 水平轴可配；子高非 fill → 竖直轴可配。
 * 横排父：子高非 fill → 竖直轴可配；子宽非 fill → 水平轴可配。
 */
export function isRelativePlacementAxisConfigurable(
  axis: "horizontal" | "vertical",
  input: PlacementResolveInput
): boolean {
  if (unsupportedRelativePlacementReason(input)) return false;
  const fillReason = fillBlocksAxisReason(axis, input);
  if (fillReason) return false;
  if (input.parentKind === "tableStackCell" || input.parentKind === "tableRowCell") {
    return true;
  }
  return resolvePlacementSemantics(input)[axis].effective;
}

function axisConfigurability(
  axis: "horizontal" | "vertical",
  input: PlacementResolveInput
): PlacementAxisConfigurability {
  const wholeBlockReason = unsupportedRelativePlacementReason(input);
  if (wholeBlockReason) {
    return { configurable: false, degradeReason: wholeBlockReason };
  }
  const fillReason = fillBlocksAxisReason(axis, input);
  if (fillReason) {
    return { configurable: false, degradeReason: fillReason };
  }
  if (input.parentKind === "tableStackCell" || input.parentKind === "tableRowCell") {
    return { configurable: true };
  }
  const sem = resolvePlacementSemantics(input)[axis];
  return {
    configurable: sem.effective,
    degradeReason: sem.degradeReason,
  };
}

const PLACEMENT_GRID_OPTIONS: ReadonlyArray<{
  horizontal: PlacementAxis;
  vertical: PlacementAxis;
  label: string;
}> = [
  { horizontal: "start", vertical: "start", label: "左上" },
  { horizontal: "center", vertical: "start", label: "上中" },
  { horizontal: "end", vertical: "start", label: "右上" },
  { horizontal: "start", vertical: "center", label: "左中" },
  { horizontal: "center", vertical: "center", label: "正中" },
  { horizontal: "end", vertical: "center", label: "右中" },
  { horizontal: "start", vertical: "end", label: "左下" },
  { horizontal: "center", vertical: "end", label: "下中" },
  { horizontal: "end", vertical: "end", label: "右下" },
];

/** 是否展示「容器相对父级摆放」（至少一轴可配）。 */
export function isRelativePlacementSupported(input: PlacementResolveInput): boolean {
  return resolveRelativePlacementUiMode(input) !== "none";
}

/** Inspector 交互形态：仅横排三点 / 仅纵排三点 / 不展示（纵排父优先水平，横排父优先竖直）。 */
export type RelativePlacementUiMode = "none" | "horizontal" | "vertical";

export function resolveRelativePlacementUiMode(
  input: PlacementResolveInput
): RelativePlacementUiMode {
  const h = isRelativePlacementAxisConfigurable("horizontal", input);
  const v = isRelativePlacementAxisConfigurable("vertical", input);
  if (!h && !v) return "none";
  if (input.parentKind === "tableStackCell") {
    return h ? "horizontal" : v ? "vertical" : "none";
  }
  if (input.parentKind === "tableRowCell") {
    return v ? "vertical" : h ? "horizontal" : "none";
  }
  return h ? "horizontal" : v ? "vertical" : "none";
}

/** 与画布语义一致：各轴是否允许写入 center/end。 */
export function resolvePlacementConfigurability(
  input: PlacementResolveInput
): PlacementConfigurability {
  return {
    horizontal: axisConfigurability("horizontal", input),
    vertical: axisConfigurability("vertical", input),
  };
}

function axisInactiveReason(axis: "horizontal" | "vertical", cfg: PlacementConfigurability): string {
  const part = cfg[axis].degradeReason;
  if (part) return part;
  return axis === "horizontal"
    ? "当前不可配置水平相对父级摆放"
    : "当前不可配置竖直相对父级摆放";
}

/** 该轴上的 placement 值是否允许持久化（仅 start 或省略）。 */
export function isPlacementAxisValueAllowed(
  axis: "horizontal" | "vertical",
  value: unknown,
  input: PlacementResolveInput
): boolean {
  if (!isRelativePlacementAxisConfigurable(axis, input)) return value === undefined;
  if (value === undefined) return true;
  if (value === "start") return true;
  if (value !== "center" && value !== "end") return true;
  return resolvePlacementConfigurability(input)[axis].configurable;
}

export function relativePlacementValidationReason(
  placement: WrapperPlacement | undefined,
  input: PlacementResolveInput
): string | null {
  const reason = unsupportedRelativePlacementReason(input);
  if (!reason) return null;
  if (!placement) return null;
  if (placement.horizontal === undefined && placement.vertical === undefined) return null;
  return reason;
}

export function placementAxisValidationReason(
  axis: "horizontal" | "vertical",
  value: unknown,
  input: PlacementResolveInput
): string | null {
  if (isPlacementAxisValueAllowed(axis, value, input)) return null;
  const label = axis === "horizontal" ? "placement.horizontal" : "placement.vertical";
  const cfg = resolvePlacementConfigurability(input);
  return `${label} 在当前父级与宽高模式下不可配置（${axisInactiveReason(axis, cfg)}）；请改父级或本块「容器内内容摆放」（contentAlign），或先将对应宽高改为 hug/fixed`;
}

export function listAllowedPlacementGridOptions(input: PlacementResolveInput): Array<{
  horizontal: PlacementAxis;
  vertical: PlacementAxis;
  label: string;
}> {
  if (!isRelativePlacementSupported(input)) return [];
  const cfg = resolvePlacementConfigurability(input);
  return PLACEMENT_GRID_OPTIONS.filter(
    (o) =>
      (cfg.horizontal.configurable || o.horizontal === "start") &&
      (cfg.vertical.configurable || o.vertical === "start")
  );
}

function scrubPlacementObject(
  placement: WrapperPlacement | undefined,
  input: PlacementResolveInput
): { placement?: WrapperPlacement; changed: boolean } {
  if (!placement) return { changed: false };
  const wholeBlockReason = unsupportedRelativePlacementReason(input);
  if (wholeBlockReason) {
    if (placement.horizontal === undefined && placement.vertical === undefined) {
      return { changed: false };
    }
    return { placement: undefined, changed: true };
  }
  const cfg = resolvePlacementConfigurability(input);
  const next: WrapperPlacement = { ...placement };
  let changed = false;
  if (!cfg.horizontal.configurable && next.horizontal !== undefined) {
    delete next.horizontal;
    changed = true;
  }
  if (!cfg.vertical.configurable && next.vertical !== undefined) {
    delete next.vertical;
    changed = true;
  }
  if (!changed) return { placement, changed: false };
  if (next.horizontal === undefined && next.vertical === undefined) {
    return { placement: undefined, changed: true };
  }
  return { placement: next, changed: true };
}

export function normalizeBlockWrapperPlacement(
  wrapperStyle: WrapperStyle | undefined,
  parentKind: PlacementParentKind
): { wrapperStyle: WrapperStyle | undefined; changed: boolean } {
  if (!wrapperStyle) return { wrapperStyle, changed: false };
  const input = buildPlacementResolveInputFromWrapper(wrapperStyle, parentKind);
  const { placement, changed } = scrubPlacementObject(wrapperStyle.placement, input);
  if (!changed) return { wrapperStyle, changed: false };
  if (!placement) {
    const { placement: _removed, ...rest } = wrapperStyle;
    return { wrapperStyle: rest as WrapperStyle, changed: true };
  }
  return { wrapperStyle: { ...wrapperStyle, placement }, changed: true };
}

export function normalizeTemplatePlacement(template: EmailTemplate): {
  template: EmailTemplate;
  changes: string[];
} {
  const next = structuredClone(template) as EmailTemplate;
  const changes: string[] = [];
  for (const [id, block] of Object.entries(next.blocks) as [string, EmailBlock][]) {
    const parentKind = placementParentKindForBlock(next, id);
    const { wrapperStyle, changed } = normalizeBlockWrapperPlacement(block.wrapperStyle, parentKind);
    if (changed) {
      block.wrapperStyle = wrapperStyle;
      changes.push(id);
    }
  }
  return { template: next, changes };
}

export function buildPlacementResolveInputForBlock(
  template: EmailTemplate,
  blockId: string
): PlacementResolveInput {
  const block = template.blocks[blockId];
  const parentKind = placementParentKindForBlock(template, blockId);
  return buildPlacementResolveInputFromWrapper(block?.wrapperStyle, parentKind);
}
