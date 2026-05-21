import type { EmailPayload, EmailTemplate } from "../types/email";
import type { ConfigSchema } from "../types/configSchema";
import type { TokenPresets } from "../types/tokenPreset";
import { stableStringify } from "./stableStringify";

export type EmailDataSyncEditorState = {
  template: EmailTemplate | null;
  payload: EmailPayload | null;
  configSchema: ConfigSchema | null;
  tokenPresets: TokenPresets | null;
};

function tokenPresetsForSnapshot(tp: TokenPresets): TokenPresets {
  const next = structuredClone(tp) as TokenPresets;
  delete next.appliedGlobalPresetId;
  return next;
}

/** 用于判断 SSE 同步是否改变了当前编辑态（template / payload / configSchema / tokenPresets）。 */
export function emailDataSyncEditorSnapshot(state: EmailDataSyncEditorState): string {
  return stableStringify({
    template: state.template,
    payload: state.payload,
    configSchema: state.configSchema,
    tokenPresets: state.tokenPresets ? tokenPresetsForSnapshot(state.tokenPresets) : null,
  });
}

/**
 * 是否展示「检测到磁盘 JSON 变更」toast。
 * - 无实质差异：不提示（含切换版式后 loadEmail 已对齐、保存后重复同步）
 * - api_write：本应用写盘，编辑态已是最新，不提示
 * - filesystem 等：外部改盘且与当前编辑态不同，提示
 */
export function shouldShowEmailDataSyncToast(params: {
  reason?: string;
  beforeSnapshot: string;
  afterSnapshot: string;
}): boolean {
  if (params.beforeSnapshot === params.afterSnapshot) return false;
  if (params.reason === "api_write") return false;
  return true;
}
