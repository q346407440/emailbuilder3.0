import type { BindingSpec, EmailTemplate } from "../types/email";

/**
 * 绑定解除/恢复策略（与来源胶囊体系对齐）：
 * - 主题：解除时把当前合并字面量写入模板，并在 meta.easyEmailBindingUi 存：
 *   1) `themeRestoreJson[pathKey]`：原 bindPath 子树 JSON 快照（含 $themeRef），用于恢复字段值。
 *   2) `themeRestoreBindingJson[pathKey]`：原 BindingSpec JSON 快照（含 mode/tokenPath 等元信息），
 *      用于恢复 `block.bindings[path]`（避免胶囊状态与字段值不一致）。
 * - 变量：`EmailPayload.detachedVariableSlotIds` 跳过 merge；编辑走模板字面量（见 merge / applyEdit）。
 * - 保存：仍与 template 同次落盘；未单独拆 payload 保存按钮。
 */

/** 写入 template.meta，与渲染无关，仅用于「恢复跟随主题」 */
export const EASY_EMAIL_BINDING_UI_META_KEY = "easyEmailBindingUi" as const;

export type EasyEmailBindingUiMeta = {
  /**
   * pathKey（见 pathKeyFor）→ 解除跟随前该 bindPath 下 JSON 子树快照（可含 $themeRef），
   * 用于把字段值恢复回原始 themeRef 形态。
   */
  themeRestoreJson?: Record<string, string>;
  /**
   * pathKey → 解除跟随前该 BindingSpec 的 JSON 快照（含 mode/tokenPath/fieldKind 等），
   * 用于恢复 `block.bindings[path]` 与字段值同步。
   */
  themeRestoreBindingJson?: Record<string, string>;
};

function cloneMeta(m: EasyEmailBindingUiMeta): EasyEmailBindingUiMeta {
  return {
    themeRestoreJson: m.themeRestoreJson ? { ...m.themeRestoreJson } : undefined,
    themeRestoreBindingJson: m.themeRestoreBindingJson ? { ...m.themeRestoreBindingJson } : undefined,
  };
}

export function pathKeyFor(blockId: string, bindPath: string): string {
  return `${blockId}\u001f${bindPath}`;
}

export function getBindingUiMeta(template: EmailTemplate): EasyEmailBindingUiMeta {
  const raw = template.meta?.[EASY_EMAIL_BINDING_UI_META_KEY];
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const out: EasyEmailBindingUiMeta = {};
  const tr = o.themeRestoreJson;
  if (tr && typeof tr === "object") {
    const themeRestoreJson: Record<string, string> = {};
    for (const [k, v] of Object.entries(tr)) {
      if (typeof v === "string") themeRestoreJson[k] = v;
    }
    if (Object.keys(themeRestoreJson).length > 0) out.themeRestoreJson = themeRestoreJson;
  }
  const trb = o.themeRestoreBindingJson;
  if (trb && typeof trb === "object") {
    const themeRestoreBindingJson: Record<string, string> = {};
    for (const [k, v] of Object.entries(trb)) {
      if (typeof v === "string") themeRestoreBindingJson[k] = v;
    }
    if (Object.keys(themeRestoreBindingJson).length > 0) {
      out.themeRestoreBindingJson = themeRestoreBindingJson;
    }
  }
  return out;
}

export function patchBindingUiMeta(
  template: EmailTemplate,
  patch: (prev: EasyEmailBindingUiMeta) => EasyEmailBindingUiMeta
): EmailTemplate {
  const t = structuredClone(template);
  const prev = getBindingUiMeta(t);
  const next = patch(cloneMeta(prev));
  if (!t.meta) t.meta = {};
  const merged: EasyEmailBindingUiMeta = {
    themeRestoreJson:
      next.themeRestoreJson && Object.keys(next.themeRestoreJson).length > 0
        ? next.themeRestoreJson
        : undefined,
    themeRestoreBindingJson:
      next.themeRestoreBindingJson && Object.keys(next.themeRestoreBindingJson).length > 0
        ? next.themeRestoreBindingJson
        : undefined,
  };
  const isEmpty = !merged.themeRestoreJson && !merged.themeRestoreBindingJson;
  if (isEmpty) {
    const { [EASY_EMAIL_BINDING_UI_META_KEY]: _omit, ...rest } = t.meta as Record<string, unknown>;
    t.meta = Object.keys(rest).length > 0 ? rest : undefined;
    return t;
  }
  (t.meta as Record<string, unknown>)[EASY_EMAIL_BINDING_UI_META_KEY] = merged;
  return t;
}

export function getThemeRestoreJson(template: EmailTemplate, pathKey: string): string | undefined {
  return getBindingUiMeta(template).themeRestoreJson?.[pathKey];
}

export function getThemeRestoreBinding(
  template: EmailTemplate,
  pathKey: string
): BindingSpec | undefined {
  const json = getBindingUiMeta(template).themeRestoreBindingJson?.[pathKey];
  if (!json) return undefined;
  try {
    const parsed = JSON.parse(json) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as BindingSpec;
    }
  } catch {
    /* 忽略损坏快照 */
  }
  return undefined;
}

export function getThemeRestoreBindings(
  template: EmailTemplate,
  pathKey: string,
  bindPath: string
): Record<string, BindingSpec> | undefined {
  const json = getBindingUiMeta(template).themeRestoreBindingJson?.[pathKey];
  if (!json) return undefined;
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return undefined;
    const record = parsed as Record<string, unknown>;
    if ("mode" in record) {
      return { [bindPath]: parsed as BindingSpec };
    }
    const out: Record<string, BindingSpec> = {};
    for (const [path, spec] of Object.entries(record)) {
      if (spec && typeof spec === "object" && !Array.isArray(spec) && "mode" in spec) {
        out[path] = spec as BindingSpec;
      }
    }
    return Object.keys(out).length > 0 ? out : undefined;
  } catch {
    /* 忽略损坏快照 */
  }
  return undefined;
}
