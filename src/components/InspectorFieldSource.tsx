import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties } from "react";
import type { BindingSpec, EmailBlock, EmailPayload, EmailTemplate, FieldSource } from "../types/email";
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
import { FieldSourcePill } from "./fieldSource/FieldSourcePill";
import { FieldSourceMenuOption } from "./fieldSource/FieldSourceMenuOption";
import {
  type ContentCapsuleMode,
  FIELD_SOURCE_MODE_LABEL,
  fieldSourcePopoverMetaLine,
  resolveFieldSourcePillDisplay,
  themePresetOptionDescription,
  themePresetPickHint,
  themePresetSectionTitle,
} from "../lib/fieldSourceUiCopy";
import { collectPayloadVariableSlots, type ExternalVariableSlotInfo } from "../lib/payloadSlots";
import {
  bindingRequirementLabel,
  filterSlotsForVariablePicker,
  inferBindingValueTypeRequirement,
  inferVariablePickerPurpose,
  slotValueTypeMatchesBindingRequirement,
} from "../payload-contract/variable-slot-compatibility";
import type { TextBodyContentMode } from "../lib/textBodyContentMode";
import { readInspectorDisplayValue } from "../lib/inspectorBindingDisplay";
import { applyTextBodyWholeVariableFromSlot } from "../lib/textBodyVariableEdit";
import { readTemplateFieldOnly } from "../lib/themeBindingEdit";
import { toastWarning } from "../lib/appToast";
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
  /** 聚合态展示：覆盖胶囊文案（如正文「正文变量」） */
  pillLabelOverride?: string;
  /** 聚合态展示：覆盖胶囊样式类后缀（literal / variable / inline-variable） */
  pillClassSuffixOverride?: string;
  /** 正文聚合：「手动填写」烘焙全文（覆盖单 bindPath detach） */
  onAggregateLiteralize?: () => void;
  /** 正文三态聚合（literal / inlineVariable / wholeVariable） */
  aggregateTextBodyMode?: TextBodyContentMode;
  /** 绑定弹窗预览文案（正文聚合时传全文） */
  bindModalPreviewText?: string;
  /** 置灰只读：repeat 行内的可绑定内容字段由列表项映射决定，禁止在此手动改源/改值 */
  disabled?: boolean;
};

type SourceOption = {
  source: FieldSource;
  label: string;
  description?: string;
  enabled: boolean;
  active: boolean;
  action?: () => void;
};

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
 * 统一表达：手动填写、样式预设（仅样式字段）、业务变量（仅内容字段）、已解除跟随。
 * 文案与样式见 `fieldSourceUiCopy` 与 `fieldSource/*` 子组件；菜单通过 portal 挂到 body，并按视口上下翻转。
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
  disabled = false,
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
        toastWarning(
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
        toastWarning("slotId 必须以字母开头，且只能包含字母、数字和下划线。");
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
      ? "切换业务变量"
      : contentCapsuleMode === "inlineVariable"
        ? "整段绑定业务变量"
        : `绑定${FIELD_SOURCE_MODE_LABEL.variable}`;

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
      label: FIELD_SOURCE_MODE_LABEL.manual,
      description: isListItemField
        ? "列表行内字段须先解除列表绑定，才能改为手动填写。"
        : state.source === "literal" && !state.detached
          ? "直接在此输入固定值。"
          : state.source === "inlineVariable"
            ? canBake
              ? "将正文改为手动填写的固定文本。"
              : "预览数据未就绪，请稍后重试。"
            : canBake
              ? "解除跟随，改为在此输入固定值。"
              : "预览数据未就绪，请稍后重试。",
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
            toastWarning(REPEAT_LIST_ITEM_LITERAL_BLOCKED_MESSAGE);
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

    if (state.fieldKind === "style" && state.source === "theme" && state.detached) {
      items.push({
        source: "theme",
        label: `恢复${FIELD_SOURCE_MODE_LABEL.theme}`,
        description: "恢复为跟随全局样式预设。",
        active: false,
        enabled: true,
        action: () =>
          onTemplateChangeRef.current(restoreThemeFieldBranch(templateRef.current, block.id, bindPath)),
      });
    }

    if (contentCapsuleMode === "listItem" && repeatListItemCtx) {
      items.push({
        source: "variable",
        label: `切换${FIELD_SOURCE_MODE_LABEL.listItem}`,
        description: `在「${repeatListItemCtx.collectionLabel}」中选择其他列。`,
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
          ? "切换业务变量"
          : contentCapsuleMode === "inlineVariable"
            ? "整段绑定业务变量"
            : `绑定${FIELD_SOURCE_MODE_LABEL.variable}`;
      const bindDescription =
        contentCapsuleMode === "variable"
          ? "选择其他业务变量。"
          : contentCapsuleMode === "inlineVariable"
            ? "将整段正文改为跟随一个业务变量。"
            : "从变量库选择或新建业务变量。";
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
        label: `恢复${FIELD_SOURCE_MODE_LABEL.variable}`,
        description: "恢复为跟随业务变量取值。",
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
    const pw = pop.offsetWidth || 272;
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

  const pillDisplay = resolveFieldSourcePillDisplay({
    state,
    contentCapsuleMode,
    listItemFieldLabel: repeatListItemCtx?.itemFieldLabel,
    pillLabelOverride,
    pillClassSuffixOverride,
  });

  const themeFollowing = state.source === "theme" && !state.detached;
  const showThemePresetSection =
    state.fieldKind === "style" && themeTokenCandidates.length > 0;

  const popoverNode =
    open && typeof document !== "undefined" ? (
      <div
        ref={popoverRef}
        className="inspector-field-source__popover inspector-field-source__popover--portal"
        style={popoverStyle}
        role="menu"
        data-inspector-field-source-popover=""
      >
        <span className="inspector-field-source__meta">{fieldSourcePopoverMetaLine(state)}</span>
        <div className="inspector-field-source__section" role="group" aria-label="取值方式">
          <span className="inspector-field-source__section-title">取值方式</span>
          {options.map((option) => (
            <FieldSourceMenuOption
              key={option.source}
              label={option.label}
              description={option.description}
              active={option.active}
              disabled={!option.enabled || !option.action}
              onSelect={() => runOptionAction(option)}
            />
          ))}
        </div>
        {showThemePresetSection ? (
          <div
            className="inspector-field-source__section inspector-field-source__theme-section"
            role="group"
            aria-label={themePresetSectionTitle()}
          >
            <span className="inspector-field-source__section-title">{themePresetSectionTitle()}</span>
            {themeFollowing && !activeThemeTokenPath ? (
              <span className="inspector-field-source__theme-section-hint">{themePresetPickHint()}</span>
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
                <FieldSourceMenuOption
                  key={tokenPath}
                  label={label}
                  description={themePresetOptionDescription(preview)}
                  active={selected}
                  disabled={false}
                  onSelect={() => applyThemeToken(tokenPath)}
                />
              );
            })}
          </div>
        ) : null}
      </div>
    ) : null;

  return (
    <span
      ref={rootRef}
      className="inspector-field-source"
      role="group"
      aria-label="字段取值方式"
      aria-disabled={disabled || undefined}
      style={disabled ? { opacity: 0.5, pointerEvents: "none" } : undefined}
    >
      <FieldSourcePill
        display={pillDisplay}
        open={disabled ? false : open}
        onToggle={disabled ? () => {} : () => setOpen((prev) => !prev)}
      />
      {!disabled && popoverNode ? createPortal(popoverNode, document.body) : null}
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
