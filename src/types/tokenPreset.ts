export type TokenPresetScaleName = "xs" | "sm" | "md" | "lg" | "xl" | "default" | "pill" | string;

export type TokenFamilyName = "colors" | "spacing" | "radius" | "typography" | string;

export type TokenScaleMap = Record<TokenPresetScaleName, string>;

export type TokenPresetTokens = {
  colors?: TokenScaleMap;
  spacing?: TokenScaleMap;
  radius?: TokenScaleMap;
  typography?: TokenScaleMap;
  [family: string]: TokenScaleMap | undefined;
};

export type TokenPresetDefinition = {
  label: string;
  description?: string;
  tokens: TokenPresetTokens;
};

export type TokenScaleSelection =
  | { mode: "follow" }
  | { mode: "scale"; scale: string }
  | { mode: "custom"; value: string };

export type TokenPresetScopeSelections = Record<string, Record<string, TokenScaleSelection>>;

/**
 * 模板级样式预设：表层保存“跟随/大中小/自定义”，底层保存实际 token 值。
 *
 * `appliedGlobalPresetId`（可选，历史字段）：曾用于「侧栏高亮与公共预设关联」；当前编辑器以 **meta.defaultStylePresetSelection**
 * 与内存中的 `stylePresetListSelection` 管理侧栏选中；持久化本邮件 JSON 时会去掉该字段。旧文件若仍含此键，加载时会剥离。
 */
export type TokenPresets = {
  schemaVersion: "1.0.0";
  activePresetId: string;
  presets: Record<string, TokenPresetDefinition>;
  scopeSelections?: TokenPresetScopeSelections;
  /** 逻辑删除时间（ISO，公共预设文件根级）；删除该字段即可恢复在编辑器中的展示 */
  deletedAt?: string;
  /** @deprecated 不再写入磁盘；加载时移除。勿用于新逻辑 */
  appliedGlobalPresetId?: string;
};
