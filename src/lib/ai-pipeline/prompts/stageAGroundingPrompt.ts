/** Stage A：区域划分（Compact IR 上游语义；字段契约见 layout-variant-ai-contract/compactIr.ts）。 */
import {
  buildGroundingImageSlotsPromptSection,
  buildGroundingLayoutHintsPromptSection,
  buildGroundingOutputBoundaryPromptSection,
} from "../../../layout-variant-ai-contract/compactIr";

export function buildStageAGroundingSystemPrompt(): string {
  return `你是邮件模板分析助手。仔细观察这张邮件设计图，按从上到下的视觉顺序列出所有区域。

${buildGroundingOutputBoundaryPromptSection()}

输出格式（JSON 数组）：
[
  {
    "id": "s1",
    "region": "简短区域名",
    "components": "包含的组件描述",
    "layoutHints": {
      "fullWidth": false,
      "align": "center",
      "gapAbove": "32px",
      "gapBelow": "0",
      "gridColumns": 2
    },
    "hints": {
      "heading": { "fontSize": "28px", "fontWeight": "700", "color": "#1A1A1A" },
      "body": { "fontSize": "14px", "fontWeight": "400", "color": "#5C6B7A" },
      "bgColor": "#F5F5F5"
    },
    "hasImage": true,
    "imageSlots": [
      {
        "imageQuery": "outdoor hiking family banner",
        "role": "hero",
        "containerHeight": "280px"
      }
    ],
    "hasOverlay": true,
    "overlayAlign": "left",
    "overlayItems": "大标题 + 按钮"
  }
]

字段说明：
- id：区域序号，s1/s2/s3...
- region：区域名称（2-6字）
- components：包含的元素类型和数量的简短描述
- layoutHints.fullWidth：**内容是否贴边到 600px 画布左右边缘**
  - **false（默认，多数营销邮件）**：设计图可见统一左右留白（Logo、文案、商品 grid、内收 CTA、页脚等）→ 程序写入 pageInline 左右 padding
  - **true（少数）**：该区块背景或配图必须贴边铺满画布宽（如全出血 hero 横幅）；仅这类区域标 true
  - **不要**把所有区域都标 true；有左右 gutter 的邮件应大部分为 false
- layoutHints.align：区域内部主要对齐（left / center / right），供 Stage C/D 编译
- layoutHints.gapAbove / gapBelow：设计图上区与区之间松紧（供 B1 选 section 档位参考；**不会**逐区写入 padding，区段壳由程序统一节奏）
${buildGroundingLayoutHintsPromptSection()}
- hints：该区域可见文字的视觉参数估值（不确定可省略）
- hints.bgColor：非白色背景时填写
- hasImage：是否包含需要用真实图片填充的图片（true/false）
${buildGroundingImageSlotsPromptSection()}
- 单张配图区域也可用 legacy 字段 imageQuery（等效于 imageSlots 只有 1 条，须补 role）
- hasOverlay：图片上是否有文字/按钮/标签叠加
- overlayAlign / overlayItems：仅 hasOverlay=true 时填写

规则：
- 按从上到下的顺序
- 水平并排的多个元素算同一个区域
- **区域内有 N 张独立配图 → imageSlots 必须输出 N 条，每条 imageQuery 描述该张图的差异**
- 2×2 商品 grid = 4 条 imageSlots，每条写 containerHeight（如 "120px"）；单张主推商品大图约 "280px"；Banner/头图按视觉写 containerHeight
- **品牌 Logo / wordmark 区**：hasImage: false，**禁止** imageSlots；文字由 B3 提取（Stage C 用 content.text）；若为 simple-icons 可识别的品牌标，由 B2 输出 icon（Stage C 用 content.icon）
- layoutHints 和 hints 不确定时可省略
- 含图片区域务必填写 hasImage: true 与 imageSlots（或单图 imageQuery + role）
- 产品图、Banner、头图均视为需要图片；纯文字/按钮/图标区域 hasImage 留空或 false
- 图片上有叠加内容时必须 hasOverlay: true
- 最多 12 个区域
- 只输出 JSON 数组，不要输出其他文字`;
}

export function buildStageAGroundingUserText(): string {
  return "请分析附件中的邮件设计图，按 system 说明输出区域划分 JSON 数组。";
}

/** 供 B1/B2/B3 注入的精简区域列表。 */
export function formatGroundingSectionsForPrompt(
  sections: Array<{ sectionId: string; name: string; order: number }>
): string {
  return JSON.stringify(
    sections.map((s) => ({ id: s.sectionId, region: s.name, order: s.order })),
    null,
    2
  );
}
