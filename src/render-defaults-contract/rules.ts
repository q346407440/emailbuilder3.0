import type { RenderDefaultRule } from "./types";

/**
 * 项目「渲染默认 / 禁止持久化」规则目录（唯一真源）。
 * 与 `block-contract`（允许写什么）、`token-preset-contract`（样式预设键）并列。
 */
export const RENDER_DEFAULT_RULES: readonly RenderDefaultRule[] = [
  // —— 禁止写入 template.json（由 validate + strip 脚本执行）——
  {
    id: "forbid.selfAlign",
    kind: "forbiddenInJson",
    title: "禁止 selfAlign",
    summary: "相对父级对齐只使用 wrapperStyle.placement；禁止 legacy selfAlign。",
    jsonPath: "wrapperStyle.selfAlign",
    blockTypes: ["all"],
    implementation: "src/render-defaults-contract/validate.ts",
  },
  {
    id: "forbid.backgroundContentAlign",
    kind: "forbiddenInJson",
    title: "禁止 backgroundContentAlign",
    summary: "底图叠放默认 left/top；叠放块位置用子级 placement。",
    jsonPath: "wrapperStyle.backgroundContentAlign",
    blockTypes: ["layout", "image"],
    implementation: "src/render-defaults-contract/values.ts",
  },
  {
    id: "forbid.wrapperOverflow",
    kind: "forbiddenInJson",
    title: "禁止 wrapperStyle.overflow",
    summary: "预览层统一 overflow:hidden，不写入 JSON。",
    jsonPath: "wrapperStyle.overflow",
    blockTypes: ["all"],
    implementation: "src/components/EmailPreview.tsx",
  },
  {
    id: "forbid.overlayInset",
    kind: "forbiddenInJson",
    title: "禁止 overlayInset",
    summary: "已废弃；底图块用 wrapperStyle.padding + 叠放语义。",
    jsonPath: "wrapperStyle.overlayInset",
    blockTypes: ["layout", "image"],
    implementation: "src/lib/validate.ts",
  },
  {
    id: "forbid.buttonInnerPadding",
    kind: "forbiddenInJson",
    title: "禁止按钮内边距 JSON",
    summary: "按钮胶囊 padding 由渲染层固定。",
    jsonPath: "props.buttonStyle.padding",
    blockTypes: ["button"],
    implementation: "src/lib/buttonInnerPadding.ts",
  },
  {
    id: "forbid.textLineHeight",
    kind: "forbiddenInJson",
    title: "禁止 text.lineHeight",
    summary: "文本行高由渲染层固定。",
    jsonPath: "props.lineHeight",
    blockTypes: ["text"],
    implementation: "src/components/EmailPreview.tsx",
  },
  {
    id: "forbid.textLegacyTypography",
    kind: "forbiddenInJson",
    title: "禁止 text 旧版字体字段",
    summary: "fontWeight/fontStyle/textDecoration/fontMode 等已废弃。",
    jsonPath: "props.fontWeight | props.fontStyle | props.textDecoration | props.fontMode",
    blockTypes: ["text"],
    implementation: "src/lib/validate.ts",
  },
  {
    id: "forbid.emailRootTypography",
    kind: "forbiddenInJson",
    title: "禁止画布根字体字段",
    summary: "fonts 在 text/button 块级绑定 token。",
    jsonPath: "props.fontFamily | props.headingFontFamily | props.bodyFontFamily",
    blockTypes: ["emailRoot"],
    implementation: "src/lib/normalizeEmailRoot.ts",
  },
  {
    id: "forbid.emailRootLayoutProps",
    kind: "forbiddenInJson",
    title: "禁止画布根排列/对齐配置",
    summary: "根节点固定纵向栈；不对齐子块序列做 contentAlign/direction 配置。",
    jsonPath: "props.direction | props.contentAlign",
    blockTypes: ["emailRoot"],
    implementation: "src/lib/validate.ts",
  },
  {
    id: "forbid.emailRootOuterBackground",
    kind: "forbiddenInJson",
    title: "禁止画布根外侧底色 JSON",
    summary: "邮件卡片外工作区灰底由项目固定 EMAIL_CANVAS_WORKSPACE_BACKGROUND（#f1f1f1），不随模板配置。",
    jsonPath: "props.outerBackgroundColor",
    blockTypes: ["emailRoot"],
    implementation: "src/lib/validate.ts",
  },
  {
    id: "forbid.fitContentMode",
    kind: "forbiddenInJson",
    title: "禁止 fitContent 宽高模式",
    summary: "widthMode/heightMode 仅 hug/fill/fixed。",
    jsonPath: "wrapperStyle.widthMode | wrapperStyle.heightMode",
    blockTypes: ["all"],
    implementation: "src/lib/validate.ts",
  },

  // —— 渲染注入（画布生效，不写入 JSON）——
  {
    id: "inject.layoutContentAlign",
    kind: "injectedAtRender",
    title: "contentAlign 默认与回退",
    summary:
      "所有普通 block 持久化 wrapperStyle.contentAlign.horizontal / vertical；缺失时渲染回退 left/top。",
    valueKey: "PROJECT_LAYOUT_CONTENT_ALIGN",
    implementation: "src/render-defaults-contract/values.ts",
  },
  {
    id: "inject.backgroundContentAlign",
    kind: "injectedAtRender",
    title: "底图叠放层默认对齐",
    summary:
      "emailRoot/layout/image 有 backgroundImage 时，叠放层外层 td 未写 contentAlign 主轴则回退 left+top（经 projectLayoutContentAlign）；direction/gapMode/gap 使用同一套栈布局语义。",
    valueKey: "PROJECT_BACKGROUND_CONTENT_ALIGN",
    implementation: "src/components/EmailPreview.tsx",
  },
  {
    id: "inject.textContentAlignVertical",
    kind: "injectedAtRender",
    title: "text 竖直排版默认",
    summary: "存量文本缺失 vertical 时回退 top；新结构会显式持久化。",
    valueKey: "PROJECT_TEXT_CONTENT_ALIGN_VERTICAL",
  },
  {
    id: "inject.buttonInnerPadding",
    kind: "injectedAtRender",
    title: "按钮内边距",
    summary: "按钮胶囊内边距由渲染层统一固定，不写入 JSON。",
    valueKey: "BUTTON_INNER_PADDING",
    implementation: "src/lib/buttonInnerPadding.ts",
  },
  {
    id: "inject.imageBackgroundFallback",
    kind: "injectedAtRender",
    title: "图片/底图兜底色",
    summary: "图片和底图透明区域使用统一兜底色。",
    valueKey: "IMAGE_BACKGROUND_FALLBACK_COLOR",
    implementation: "src/lib/imageBackgroundFallback.ts",
  },
  {
    id: "inject.textLineHeight",
    kind: "injectedAtRender",
    title: "文本行高",
    summary: "文本行高由预览层统一固定。",
    valueKey: "FIXED_TEXT_LINE_HEIGHT",
    implementation: "src/components/EmailPreview.tsx",
  },
  {
    id: "inject.emailRootWidth",
    kind: "injectedAtRender",
    title: "画布根固定宽度",
    summary:
      "邮件内容区宽度以 render-defaults-contract/values.ts 中的 EMAIL_ROOT_FIXED_WIDTH 为唯一真源，与根节点 props.width 校验一致。",
    valueKey: "EMAIL_ROOT_FIXED_WIDTH",
    implementation: "src/lib/normalizeEmailRoot.ts",
  },
  {
    id: "inject.previewOverflow",
    kind: "injectedAtRender",
    title: "预览块 overflow",
    summary: "预览层统一按 hidden 裁切区块外壳。",
    valueKey: "PREVIEW_BLOCK_OVERFLOW",
    implementation: "src/components/EmailPreview.tsx",
  },
  {
    id: "inject.hugLayoutShrinkWrap",
    kind: "injectedAtRender",
    title: "hug 布局收缩行宽",
    summary: "widthMode:hug 的 layout 在竖栈父级下用 fit-content，避免 placement 水平居中失效。",
    implementation: "src/lib/emailTableLayout.ts",
  },
  {
    id: "inject.presentationTable",
    kind: "injectedAtRender",
    title: "邮件表格 presentation 基样式",
    summary: "borderCollapse/width 等表格骨架样式。",
    implementation: "src/lib/emailTableLayout.ts",
  },
  {
    id: "inject.gridGapUnified",
    kind: "injectedAtRender",
    title: "栅格行列间隙同值",
    summary: "grid.props.gap 同时驱动列间隙与行间隙（spacer 列/行）。",
    implementation: "src/components/EmailPreview.tsx",
  },

  // —— 特殊语义（JSON 字段在特定上下文下含义不同）——
  {
    id: "semantic.backgroundPadding",
    kind: "specialSemantic",
    title: "底图容器 padding → 叠放内容区内边距",
    summary:
      "emailRoot/layout/image 且 backgroundImage 有效时：emailRoot.props.padding 或普通块 wrapperStyle.padding 不缩小底图，仅作用于绝对定位叠放表 <td> 内边距（与常规定义「容器外圈留白」不同）。",
    jsonPath: "props.padding | wrapperStyle.padding",
    blockTypes: ["emailRoot", "layout", "image"],
    implementation: "src/components/EmailPreview.tsx · wrapperStyleToCss({ omitPadding: true })",
  },
  {
    id: "semantic.imagePositionOnlyCover",
    kind: "specialSemantic",
    title: "图片画面位置仅作用于 cover 裁切",
    summary:
      "emailRoot/layout/image 的 backgroundImage.fit 为 contain 时完整显示图片，backgroundImage.position 不参与小图在视窗内的摆放；fit 为 cover 时才作为裁切焦点映射到 object-position。",
    jsonPath: "wrapperStyle.backgroundImage.position",
    blockTypes: ["emailRoot", "layout", "image"],
    implementation: "src/lib/imageObjectPosition.ts · src/components/EmailPreview.tsx",
  },
  {
    id: "semantic.emailRootVerticalStack",
    kind: "specialSemantic",
    title: "画布根固定纵向栈",
    summary: "emailRoot 在预览中恒为纵向表格堆叠；仅 props.gap/gapMode 可配间距。",
    blockTypes: ["emailRoot"],
    implementation: "src/components/EmailPreview.tsx",
  },
  {
    id: "semantic.placementVsParentContentAlign",
    kind: "specialSemantic",
    title: "placement 优先于父行/父栈默认对齐",
    summary:
      "placement 管外层 wrapper 相对父级槽位；横排 layout 子槽位 placement.vertical 映射 <td valign>；纵排（含底图叠放内子表）读子块 placement；叠放层外层 td 主轴对齐读 layout contentAlign（未写则 top/left）；组内逐子块仍可用 placement。",
    implementation: "src/components/EmailPreview.tsx",
  },
  {
    id: "semantic.buttonContentAlignVsPlacement",
    kind: "specialSemantic",
    title: "按钮 placement vs contentAlign",
    summary:
      "placement 管外层 wrapper 相对父级槽位；fill 宽按钮的胶囊左/中/右用 wrapperStyle.contentAlign.horizontal（渲染为外层 text-align），勿用 placement 代替。",
    blockTypes: ["button"],
    jsonPath: "wrapperStyle.contentAlign.horizontal",
    implementation: "src/lib/wrapperStyleToCss.ts · src/lib/buttonContentAlign.ts",
  },
  {
    id: "semantic.componentBodyWidth",
    kind: "specialSemantic",
    title: "组件本体宽度 vs 外层容器宽度",
    summary:
      "button/divider/progress 的 wrapperStyle.widthMode/width 只控制外层容器；可见本体宽度分别由 props.buttonStyle.widthMode/width、props.lineWidthMode/lineWidth、props.barWidthMode/barWidth 控制。",
    blockTypes: ["button", "divider", "progress"],
    jsonPath:
      "props.buttonStyle.widthMode | props.buttonStyle.width | props.lineWidthMode | props.lineWidth | props.barWidthMode | props.barWidth",
    implementation: "src/components/EmailPreview.tsx · componentBodyWidthCss",
  },
  {
    id: "semantic.layoutContentAlignHorizontal",
    kind: "specialSemantic",
    title: "layout contentAlign.horizontal（横向 fill 行）",
    summary:
      "横向 layout 且 widthMode fill/fixed 时，contentAlign.horizontal 控制内层行表在满宽外壳中的左/中/右（外层 td align）；含底图叠放层；与整行 hug+placement 居中二选一。",
    blockTypes: ["layout"],
    jsonPath: "wrapperStyle.contentAlign.horizontal",
    implementation: "src/components/EmailPreview.tsx · tableAlignFromContentHorizontal",
  },
  {
    id: "semantic.layoutContentAlignVertical",
    kind: "specialSemantic",
    title: "layout contentAlign.vertical（纵向 fill 列）",
    summary:
      "纵向 layout 且 heightMode fill/fixed 时，contentAlign.vertical 控制内层栈表在满高外壳中的上/中/下（外层 td valign）；含底图叠放层；与整列 hug+placement 居中二选一。",
    blockTypes: ["layout"],
    jsonPath: "wrapperStyle.contentAlign.vertical",
    implementation: "src/components/EmailPreview.tsx · tableValignFromContentVertical",
  },
] as const;

export const RENDER_DEFAULT_RULE_IDS = RENDER_DEFAULT_RULES.map((r) => r.id);
