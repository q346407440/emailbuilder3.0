/**
 * 「容器内内容摆放」Inspector 可见性、可配性、校验与迁移 — **产品规则唯一真源**。
 *
 * 消费方（须引用本模块，禁止在其它处重复轴分工判断）：
 * - `src/components/Inspector.tsx` → `resolveContentAlignInspectorPresentation`
 * - `src/lib/wrapperLayoutReconcile.ts` → 结构性编辑后协调（含本模块 normalizeBlockWrapperContentAlign）
 * - `src/components/ui/ContentAlignAxisControl.tsx`
 * - `src/lib/validate.ts` → `collectContentAlignEffectivenessIssues`
 * - `scripts/migrate-content-align-hug-neutral.ts` → `normalizeTemplateContentAlignEffectiveness`
 *
 * 渲染语义见 `EmailPreview`（table `align`/`valign`）与 `emailTableLayout`（横排外层壳满宽见
 * `layoutHorizontalOuterPresentationShellFillWidth`）；
 * 持久化键为 `wrapperStyle.contentAlign`。
 *
 * 容器块（layout / grid / image 叠放）与子级排列方向无关时，水平+竖直两轴均配置
 * 「容器内内容摆放」；per-child 差异对齐请嵌套 layout，子块 contentAlign 仅作用于自身壳内。
 */
import type { EmailBlock, EmailTemplate, WrapperStyle } from "../types/email";

export type ContentAlignAxis = "horizontal" | "vertical";

export type ContentAlignAxisConfigurability = {
  configurable: boolean;
  degradeReason?: string;
  /** Inspector 小标题下红色简短说明 */
  inspectorDegradeReason?: string;
};

export type ContentAlignAxisVisibility = {
  showHorizontal: boolean;
  showVertical: boolean;
};

export type ContentAlignInspectorContext = {
  blockType: EmailBlock["type"];
  /** 直接父块类型（用于栅格格内 hug 子块等特例） */
  parentBlockType?: EmailBlock["type"];
  /** 父 layout / 底图 image 的排列方向（子块交叉轴可配性判定用） */
  parentLayoutDirection?: "vertical" | "horizontal";
  layoutDirection?: "vertical" | "horizontal";
  widthMode: "hug" | "fill" | "fixed";
  heightMode: "hug" | "fill" | "fixed";
  allChildrenFillWidth: boolean;
  allChildrenFillHeight: boolean;
  hasFillHeightChild: boolean;
};

function normalizeWidthMode(raw: unknown): "hug" | "fill" | "fixed" {
  if (raw === "hug" || raw === "fill" || raw === "fixed") return raw;
  return "fill";
}

function normalizeHeightMode(raw: unknown): "hug" | "fill" | "fixed" {
  if (raw === "hug" || raw === "fill" || raw === "fixed") return raw;
  return "hug";
}

function normalizeLayoutDirection(raw: unknown): "vertical" | "horizontal" | undefined {
  if (raw === "vertical" || raw === "horizontal") return raw;
  return undefined;
}

/** 从当前块与模板解析 Inspector 用的 contentAlign 上下文。 */
export function resolveContentAlignInspectorContext(
  template: EmailTemplate,
  block: EmailBlock
): ContentAlignInspectorContext {
  const ws = (block.wrapperStyle ?? {}) as WrapperStyle;
  const childIds = block.children ?? [];
  const childWidthModes = childIds.map((id) => {
    const child = template.blocks[id];
    return normalizeWidthMode(child?.wrapperStyle?.widthMode);
  });
  const childHeightModes = childIds.map((id) => {
    const child = template.blocks[id];
    return normalizeHeightMode(child?.wrapperStyle?.heightMode);
  });

  const layoutDirection = effectiveContentAlignLayoutDirection(block);
  const parent = block.parentId ? template.blocks[block.parentId] : undefined;
  const parentLayoutDirection =
    parent?.type === "layout" || parent?.type === "image"
      ? normalizeLayoutDirection((parent.props as { direction?: unknown })?.direction)
      : undefined;

  return {
    blockType: block.type,
    parentBlockType: parent?.type,
    parentLayoutDirection,
    layoutDirection,
    widthMode: normalizeWidthMode(ws.widthMode),
    heightMode: normalizeHeightMode(ws.heightMode),
    allChildrenFillWidth: childIds.length > 0 && childWidthModes.every((m) => m === "fill"),
    allChildrenFillHeight: childIds.length > 0 && childHeightModes.every((m) => m === "fill"),
    hasFillHeightChild: childHeightModes.some((m) => m === "fill"),
  };
}

/**
 * contentAlign 轴分工用的「有效排列方向」：栅格无 direction 时视同纵排。
 * Inspector / validate / reconcile 须用本函数，勿从 grid.props 读 direction。
 */
export function effectiveContentAlignLayoutDirection(
  block: EmailBlock
): "vertical" | "horizontal" | undefined {
  if (block.type === "grid") return "vertical";
  if (block.type === "layout" || block.type === "image") {
    return normalizeLayoutDirection((block.props as { direction?: unknown })?.direction);
  }
  return undefined;
}

/** 轴可见性：Inspector 常显双轴。 */
export function resolveContentAlignAxisVisibility(
  _ctx: ContentAlignInspectorContext
): ContentAlignAxisVisibility {
  return { showHorizontal: true, showVertical: true };
}

/** 单轴是否建议在 Inspector 中配置。当前按产品决策双轴恒可配。 */
export function resolveContentAlignAxisConfigurability(
  _axis: ContentAlignAxis,
  _ctx: ContentAlignInspectorContext
): ContentAlignAxisConfigurability {
  return { configurable: true };
}

export type ContentAlignEffectivenessIssue = { path: string; reason: string };

/** 当前 contentAlign 双轴恒可配，不额外产出有效性校验问题。 */
export function collectContentAlignEffectivenessIssues(
  _blockId: string,
  _template: EmailTemplate,
  _block: EmailBlock
): ContentAlignEffectivenessIssue[] {
  return [];
}

export type ContentAlignEffectivenessChange = {
  blockId: string;
  axis: ContentAlignAxis;
  from: string;
  to: string;
};

function scrubContentAlignObject(
  _blockId: string,
  ca: NonNullable<WrapperStyle["contentAlign"]>,
  _ctx: ContentAlignInspectorContext
): { contentAlign: NonNullable<WrapperStyle["contentAlign"]>; changes: ContentAlignEffectivenessChange[] } {
  return { contentAlign: ca, changes: [] };
}

/**
 * 单块 contentAlign 失效轴回落（Inspector 改 direction / 迁移脚本共用）。
 * `block` 须已反映最新 props（如已写入 direction）。
 */
export function normalizeBlockWrapperContentAlign(
  template: EmailTemplate,
  blockId: string,
  block?: EmailBlock
): {
  wrapperStyle: WrapperStyle | undefined;
  changed: boolean;
  changes: ContentAlignEffectivenessChange[];
} {
  const target = block ?? template.blocks[blockId];
  if (!target || target.type === "emailRoot") {
    return { wrapperStyle: target?.wrapperStyle, changed: false, changes: [] };
  }
  const ca = target.wrapperStyle?.contentAlign;
  if (!ca || typeof ca !== "object" || Array.isArray(ca)) {
    return { wrapperStyle: target.wrapperStyle, changed: false, changes: [] };
  }

  const ctx = resolveContentAlignInspectorContext(template, target);
  const { contentAlign: nextCa, changes } = scrubContentAlignObject(blockId, ca, ctx);
  if (changes.length === 0) {
    return { wrapperStyle: target.wrapperStyle, changed: false, changes: [] };
  }
  return {
    wrapperStyle: { ...target.wrapperStyle, contentAlign: nextCa },
    changed: true,
    changes,
  };
}

/** 保留迁移入口：当前规则下 contentAlign 不做可配性回落。 */
export function normalizeTemplateContentAlignEffectiveness(template: EmailTemplate): {
  template: EmailTemplate;
  changes: ContentAlignEffectivenessChange[];
} {
  const changes: ContentAlignEffectivenessChange[] = [];
  const blocks = { ...template.blocks };

  for (const [blockId, block] of Object.entries(blocks)) {
    if (block.type === "emailRoot") continue;
    const { wrapperStyle, changed, changes: blockChanges } = normalizeBlockWrapperContentAlign(
      template,
      blockId,
      block
    );
    if (!changed || !wrapperStyle) continue;
    changes.push(...blockChanges);
    blocks[blockId] = { ...block, wrapperStyle };
  }

  return changes.length > 0 ? { template: { ...template, blocks }, changes } : { template, changes };
}

/** 容器内内容摆放 Field 总说明（按块类型与排列方向）。 */
export function buildContentAlignInspectorHint(ctx: ContentAlignInspectorContext): string {
  const parts = ["控制内容在当前区块自己的外层容器里如何摆放。"];

  if (
    ctx.blockType === "layout" ||
    ctx.blockType === "grid" ||
    ctx.blockType === "image"
  ) {
    if (ctx.layoutDirection === "vertical") {
      parts.push(
        ctx.blockType === "grid"
          ? "栅格：配置格内子级在格内的水平与竖直对齐。"
          : "纵排容器：配置子级整组在容器内的水平与竖直对齐。"
      );
    } else if (ctx.layoutDirection === "horizontal") {
      parts.push("横排容器：配置子级整组在容器内的水平与竖直对齐。");
    }
  } else {
    parts.push(
      "叶子块：配置块自身内容在外层容器中的水平与竖直摆放。"
    );
  }

  return parts.join(" ");
}

export function resolveContentAlignInspectorPresentation(
  template: EmailTemplate,
  block: EmailBlock
): {
  hint: string;
  horizontal: ContentAlignAxisConfigurability;
  vertical: ContentAlignAxisConfigurability;
  visibility: ContentAlignAxisVisibility;
} {
  const ctx = resolveContentAlignInspectorContext(template, block);
  return {
    hint: buildContentAlignInspectorHint(ctx),
    horizontal: resolveContentAlignAxisConfigurability("horizontal", ctx),
    vertical: resolveContentAlignAxisConfigurability("vertical", ctx),
    visibility: resolveContentAlignAxisVisibility(ctx),
  };
}
