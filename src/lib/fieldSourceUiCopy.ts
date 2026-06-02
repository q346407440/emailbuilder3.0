import type { FieldKind, FieldSource } from "../types/email";
import type { FieldSourceState } from "../hooks/useFieldSource";

/** 内容字段在胶囊上的展示态（含列表重复行内映射） */
export type ContentCapsuleMode = "literal" | "variable" | "inlineVariable" | "listItem";

/** 胶囊视觉变体（与 CSS `inspector-field-source__pill--*` 后缀一致） */
export type FieldSourcePillVariant =
  | "literal"
  | "theme"
  | "variable"
  | "inline-variable"
  | "list-item";

export type FieldSourcePillDisplay = {
  label: string;
  variant: FieldSourcePillVariant;
  /** 悬停说明（title） */
  title: string;
  /** 是否处于「已解除跟随」虚线样式 */
  detached: boolean;
};

export type FieldSourceMenuOptionCopy = {
  id: string;
  label: string;
  description?: string;
  active: boolean;
  enabled: boolean;
};

/** 取值方式：与胶囊主文案一致，避免「自由 / 字面量」混用 */
export const FIELD_SOURCE_MODE_LABEL: Record<
  "manual" | "theme" | "variable" | "inlineVariable" | "listItem",
  string
> = {
  manual: "手动填写",
  theme: "样式预设",
  variable: "业务变量",
  inlineVariable: "正文变量",
  listItem: "列表字段",
};

export function fieldKindLabelZh(kind: FieldKind): string {
  if (kind === "style") return "样式字段";
  if (kind === "content") return "内容字段";
  return "结构字段";
}

function followHelp(source: FieldSource): string {
  if (source === "theme") return "当前跟随全局样式预设，修改预设即可批量生效。";
  if (source === "variable") return "当前跟随业务变量，发信时由数据注入。";
  if (source === "inlineVariable") return "正文中含有变量占位，发信时由数据注入。";
  return "当前为手动填写的固定值。";
}

/**
 * 胶囊主文案与样式变体（运营向统一命名）。
 * `pillLabelOverride` 仅用于正文聚合等少数覆盖场景。
 */
export function resolveFieldSourcePillDisplay(input: {
  state: FieldSourceState;
  contentCapsuleMode: ContentCapsuleMode | null;
  listItemFieldLabel?: string;
  pillLabelOverride?: string;
  pillClassSuffixOverride?: string;
}): FieldSourcePillDisplay {
  const { state, contentCapsuleMode, listItemFieldLabel, pillLabelOverride, pillClassSuffixOverride } =
    input;

  if (pillLabelOverride && pillClassSuffixOverride) {
    return {
      label: pillLabelOverride,
      variant: pillClassSuffixOverride as FieldSourcePillVariant,
      title: followHelp(
        pillClassSuffixOverride === "inline-variable"
          ? "inlineVariable"
          : pillClassSuffixOverride === "variable"
            ? "variable"
            : "literal"
      ),
      detached: state.detached,
    };
  }

  if (contentCapsuleMode === "listItem" && listItemFieldLabel) {
    return {
      label: `${FIELD_SOURCE_MODE_LABEL.listItem} · ${listItemFieldLabel}`,
      variant: "list-item",
      title: `当前映射到列表项字段「${listItemFieldLabel}」。`,
      detached: false,
    };
  }

  if (state.detached || state.source === "literal") {
    return {
      label: FIELD_SOURCE_MODE_LABEL.manual,
      variant: "literal",
      title: state.detached
        ? "已解除跟随，当前为手动填写的固定值。"
        : followHelp("literal"),
      detached: state.detached,
    };
  }

  const variantMap: Record<FieldSource, FieldSourcePillVariant> = {
    literal: "literal",
    theme: "theme",
    variable: "variable",
    inlineVariable: "inline-variable",
  };

  const labelMap: Record<FieldSource, string> = {
    literal: FIELD_SOURCE_MODE_LABEL.manual,
    theme: FIELD_SOURCE_MODE_LABEL.theme,
    variable: FIELD_SOURCE_MODE_LABEL.variable,
    inlineVariable: FIELD_SOURCE_MODE_LABEL.inlineVariable,
  };

  return {
    label: labelMap[state.source],
    variant: variantMap[state.source],
    title: followHelp(state.source),
    detached: false,
  };
}

export function fieldSourcePopoverMetaLine(state: FieldSourceState): string {
  const kind = fieldKindLabelZh(state.fieldKind);
  if (state.detached) return `${kind} · 已改为手动填写`;
  return kind;
}

export function themePresetSectionTitle(): string {
  return "选择样式预设项";
}

export function themePresetOptionDescription(preview: string | null | undefined): string {
  if (preview) return `当前预设值 ${preview}`;
  return "点击切换为此预设项";
}

export function themePresetPickHint(): string {
  return "请选择要跟随的样式预设项";
}

export function disabledThemeOptionDescription(kind: FieldKind): string {
  if (kind === "content") return "内容字段不支持样式预设。";
  if (kind === "structural") return "该字段不支持切换取值方式。";
  return "当前不可用。";
}
