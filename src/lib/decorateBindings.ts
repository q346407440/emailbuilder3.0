import type { BindingSpec, EmailBlock, EmailTemplate, FieldKind } from "../types/email";
import { isThemeRef } from "../types/themeRef";
import { classifyField } from "./blockFieldClassification";

/**
 * 把字段值中的 `$themeRef` 同步登记到 `block.bindings`，并为所有 binding 补齐 `fieldKind`。
 *
 * 设计要点（与 plan Phase 0.2 对齐）：
 * - 渲染层仍然消费字段值里的 `$themeRef`（兼容运行），UI 层只读 `block.bindings[path].mode === "theme"`。
 * - 对已经存在的 binding（如 `mode: "variable"` 由 applySlotsToTemplate 写入）补 `fieldKind` 缓存。
 * - 子字段下出现 $themeRef 时（如 `props.buttonStyle.backgroundColor`），生成的 bindPath 与 detach/restore
 *   等模块使用的「点路径」一致，保证两侧 path key 可对齐。
 *
 * 注意：本函数不破坏既有 bindings；若同一 path 已存在 binding（罕见情况：作者手写）则跳过。
 */
export function decorateThemeAndKindBindings(template: EmailTemplate): void {
  if (!template?.blocks) return;
  for (const block of Object.values(template.blocks)) {
    if (block.props && typeof block.props === "object") {
      walkAndDecorateThemeRefs(block, "props", "", block.props as Record<string, unknown>);
    }
    if (block.wrapperStyle && typeof block.wrapperStyle === "object") {
      walkAndDecorateThemeRefs(
        block,
        "wrapperStyle",
        "",
        block.wrapperStyle as Record<string, unknown>
      );
    }
    backfillFieldKindForExistingBindings(block);
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function walkAndDecorateThemeRefs(
  block: EmailBlock,
  rootKey: "props" | "wrapperStyle",
  parentPath: string,
  container: Record<string, unknown>
): void {
  for (const [key, value] of Object.entries(container)) {
    const subPath = parentPath ? `${parentPath}.${key}` : key;
    const fullPath = `${rootKey}.${subPath}`;
    if (isThemeRef(value)) {
      const tokenPath = value.$themeRef.trim();
      if (tokenPath) {
        ensureThemeBinding(block, fullPath, tokenPath);
      }
      continue;
    }
    if (isPlainObject(value)) {
      walkAndDecorateThemeRefs(block, rootKey, subPath, value);
    }
  }
}

function ensureThemeBinding(block: EmailBlock, bindPath: string, tokenPath: string): void {
  const target = block as unknown as { bindings?: Record<string, BindingSpec> };
  if (!target.bindings) target.bindings = {};
  const existing = target.bindings[bindPath];
  if (existing) {
    // 已存在的 binding（如 variable）通常优先于 theme；仅补缺失的 fieldKind。
    if (!existing.fieldKind) {
      existing.fieldKind = classifyField(block.type, bindPath) as FieldKind;
    }
    return;
  }
  target.bindings[bindPath] = {
    slotId: tokenPath,
    mode: "theme",
    tokenPath,
    fieldKind: classifyField(block.type, bindPath),
  };
}

function backfillFieldKindForExistingBindings(block: EmailBlock): void {
  const target = block as unknown as { bindings?: Record<string, BindingSpec> };
  const bindings = target.bindings;
  if (!bindings) return;
  for (const [path, spec] of Object.entries(bindings)) {
    if (!spec.fieldKind) {
      spec.fieldKind = classifyField(block.type, path);
    }
  }
}
