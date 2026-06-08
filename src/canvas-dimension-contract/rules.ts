import type { CanvasDimensionRule } from "./types";

/**
 * 画布尺寸语义规则目录（唯一真源）。
 * 与 `render-defaults-contract`（渲染注入常量）、`editor-canvas-contract`（预览视窗 UI 态）分工：
 * 本包定义 hug/fill/fixed 如何参与自适应、fixed 如何强制、视窗如何裁切。
 */
export const CANVAS_DIMENSION_RULES: readonly CanvasDimensionRule[] = [
  {
    id: "strict.fixedNoShrink",
    kind: "strictFixed",
    title: "fixed 轴强制占位",
    summary:
      "widthMode/heightMode 为 fixed 时输出配置的 px，禁止 max-width/min-width 等自适应压窄或压矮。",
    implementation: "src/lib/canvasDimensionResolve.ts · resolveWrapperWidthCss / resolveWrapperHeightCss",
  },
  {
    id: "adaptive.fillUsesParentAvailable",
    kind: "adaptive",
    title: "fill 占满父级可用空间",
    summary: "fill 轴在父级 content box 内按 100% 铺满；父级变窄时随父级收缩。",
    implementation: "src/lib/canvasDimensionResolve.ts · resolveWrapperWidthCss",
  },
  {
    id: "adaptive.hugShrinksWithContent",
    kind: "adaptive",
    title: "hug 随内容收缩",
    summary: "hug 轴 width:auto，且 maxWidth 不超过父级可用宽；文本等内容在 content box 内换行。",
    implementation: "src/lib/canvasDimensionResolve.ts · resolveWrapperWidthCss / resolveComponentBodyWidthCss",
  },
  {
    id: "clip.overflowHiddenOnShell",
    kind: "clip",
    title: "块外壳 overflow 裁切",
    summary: "每个 block 外壳 overflow:hidden；子级超出父级可视区域时裁切，不改子级 fixed 尺寸。",
    implementation: "src/render-defaults-contract/values.ts · PREVIEW_BLOCK_OVERFLOW",
  },
  {
    id: "clip.viewportBoundsPreview",
    kind: "clip",
    title: "预览视窗为最外层裁切边界",
    summary: "桌面/移动预览视窗宽度仅 UI 态；视窗层 overflow:hidden，横向不滚动。",
    implementation:
      "src/lib/canvasDimensionResolve.ts · resolvePreviewViewportClipCss · src/editor-canvas-contract/values.ts",
  },
  {
    id: "viewport.effectiveLayoutWidth",
    kind: "viewport",
    title: "fill/hug 有效父宽",
    summary:
      "预览态下 layout 可用宽 = min(版心配置宽, 预览视窗宽)；fixed 子级仍保持配置 px，超出部分由父级/视窗裁切。",
    implementation: "src/lib/canvasDimensionResolve.ts · resolveEffectiveLayoutWidth",
  },
  {
    id: "viewport.previewSeparateFromJson",
    kind: "viewport",
    title: "预览视窗不写 JSON",
    summary: "桌面/移动切换仅影响画布预览，不修改 emailRoot.props.width 与发信 HTML。",
    implementation: "src/editor-canvas-contract/values.ts · resolveCanvasPreviewViewportWidth",
  },
  {
    id: "viewport.rootSelectionOnNarrowViewport",
    kind: "viewport",
    title: "窄视窗下根选中描边画在视窗层",
    summary:
      "视窗窄于版心且选中画布根时，选中框画在 .email-preview-viewport（可见区域），避免 600px 根外壳被 overflow 裁切后描边缺右侧。",
    implementation:
      "src/lib/canvasDimensionResolve.ts · isPreviewViewportNarrowerThanRoot · src/components/EmailPreview.tsx",
  },
] as const;

export const CANVAS_DIMENSION_RULE_IDS = CANVAS_DIMENSION_RULES.map((r) => r.id);
