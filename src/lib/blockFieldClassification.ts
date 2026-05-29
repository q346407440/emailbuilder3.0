import type { FieldKind } from "../types/email";

/**
 * 字段分类（来源胶囊体系核心约束）
 *
 * 规则（一次定型，所有上下游遵守）：
 * - style：颜色、字号、间距、圆角、描边、对齐 token 等。允许字面量 / theme。
 * - content：业务内容（文本、图片 src、链接、alt、按钮文案等）。允许字面量 / variable / interpolate。
 * - structural：结构性配置（间距模式、布局方向、可见性 mode 等），仅允许字面量；不出胶囊。
 *
 * 灰色字段定调：
 * - 图片块：资源与裁切在 `wrapperStyle.backgroundImage` / 外层 wrapper 尺寸，`props` 仅承载与带底图 layout 一致的叠放栈布局
 * - 按钮 text / link → content；按钮 buttonStyle.* → style
 * - 图标 src → content；icon.size → style
 * - 背景色 backgroundColor → style；背景图 backgroundImage.src / alt / link → content；backgroundImage.borderRadius / border / fit / position → style；backgroundContentAlign → structural
 * - 文本段内变色/变字号：使用 `textBody.paragraphs[].runs[].color|fontSize` 字面量字段（不可绑 theme/variable）；禁止手写 HTML `<span style="...">`
 *
 * 实现：每条规则是「字段路径前缀 → 分类」；匹配按前缀长度倒序，最长前缀优先。
 * 字段路径是否允许出现：先由 `src/block-contract/` 白名单约束，再由此处约束 bindings 的 mode/fieldKind。
 */

type ClassificationRule = {
  prefix: string;
  kind: FieldKind;
};

/** 适用于所有 block.type 的通用规则（wrapperStyle 与个别 props 共性字段） */
const COMMON_RULES: ClassificationRule[] = [
  // 间距 / 圆角 / 描边；字段是否允许出现仍以 src/block-contract 白名单为准。
  { prefix: "wrapperStyle.padding", kind: "style" },
  { prefix: "wrapperStyle.borderRadius", kind: "style" },
  { prefix: "wrapperStyle.border", kind: "style" },
  // 颜色
  { prefix: "wrapperStyle.backgroundColor", kind: "style" },
  // 尺寸：mode 决定布局策略 → structural；具体 width/height 数值 → style（允许 token）
  { prefix: "wrapperStyle.widthMode", kind: "structural" },
  { prefix: "wrapperStyle.heightMode", kind: "structural" },
  { prefix: "wrapperStyle.width", kind: "style" },
  { prefix: "wrapperStyle.height", kind: "style" },
  // 排版对齐 → structural（不应走 theme，也不应走 payload）
  { prefix: "wrapperStyle.contentAlign", kind: "structural" },
  // 容器背景图：URL / alt / link 是业务内容，圆角描边 fit 是样式
  { prefix: "wrapperStyle.backgroundImage.src", kind: "content" },
  { prefix: "wrapperStyle.backgroundImage.alt", kind: "content" },
  { prefix: "wrapperStyle.backgroundImage.link", kind: "content" },
  { prefix: "wrapperStyle.backgroundImage.borderRadius", kind: "style" },
  { prefix: "wrapperStyle.backgroundImage.border", kind: "style" },
  { prefix: "wrapperStyle.backgroundImage.fit", kind: "structural" },
  { prefix: "wrapperStyle.backgroundImage.position", kind: "style" },
];

/** 按 block.type 拆分的规则 */
const RULES_BY_TYPE: Record<string, ClassificationRule[]> = {
  emailRoot: [
    { prefix: "props.backgroundColor", kind: "style" },
    { prefix: "props.padding", kind: "style" },
    { prefix: "props.border", kind: "style" },
    { prefix: "props.gapMode", kind: "structural" },
    { prefix: "props.gap", kind: "style" },
    { prefix: "props.width", kind: "structural" },
  ],
  layout: [
    { prefix: "props.direction", kind: "structural" },
    { prefix: "props.gapMode", kind: "structural" },
    { prefix: "props.gap", kind: "style" },
  ],
  image: [
    { prefix: "props.direction", kind: "structural" },
    { prefix: "props.gapMode", kind: "structural" },
    { prefix: "props.gap", kind: "style" },
  ],
  text: [
    { prefix: "props.textBody", kind: "content" },
    { prefix: "props.text", kind: "content" },
    { prefix: "props.html", kind: "content" },
    { prefix: "props.fontSize", kind: "style" },
    { prefix: "props.color", kind: "style" },
    { prefix: "props.bold", kind: "style" },
    { prefix: "props.italic", kind: "style" },
    { prefix: "props.decoration", kind: "style" },
  ],
  button: [
    { prefix: "props.text", kind: "content" },
    { prefix: "props.link", kind: "content" },
    { prefix: "props.buttonStyle.widthMode", kind: "structural" },
    { prefix: "props.buttonStyle.width", kind: "style" },
    { prefix: "props.buttonStyle.backgroundColor", kind: "style" },
    { prefix: "props.buttonStyle.textColor", kind: "style" },
    { prefix: "props.buttonStyle.fontSize", kind: "style" },
    { prefix: "props.buttonStyle.borderRadius", kind: "style" },
    { prefix: "props.buttonStyle.border", kind: "style" },
    { prefix: "props.buttonStyle.bold", kind: "style" },
    { prefix: "props.buttonStyle.italic", kind: "style" },
  ],
  divider: [
    { prefix: "props.color", kind: "style" },
    { prefix: "props.lineWidthMode", kind: "structural" },
    { prefix: "props.lineWidth", kind: "style" },
    { prefix: "props.height", kind: "style" },
  ],
  progress: [
    { prefix: "props.trackColor", kind: "style" },
    { prefix: "props.fillColor", kind: "style" },
    { prefix: "props.barWidthMode", kind: "structural" },
    { prefix: "props.barWidth", kind: "style" },
    { prefix: "props.barHeight", kind: "style" },
    { prefix: "props.barBorderRadius", kind: "style" },
    { prefix: "props.value", kind: "content" },
    { prefix: "props.max", kind: "content" },
  ],
  grid: [
    { prefix: "props.columns", kind: "structural" },
    { prefix: "props.gap", kind: "style" },
    { prefix: "props.cellWidthMode", kind: "structural" },
    { prefix: "props.cellWidth", kind: "style" },
    { prefix: "props.cellHeightMode", kind: "structural" },
    { prefix: "props.cellHeight", kind: "style" },
  ],
  icon: [
    { prefix: "props.src", kind: "content" },
    { prefix: "props.link", kind: "content" },
    { prefix: "props.color", kind: "style" },
    { prefix: "props.size", kind: "style" },
  ],
};

function pickLongestPrefix(rules: ClassificationRule[], bindPath: string): FieldKind | null {
  let bestLen = -1;
  let bestKind: FieldKind | null = null;
  for (const rule of rules) {
    if (bindPath === rule.prefix || bindPath.startsWith(`${rule.prefix}.`)) {
      if (rule.prefix.length > bestLen) {
        bestLen = rule.prefix.length;
        bestKind = rule.kind;
      }
    }
  }
  return bestKind;
}

/**
 * 分类某个字段。命中规则的最长前缀优先；
 * - block 专属规则优先于通用规则；命中任一即返回。
 * - 都未命中时回退 `structural`，避免误把未知字段当作可绑定（更保守）。
 */
/** textBody run 上的 color/fontSize：仅字面量落盘，禁止 theme/variable 绑定 */
const TEXT_BODY_RUN_LITERAL_STYLE_RE =
  /^props\.textBody\.paragraphs\.\d+\.runs\.\d+\.(color|fontSize)$/;

export function classifyField(blockType: string, bindPath: string): FieldKind {
  if (blockType === "text" && TEXT_BODY_RUN_LITERAL_STYLE_RE.test(bindPath)) {
    return "structural";
  }
  const typeRules = RULES_BY_TYPE[blockType] ?? [];
  const typed = pickLongestPrefix(typeRules, bindPath);
  if (typed !== null) return typed;
  const common = pickLongestPrefix(COMMON_RULES, bindPath);
  if (common !== null) return common;
  return "structural";
}

/** 帮助方法 */
export function isStyleField(blockType: string, bindPath: string): boolean {
  return classifyField(blockType, bindPath) === "style";
}

export function isContentField(blockType: string, bindPath: string): boolean {
  return classifyField(blockType, bindPath) === "content";
}

export function isStructuralField(blockType: string, bindPath: string): boolean {
  return classifyField(blockType, bindPath) === "structural";
}

/**
 * 列出所有声明过的字段路径（仅用于文档导出 / 调试）。
 * 注：未在此处声明的路径会被分类为 structural，等于禁止绑定。
 */
export function listClassifiedPrefixes(): Array<{ blockType: string | "*"; prefix: string; kind: FieldKind }> {
  const out: Array<{ blockType: string | "*"; prefix: string; kind: FieldKind }> = [];
  for (const r of COMMON_RULES) out.push({ blockType: "*", prefix: r.prefix, kind: r.kind });
  for (const [type, rules] of Object.entries(RULES_BY_TYPE)) {
    for (const r of rules) out.push({ blockType: type, prefix: r.prefix, kind: r.kind });
  }
  return out;
}
