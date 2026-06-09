/** 以图创建：豆包 mjs 首轮生成策略（HTTP multipart `mjsGenerateMode` 真源）。 */
export const MJS_GENERATE_MODES = ["delta-first", "full-body-first"] as const;

export type MjsGenerateMode = (typeof MJS_GENERATE_MODES)[number];

export const DEFAULT_MJS_GENERATE_MODE: MjsGenerateMode = "delta-first";

const MODE_SET = new Set<string>(MJS_GENERATE_MODES);

export function isMjsGenerateMode(value: string): value is MjsGenerateMode {
  return MODE_SET.has(value);
}

/** 解析 API 表单字段；非法或缺省返回 default。 */
export function parseMjsGenerateMode(value: unknown): MjsGenerateMode {
  if (typeof value !== "string") return DEFAULT_MJS_GENERATE_MODE;
  const trimmed = value.trim();
  return isMjsGenerateMode(trimmed) ? trimmed : DEFAULT_MJS_GENERATE_MODE;
}

export function mjsGenerateModeLabel(mode: MjsGenerateMode): string {
  return mode === "delta-first" ? "底稿 patch" : "整段生成";
}

export function mjsGenerateModeHint(mode: MjsGenerateMode): string {
  return mode === "delta-first"
    ? "视觉规格识别 + 程序底稿 + XML slot 补丁（当前默认）"
    : "豆包一次输出完整 mjs body（对照 git 版首轮）";
}
