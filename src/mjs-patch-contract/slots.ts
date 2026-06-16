/** mjs body 底稿可 patch 的 slot id（程序锚点，LLM 只写 replace 正文）。 */
export const MJS_PATCH_SLOT_IDS = [
  "COLORS",
  "buildS1",
  "buildS2",
  "buildS3",
  "buildS4",
  "buildS5",
  "buildS6",
  "buildS7",
  "buildS8",
  "tokenPresets",
  "template",
] as const;

export type MjsPatchSlotId = (typeof MJS_PATCH_SLOT_IDS)[number];

const SLOT_ID_SET = new Set<string>(MJS_PATCH_SLOT_IDS);

export function isMjsPatchSlotId(value: string): value is MjsPatchSlotId {
  return SLOT_ID_SET.has(value);
}

export function mjsSlotBeginMarker(id: MjsPatchSlotId): string {
  return `/* @mjs-slot:${id} */`;
}

export function mjsSlotEndMarker(id: MjsPatchSlotId): string {
  return `/* @mjs-slot-end:${id} */`;
}

/** 在 mother body 中包裹一段可替换源码。 */
export function wrapMjsSlot(id: MjsPatchSlotId, content: string): string {
  return `${mjsSlotBeginMarker(id)}\n${content.trim()}\n${mjsSlotEndMarker(id)}`;
}

export function listMjsPatchSlotIdsForPrompt(): string {
  return MJS_PATCH_SLOT_IDS.map((id) => `\`${id}\``).join("、");
}

/** 提取 slot 锚点之间的当前源码（不含锚点行）；锚点缺失返回 null。 */
export function extractMjsSlotContent(source: string, id: MjsPatchSlotId): string | null {
  const begin = mjsSlotBeginMarker(id);
  const end = mjsSlotEndMarker(id);
  const beginIdx = source.indexOf(begin);
  const endIdx = source.indexOf(end);
  if (beginIdx < 0 || endIdx < 0 || endIdx <= beginIdx) return null;
  return source.slice(beginIdx + begin.length, endIdx).trim();
}
