import type { EmailPayload, EmailTemplate } from "../types/email";
import type { ConfigTarget } from "../types/configSchema";
import type { TokenPresets } from "../types/tokenPreset";
import { getAtPath, setAtPath } from "./paths";

const DANGEROUS_TEMPLATE_PATH_RE = /(^|\.)(id|parentId|children|rootBlockId|blocks)$/;

export function isConfigTargetPathSafe(target: ConfigTarget): boolean {
  if (target.kind === "payload") return /^[a-zA-Z][a-zA-Z0-9_]*$/.test(target.slotId);
  const path = target.kind === "blockPath" ? target.path : target.path;
  if (!path || path.includes("..")) return false;
  if (target.kind === "blockPath") {
    return path.startsWith("props.") || path.startsWith("wrapperStyle.");
  }
  if (target.kind === "templatePath") {
    return !DANGEROUS_TEMPLATE_PATH_RE.test(path);
  }
  return !path.includes("..");
}

export function readConfigTargetValue(
  target: ConfigTarget,
  state: { template: EmailTemplate; payload: EmailPayload; tokenPresets: TokenPresets | null }
): unknown {
  if (target.kind === "payload") return state.payload.values[target.slotId];
  if (target.kind === "tokenPreset") {
    return state.tokenPresets ? getAtPath(state.tokenPresets as unknown as Record<string, unknown>, target.path) : undefined;
  }
  if (target.kind === "blockPath") {
    const block = state.template.blocks[target.blockId];
    return block ? getAtPath(block as unknown as Record<string, unknown>, target.path) : undefined;
  }
  return getAtPath(state.template as unknown as Record<string, unknown>, target.path);
}

export function writeConfigTargetValue(
  target: ConfigTarget,
  value: unknown,
  state: { template: EmailTemplate; payload: EmailPayload; tokenPresets: TokenPresets | null }
): void {
  if (!isConfigTargetPathSafe(target)) return;
  if (target.kind === "payload") {
    state.payload.values[target.slotId] = value;
    return;
  }
  if (target.kind === "tokenPreset") {
    if (!state.tokenPresets) return;
    setAtPath(state.tokenPresets as unknown as Record<string, unknown>, target.path, value);
    return;
  }
  if (target.kind === "blockPath") {
    const block = state.template.blocks[target.blockId];
    if (!block) return;
    setAtPath(block as unknown as Record<string, unknown>, target.path, value);
    return;
  }
  setAtPath(state.template as unknown as Record<string, unknown>, target.path, value);
}
