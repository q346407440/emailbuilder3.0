import { useMemo } from "react";
import type {
  BindingSpec,
  EmailBlock,
  EmailPayload,
  EmailTemplate,
  FieldKind,
  FieldSource,
} from "../types/email";
import { classifyField } from "../lib/blockFieldClassification";
import {
  hasThemeRefInTemplateField,
  isThemeDetached,
} from "../lib/themeBindingEdit";
import { variableBindingSpec } from "../lib/variableBindingEdit";
import { resolveRepeatListItemFieldBinding } from "../lib/repeatListItemField";

/**
 * 来源胶囊体系的 UI 层聚合视图。
 *
 * 将分散在 inspectFieldBindMode / themeBindingEdit / variableBindingEdit 中的状态聚合成一个易消费结构，
 * 让 Inspector 各处只对接一个 hook，避免到处重复重新组合。
 */
export type FieldSourceState = {
  /** 来源胶囊 UI 枚举：interpolate 在 UI 上表达为「文中变量」。 */
  source: FieldSource;
  /** 字段是否处于「跟随」态（输入框置灰的依据） */
  locked: boolean;
  /** 已在子级解除跟随 */
  detached: boolean;
  /** 字段分类，决定胶囊菜单可选项 */
  fieldKind: FieldKind;
  /** 当前是否允许从字面量升级为「跟随样式预设（设计令牌）」 */
  canBindTheme: boolean;
  /** 当前是否允许从字面量升级为「设为变量」 */
  canBindVariable: boolean;
  /** mode=theme（JSON 契约名未改）时引用的令牌路径，如 colors.surfaceMuted */
  themeTokenPath?: string;
  /** mode=variable 时的 slot id */
  slotId?: string;
  /** 当前变量来源是否支持一键解除跟随并烘焙为字面量 */
  canDetachVariable: boolean;
  /** 完整透传 BindingSpec，便于消费 label / description / required 等元数据 */
  bindingSpec?: BindingSpec;
};

function readBindingSpec(block: EmailBlock | undefined, bindPath: string): BindingSpec | undefined {
  return block?.bindings?.[bindPath];
}

/** 纯函数 selector：在非 React 环境（如 selector 测试、saveTransaction 推导）也可复用 */
export function getFieldSource(
  template: EmailTemplate,
  payload: EmailPayload,
  blockId: string,
  bindPath: string
): FieldSourceState {
  const block = template.blocks[blockId];
  const fieldKind = block ? classifyField(block.type, bindPath) : "structural";
  const spec = readBindingSpec(block, bindPath);

  // structural 字段：不出胶囊，永远视为 literal 且不可绑定
  if (fieldKind === "structural") {
    return {
      source: "literal",
      locked: false,
      detached: false,
      fieldKind,
      canBindTheme: false,
      canBindVariable: false,
      canDetachVariable: false,
      bindingSpec: spec,
    };
  }

  // variable：整字段跟随 payload 变量（含 detached）
  if (spec && spec.mode === "variable") {
    const variable = variableBindingSpec(block!, bindPath);
    const slotId = spec.slotId;
    const detached =
      Boolean(variable) && (payload.detachedVariableSlotIds ?? []).includes(slotId);
    const repeatListItem = resolveRepeatListItemFieldBinding(template, blockId, bindPath);
    return {
      source: "variable",
      locked: !detached,
      detached,
      fieldKind,
      canBindTheme: false,
      canBindVariable: false,
      canDetachVariable: repeatListItem ? false : variable?.detachable === true,
      themeTokenPath: undefined,
      slotId,
      bindingSpec: spec,
    };
  }

  // interpolate：文本内局部变量，不等同于整字段跟随变量。
  if (spec && spec.mode === "interpolate") {
    return {
      source: "inlineVariable",
      locked: true,
      detached: false,
      fieldKind,
      canBindTheme: false,
      canBindVariable: false,
      canDetachVariable: false,
      themeTokenPath: undefined,
      slotId: spec.slotId,
      bindingSpec: spec,
    };
  }

  // 样式令牌：优先识别 detached（meta 中存有解除前快照）
  if (template && isThemeDetached(template, blockId, bindPath)) {
    return {
      source: "theme",
      locked: false,
      detached: true,
      fieldKind,
      canBindTheme: false,
      canBindVariable: false,
      canDetachVariable: false,
      themeTokenPath: spec?.tokenPath,
      slotId: spec?.slotId,
      bindingSpec: spec,
    };
  }

  // 跟随样式令牌：bindings 登记 mode:"theme"（JSON 契约）或字段值含 $themeRef
  if (template && hasThemeRefInTemplateField(template, blockId, bindPath)) {
    const themeSpec = spec && spec.mode === "theme" ? spec : undefined;
    return {
      source: "theme",
      locked: true,
      detached: false,
      fieldKind,
      canBindTheme: false,
      canBindVariable: false,
      canDetachVariable: false,
      themeTokenPath: themeSpec?.tokenPath,
      slotId: themeSpec?.slotId,
      bindingSpec: themeSpec,
    };
  }

  // 自由态：按 fieldKind 决定可达升级
  return {
    source: "literal",
    locked: false,
    detached: false,
    fieldKind,
    canBindTheme: fieldKind === "style",
    canBindVariable: fieldKind === "content",
    canDetachVariable: false,
    bindingSpec: spec,
  };
}

/**
 * React hook：在 Inspector 等组件中订阅 (template, payload, blockId, bindPath) 的来源态。
 * 内部使用 useMemo 缓存，避免 popover 等下游频繁重算。
 */
export function useFieldSource(
  template: EmailTemplate,
  payload: EmailPayload,
  blockId: string,
  bindPath: string
): FieldSourceState {
  return useMemo(
    () => getFieldSource(template, payload, blockId, bindPath),
    [template, payload, blockId, bindPath]
  );
}
