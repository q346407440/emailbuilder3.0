/**
 * 样式预设 Inspector：将 tokens 的 family / scale 键映射为面向编辑者的简体中文标题。
 * 仅维护「data/emails 下 tokenPresets 与 createDefaultTokenPresets 精简默认」中会出现的键；其余键回退「其他项 n」。
 */

const FAMILY_TITLE_ZH: Record<string, string> = {
  colors: "颜色",
  spacing: "间距",
  radius: "圆角",
  typography: "字号",
};

/** family × scale → 表单项主标题（不含 JSON 键名） */
const SCALE_TITLE_ZH: Partial<Record<string, Record<string, string>>> = {
  colors: {
    primary: "主色",
    secondary: "副色",
    brand: "品牌主色",
    accent: "强调色",
    surface: "主背景",
    surfaceMuted: "次要背景",
    text: "主文字色",
    textMuted: "次要文字色",
    border: "边框色",
  },
  spacing: {
    xs: "特小档",
    sm: "小档",
    md: "中档",
    lg: "大档",
    xl: "特大档",
    section: "模块上下间距",
    pageInline: "页面左右间距",
    gap: "组件内部间隙",
  },
  radius: {
    none: "无圆角",
    sm: "小圆角",
    md: "中圆角",
    lg: "大圆角",
    pill: "胶囊圆角",
    /** 弃购挽留等学习模板：模块/商品卡等容器外框圆角（四角独立绑定时共用同一 token） */
    panel: "面板容器圆角",
    /** 主 CTA 等按钮圆角（四角独立绑定时共用同一 token） */
    cta: "主按钮圆角",
  },
  typography: {
    display: "大标题字号",
    h1: "小标题字号",
    h2: "二级标题字号",
    body: "正文字号",
    caption: "极小字",
    micro: "徽标级字号",
  },
};

export function tokenPresetFamilyTitleZh(family: string): string {
  return FAMILY_TITLE_ZH[family] ?? "其他分组";
}

function scaleTitleForFamily(family: string, scale: string): string | undefined {
  return SCALE_TITLE_ZH[family]?.[scale];
}

export function tokenPresetScaleTitleKnown(family: string, scale: string): boolean {
  return scaleTitleForFamily(family, scale) !== undefined;
}

export type TokenPresetFieldLabelZh = {
  /** 表单项主标题（不出现 JSON 键名） */
  label: string;
  /** 未知键时给 ColorField / 维护者看的补充说明（含键名） */
  technicalHint?: string;
};

/**
 * @param unknownOrdinal 从 1 起，仅在 family+scale 无映射时使用，区分多个「其他项」。
 */
export function tokenPresetFieldLabelZh(
  family: string,
  scale: string,
  unknownOrdinal: number
): TokenPresetFieldLabelZh {
  const mapped = scaleTitleForFamily(family, scale);
  if (mapped) return { label: mapped };
  return {
    label: `其他项 ${unknownOrdinal}`,
    technicalHint: `对应 JSON 键：${family}.${scale}`,
  };
}
