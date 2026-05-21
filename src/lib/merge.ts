import type { EmailPayload, EmailTemplate } from "../types/email";
import { getAtPath, setAtPath } from "./paths";
import { interpolateTextValue } from "./interpolateText";

function clone<T>(v: T): T {
  return structuredClone(v);
}

function shouldSkipOptionalWrapperSubPath(
  template: EmailTemplate,
  blockId: string,
  root: string,
  subPath: string
): boolean {
  if (root !== "wrapperStyle") return false;
  if (!subPath.startsWith("backgroundImage.")) return false;
  const sourceBlock = template.blocks[blockId];
  return sourceBlock?.wrapperStyle?.backgroundImage === undefined || sourceBlock.wrapperStyle.backgroundImage === null;
}

/**
 * 将赋值文件中「可变且允许外部注入」的槽位合并进模板副本（字面量及未开放路径不覆盖）。
 */
export function mergeTemplatePayload(
  template: EmailTemplate,
  payload: EmailPayload | null
): EmailTemplate {
  const out = clone(template);
  if (!payload?.values) return out;

  for (const block of Object.values(out.blocks)) {
    if (!block.bindings) continue;
    for (const [bindPath, spec] of Object.entries(block.bindings)) {
      const [root, ...rest] = bindPath.split(".");
      if (root !== "props" && root !== "wrapperStyle") continue;
      const subPath = rest.join(".");
      if (subPath && shouldSkipOptionalWrapperSubPath(template, block.id, root, subPath)) continue;
      const target =
        root === "props"
          ? (block.props ?? {})
          : (block.wrapperStyle ?? (block.wrapperStyle = {}));

      if (spec.mode === "variable" && spec.allowExternal === true) {
        if (payload.detachedVariableSlotIds?.includes(spec.slotId)) continue;
        const rawSlotVal = payload.values[spec.slotId];
        const slotVal =
          spec.slotPath && rawSlotVal !== undefined
            ? getAtPath(rawSlotVal as Record<string, unknown>, spec.slotPath)
            : rawSlotVal;
        if (slotVal === undefined) continue;
        if (subPath) setAtPath(target as Record<string, unknown>, subPath, slotVal);
        else (block as Record<string, unknown>)[root] = slotVal;
        continue;
      }

      if (spec.mode === "interpolate" && subPath) {
        const current = getAtPath(target as Record<string, unknown>, subPath);
        if (typeof current !== "string") continue;
        const nextValue = interpolateTextValue(current, spec.interpolationSlots, payload.values);
        setAtPath(target as Record<string, unknown>, subPath, nextValue);
      }
    }
  }
  return out;
}
