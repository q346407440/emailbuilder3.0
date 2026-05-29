export type ThemeDensity = "comfortable" | "compact";

/**
 * 用户可编辑的三档字号（像素）。展开后映射到完整 `tokens.typography`：
 * - hero → display（营销/主视觉大字）
 * - title → h1，h2 按历史模板比例由 h1 派生
 * - body → body，caption/micro 按历史比例由 body 派生
 */
export type ThemeTypographyRails = {
  hero?: string;
  title?: string;
  body?: string;
};

/**
 * `mergeEmailThemeIntoBaseline` 的可选入参：单测或工具在内存中模拟品牌色、密度与字号轨道覆盖。
 * 运行时预览真源为各邮件 `tokenPresets.json`；本类型不对应磁盘主题文件。
 */
export type EmailTheme = {
  schemaVersion: "2.0.0";
  brand?: string;
  accent?: string;
  density?: ThemeDensity;
  /** 可选：三组字号（hero/title/body），单位建议写 `NNpx` */
  typography?: ThemeTypographyRails;
};

/**
 * 预览与 `$themeRef` 解析消费的合并后主题形状；由 `resolveDesignTokens`（tokenPresets + 仓库基线）产出。
 * 不应被写入磁盘，也不暴露给 Inspector 直接编辑整对象。
 */
export type ExpandedTheme = {
  schemaVersion: "2.0.0";
  colors: {
    brand: string;
    accent: string;
    onBrand: string;
    onAccent: string;
    surface: string;
    surfaceMuted: string;
    surfaceInverse: string;
    text: string;
    textMuted: string;
    textInverse: string;
    border: string;
    danger: string;
    /** 与 tokenPresets.colors 等合并时可能增加的命名色键 */
    [extraColorKey: string]: string;
  };
  tokens: {
    spacing: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
      section: string;
    };
    typography: {
      display: string;
      h1: string;
      h2: string;
      body: string;
      caption: string;
      micro: string;
    };
    /** 圆角字符串表：仅由样式预设等合并写入；无内置 none/sm/md 档位，键名由各邮件 tokenPresets 自定。 */
    radius: Record<string, string>;
  };
};
