/**
 * Stage C styleKeys：字面量保底 + 可选主题档位绑定（Agent 语义，E 机械落盘）。
 *
 * - `literal`（或裸字符串）必填：设计图上的实际值。
 * - `tokenPath` / `*Bind` 可选：标准 12 键之一；解析失败则仅用 literal。
 */

import { STANDARD_THEME_REF_PATHS } from "../token-preset-contract/theme-ref-paths";

/** Stage C 可写的 styleKeys 绑定后缀（与主键配对，如 color + colorBind）。 */
export const COMPACT_STYLE_BIND_SUFFIX = "Bind" as const;

/** 支持 `{ literal, tokenPath? }` 的 styleKeys 字段（对象形态）。 */
export type CompactStyleValueObject = {
  literal: string;
  tokenPath?: string;
};

/** Stage C 允许嵌套的分组键（程序展平为 `buttonStyle.backgroundColor` 等）。 */
export const COMPACT_STYLE_NESTED_GROUP_KEYS = ["buttonStyle"] as const;

export type CompactStyleNestedGroup = Record<string, CompactStyleRawValue>;

export type CompactStyleRawValue =
  | string
  | boolean
  | number
  | CompactStyleValueObject
  | CompactStyleNestedGroup;

/** 归一化后的单字段样式意图。 */
export type NormalizedAgentStyleField = {
  literal?: string;
  tokenPath?: string;
};

/** 主题档位目录（注入 Stage C prompt，与 B1 tokenPresets 一致）。 */
export type StyleTokenCatalogEntry = {
  tokenPath: string;
  label: string;
  value: string;
  hint: string;
};

const COLOR_LABELS: Record<string, string> = {
  "colors.primary": "主色",
  "colors.secondary": "副色",
  "colors.surface": "主背景",
};

const TYPO_LABELS: Record<string, string> = {
  "tokens.typography.display": "大标题字号",
  "tokens.typography.h1": "小标题字号",
  "tokens.typography.body": "正文字号",
  "tokens.typography.caption": "极小字",
};

/** 从 B1 归一化 tokens 生成 Stage C 可用的档位表（含当前 hex/px）。 */
export function buildStyleTokenCatalogForPrompt(tokens: {
  colors: { primary: string; secondary: string; surface: string };
  typography: { display: string; h1: string; body: string; caption: string };
}): StyleTokenCatalogEntry[] {
  const rows: StyleTokenCatalogEntry[] = [
    {
      tokenPath: "colors.primary",
      label: COLOR_LABELS["colors.primary"],
      value: tokens.colors.primary,
      hint: "CTA/按钮背景、强调色块；禁止用于正文/wordmark",
    },
    {
      tokenPath: "colors.secondary",
      label: COLOR_LABELS["colors.secondary"],
      value: tokens.colors.secondary,
      hint: "弱化文案、页脚、辅助说明字色",
    },
    {
      tokenPath: "colors.surface",
      label: COLOR_LABELS["colors.surface"],
      value: tokens.colors.surface,
      hint: "内容区/卡片/容器背景；勿绑到正文 props.color",
    },
    {
      tokenPath: "tokens.typography.display",
      label: TYPO_LABELS["tokens.typography.display"],
      value: tokens.typography.display,
      hint: "大标题",
    },
    {
      tokenPath: "tokens.typography.h1",
      label: TYPO_LABELS["tokens.typography.h1"],
      value: tokens.typography.h1,
      hint: "小标题",
    },
    {
      tokenPath: "tokens.typography.body",
      label: TYPO_LABELS["tokens.typography.body"],
      value: tokens.typography.body,
      hint: "正文/按钮字号",
    },
    {
      tokenPath: "tokens.typography.caption",
      label: TYPO_LABELS["tokens.typography.caption"],
      value: tokens.typography.caption,
      hint: "页脚/说明",
    },
  ];
  return rows;
}

/** Stage C system prompt：styleKeys 双写规则。 */
export function buildAgentStyleKeysPromptSection(
  catalog: StyleTokenCatalogEntry[]
): string {
  const table = catalog
    .map((e) => `- ${e.tokenPath}（${e.label}）= ${e.value} — ${e.hint}`)
    .join("\n");

  return `## styleKeys（字面量 + 可选 *Bind）
- **每个可跟随意字段**：先写设计图 **literal**（hex/px）；需要跟主题档位时写 **\*Bind**（或对象内 tokenPath）。
- **文本/图标（顶层键 + *Bind，推荐）**：
\`\`\`json
"styleKeys": {
  "color": "#6B7280",
  "colorBind": "colors.secondary",
  "fontSize": "16px",
  "fontSizeBind": "tokens.typography.body"
}
\`\`\`
- **按钮（嵌套 buttonStyle 对象，推荐）**：同一按钮样式放一组，程序会展平
\`\`\`json
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
\`\`\`
- 也接受展平写法：\`"buttonStyle.backgroundColor"\` + \`"buttonStyle.backgroundColorBind"\`（与嵌套等价）
- 对象形态（文本 color 可用）：\`"color": { "literal": "#1A1A1A", "tokenPath": "colors.secondary" }\`
- **tokenPath / *Bind 白名单**：
${STANDARD_THEME_REF_PATHS.filter((p) => p.startsWith("colors.") || p.startsWith("tokens.typography.") || p.startsWith("tokens.radius.")).map((p) => `  - ${p}`).join("\n")}
- **当前档位取值**：
${table}
- **绑定建议**：弱化字色 → \`colors.secondary\`；CTA 底 → \`colors.primary\`；**禁止**字色 Bind \`colors.surface\`
- 省略 *Bind = 仅 literal；禁止写 \`$themeRef\``;
}
