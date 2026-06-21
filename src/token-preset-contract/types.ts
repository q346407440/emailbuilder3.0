/** 标准 token family（`presets.*.tokens` 下的一级键） */
export type TokenPresetFamily = "colors" | "spacing" | "typography" | "radius";

/** 单个 family.scale 组合，共 13 项 */
export type TokenPresetStandardKey = {
  family: TokenPresetFamily;
  scale: string;
};

export type TokenPresetStandardTokens = Record<
  TokenPresetFamily,
  Record<string, string>
>;
