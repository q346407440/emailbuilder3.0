import type { EmailPayload } from "../types/email";
import { SLOT_ID_PATTERN } from "../payload-contract/value-types";
import { isPayloadSlotIdTaken } from "./payloadSlotRegister";

const MAX_SCENE_PRESET_INSTANCE_SUFFIX = 99;

/**
 * 同一场景列表预设可多次实例化：优先用预设 slotId，已占用则依次尝试 base2、base3…
 */
export function proposeScenePresetInstanceSlotId(
  payload: EmailPayload,
  presetBaseSlotId: string
): string | null {
  const base = presetBaseSlotId.trim();
  if (!base) return null;

  const candidates = [base];
  for (let n = 2; n <= MAX_SCENE_PRESET_INSTANCE_SUFFIX; n++) {
    candidates.push(`${base}${n}`);
  }

  for (const candidate of candidates) {
    if (!SLOT_ID_PATTERN.test(candidate)) continue;
    if (!isPayloadSlotIdTaken(payload, candidate)) return candidate;
  }
  return null;
}

/** 第二份及以后实例的展示名（如「商品列表 2」） */
export function scenePresetInstanceLabel(baseLabel: string, presetSlotId: string, instanceSlotId: string): string {
  if (instanceSlotId === presetSlotId) return baseLabel;
  const suffix = instanceSlotId.startsWith(presetSlotId)
    ? instanceSlotId.slice(presetSlotId.length)
    : "";
  return suffix ? `${baseLabel} ${suffix}` : baseLabel;
}
