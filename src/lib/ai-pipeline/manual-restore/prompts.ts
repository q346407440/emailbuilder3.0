import type { ManualRestoreBlueprint, ResolvedManualRestoreAssets } from "./types";
import { loadManual53ReferenceExcerpt, loadManualRestoreContext } from "./loadRestoreContext";

export function buildBlueprintSystemPrompt(): string {
  return `你是 Easy-Email 邮件模板「手工还原」助手。任务：看设计图，输出一份 **手工 mjs 蓝图 JSON**（不是最终 template.json）。

## 输出形态
只输出一个 JSON 对象（禁止 markdown 围栏），字段：
- emailKey, displayName, idPrefix, description
- colors: { primary, secondary, surface }
- spacing: { section, gap, pageInline }
- typography: { display, h1, body, caption }
- emailRootBackground
- imageSlots: [{ slotId, query, targetWidth?, height? }] — 只写英文 Pexels 搜索词，**禁止 URL**
- iconSlots: [{ slotId, pack: tabler|simple-icons|lucide, iconQuery, colorHex? }] — **禁止 URL**
- sections: [{ sectionId: s1|s2|..., name, backgroundColor?, pageInline?, padTop?, padBottom?, summary, texts[], imageSlotIds[], iconSlotIds[] }]

## 原则（对齐手工 mjs）
1. sections 自上而下覆盖设计图全部视觉区块（通常 4–8 个）。
2. 品牌 wordmark 优先 texts，不要为纯文字 logo 占 imageSlot。
3. 商品网格、信任图标、社媒等拆到对应 section。
4. texts 写设计图上可见英文原文（尽量完整）。
5. imageQuery 语义化、可搜（product flat lay, yoga apparel studio 等）。

## 仓库约束摘要
${loadManualRestoreContext()}`;
}

export function buildBlueprintUserText(opts: {
  emailKey: string;
  displayName: string;
}): string {
  return `请为这封邮件输出手工还原蓝图 JSON。

目标 emailKey（可沿用或加后缀 _doubao）：${opts.emailKey}
目标 displayName：${opts.displayName}

下一步程序会根据 imageSlots/iconSlots 搜 Pexels 与 CDN 图标，再按 sections 逐区生成 nested template。`;
}

export function buildSectionSystemPrompt(): string {
  return `你是 Easy-Email nested 4.0.0 模板生成器。输入：设计图 + 单区蓝图 + 已解析资产 URL。
只输出 JSON：{ "section": <单个顶层 layout.container 节点> }

## 节点契约
- section 的 id 必须为 {idPrefix}-{sectionId}，type: layout，blockMeta.blockType: layout.container，blockMeta.name 必填（简体中文模块名）
- 每个子节点 blockMeta.name 必填（如 标题、正文、配图、按钮、图标、分隔线、布局）
- 子节点允许：layout / text / image / button / icon / divider(grid 用 layout.grid)
- text: props.textBody.paragraphs[].runs[].text；可用 props.fontSize/color 字面量或 { "$themeRef": "tokens.typography.body" }
- image: wrapperStyle.height 固定高度；backgroundImage.src 用已给 URL；fit: cover|contain
- icon: props.src 用已给 URL；props.color；props.size 如 24px
- button: action.button；buttonStyle.backgroundColor / textColor；**禁止** buttonStyle.padding
- text: **禁止** props.fontWeight / lineHeight / fontStyle；用 props.bold 布尔值
- divider: separator.divider；props.color；props.height: 1px
- padding：四边不同用 mode: separate；禁止 unified: "8px 12px" 多值简写
- 父 hug 时子 text widthMode 用 hug；父 fixed（layout/image 且写了 width）时子 text 用 fill（textBlock 默认）
- button 外层 wrapperStyle.heightMode 必须 hug
- 等列矩阵用 grid（gridBlock），单行横排用 rowLayout
- grid 每格须 layout 复合单元（如 colorSwatch），禁止 grid 下直接裸 text
- imageContainer 的 alignH/alignV 按设计图显式传，助手内勿写默认 right/top
- 需要 theme 绑定时写 bindings + $themeRef（参考 excerpt）

## 参考 excerpt（手工 mjs 53 尾部结构）
${loadManual53ReferenceExcerpt()}`;
}

export function buildSectionUserText(opts: {
  blueprint: ManualRestoreBlueprint;
  section: ManualRestoreBlueprint["sections"][number];
  assets: ResolvedManualRestoreAssets;
}): string {
  const { blueprint, section, assets } = opts;
  const images = section.imageSlotIds
    .map((id) => ({ id, ...assets.images[id] }))
    .filter((x) => x.url);
  const icons = section.iconSlotIds
    .map((id) => ({ id, ...assets.icons[id] }))
    .filter((x) => x.url);

  return `生成单个 section 的 nested 节点。

全局：
- idPrefix: ${blueprint.idPrefix}
- colors: ${JSON.stringify(blueprint.colors)}
- spacing: ${JSON.stringify(blueprint.spacing)}
- typography: ${JSON.stringify(blueprint.typography)}

当前区：
${JSON.stringify(section, null, 2)}

本区已解析图片：
${JSON.stringify(images, null, 2)}

本区已解析图标：
${JSON.stringify(icons, null, 2)}

只输出 { "section": ... }，section 即 emailRoot.children 中的一个顶层 layout 模块。`;
}
