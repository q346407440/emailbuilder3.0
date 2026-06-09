import type { ManualRestoreBlueprint } from "./types";

/** 豆包先输出视觉规格，不直接写 mjs。 */
export function buildVisualBlueprintSystemPrompt(): string {
  return `你是 Easy-Email 邮件模板视觉规格分析助手。你只看设计图，输出 JSON，供后续程序生成 mjs patch。

## 阶段边界（很重要）

- 本阶段只输出**轻量 visual blueprint**，不是模板 IR，不写 mjs，不写 Easy-Email block。
- 后续 MR:MjsGenerate 会再次看设计图；本阶段不要完整转写每个元素、不要展开 content/elements。
- 输出应紧凑，目标 300-700 token；复杂邮件最多 5-7 个粗分区。
- 每个 section 只写一句 summary；不要复制正文段落，不要枚举每个按钮/文本/图标。

## 输出目标

只输出后续阶段必需的信息：全局颜色/字号/间距、必需资产槽、粗分区顺序、少量视觉质量检查点。
不要输出 markdown，不要解释。

## JSON 字段清单（字段名必须逐字匹配）

顶层必须包含：
\`emailKey\`, \`displayName\`, \`idPrefix\`, \`description\`, \`canvas\`, \`colors\`, \`spacing\`, \`typography\`, \`emailRootBackground\`, \`imageSlots\`, \`iconSlots\`, \`dividers\`, \`visualChecks\`, \`sections\`。

槽字段：
- imageSlots[]: \`slotId\`, \`query\`, \`targetWidth\`, \`height\`, \`required\`, \`usage\`
- iconSlots[]: \`slotId\`, \`pack\`, \`iconQuery\`, \`colorHex\`, \`required\`, \`usage\`, \`hasBox\`
- dividers[]: \`target\`, \`kind\`, \`color\`, \`height\`（顶层唯一边线清单，用 \`target\` 指向区域，如 "s3 底部"）
- sections[]: \`sectionId\`, \`name\`, \`backgroundColor\`, \`pageInline\`, \`padTop\`, \`padBottom\`, \`targetHeight\`, \`gap\`, \`summary\`, \`texts\`, \`imageSlotIds\`, \`iconSlotIds\`, \`visualChecks\`（**没有** dividers 字段）

## 极短示例（只示意字段名，不是默认值）

\`\`\`json
{
  "emailKey": "<user>",
  "displayName": "<user>",
  "idPrefix": "<user>",
  "description": "一句话视觉摘要",
  "canvas": { "sourceImageWidth": 382, "sourceImageHeight": 994, "emailRootWidth": "600px" },
  "colors": { "primary": "#000000", "secondary": "#F4F3EA", "surface": "#FFFFFF" },
  "spacing": { "section": "22px", "gap": "13px", "pageInline": "22px" },
  "typography": { "display": "28px", "h1": "26px", "body": "10px", "caption": "6px" },
  "emailRootBackground": "#FFFFFF",
  "imageSlots": [{ "slotId": "hero", "query": "英文搜图词", "targetWidth": 600, "height": "280px", "required": true, "usage": "首屏头图" }],
  "iconSlots": [{ "slotId": "brandLogo", "pack": "simple-icons", "iconQuery": "adidas", "colorHex": "#FFFFFF", "required": true, "usage": "品牌 Logo", "hasBox": false }],
  "dividers": [{ "target": "s3 底部", "kind": "bottom-divider", "color": "#D8D8D8", "height": "1px" }],
  "visualChecks": ["社媒图标有 1px 外框"],
  "sections": [
    { "sectionId": "s1", "name": "顶部提示条", "backgroundColor": "#FFFFFF", "pageInline": true, "padTop": "8px", "padBottom": "8px", "targetHeight": "24px", "gap": "0", "summary": "左右提示文字", "texts": [], "imageSlotIds": [], "iconSlotIds": [], "visualChecks": [] }
  ]
}

\`\`\`

## 禁止输出的字段名

- imageSlots 内禁止使用 \`id\`、\`label\`、\`searchTerms\`、\`searchKeywords\`、\`dimensions\`；必须使用 \`slotId\`、\`query\`、\`targetWidth\`、\`height\`。
- iconSlots 内禁止使用 \`id\`、\`label\`、\`searchTerms\`、\`searchKeywords\`、\`boxSize\`；必须使用 \`slotId\`、\`pack\`、\`iconQuery\`、\`colorHex\`、\`hasBox\`。
- sections 内禁止使用 \`id\`、\`type\`、\`content\`、\`elements\`、\`padding\`、\`dividers\`；必须使用 \`sectionId\`（s1/s2/s3...）、\`name\`、\`summary\`、\`texts\`、\`imageSlotIds\`、\`iconSlotIds\`。
- 边线只在**顶层 \`dividers\`** 表达，**禁止**写进 \`sections[].dividers\`；顶层 dividers 内禁止使用 \`id\`、\`type\`、\`thickness\`、\`location\`，且每条必须是对象（含 \`target\`、\`kind\`、\`color\`、\`height\`），禁止用字符串。
- 禁止输出 CSS 字符串、style 字符串、嵌套 content/elements/items；这些属于后续 mjs 生成阶段。

## 必须量化

- 粗分区顺序、目标高度、背景色、内部 gap / padding（只用 padTop/padBottom/gap 摘要表达）。
- 标题、正文、页脚 caption 的字号层级。
- 头图高度、App 图标尺寸、社媒外框尺寸。
- 边线语义须拆开：top-divider / bottom-divider / box-border，禁止只写“有描边”。
- 资产需求须完整列出：摄影图、品牌 Logo、App glyph、社媒图标、装饰图标。
- 首屏图、品牌 Logo、App glyph、社媒图标等视觉必需资产，必须写 \`required: true\`；带外框图标写 \`hasBox: true\`。
- \`iconSlots[].pack\` 只能是 \`tabler\`、\`simple-icons\`、\`lucide\`；品牌 Logo 优先 \`simple-icons\`，社媒图标优先 \`tabler\`。
- \`sections[].sectionId\` 必须从 \`s1\` 开始递增，不要带 P 前缀。

## 避免默认值

除非设计图明显如此，否则不要给出 48px、32px、16px、480px、100px、gap 48px 这类通用默认大值。

## 输出长度控制

- \`sections\` 最多 7 条；把页脚链接/条款合并为一个 section。
- \`sections[].texts\` 每区最多 2 条，只放标题/CTA/优惠码这类关键短文案；长段正文和条款不要复制。
- \`visualChecks\` 总数最多 6 条，每条一句话。
- 不要为每个按钮/文本/图标建一个对象；只在 summary / texts / visualChecks 中描述。

只输出 JSON。`;
}

/** 给后续 mjs / patch 阶段的压缩版视觉规格，避免重复塞完整 JSON。 */
export function formatVisualBlueprintForPrompt(blueprint: ManualRestoreBlueprint): string {
  const assets = [
    ...blueprint.imageSlots.map((slot) => {
      const required = slot.required ? "必需" : "可选";
      return `图:${slot.slotId}(${slot.query}${slot.height ? `/${slot.height}` : ""}/${required})`;
    }),
    ...blueprint.iconSlots.map((slot) => {
      const required = slot.required ? "必需" : "可选";
      const boxed = slot.hasBox ? "/有外框" : "";
      return `标:${slot.slotId}(${slot.pack}:${slot.iconQuery}${boxed}/${required})`;
    }),
  ];
  const sections = blueprint.sections.map((section) => {
    const refs = [...section.imageSlotIds, ...section.iconSlotIds];
    const refText = refs.length > 0 ? `；资产=${refs.join(",")}` : "";
    const sizeText = [
      section.targetHeight ? `高=${section.targetHeight}` : "",
      section.padTop || section.padBottom
        ? `pad=${section.padTop ?? "?"}/${section.padBottom ?? "?"}`
        : "",
      section.gap ? `gap=${section.gap}` : "",
    ].filter(Boolean).join("；");
    return `- ${section.sectionId} ${section.name}${sizeText ? `（${sizeText}）` : ""}：${section.summary}${refText}`;
  });
  const dividers = blueprint.dividers.map((divider) => {
    const stroke = [divider.color, divider.height ?? divider.width].filter(Boolean).join("/");
    return `- ${divider.target}：${divider.kind}${stroke ? `（${stroke}）` : ""}`;
  });
  return [
    `画布: root=${blueprint.canvas.emailRootWidth}; bg=${blueprint.emailRootBackground}`,
    `颜色: primary=${blueprint.colors.primary}; secondary=${blueprint.colors.secondary}; surface=${blueprint.colors.surface}`,
    `间距: section=${blueprint.spacing.section}; gap=${blueprint.spacing.gap}; pageInline=${blueprint.spacing.pageInline}`,
    `字号: display=${blueprint.typography.display}; h1=${blueprint.typography.h1}; body=${blueprint.typography.body}; caption=${blueprint.typography.caption}`,
    `资产: ${assets.join(" | ") || "无"}`,
    `区域:\n${sections.join("\n")}`,
    dividers.length > 0 ? `边线:\n${dividers.join("\n")}` : "",
    blueprint.visualChecks.length > 0
      ? `视觉检查:\n${blueprint.visualChecks.slice(0, 10).map((item) => `- ${item}`).join("\n")}`
      : "",
  ].filter(Boolean).join("\n");
}

export function buildVisualBlueprintUserText(opts: {
  emailKey: string;
  displayName: string;
  idPrefix: string;
}): string {
  return `请根据附带的设计图输出 visual blueprint JSON。

运行参数：
- emailKey: ${opts.emailKey}
- displayName: ${opts.displayName}
- idPrefix: ${opts.idPrefix}

要求：
1. 只输出 JSON，不要解释，不要 markdown 围栏。
2. imageSlots / iconSlots 只写搜索条件，不写 URL；字段名必须用 slotId/query/iconQuery。
3. 品牌 Logo、App 图标内部 glyph、社媒图标必须作为资产需求列出，并写 required: true；如打算纯文字实现，必须在 visualChecks 说明。
4. sections 必须自上而下覆盖完整邮件，sectionId 必须为 s1、s2、s3 ...。`;
}
