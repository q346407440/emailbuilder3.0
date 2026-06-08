import type {
  AssetManifest,
  GroundingSection,
  IconQueryItem,
  NormalizedStyleTokens,
  TextExtractResult,
} from "../types";
import { listImageSlots, listPexelsImageSlots } from "../groundingImage";
import { buildSectionAllowlists } from "../sectionCompactGuard";
import {
  buildCompactIrFormatPromptSection,
  buildCompactIrKindRulesPromptSection,
  buildCompactIrLayoutIntentPromptSection,
  buildCompactIrBlockNamingPromptSection,
} from "../../../layout-variant-ai-contract/compactIr";
import { buildStyleBiblePromptSection } from "./styleBiblePrompt";
import {
  buildAgentStyleKeysPromptSection,
  buildStyleTokenCatalogForPrompt,
} from "../../../layout-variant-ai-contract/agentStyleKeys";

export type StageCSectionPromptContext = {
  section: GroundingSection;
  styleTokens: NormalizedStyleTokens;
  textExtract: TextExtractResult;
  assetManifest: AssetManifest;
  iconQueries: IconQueryItem[];
};

function sectionTextRefs(textExtract: TextExtractResult, sectionId: string) {
  const region = textExtract.regions.find((r) => r.regionId === sectionId);
  if (!region) return [];
  return region.paragraphs.map((p) => ({
    textId: p.textId,
    role: p.role,
    text: p.textBody.paragraphs.map((para) => para.runs.map((r) => r.text).join("")).join("\n"),
  }));
}

function sectionImages(manifest: AssetManifest, section: GroundingSection) {
  if (!section.hasImage) return [];
  return listPexelsImageSlots(section)
    .map((slot) => {
      const img = manifest.images[slot.slotId];
      if (!img?.url) return null;
      return {
        slotId: slot.slotId,
        imageQuery: slot.imageQuery,
        url: img.url,
        alt: img.alt ?? slot.imageQuery,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null);
}

function sectionIcons(
  manifest: AssetManifest,
  iconQueries: IconQueryItem[],
  sectionId: string
) {
  const idsForSection = new Set(
    iconQueries.filter((q) => q.regionId === sectionId).map((q) => q.id)
  );
  return Object.entries(manifest.icons)
    .filter(([id, icon]) => icon && idsForSection.has(id))
    .map(([id, icon]) => ({
      id,
      colorHex: icon.colorHex,
    }));
}

function sectionScopeBlock(section: GroundingSection, texts: ReturnType<typeof sectionTextRefs>) {
  const parts = [
    `- 区域 id：${section.sectionId}`,
    `- 区域名称：${section.name}`,
    section.components ? `- 应包含的元素：${section.components}` : null,
    `- hasImage：${section.hasImage === true}`,
    `- 本区配图 slot 数：${listPexelsImageSlots(section).length}`,
    `- 本区文案条数：${texts.length}`,
  ].filter(Boolean);
  return parts.join("\n");
}

/** Stage C：单区域结构生成（Easy-Email compact IR + iconRef/CDN 资产模型）。 */
export function buildStageCSectionSystemPrompt(ctx: StageCSectionPromptContext): string {
  const { section, styleTokens, textExtract, assetManifest, iconQueries } = ctx;
  const sectionId = section.sectionId;
  const texts = sectionTextRefs(textExtract, sectionId);
  const images = sectionImages(assetManifest, section);
  const icons = sectionIcons(assetManifest, iconQueries, sectionId);
  const allowlists = buildSectionAllowlists(
    sectionId,
    section,
    textExtract,
    iconQueries,
    assetManifest
  );

  const textBlock =
    texts.length > 0
      ? `## 本区文案（B3 已提取；content.text / action.button 只能引用下列 textId，禁止自造 id）
${JSON.stringify(texts, null, 2)}`
      : `## 本区文案
（无预提取文案 → **禁止**输出 content.text 或 action.button）`;

  const imageBlock =
    images.length > 0
      ? `## 本区图片（wrapper.backgroundImageRef 只能填下列 slotId；**多格 grid 每个格子必须用不同 slotId**）
${JSON.stringify(images, null, 2)}`
      : `## 本区图片
（无配图 → **禁止**输出 content.image）`;

  const iconBlock =
    icons.length > 0
      ? `## 本区图标（content.icon 用 props.iconRef 引用 id；管线会解析为 CDN URL，**禁止**写 src/url/iconType）
${JSON.stringify(icons, null, 2)}`
      : `## 本区图标
（无图标 → **禁止**输出 content.icon）`;

  return `你是邮件结构生成助手。只为当前区域生成 compact 区块树。

## 当前任务（必须严格遵守）
只生成区域 **${sectionId}（${section.name}）** 的结构。
**禁止**生成其他区域的元素（即使设计图全屏可见，也只输出本区职责范围内的 block）。
只输出 JSON 对象：{ "root": { ... } }

### 本区职责边界
${sectionScopeBlock(section, texts)}

${buildStyleBiblePromptSection(styleTokens)}

${buildCompactIrFormatPromptSection()}

${buildCompactIrKindRulesPromptSection()}

${buildCompactIrBlockNamingPromptSection()}

${buildCompactIrLayoutIntentPromptSection()}

## 约束（违反将导致 sanitize 丢弃或 Stage C 重试）
- textId 白名单：${[...allowlists.textIds].join(", ") || "（空，禁止 text/button）"}
- iconRef 白名单：${[...allowlists.iconRefs].join(", ") || "（空，禁止 icon）"}
- 图片 slot 白名单：${[...allowlists.imageSlotIds].join(", ") || "（空，禁止 image）"}
- **禁止**引用其他区域的 textId / iconRef / 图片 slot
- **禁止**把不属于本区职责的内容写进本区
- 纯图标行（如社交）外层 layout.container 建议 widthMode: "hug"
- **品牌 Logo / wordmark**：优先 content.text（B3 文案）或 content.icon（B2 图标）；**禁止** content.image + Pexels
- 嵌套不超过 4 层
- **contentAlign**（可选）：horizontal 仅 left|center|right；vertical 可省略（程序默认 top）。与区段主节奏一致可省略；**顶栏/分栏**（左 logo + 右文案）用横排 layout + 右列容器写 horizontal:right，**禁止** space-between
- **底图叠放**（content.image 含 children）：缺省 horizontal 随区段/父级，**vertical 缺省为 center**（社交格 icon+文案居中）；若需贴顶/贴底可显式写 vertical:top|bottom
- 只输出 { "root": ... }，不要 markdown

## CTA 示例（嵌套 buttonStyle + 文本 colorBind）
{
  "root": {
    "kind": "layout.container",
    "wrapper": { "contentAlign": { "horizontal": "center" } },
    "props": { "direction": "vertical", "gap": "16px" },
    "children": [
      {
        "kind": "content.text",
        "props": { "textId": "s2-t0" },
        "styleKeys": {
          "fontSize": "24px",
          "fontSizeBind": "tokens.typography.h1",
          "color": "#1A1A1A",
          "bold": true
        }
      },
      {
        "kind": "action.button",
        "props": { "textId": "s2-t1" },
        "styleKeys": {
          "buttonStyle": {
            "backgroundColor": "#E0D12C",
            "backgroundColorBind": "colors.primary",
            "textColor": "#1A1A1A",
            "fontSize": "16px",
            "fontSizeBind": "tokens.typography.body",
            "borderRadius": "24px",
            "borderRadiusBind": "tokens.radius.cta"
          }
        }
      }
    ]
  }
}

## 叠层示例（Banner：image 只绑 slot，不写容器 height px）
{
  "root": {
    "kind": "content.image",
    "wrapper": { "backgroundImageRef": "s1-img-0" },
    "props": { "direction": "vertical", "gap": "12px" },
    "children": [
      { "kind": "content.text", "props": { "textId": "s1-t0" }, "styleKeys": { "color": "#FFFFFF", "bold": true } },
      { "kind": "action.button", "props": { "textId": "s1-t1" } }
    ]
  }
}

## 栅格商品示例（4 格各用不同 slotId；默认 content-max，不写 cellHeight）
{
  "root": {
    "kind": "layout.grid",
    "props": { "columns": 2, "gap": "12px", "cellHeightMode": "content-max" },
    "children": [
      { "kind": "content.image", "wrapper": { "backgroundImageRef": "s3-img-0" } },
      { "kind": "content.image", "wrapper": { "backgroundImageRef": "s3-img-1" } },
      { "kind": "content.image", "wrapper": { "backgroundImageRef": "s3-img-2" } },
      { "kind": "content.image", "wrapper": { "backgroundImageRef": "s3-img-3" } }
    ]
  }
}

## Logo 居中示例（内层 hug，text 不写 fill）
{
  "root": {
    "kind": "layout.container",
    "wrapper": { "contentAlign": { "horizontal": "center" } },
    "props": { "direction": "vertical" },
    "children": [
      {
        "kind": "layout.container",
        "wrapper": { "widthMode": "hug", "contentAlign": { "horizontal": "center" } },
        "children": [
          { "kind": "content.text", "props": { "textId": "s1-t0" } }
        ]
      }
    ]
  }
}

${textBlock}

${imageBlock}

${iconBlock ? `${iconBlock}\n` : ""}## 区域分析
${JSON.stringify(
  {
    sectionId: section.sectionId,
    name: section.name,
    components: section.components,
    layoutHints: section.layoutHints,
    hasOverlay: section.hasOverlay,
    hasImage: section.hasImage,
    imageSlots: listImageSlots(section),
  },
  null,
  2
)}

${buildAgentStyleKeysPromptSection(buildStyleTokenCatalogForPrompt(styleTokens))}

## B1 原始 tokens（间距/圆角等；字号 color 绑定见上节）
${JSON.stringify(styleTokens, null, 2)}`;
}

export function buildStageCSectionUserText(sectionId: string): string {
  return `请为区域 ${sectionId} 生成 compact 区块树 JSON（仅 { root }；只含本区元素，禁止越界）。`;
}
