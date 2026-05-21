/**
 * 图片 / 叠加背景图的 CSS object-position 预设与归一化。
 * 与编辑器下拉选项、画布预览共用，避免「画面位置」散落魔法字符串。
 */

export type ImageObjectPositionOption = { value: string; label: string };

/** 九宫格语义预设（value 可直接写入 JSON 并用于 CSS object-position） */
export const IMAGE_OBJECT_POSITION_PRESETS: ReadonlyArray<ImageObjectPositionOption> = [
  { value: "left top", label: "左上" },
  { value: "center top", label: "上中" },
  { value: "right top", label: "右上" },
  { value: "left center", label: "左中" },
  { value: "center", label: "正中" },
  { value: "right center", label: "右中" },
  { value: "left bottom", label: "左下" },
  { value: "center bottom", label: "下中" },
  { value: "right bottom", label: "右下" },
];

const PRESET_VALUE_SET = new Set(IMAGE_OBJECT_POSITION_PRESETS.map((p) => p.value));

function normalizePositionKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * 常见别名与同义写法 → 预设 value（无法识别时返回 null，保留自定义如 40% 60%）
 */
const POSITION_ALIAS_TO_PRESET: Record<string, string> = {
  center: "center",
  "center center": "center",
  middle: "center",
  top: "center top",
  bottom: "center bottom",
  left: "left center",
  right: "right center",
  "top left": "left top",
  "left top": "left top",
  "top center": "center top",
  "center top": "center top",
  "top right": "right top",
  "right top": "right top",
  "bottom left": "left bottom",
  "left bottom": "left bottom",
  "bottom center": "center bottom",
  "center bottom": "center bottom",
  "bottom right": "right bottom",
  "right bottom": "right bottom",
  "center left": "left center",
  "left center": "left center",
  "center right": "right center",
  "right center": "right center",
};

/**
 * 若 raw 能映射到预设则返回预设 value；空串视为正中；否则返回 null（自定义取值）。
 */
export function matchImageObjectPositionPreset(raw: unknown): string | null {
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  if (!trimmed) return "center";
  const key = normalizePositionKey(trimmed);
  if (PRESET_VALUE_SET.has(key)) return key;
  return POSITION_ALIAS_TO_PRESET[key] ?? null;
}

/** 画布预览：cover 裁切时使用，预设别名归一化，自定义原样传递 */
export function canonicalImageObjectPositionCss(raw: unknown): string {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return "center";
  return matchImageObjectPositionPreset(s) ?? s;
}

/** 图片完整显示（contain）时不裁切，画面位置不参与图像在视窗内的摆放。 */
export function imageObjectPositionCssForFit(raw: unknown, fit: unknown): string {
  if (fit === "contain") return "center";
  return canonicalImageObjectPositionCss(raw);
}
