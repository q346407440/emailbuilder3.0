import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties } from "react";
import type { BindingSpec, EmailBlock, EmailPayload, EmailTemplate, FieldKind, FieldSource } from "../types/email";
import type { ExpandedTheme } from "../types/theme";
import type { TokenPresets } from "../types/tokenPreset";
import { getFieldSource } from "../hooks/useFieldSource";
import {
  applyThemeTokenBinding,
  detachThemeFieldBranch,
  readThemeTokenPathForField,
  restoreThemeFieldBranch,
} from "../lib/themeBindingEdit";
import {
  applyVariableBinding,
  detachInlineVariableBinding,
  detachVariableSlot,
  restoreVariableSlot,
} from "../lib/variableBindingEdit";
import {
  parseTokenPathForLabel,
  previewThemeTokenValueForField,
  suggestThemeTokenPaths,
} from "../lib/themeTokenCandidates";
import { tokenPresetFieldLabelZh } from "../lib/tokenPresetFieldLabels";
import { computeInspectorFieldSourcePopoverStyle } from "./inspectorFieldSourcePopoverLayout";
import { collectPayloadVariableSlots, type ExternalVariableSlotInfo } from "../lib/payloadSlots";
import {
  bindingRequirementLabel,
  filterSlotsForVariablePicker,
  inferBindingValueTypeRequirement,
  inferVariablePickerPurpose,
  slotValueTypeMatchesBindingRequirement,
} from "../lib/variableSlotCompatibility";
import type { TextBodyContentMode } from "../lib/textBodyContentMode";
import { readInspectorDisplayValue } from "../lib/inspectorBindingDisplay";
import { applyTextBodyWholeVariableFromSlot } from "../lib/textBodyVariableEdit";
import { readTemplateFieldOnly } from "../lib/themeBindingEdit";
import { PayloadVariablePickerModal } from "./PayloadVariablePickerModal";
import { RepeatListItemFieldPickerModal } from "./RepeatListItemFieldPickerModal";
import {
  applyRepeatListItemFieldKey,
  filterRepeatItemFieldsForBindPath,
  REPEAT_LIST_ITEM_LITERAL_BLOCKED_MESSAGE,
  resolveRepeatListItemFieldBinding,
} from "../lib/repeatListItemField";

type Props = {
  template: EmailTemplate;
  payload: EmailPayload;
  block: EmailBlock;
  mergedTemplate: EmailTemplate | null;
  effectiveDesignTokens?: ExpandedTheme | null;
  tokenPresets?: TokenPresets | null;
  bindPath: string;
  onUpdate: (next: { template: EmailTemplate; payload: EmailPayload }) => void;
  onTemplateChange: (nextTemplate: EmailTemplate) => void;
  /** 聚合态展示：覆盖胶囊文案（如正文「文中变量」） */
  pillLabelOverride?: string;
  /** 聚合态展示：覆盖胶囊样式类后缀（literal / variable / inline-variable） */
  pillClassSuffixOverride?: string;
  /** 正文聚合：「字面量」烘焙全文（覆盖单 bindPath detach） */
  onAggregateLiteralize?: () => void;
  /** 正文三态聚合（literal / inlineVariable / wholeVariable） */
  aggregateTextBodyMode?: TextBodyContentMode;
  /** 绑定弹窗预览文案（正文聚合时传全文） */
  bindModalPreviewText?: string;
};

type SourceOption = {
  source: FieldSource;
  label: string;
  description: string;
  enabled: boolean;
  active: boolean;
  action?: () => void;
};

const SOURCE_LABEL: Record<FieldSource, string> = {
  literal: "自由",
  theme: "样式令牌",
  variable: "标量变量",
  inlineVariable: "文中变量",
};

const SOURCE_CLASS: Record<FieldSource, string> = {
  literal: "literal",
  theme: "theme",
  variable: "variable",
  inlineVariable: "inline-variable",
};

function fieldKindLabel(kind: FieldKind): string {
  if (kind === "style") return "样式字段";
  if (kind === "content") return "内容字段";
  return "结构字段";
}

function sourceHelp(source: FieldSource): string {
  if (source === "theme") return "字段值引用样式预设（tokenPresets）展开后的设计令牌（$themeRef）。";
  if (source === "variable") return "跟随 payload.json 中的业务变量。";
  if (source === "inlineVariable") return "正文中包含一个或多个 payload 文中变量。";
  return "直接写入当前模板字段。";
}

function disabledThemeReason(kind: FieldKind): string {
  if (kind === "content") return "内容字段不能绑定样式预设令牌；请使用变量或字面量。";
  if (kind === "structural") return "结构字段不能绑定来源。";
  return "令牌选择器将在后续版本接入。";
}

/** 内容字段胶囊在 UI 上的态（与正文聚合态对齐；listItem 为列表重复行模板内字段映射） */
type ContentCapsuleMode = "literal" | "variable" | "inlineVariable" | "listItem";

function deriveContentCapsuleMode(
  state: ReturnType<typeof getFieldSource>,
  aggregateTextBodyMode?: TextBodyContentMode
): ContentCapsuleMode | null {
  if (state.fieldKind !== "content") return null;
  if (aggregateTextBodyMode === "wholeVariable") return "variable";
  if (aggregateTextBodyMode === "inlineVariable") return "inlineVariable";
  if (aggregateTextBodyMode === "literal") return "literal";
  if (state.source === "inlineVariable") return "inlineVariable";
  if (state.source === "variable" && !state.detached) return "variable";
  return "literal";
}

function deriveContentCapsuleModeWithRepeat(
  template: EmailTemplate,
  blockId: string,
  bindPath: string,
  state: ReturnType<typeof getFieldSource>,
  aggregateTextBodyMode?: TextBodyContentMode
): ContentCapsuleMode | null {
  const base = deriveContentCapsuleMode(state, aggregateTextBodyMode);
  if (base !== "variable") return base;
  if (resolveRepeatListItemFieldBinding(template, blockId, bindPath)) return "listItem";
  return base;
}

function isValidSlotId(slotId: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9_]*$/.test(slotId);
}

function readWholeFieldPreviewString(
  block: EmailBlock,
  payload: EmailPayload,
  mergedTemplate: EmailTemplate | null,
  bindPath: string,
  template: EmailTemplate,
  bindModalPreviewText?: string
): string {
  if (bindModalPreviewText !== undefined) return bindModalPreviewText;
  const mergedBlock = mergedTemplate?.blocks[block.id];
  const raw = readInspectorDisplayValue(block, payload, mergedBlock ?? null, bindPath, template);
  if (typeof raw === "number" && Number.isFinite(raw)) return String(raw);
  if (typeof raw === "string") return raw;
  return "";
}

/** 事件路径上是否命中某节点或其子树（含 composedPath，避免 portal/ref 时序导致误判） */
function composedPathTouchesNode(path: ReadonlyArray<EventTarget>, node: Node | null | undefined): boolean {
  if (!node) return false;
  for (const t of path) {
    if (t instanceof Node && (t === node || node.contains(t))) return true;
  }
  return false;
}

function eventTargetInsideFieldSourcePopover(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest("[data-inspector-field-source-popover]"));
}

function eventTouchesInspectorFieldSourcePopover(event: Event): boolean {
  const rawPath =
    typeof event.composedPath === "function" ? event.composedPath() : [event.target ?? event.currentTarget];
  const path = rawPath.filter((t): t is EventTarget => t != null);
  if (eventTargetInsideFieldSourcePopover(event.target)) return true;
  return path.some(
    (t) => t instanceof HTMLElement && t.hasAttribute("data-inspector-field-source-popover")
  );
}

/**
 * Inspector 字段标题右侧的「来源胶囊」。
 *
 * 统一表达：自由编辑、跟随样式预设（仅样式字段）、跟随 payload 变量（仅内容字段）、已解除跟随。
 * 样式字段不出现「设为变量」项（不支持）；菜单通过 portal 挂到 body，并按视口上下翻转，避免被侧栏裁剪。
 */
export function InspectorFieldSource({
  template,
  payload,
  block,
  mergedTemplate,
  effectiveDesignTokens = null,
  tokenPresets = null,
  bindPath,
  onUpdate,
  onTemplateChange,
  pillLabelOverride,
  pillClassSuffixOverride,
  onAggregateLiteralize,
  aggregateTextBodyMode,
  bindModalPreviewText,
}: Props) {
  const [open, setOpen] = useState(false);
  const [bindModalOpen, setBindModalOpen] = useState(false);
  const [listItemModalOpen, setListItemModalOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties>({});
  const templateRef = useRef(template);
  const payloadRef = useRef(payload);
  const mergedTemplateRef = useRef(mergedTemplate);
  const onUpdateRef = useRef(onUpdate);
  const onTemplateChangeRef = useRef(onTemplateChange);
  templateRef.current = template;
  payloadRef.current = payload;
  mergedTemplateRef.current = mergedTemplate;
  onUpdateRef.current = onUpdate;
  onTemplateChangeRef.current = onTemplateChange;

  const state = getFieldSource(template, payload, block.id, bindPath);
  const repeatListItemCtx = useMemo(
    () => resolveRepeatListItemFieldBinding(template, block.id, bindPath),
    [template, block.id, bindPath]
  );
  const currentLiteral = readTemplateFieldOnly(block, bindPath);
  const bindingRequirement = inferBindingValueTypeRequirement(block, bindPath, currentLiteral);
  const pickerPurpose = inferVariablePickerPurpose(block, bindPath, currentLiteral);
  const catalogSlots = useMemo(
    () => collectPayloadVariableSlots(template, payload),
    [payload, template]
  );
  const contentCapsuleMode = deriveContentCapsuleModeWithRepeat(
    template,
    block.id,
    bindPath,
    state,
    aggregateTextBodyMode
  );
  const listItemFieldCandidates = useMemo(
    () =>
      repeatListItemCtx
        ? filterRepeatItemFieldsForBindPath(repeatListItemCtx.repeat.itemFields, bindPath)
        : [],
    [bindPath, repeatListItemCtx]
  );
  const bindModalPreview = useMemo(
    () =>
      readWholeFieldPreviewString(
        block,
        payload,
        mergedTemplate,
        bindPath,
        template,
        bindModalPreviewText
      ),
    [bindModalPreviewText, bindPath, block, mergedTemplate, payload, template]
  );

  const applyScalarVariableSlot = useCallback(
    (slot: ExternalVariableSlotInfo, mode: "bind" | "create") => {
      const currentValue = readTemplateFieldOnly(templateRef.current.blocks[block.id]!, bindPath);
      const inferred = inferBindingValueTypeRequirement(block, bindPath, currentValue);
      if (
        !slotValueTypeMatchesBindingRequirement(slot.valueType, inferred, {
          block,
          bindPath,
        })
      ) {
        window.alert(
          `该字段需要「${bindingRequirementLabel(inferred)}」类变量，所选变量类型为「${slot.valueType}」，无法绑定。`
        );
        return;
      }
      const seed =
        typeof currentValue === "string" || (typeof currentValue === "number" && Number.isFinite(currentValue))
          ? currentValue
          : bindModalPreview.trim();

      if (
        block.type === "text" &&
        contentCapsuleMode === "inlineVariable" &&
        mergedTemplateRef.current
      ) {
        onUpdateRef.current(
          applyTextBodyWholeVariableFromSlot(
            templateRef.current,
            payloadRef.current,
            block.id,
            mergedTemplateRef.current,
            {
              slotId: slot.slotId,
              label: slot.label ?? slot.slotId,
              valueType: slot.valueType as BindingSpec["valueType"],
              mode,
              defaultValue: bindModalPreview.trim() || String(seed),
            },
            (path) => {
              const mb = mergedTemplateRef.current?.blocks[block.id];
              if (!mb) return "";
              const v = readInspectorDisplayValue(block, payloadRef.current, mb, path, templateRef.current);
              return typeof v === "string" ? v : String(v ?? "");
            }
          )
        );
        setBindModalOpen(false);
        return;
      }

      const spec: BindingSpec = {
        slotId: slot.slotId,
        mode: "variable",
        valueType: slot.valueType as BindingSpec["valueType"],
        defaultValue: seed,
        allowExternal: true,
        fieldKind: "content",
        label: slot.label ?? slot.slotId,
        description: slot.description,
      };
      onUpdateRef.current(
        applyVariableBinding(
          templateRef.current,
          payloadRef.current,
          block.id,
          bindPath,
          spec,
          seed
        )
      );
      setBindModalOpen(false);
    },
    [bindModalPreview, bindPath, block, contentCapsuleMode]
  );

  const handleBindModalCreate = useCallback(
    ({ slotId, label }: { slotId: string; label: string }) => {
      if (!isValidSlotId(slotId)) {
        window.alert("slotId 必须以字母开头，且只能包含字母、数字和下划线。");
        return;
      }
      const currentValue = readTemplateFieldOnly(templateRef.current.blocks[block.id]!, bindPath);
      const inferred = inferBindingValueTypeRequirement(block, bindPath, currentValue);
      const seed =
        typeof currentValue === "string" || (typeof currentValue === "number" && Number.isFinite(currentValue))
          ? currentValue
          : bindModalPreview.trim();

      if (block.type === "text" && contentCapsuleMode === "inlineVariable" && mergedTemplateRef.current) {
        onUpdateRef.current(
          applyTextBodyWholeVariableFromSlot(
            templateRef.current,
            payloadRef.current,
            block.id,
            mergedTemplateRef.current,
            {
              slotId,
              label,
              valueType: inferred,
              mode: "create",
              defaultValue: bindModalPreview.trim() || String(seed),
            },
            (path) => {
              const mb = mergedTemplateRef.current?.blocks[block.id];
              if (!mb) return "";
              const v = readInspectorDisplayValue(block, payloadRef.current, mb, path, templateRef.current);
              return typeof v === "string" ? v : String(v ?? "");
            }
          )
        );
        setBindModalOpen(false);
        return;
      }

      const spec: BindingSpec = {
        slotId,
        mode: "variable",
        valueType: inferred,
        defaultValue: seed,
        allowExternal: true,
        fieldKind: "content",
        label,
      };
      onUpdateRef.current(
        applyVariableBinding(templateRef.current, payloadRef.current, block.id, bindPath, spec, seed)
      );
      setBindModalOpen(false);
    },
    [bindModalPreview, bindPath, block, contentCapsuleMode]
  );

  const bindModalSlots = useMemo(
    () => filterSlotsForVariablePicker(catalogSlots, pickerPurpose),
    [catalogSlots, pickerPurpose]
  );

  const bindModalTitle =
    contentCapsuleMode === "variable"
      ? "切换绑定"
      : contentCapsuleMode === "inlineVariable"
        ? "整个绑定标量变量"
        : "绑定标量变量";

  const runOptionAction = useCallback((option: SourceOption) => {
    if (!option.enabled || !option.action) return;
    option.action();
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    /**
     * 使用 capture：在目标按钮的 pointerdown 默认行为之前判断是否「点在外部」。
     * 选项的实际提交在选项按钮 pointerdown 中完成，避免 portal 菜单在 click 前被卸载。
     */
    const onPointerDownCapture = (event: PointerEvent) => {
      const rawPath =
        typeof event.composedPath === "function" ? event.composedPath() : [event.target ?? event.currentTarget];
      const path = rawPath.filter((t): t is EventTarget => t != null);
      const root = rootRef.current;
      const pop = popoverRef.current;
      if (composedPathTouchesNode(path, root)) return;
      if (composedPathTouchesNode(path, pop)) return;
      if (eventTouchesInspectorFieldSourcePopover(event)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDownCapture, true);
    return () => document.removeEventListener("pointerdown", onPointerDownCapture, true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const options = useMemo<SourceOption[]>(() => {
    const canBake = Boolean(mergedTemplate);
    const items: SourceOption[] = [];
    const isListItemField = contentCapsuleMode === "listItem" && Boolean(repeatListItemCtx);

    const canDetachVariable = state.source !== "variable" || state.canDetachVariable;

    items.push({
      source: "literal",
      label: "字面量",
      description: isListItemField
        ? "列表行内字段不能直接改为字面量；须先解除列表重复绑定。"
        : state.source === "literal"
          ? "当前直接写在模板字段中。"
          : state.source === "inlineVariable"
            ? canBake
              ? "将当前预览文案烘焙为自由文本，并移除文中变量绑定。"
              : "需要等待合并预览完成后才能移除文中变量。"
            : canBake
              ? "将当前预览值烘焙为模板字面量。"
              : "需要等待合并预览完成后才能改为字面量。",
      active: state.source === "literal" || state.detached,
      enabled:
        isListItemField ||
        state.source === "literal" ||
          (canBake &&
            (onAggregateLiteralize
              ? state.source === "variable" || state.source === "inlineVariable"
              : canDetachVariable)),
      action: isListItemField
        ? () => {
            window.alert(REPEAT_LIST_ITEM_LITERAL_BLOCKED_MESSAGE);
          }
        : onAggregateLiteralize &&
            canBake &&
            (state.source === "variable" || state.source === "inlineVariable") &&
            !state.detached
          ? () => {
              onAggregateLiteralize();
              setOpen(false);
            }
          : state.source === "theme" && !state.detached && mergedTemplate
            ? () => {
                const merged = mergedTemplateRef.current;
                if (!merged) return;
                onTemplateChangeRef.current(
                  detachThemeFieldBranch(templateRef.current, merged, block.id, bindPath)
                );
              }
            : state.source === "variable" && !state.detached && mergedTemplate && state.canDetachVariable
              ? () => {
                  const merged = mergedTemplateRef.current;
                  if (!merged) return;
                  onUpdateRef.current(
                    detachVariableSlot(templateRef.current, payloadRef.current, block.id, bindPath, merged)
                  );
                }
              : state.source === "inlineVariable" && mergedTemplate
                ? () => {
                    const merged = mergedTemplateRef.current;
                    if (!merged) return;
                    onTemplateChangeRef.current(
                      detachInlineVariableBinding(templateRef.current, block.id, bindPath, merged)
                    );
                  }
                : undefined,
    });

    if (state.fieldKind === "style") {
      items.push({
        source: "theme",
        label: state.detached && state.source === "theme" ? "恢复跟随预设" : "跟随样式预设",
        description: disabledThemeReason(state.fieldKind),
        active: state.source === "theme" && !state.detached,
        enabled: state.source === "theme" ? state.detached : false,
        action:
          state.source === "theme" && state.detached
            ? () =>
                onTemplateChangeRef.current(restoreThemeFieldBranch(templateRef.current, block.id, bindPath))
            : undefined,
      });
    }

    if (contentCapsuleMode === "listItem" && repeatListItemCtx) {
      items.push({
        source: "variable",
        label: "切换列表字段",
        description: `改绑到「${repeatListItemCtx.collectionLabel}」的另一项字段（如 title / subtitle），不能切换列表槽或标量变量。`,
        active: false,
        enabled: listItemFieldCandidates.length > 1,
        action: () => {
          setOpen(false);
          setListItemModalOpen(true);
        },
      });
    } else if (contentCapsuleMode) {
      const bindLabel =
        contentCapsuleMode === "variable"
          ? "切换绑定"
          : contentCapsuleMode === "inlineVariable"
            ? "整个绑定标量变量"
            : "绑定标量变量";
      const bindDescription =
        contentCapsuleMode === "variable"
          ? "在弹窗中选择其他标量变量，整字段改绑（不含列表类变量）。"
          : contentCapsuleMode === "inlineVariable"
            ? "将正文整体改为跟随一个标量变量（会先烘焙文中变量为字面量）。"
            : "在弹窗中绑定或新建标量变量，整字段跟随（不含列表类变量）。";
      items.push({
        source: "variable",
        label: bindLabel,
        description: bindDescription,
        active: false,
        enabled: true,
        action: () => {
          setOpen(false);
          setBindModalOpen(true);
        },
      });
    } else if (state.fieldKind === "style" && state.source === "variable" && state.detached) {
      items.push({
        source: "variable",
        label: "恢复跟随变量",
        description: "恢复到 payload 变量值。",
        active: false,
        enabled: true,
        action: () =>
          onUpdateRef.current(restoreVariableSlot(templateRef.current, payloadRef.current, block.id, bindPath)),
      });
    }

    return items;
  }, [
    bindPath,
    block.id,
    contentCapsuleMode,
    mergedTemplate,
    onAggregateLiteralize,
    contentCapsuleMode,
    listItemFieldCandidates.length,
    repeatListItemCtx,
    state,
  ]);

  const themeTokenCandidates = useMemo(
    () => (state.fieldKind === "style" ? suggestThemeTokenPaths(block.type, bindPath) : []),
    [block.type, bindPath, state.fieldKind]
  );

  const activeThemeTokenPath = useMemo(
    () => readThemeTokenPathForField(template, block.id, bindPath),
    [template, block.id, bindPath]
  );

  const applyThemeToken = useCallback(
    (tokenPath: string) => {
      onTemplateChangeRef.current(
        applyThemeTokenBinding(templateRef.current, block.id, bindPath, tokenPath)
      );
      setOpen(false);
    },
    [bindPath, block.id]
  );

  const updatePopoverPosition = useCallback(() => {
    const pill = rootRef.current;
    const pop = popoverRef.current;
    if (!pill || !pop) return;
    const tr = pill.getBoundingClientRect();
    const pw = pop.offsetWidth || 240;
    const ph = pop.offsetHeight;
    setPopoverStyle(computeInspectorFieldSourcePopoverStyle(tr, pw, ph));
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPopoverStyle({});
      return;
    }
    updatePopoverPosition();
    const id = window.requestAnimationFrame(() => updatePopoverPosition());
    const onScrollOrResize = () => updatePopoverPosition();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    const popEl = popoverRef.current;
    const ro =
      typeof ResizeObserver !== "undefined" && popEl ? new ResizeObserver(() => updatePopoverPosition()) : null;
    if (popEl && ro) ro.observe(popEl);
    return () => {
      window.cancelAnimationFrame(id);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
      ro?.disconnect();
    };
  }, [open, options.length, themeTokenCandidates.length, updatePopoverPosition]);

  if (state.fieldKind === "structural") return null;

  const badgeText =
    pillLabelOverride ??
    (contentCapsuleMode === "listItem" && repeatListItemCtx
      ? `列表项 · ${repeatListItemCtx.itemFieldLabel}`
      : state.detached
        ? "自由"
        : SOURCE_LABEL[state.source]);
  const pillClassSuffix =
    pillClassSuffixOverride ??
    (contentCapsuleMode === "listItem" ? "list-item" : SOURCE_CLASS[state.source]);
  const badgeTitle =
    contentCapsuleMode === "listItem" && repeatListItemCtx
      ? `${fieldKindLabel(state.fieldKind)}：跟随列表「${repeatListItemCtx.collectionLabel}」的项字段「${repeatListItemCtx.itemFieldKey}」；由列表重复展开，不可改为字面量。`
      : `${fieldKindLabel(state.fieldKind)}：${
          state.detached ? "已解除跟随，当前直接写入模板字段。" : sourceHelp(state.source)
        }`;

  const themeFollowing = state.source === "theme" && !state.detached;

  const popoverNode =
    open && typeof document !== "undefined" ? (
      <div
        ref={popoverRef}
        className="inspector-field-source__popover inspector-field-source__popover--portal"
        style={popoverStyle}
        role="menu"
        data-inspector-field-source-popover=""
      >
        <span className="inspector-field-source__meta">
          {fieldKindLabel(state.fieldKind)}
          {state.detached ? " · 已解除跟随" : ""}
        </span>
        {options.map((option) => (
          <button
            key={option.source}
            type="button"
            className={`inspector-field-source__option${
              option.active ? " inspector-field-source__option--active" : ""
            }`}
            role="menuitem"
            disabled={!option.enabled || !option.action}
            onPointerDown={(event) => {
              if (!option.enabled || !option.action) return;
              event.preventDefault();
              runOptionAction(option);
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              runOptionAction(option);
            }}
          >
            <span className="inspector-field-source__option-title">{option.label}</span>
            <span className="inspector-field-source__option-desc">{option.description}</span>
          </button>
        ))}
        {state.fieldKind === "style" && themeTokenCandidates.length > 0 ? (
          <div
            className="inspector-field-source__theme-section"
            role="radiogroup"
            aria-label="跟随样式预设参数"
          >
            <span className="inspector-field-source__theme-section-title">跟随样式预设参数</span>
            {themeFollowing && !activeThemeTokenPath ? (
              <span className="inspector-field-source__theme-section-hint">请选择要跟随的预设参数</span>
            ) : null}
            {themeTokenCandidates.map((tokenPath) => {
              const { family, scale } = parseTokenPathForLabel(tokenPath);
              const label = tokenPresetFieldLabelZh(family, scale, 1).label;
              const preview = previewThemeTokenValueForField(
                bindPath,
                tokenPath,
                effectiveDesignTokens,
                tokenPresets
              );
              const selected = themeFollowing && activeThemeTokenPath === tokenPath;
              return (
                <button
                  key={tokenPath}
                  type="button"
                  name={`theme-token-${block.id}-${bindPath}`}
                  className={`inspector-field-source__token-option${
                    selected ? " inspector-field-source__token-option--selected" : ""
                  }`}
                  role="radio"
                  aria-checked={selected}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    applyThemeToken(tokenPath);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    applyThemeToken(tokenPath);
                  }}
                >
                  <span className="inspector-field-source__radio" aria-hidden="true" />
                  <span className="inspector-field-source__token-option-body">
                    <span className="inspector-field-source__option-title">{label}</span>
                    <span className="inspector-field-source__option-desc">
                      {tokenPath}
                      {preview ? ` · 当前预设值 ${preview}` : ""}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    ) : null;

  return (
    <span ref={rootRef} className="inspector-field-source" role="group" aria-label="字段来源">
      <button
        type="button"
        className={`inspector-field-source__pill inspector-field-source__pill--${pillClassSuffix}${
          state.detached ? " inspector-field-source__pill--detached" : ""
        }`}
        title={badgeTitle}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="inspector-field-source__dot" aria-hidden="true" />
        <span className="inspector-field-source__text">{badgeText}</span>
      </button>
      {popoverNode ? createPortal(popoverNode, document.body) : null}
      {contentCapsuleMode === "listItem" && repeatListItemCtx ? (
        <RepeatListItemFieldPickerModal
          visible={listItemModalOpen}
          collectionLabel={repeatListItemCtx.collectionLabel}
          slotId={repeatListItemCtx.repeat.slotId}
          payload={payload}
          itemFields={listItemFieldCandidates}
          currentFieldKey={repeatListItemCtx.itemFieldKey}
          onClose={() => setListItemModalOpen(false)}
          onConfirm={(fieldKey) => {
            onTemplateChangeRef.current(
              applyRepeatListItemFieldKey(templateRef.current, block.id, bindPath, fieldKey)
            );
            setListItemModalOpen(false);
          }}
        />
      ) : contentCapsuleMode && contentCapsuleMode !== "listItem" ? (
        <PayloadVariablePickerModal
          visible={bindModalOpen}
          title={bindModalTitle}
          previewLabel="当前字段值"
          previewText={bindModalPreview}
          slots={bindModalSlots}
          payload={payload}
          defaultSelectedSlotId={state.slotId ?? null}
          allowCreate
          onClose={() => setBindModalOpen(false)}
          onConfirmBind={(slot) => applyScalarVariableSlot(slot, "bind")}
          onConfirmCreate={handleBindModalCreate}
        />
      ) : null}
    </span>
  );
}
