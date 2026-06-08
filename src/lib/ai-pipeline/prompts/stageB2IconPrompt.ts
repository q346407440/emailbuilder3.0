import { formatGroundingSectionsForPrompt } from "./stageAGroundingPrompt";

/** Stage B2：图标识别（对齐 2.0 思路：pack + query + colorHex）。 */
export function buildStageB2IconSystemPrompt(
  sections: Array<{ sectionId: string; name: string; order: number }>,
  simpleIconSlugs: string[],
  tablerIconSlugs: string[] = []
): string {
  const socialSample = simpleIconSlugs.slice(0, 20).join(", ");
  const tablerSample = tablerIconSlugs.slice(0, 25).join(", ");
  return `你是邮件图标识别助手。仔细观察设计图，识别所有需要用图标表达的视觉元素。

## 图标颜色（必须输出）
每个图标记录设计图中的实际颜色 colorHex（如 "#000000"）。

## pack 选择规则
- 社交媒体 logo（Instagram/TikTok/YouTube/Facebook/Twitter 等）：pack 用 "simple-icons"，iconQuery 用品牌 slug（如 instagram、tiktok）
- 页头/页脚**品牌标**若在 simple-icons 索引中有对应 slug（如 nike、apple），可输出 icon；**文字 wordmark**（如纯字母品牌名）不要强行输出 icon，留给 B3 文案
- **金融/卖点圆形图标**（Affirm、Quick、Hidden fees 等）：pack 用 "tabler"，iconQuery 用 circle-check、cash-banknote、shield-check、percentage、clock-dollar 等语义接近的 slug；每个圆形卖点单独一条
- **认证/保障徽标**（UL、TÜV、1,800+ shops、warranty 等）：pack 用 "tabler"，iconQuery 用 certificate、shield-check、building-store、award、badge-check 等；与 B3 文案一一对应，勿漏列
- 通用 UI 图标（mail、phone、location、star、check、truck、package 等）：pack 用 "tabler"
- 简单线条图标也可选 "lucide"
- iconQuery 只写 slug/语义名，**禁止**输出 URL；程序会解析为 CDN 图标（非法 slug 会自动 fallback）

输出格式（JSON 数组）：
[
  {
    "id": "icon_instagram",
    "regionId": "s5",
    "pack": "simple-icons",
    "iconQuery": "instagram",
    "colorHex": "#000000",
    "label": "Instagram"
  },
  {
    "id": "icon_shipping",
    "regionId": "s7",
    "pack": "tabler",
    "iconQuery": "package",
    "colorHex": "#000000",
    "label": "Shipping"
  }
]

规则：
- id：唯一英文标识，建议 icon_ 前缀
- regionId：对应下方区域 id
- 禁止输出完整 URL 或 SVG
- tabler 优先从下列常见 slug 中选，不要编造 brand-* 等品牌 slug
- 图中无图标则输出空数组 []
- 只输出 JSON 数组

允许的 simple-icons slug 参考：${socialSample}
允许的 tabler slug 参考：${tablerSample}

区域参考：
${formatGroundingSectionsForPrompt(sections)}`;
}

export function buildStageB2IconUserText(): string {
  return "请识别附件设计图中的图标，按 system 说明输出 JSON 数组。";
}
