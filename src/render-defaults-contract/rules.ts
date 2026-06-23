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
    summary: "禁止 selfAlign；对齐请使用 wrapperStyle.contentAlign。",
    jsonPath: "wrapperStyle.selfAlign",
    blockTypes: ["all"],
    implementation: "src/render-defaults-contract/validate.ts",
  },
  {
    id: "forbid.backgroundContentAlign",
    kind: "forbiddenInJson",
    title: "禁止 backgroundContentAlign",
    summary: "底图叠放默认 left/top；叠放区对齐用容器 wrapperStyle.contentAlign 或嵌套 layout。",
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
    summary: "不符合规范；底图块请用 wrapperStyle.padding + 叠放语义。",
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
    implementation: "src/render-defaults-contract/values.ts",
  },
  {
    id: "forbid.textLineHeight",
    kind: "forbiddenInJson",
    title: "禁止 text.lineHeight",
    summary: "文本行高由渲染层固定。",
    jsonPath: "props.lineHeight",
    blockTypes: ["text"],
    implementation: "src/render-defaults-contract/forbiddenLegacyProps.ts",
  },
  {
    id: "forbid.textLegacyTypography",
    kind: "forbiddenInJson",
    title: "禁止 text 旧版排版字段",
    summary: "fontWeight/fontStyle/textDecoration/fontMode 等已废弃。",
    jsonPath: "props.fontWeight | props.fontStyle | props.textDecoration | props.fontMode",
    blockTypes: ["text"],
    implementation: "src/render-defaults-contract/forbiddenLegacyProps.ts",
  },
  {
    id: "forbid.emailRootLayoutProps",
    kind: "forbiddenInJson",
    title: "禁止画布根排列/对齐配置",
    summary: "根节点固定纵向栈；不对齐子块序列做 contentAlign/direction 配置。",
    jsonPath: "props.direction | props.contentAlign",
    blockTypes: ["emailRoot"],
    implementation: "src/render-defaults-contract/forbiddenLegacyProps.ts",
  },
  {
    id: "forbid.emailRootOuterBackground",
    kind: "forbiddenInJson",
    title: "禁止画布根外侧底色 JSON",
    summary: "邮件卡片外工作区灰底由项目固定 EMAIL_CANVAS_WORKSPACE_BACKGROUND（#f1f1f1），不随模板配置。",
    jsonPath: "props.outerBackgroundColor",
    blockTypes: ["emailRoot"],
    implementation: "src/render-defaults-contract/forbiddenLegacyProps.ts",
  },
  {
    id: "forbid.backgroundImageAlt",
    kind: "forbiddenInJson",
    title: "禁止 backgroundImage.alt",
    summary:
      "图片与容器底图不写替代文本；渲染层统一使用 WRAPPER_BACKGROUND_IMAGE_DEFAULT_ALT（此处是图片）。",
    jsonPath: "wrapperStyle.backgroundImage.alt",
    blockTypes: ["emailRoot", "layout", "grid", "image"],
    implementation: "src/render-defaults-contract/forbiddenBackgroundImageAlt.ts",
  },
  {
    id: "inject.backgroundImageAlt",
    kind: "injectedAtRender",
    title: "底图替代文本默认",
    summary: "emailRoot/layout/grid/image 的 backgroundImage 在发信与画布渲染时注入固定替代文本。",
    valueKey: "WRAPPER_BACKGROUND_IMAGE_DEFAULT_ALT",
    implementation: "src/render-defaults-contract/values.ts",
  },
  {
    id: "forbid.backgroundImagePositionWhenContain",
    kind: "forbiddenInJson",
    title: "contain 禁止 backgroundImage.position",
    summary:
      "完整显示（contain）时不写入 backgroundImage.position；画面位置仅在裁切铺满（cover）下可配置。",
    jsonPath: "wrapperStyle.backgroundImage.position",
    blockTypes: ["emailRoot", "layout", "grid", "image"],
    implementation: "src/render-defaults-contract/backgroundImageFitSemantics.ts",
  },
  {
    id: "forbid.backgroundImageChrome",
    kind: "forbiddenInJson",
    title: "禁止 backgroundImage.border / borderRadius",
    summary:
      "底图不写描边与圆角；外层 wrapperStyle.border / borderRadius + overflow:hidden 承接裁切视窗。",
    jsonPath: "wrapperStyle.backgroundImage.border | wrapperStyle.backgroundImage.borderRadius",
    blockTypes: ["emailRoot", "layout", "grid", "image"],
    implementation: "src/render-defaults-contract/forbiddenBackgroundImageChrome.ts",
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
    summary: "按钮胶囊内边距与行高由渲染层统一固定（行高避免继承 td line-height:0 导致垂直 padding 失效），不写入 JSON。",
    valueKey: "BUTTON_INNER_PADDING",
    implementation: "src/render-defaults-contract/values.ts",
  },
  {
    id: "inject.imageBackgroundFallback",
    kind: "injectedAtRender",
    title: "图片/底图兜底色",
    summary: "图片和底图透明区域使用统一兜底色。",
    valueKey: "IMAGE_BACKGROUND_FALLBACK_COLOR",
    implementation: "src/render-defaults-contract/values.ts",
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
    summary:
      "widthMode:hug 的 layout 在满宽父槽位内用 inline-block 外壳收缩（与叶壳同源，见 emailPresentationLayout.layoutPreviewHugOuterShellBoxStyle）。",
    implementation: "src/lib/emailPresentationLayout.ts · layoutPreviewHugOuterShellBoxStyle",
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
      "emailRoot/layout/grid/image 且 backgroundImage 有效时：emailRoot.props.padding 或普通块 wrapperStyle.padding 不缩小底图，仅作用于底图承载 <td> 内叠放内容的内边距（与常规定义「容器外圈留白」不同）。",
    jsonPath: "props.padding | wrapperStyle.padding",
    blockTypes: ["emailRoot", "layout", "grid", "image"],
    implementation:
      "src/lib/wrapperBackgroundImageCanvasLayout.ts · resolveWrapperBackgroundImageCanvasLayout（omitPadding + td padding）",
  },
  {
    id: "semantic.backgroundImageInheritWrapperChrome",
    kind: "specialSemantic",
    title: "底图 td 圆角继承外层 wrapperStyle",
    summary:
      "backgroundImage 禁止持久化 border / borderRadius；底图承载 <td> 的 overlayRadiusCss 从 wrapperStyle.borderRadius 派生，描边仅由外层 wrapperStyle.border 承接。",
    jsonPath: "wrapperStyle.borderRadius | wrapperStyle.border",
    blockTypes: ["emailRoot", "layout", "grid", "image"],
    implementation:
      "src/lib/wrapperBackgroundImageCanvasLayout.ts · overlayRadiusCss；src/lib/wrapperBackgroundImageCanvas.tsx",
  },
  {
    id: "semantic.gridMatrixSlotVerticalAlign",
    kind: "specialSemantic",
    title: "栅格矩阵格：contentAlign 映射槽位 td",
    summary:
      "layout.grid 矩阵格：格内直接子块的 wrapperStyle.contentAlign 映射该格 <td> 的 textAlign 与 verticalAlign；无子块时回退栅格块 contentAlign。per-child 差异也可嵌套 layout。",
    jsonPath: "wrapperStyle.contentAlign.horizontal | wrapperStyle.contentAlign.vertical",
    blockTypes: ["grid"],
    implementation:
      "src/lib/emailPresentationLayout.ts · gridMatrixSlotContentAlignCss · src/components/EmailPreview.tsx",
  },
  {
    id: "semantic.backgroundImageFixedHeightTable",
    kind: "specialSemantic",
    title: "定高底图画布 table 高度由 td 撑开",
    summary:
      "heightMode=fixed 且 backgroundImage 有效时：外层 div 取 wrapper 定高；内层底图 table 不写死 height，仅 td 使用定高。",
    jsonPath: "wrapperStyle.heightMode | wrapperStyle.height",
    blockTypes: ["emailRoot", "layout", "grid", "image"],
    implementation:
      "src/lib/wrapperBackgroundImageCanvasLayout.ts · bgTableHeightFromTd / bgTableBorderCollapse",
  },
  {
    id: "semantic.imagePositionOnlyCover",
    kind: "specialSemantic",
    title: "图片画面位置仅作用于 cover 裁切",
    summary:
      "emailRoot/layout/image 的 backgroundImage.fit 为 contain 时完整显示图片，backgroundImage.position 不参与小图在视窗内的摆放；fit 为 cover 时才作为裁切焦点映射到 td 的 background-position（发信 HTML 禁止 object-fit）。",
    jsonPath: "wrapperStyle.backgroundImage.position",
    blockTypes: ["emailRoot", "layout", "image"],
    implementation: "src/render-defaults-contract/backgroundImageFitSemantics.ts · src/lib/imageObjectPosition.ts",
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
    id: "semantic.wrapperContentAlignOnly",
    kind: "specialSemantic",
    title: "容器内内容摆放仅用 contentAlign",
    summary:
      "wrapperStyle.contentAlign（水平+竖直）控制块在外层容器内的对齐；per-child 差异请嵌套 layout。当前双轴恒可配，由父容器与块自身壳内语义分别生效。",
    implementation: "src/lib/contentAlignConfigurability.ts · src/components/EmailPreview.tsx",
  },
  {
    id: "semantic.buttonContentAlignHorizontal",
    kind: "specialSemantic",
    title: "按钮胶囊水平对齐",
    summary:
      "fill 宽按钮的胶囊左/中/右用 wrapperStyle.contentAlign.horizontal（渲染为外层 text-align）。",
    blockTypes: ["button"],
    jsonPath: "wrapperStyle.contentAlign.horizontal",
    implementation: "src/lib/wrapperStyleToCss.ts · src/lib/buttonContentAlign.ts",
  },
  {
    id: "semantic.componentBodyWidth",
    kind: "specialSemantic",
    title: "组件本体宽高 vs 外层容器宽高",
    summary:
      "button/divider/progress 的 wrapperStyle.widthMode/width/heightMode/height 只控制外层容器；可见本体尺寸分别由 props.buttonStyle.widthMode/width/heightMode/height、props.lineWidthMode/lineWidth、props.barWidthMode/barWidth 等控制。按钮胶囊 fill 须外层同轴非 hug。",
    blockTypes: ["button", "divider", "progress"],
    jsonPath:
      "props.buttonStyle.widthMode | props.buttonStyle.width | props.buttonStyle.heightMode | props.buttonStyle.height | props.lineWidthMode | props.lineWidth | props.barWidthMode | props.barWidth",
    implementation: "src/lib/canvasDimensionResolve.ts · resolveComponentBodySizeCss",
  },
  {
    id: "semantic.layoutContentAlignHorizontal",
    kind: "specialSemantic",
    title: "layout contentAlign.horizontal（横向 fill 行）",
    summary:
      "横向 layout 且 widthMode fill/fixed 时，contentAlign.horizontal 控制内层行表在满宽外壳中的左/中/右（外层 td align）；含底图叠放层。",
    blockTypes: ["layout"],
    jsonPath: "wrapperStyle.contentAlign.horizontal",
    implementation: "src/components/EmailPreview.tsx · tableAlignFromContentHorizontal",
  },
  {
    id: "semantic.layoutContentAlignVertical",
    kind: "specialSemantic",
    title: "layout contentAlign.vertical（纵向 fill 列）",
    summary:
      "纵向 layout 且 heightMode fill/fixed 时，contentAlign.vertical 控制内层栈表在满高外壳中的上/中/下（外层 td valign）；含底图叠放层。",
    blockTypes: ["layout"],
    jsonPath: "wrapperStyle.contentAlign.vertical",
    implementation: "src/components/EmailPreview.tsx · tableValignFromContentVertical",
  },
  {
    id: "semantic.deliveryExportMeasuredBox",
    kind: "specialSemantic",
    title: "发信导出：hug 盒烘焙为实测 px",
    summary:
      "SMTP/投递抓取 HTML 时，wrapperStyle.heightMode/widthMode 为 hug 且 inline 未写死长度的预览块，须写入画布 getBoundingClientRect 实测宽高；template.json 仍只存 hug/fill/fixed，不写 px。DOM 标记见 deliveryExport.ts。",
    jsonPath: "wrapperStyle.heightMode | wrapperStyle.widthMode",
    blockTypes: ["all"],
    implementation:
      "src/render-defaults-contract/deliveryExport.ts · src/lib/emailDeliveryExport.ts · src/lib/captureEmailPreviewHtml.ts",
  },
  {
    id: "semantic.emailPreviewDeliveryScope",
    kind: "specialSemantic",
    title: "发信抓取范围：仅 .email-preview-scope 内版心",
    summary:
      "画布工作区灰底与 padding 在 .email-preview-canvas-workspace，不得进入 .email-preview-scope；MetaEditor 抓取与 SMTP 只序列化 scope 内节点（600px 版心）。",
    blockTypes: ["emailRoot"],
    jsonPath: "—",
    implementation: "src/components/EmailPreview.tsx · src/lib/captureEmailPreviewHtml.ts",
  },
  {
    id: "semantic.emailPresentationTableOnly",
    kind: "specialSemantic",
    title: "邮件呈现：画布 DOM 与发信 HTML 均仅用 table",
    summary:
      "布局/对齐/叶子块壳/进度条一律经 presentation `<table>` + `align`/`valign`/`td` 背景实现；禁止 Flexbox 与 `width:fit-content`。发信仅烘焙 hug 与剥离画布标记，禁止靠二次 CSS 修正布局。真源 emailPresentation.ts；实现 emailPresentationPrimitives.tsx · emailPresentationLayout.ts · EmailPreview.tsx。",
    blockTypes: ["all"],
    jsonPath: "—",
    implementation:
      "src/render-defaults-contract/emailPresentation.ts · src/lib/emailPresentationPrimitives.tsx · src/lib/emailPresentationLayout.ts · src/components/EmailPreview.tsx",
  },
] as const;

export const RENDER_DEFAULT_RULE_IDS = RENDER_DEFAULT_RULES.map((r) => r.id);
