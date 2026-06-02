import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { message } from "@shoplazza/sds";
import type {
  BorderRadiusValue,
  BorderValue,
  EmailBlock,
  EmailPayload,
  EmailTemplate,
  RepeatFieldMapping,
  SpacingValue,
} from "../types/email";
import { applyBlockField, bindingMeta } from "../lib/applyEdit";
import { readInspectorDisplayValue } from "../lib/inspectorBindingDisplay";
import { applyBlockMetaName, blockDisplayName } from "../lib/blockMeta";
import { Field } from "./ui/Field";
import { ColorField } from "./ui/ColorField";
import { ContentAlignAxisControl } from "./ui/ContentAlignAxisControl";
import { resolveContentAlignInspectorPresentation } from "../lib/contentAlignConfigurability";
import { ImageObjectPositionGrid } from "./ui/ImageObjectPositionGrid";
import {
  ShopCountInput,
  ShopInput,
  ShopPrimaryButton,
  ShopSecondaryButton,
  ShopSelect,
  ShopUnitInput,
} from "./ui/ShopFormControls";
import { blockBackgroundImageRenderable, layoutHasBackgroundImage } from "../lib/wrapperBackgroundImage";
import {
  getFillOptionTitle,
  getWrapperModeHint,
  isChildFillBlockedByParentHug,
} from "../lib/wrapperFillConstraint";
import { reconcileLayoutStructuralSubtreeInPlace } from "../lib/wrapperLayoutReconcile";
import { RepeatRegionBindModal } from "./RepeatRegionBindModal";
import { RepeatUnbindChoiceModal } from "./RepeatUnbindChoiceModal";
import { ListBindInspectorEmpty } from "./ListBindInspectorEmpty";
import { RepeatRegionInspectorSummary } from "./RepeatRegionInspectorSummary";
import { InspectorPanelSection } from "./ui/InspectorPanelSection";
import {
  BuiltinCollectionRulesFields,
  readBuiltinSortPolicyFromPayloadSlot,
} from "./BuiltinCollectionRulesFields";
import { patchPayloadBuiltinCollectionSortPolicy } from "../lib/collectionBuiltinRulesPayload";
import { patchPayloadCollectionSlot } from "../lib/collectionDataSource";
import {
  applyPayloadCollectionFixedLength,
  collectionFixedLengthEditability,
  readPayloadCollectionFixedLength,
} from "../lib/collectionFixedLength";
import type { NormalizedBuiltinSortPolicy } from "../payload-contract/collection-builtin-sort-policy";
import { TextRichEditor } from "./TextRichEditor";
import {
  normalizeTextBody,
  renderTextBodyToHtml,
  type TextBodyDefaults,
} from "../lib/textBodyFormat";
import {
  collectTextBodyVariableRuns,
  type TextBodyVariableRunMeta,
} from "../lib/textBodyEditorFormat";
import { getTextBodyContentMode, getTextBodyFieldSourceBindPath } from "../lib/textBodyContentMode";
import { resolveRepeatListItemFieldBinding } from "../lib/repeatListItemField";
import {
  applyInlineVariableFromTextBodySelection,
  applyRunVariableSlotBinding,
  bakeTextBodyToLiteralByMode,
  clearRunLink,
  detachRunVariableToLiteral,
  setRunLinkBinding,
} from "../lib/textBodyVariableEdit";
import { TextBodyFieldSource } from "./TextBodyFieldSource";
import { TextBodyVariablePillModal } from "./TextBodyVariablePillModal";
import type { TextBody } from "../types/email";
import type { ExpandedTheme } from "../types/theme";
import type { TokenPresets } from "../types/tokenPreset";
import type { ReactNode } from "react";
import { AdminInspectorTabs, type InspectorMainTab } from "./AdminInspectorTabs";
import {
  buildInspectorTabAvailability,
  resolveInspectorTabForContext,
} from "../lib/inspectorTabPreference";
import { InspectorBlockNameField } from "./InspectorBlockNameField";
import { IconSrcEditor } from "./IconSrcEditor";
import { InspectorFieldSource } from "./InspectorFieldSource";
import { getInspectFieldBindMode, isInspectFollowLocked } from "../lib/inspectFieldBindMode";
import { filterSlotsForVisibilityPicker } from "../payload-contract/variable-slot-compatibility";
import type { RepeatPreviewModel, VirtualBlockRef } from "../repeat-binding-contract";
import {
  countRepeatExpansionGroupMembers,
  findPreviewNodeByRef,
  previewModelToFlatTemplate,
  resolvePhysicalBlockId,
  resolveRepeatContextForRef,
} from "../repeat-runtime";
import {
  buildRepeatPrototypeIdSet,
  collectionItemCount,
  isRepeatHostBlock,
} from "../lib/repeatRegion";
import { remapRepeatFieldMappingTargets } from "../lib/repeatMaterializedNormalize";
import {
  applySingleLevelRepeatBinding,
  listNestedCollectionFields,
  removeUnifiedRepeatBinding,
} from "../lib/repeatNestedBinding";
import { resolveRepeatUnbindSelectionBlockId } from "../lib/repeatRegion";
import type { TemplateChangeOptions } from "../lib/templateBlockSelection";
import type { RepeatUnbindMode } from "../lib/repeatUnbindMode";
import { mergeRepeatBindSlotCandidates } from "../lib/repeatBindSlotCandidates";
import {
  enrichNestedRepeatPreviewRowsForInspector,
  findEnclosingParentRepeatBinding,
  listRepeatFieldMappingScalarFields,
  resolveNestedRepeatPreviewItems,
  resolveRepeatFieldMappingSourceMeta,
} from "../lib/repeatNestedFieldMapping";
import { readTemplateFieldOnly } from "../lib/themeBindingEdit";
import { IMAGE_BACKGROUND_FALLBACK_COLOR } from "../render-defaults-contract/values";
import { EMAIL_ROOT_FIXED_WIDTH, emailRootWidthMismatchReason } from "../render-defaults-contract/values";
import { getAtPath } from "../lib/paths";
import { collectPayloadVariableSlots } from "../lib/payloadSlots";
import { layoutVariantTemplatePathHint } from "../lib/layoutVariantPathHint";
import {
  listRepeatMappableContentBindPaths,
  repeatMappingTargetLabel,
} from "../lib/repeatMappableContentBindPaths";
import { isThemeRef, parseThemeRefPath, type ThemeRef } from "../types/themeRef";
import { previewThemeTokenValue } from "../lib/themeTokenCandidates";
import type { SlotValueType } from "../payload-contract/types";
import { findCollectionFieldByPath } from "../payload-contract/collection-item-fields";
import {
  getVisibilityOperatorSpec,
  getVisibilityOperatorsForValueType,
  type VisibilityRule,
} from "../visibility-contract";

type Props = {
  template: EmailTemplate;
  payload: EmailPayload;
  selectedBlockRef: VirtualBlockRef | null;
  previewModel: RepeatPreviewModel | null;
  onUpdate: (next: { template: EmailTemplate; payload: EmailPayload }) => void;
  onTemplateChange: (nextTemplate: EmailTemplate, options?: TemplateChangeOptions) => void;
  /** 当前场景目录名，用于复制调试定位文案 */
  emailKey?: string | null;
  /** 当前版式变体 id（有 layout-manifest 时） */
  layoutVariantId?: string | null;
  /**
   * 当前生效的设计令牌（与画布解析同源）。
   */
  effectiveDesignTokens?: ExpandedTheme | null;
  tokenPresets?: TokenPresets | null;
  /** 含变量草稿的预览 payload */
  previewPayload?: EmailPayload | null;
  onDiscardPayloadSlotDraft?: (slotId: string) => void;
};

type TextBlock = Extract<EmailBlock, { type: "text" }>;
type BorderStyleOption = "solid" | "dashed" | "dotted";
type BorderModeOption = BorderValue["mode"];
type BorderRadiusModeOption = BorderRadiusValue["mode"];
type SpacingModeOption = SpacingValue["mode"];
type RepeatCollectionCandidate = {
  key: string;
  slotId: string;
  itemPath?: string;
  label: string;
  itemFields: NonNullable<EmailBlock["repeat"]>["itemFields"];
  minItems?: number;
  maxItems?: number;
  description?: string;
};
type RepeatTargetFieldOption = {
  key: string;
  blockId: string;
  bindPath: string;
  label: string;
};
type VisibilitySlotCandidate = {
  slotId: string;
  valueType: SlotValueType;
  label: string;
  description?: string;
  minItems?: number;
  maxItems?: number;
};
const BORDER_DEFAULT_HINT = "默认值：宽度 0、样式实线、颜色透明。";
const RADIUS_DEFAULT_HINT = "默认值：0。";
const SPACING_DEFAULT_HINT = "默认值：0。";
const GRID_FIXED_CELL_WIDTH_DEFAULT = "160px";
const GRID_FIXED_CELL_HEIGHT_DEFAULT = "220px";
const TRANSPARENT_BORDER_COLOR = "rgba(0,0,0,0)";
const BORDER_STYLE_OPTIONS: Array<{ value: BorderStyleOption; label: string }> = [
  { value: "solid", label: "实线" },
  { value: "dashed", label: "虚线" },
  { value: "dotted", label: "点线" },
];
const BORDER_SIDE_LABELS = {
  top: "上侧",
  right: "右侧",
  bottom: "下侧",
  left: "左侧",
} as const;
const RADIUS_CORNER_LABELS = {
  topLeft: "左上",
  topRight: "右上",
  bottomRight: "右下",
  bottomLeft: "左下",
} as const;
const SPACING_SIDE_LABELS = {
  top: "上",
  right: "右",
  bottom: "下",
  left: "左",
} as const;

/** 从 blockId 向上走到 hostId（不含 hostId）：路径上任一区块自带 repeat → true（字段属更深层）。 */
function hasIntermediateRepeatBetween(
  template: EmailTemplate,
  blockId: string,
  hostId: string
): boolean {
  let cur: string | null = blockId;
  while (cur && cur !== hostId) {
    if (template.blocks[cur]?.repeat?.mode === "collection") return true;
    cur = template.blocks[cur]?.parentId ?? null;
  }
  return false;
}

/** hostId 子树内（不含自身）是否存在带 repeat 的子容器。 */
function hasNestedRepeatUnder(template: EmailTemplate, hostId: string): boolean {
  const visit = (blockId: string): boolean => {
    for (const childId of template.blocks[blockId]?.children ?? []) {
      const child = template.blocks[childId];
      if (!child) continue;
      if (child.repeat?.mode === "collection") return true;
      if (visit(childId)) return true;
    }
    return false;
  };
  return visit(hostId);
}

function buildRepeatCollectionCandidates(
  template: EmailTemplate,
  payload: EmailPayload
): RepeatCollectionCandidate[] {
  return collectPayloadVariableSlots(template, payload)
    .filter((slot) => slot.valueType === "collection")
    .map((slot) => ({
      key: slot.slotId,
      slotId: slot.slotId,
      label: slot.label ?? slot.slotId,
      itemFields: slot.itemFields ?? [],
      minItems: slot.minItems,
      maxItems: slot.maxItems,
      description: slot.description,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function buildVisibilitySlotCandidates(
  template: EmailTemplate,
  payload: EmailPayload
): VisibilitySlotCandidate[] {
  const fromCatalog = filterSlotsForVisibilityPicker(
    collectPayloadVariableSlots(template, payload)
  );
  return fromCatalog.map((slot) => ({
    slotId: slot.slotId,
    valueType: slot.valueType as SlotValueType,
    label: slot.label ?? slot.slotId,
    description: slot.description,
    minItems: slot.minItems,
    maxItems: slot.maxItems,
  }));
}

function collectSubtreeBlockIds(template: EmailTemplate, rootIds: string[]): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  const visit = (blockId: string) => {
    if (seen.has(blockId)) return;
    const block = template.blocks[blockId];
    if (!block) return;
    seen.add(blockId);
    ids.push(blockId);
    block.children.forEach(visit);
  };
  rootIds.forEach(visit);
  return ids;
}

function targetFieldLabel(template: EmailTemplate, blockId: string, bindPath: string): string {
  return repeatMappingTargetLabel(template, blockId, bindPath);
}

function candidateContentBindPaths(block: EmailBlock): string[] {
  return listRepeatMappableContentBindPaths(block);
}

function buildRepeatTargetFieldOptions(
  template: EmailTemplate,
  prototypeChildIds: string[]
): RepeatTargetFieldOption[] {
  return collectSubtreeBlockIds(template, prototypeChildIds).flatMap((blockId) => {
    const block = template.blocks[blockId];
    if (!block) return [];
    return candidateContentBindPaths(block).map((bindPath) => ({
      key: `${blockId}:${bindPath}`,
      blockId,
      bindPath,
      label: targetFieldLabel(template, blockId, bindPath),
    }));
  });
}

function buildRepeatFieldMappings(
  itemFields: RepeatCollectionCandidate["itemFields"],
  targetOptions: RepeatTargetFieldOption[],
  draft: Record<string, string>
): RepeatFieldMapping[] {
  return targetOptions.flatMap((target) => {
    const sourcePath = draft[target.key]?.trim();
    if (!sourcePath) return [];
    const sourceField = findCollectionFieldByPath(itemFields, sourcePath);
    if (!sourceField || sourceField.valueType === "collection") return [];
    return {
      id: `${target.blockId}.${target.bindPath}:${sourceField.key}`,
      sourcePath,
      targetBlockId: target.blockId,
      targetBindPath: target.bindPath,
      label: sourceField.label || sourceField.key,
      valueType: sourceField.valueType,
    };
  });
}

/** 列表重复绑定向导：仅从 repeat 上已保存的 fieldMappings 回填草稿，不做自动猜测。 */
function repeatMappingDraftFromSaved(
  template: EmailTemplate,
  itemFields: RepeatCollectionCandidate["itemFields"],
  targetOptions: RepeatTargetFieldOption[],
  currentMappings?: RepeatFieldMapping[]
): Record<string, string> {
  const draft: Record<string, string> = {};
  const prototypeSet = buildRepeatPrototypeIdSet(template);
  const normalizedMappings = remapRepeatFieldMappingTargets(
    currentMappings,
    template,
    prototypeSet
  );
  const currentByTarget = new Map(
    normalizedMappings.map((mapping) => [
      `${mapping.targetBlockId}:${mapping.targetBindPath}`,
      mapping.sourcePath,
    ])
  );

  for (const target of targetOptions) {
    const current = currentByTarget.get(target.key);
    if (current && findCollectionFieldByPath(itemFields, current)) {
      draft[target.key] = current;
    }
  }
  return draft;
}

function normalizeBorderStyle(value: unknown): BorderStyleOption {
  if (value === "dashed" || value === "dotted" || value === "solid") return value;
  return "solid";
}

function recordOrNull(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function readBorderSideWidth(value: unknown, fallback = "0"): string {
  const record = recordOrNull(value);
  return readString(record?.width, fallback);
}

function normalizeBorderValue(raw: unknown): BorderValue {
  const record = recordOrNull(raw);
  const style = normalizeBorderStyle(record?.style);
  const color = readString(record?.color, TRANSPARENT_BORDER_COLOR);
  if (record?.mode === "custom") {
    return {
      mode: "custom",
      style,
      color,
      top: { width: readBorderSideWidth(record.top) },
      right: { width: readBorderSideWidth(record.right) },
      bottom: { width: readBorderSideWidth(record.bottom) },
      left: { width: readBorderSideWidth(record.left) },
    };
  }
  return {
    mode: "unified",
    width: readString(record?.width, "0"),
    style,
    color,
  };
}

function borderWidthForUnified(border: BorderValue): string {
  if (border.mode === "unified") return border.width;
  const widths = [border.top.width, border.right.width, border.bottom.width, border.left.width];
  return widths.find((width) => width.trim() && width.trim() !== "0" && width.trim() !== "0px") ?? widths[0] ?? "0";
}

function borderValueForMode(raw: unknown, mode: BorderModeOption): BorderValue {
  const current = normalizeBorderValue(raw);
  if (mode === "custom") {
    const width = borderWidthForUnified(current);
    return {
      mode,
      style: current.style,
      color: current.color,
      top: { width: current.mode === "custom" ? current.top.width : width },
      right: { width: current.mode === "custom" ? current.right.width : width },
      bottom: { width: current.mode === "custom" ? current.bottom.width : width },
      left: { width: current.mode === "custom" ? current.left.width : width },
    };
  }
  return {
    mode,
    width: borderWidthForUnified(current),
    style: current.style,
    color: current.color,
  };
}

function normalizeBorderRadiusValue(raw: unknown): BorderRadiusValue {
  const record = recordOrNull(raw);
  if (record?.mode === "corners") {
    return {
      mode: "corners",
      topLeft: readString(record.topLeft, "0"),
      topRight: readString(record.topRight, "0"),
      bottomRight: readString(record.bottomRight, "0"),
      bottomLeft: readString(record.bottomLeft, "0"),
    };
  }
  return {
    mode: "unified",
    radius: readString(record?.radius, "0"),
  };
}

function radiusForUnified(radius: BorderRadiusValue): string {
  if (radius.mode === "unified") return radius.radius;
  const radii = [radius.topLeft, radius.topRight, radius.bottomRight, radius.bottomLeft];
  return radii.find((value) => value.trim() && value.trim() !== "0" && value.trim() !== "0px") ?? radii[0] ?? "0";
}

function borderRadiusValueForMode(raw: unknown, mode: BorderRadiusModeOption): BorderRadiusValue {
  const current = normalizeBorderRadiusValue(raw);
  if (mode === "corners") {
    const radius = radiusForUnified(current);
    return {
      mode,
      topLeft: current.mode === "corners" ? current.topLeft : radius,
      topRight: current.mode === "corners" ? current.topRight : radius,
      bottomRight: current.mode === "corners" ? current.bottomRight : radius,
      bottomLeft: current.mode === "corners" ? current.bottomLeft : radius,
    };
  }
  return {
    mode,
    radius: radiusForUnified(current),
  };
}

function normalizeSpacingValue(raw: unknown): SpacingValue {
  const record = recordOrNull(raw);
  if (record?.mode === "separate") {
    return {
      mode: "separate",
      top: readString(record.top, "0"),
      right: readString(record.right, "0"),
      bottom: readString(record.bottom, "0"),
      left: readString(record.left, "0"),
    };
  }
  return {
    mode: "unified",
    unified: readString(record?.unified, "0"),
  };
}

function spacingSideToInputValue(value: string | ThemeRef | undefined): string {
  if (value === undefined) return "0";
  if (typeof value === "string") return value;
  return value.$themeRef;
}

function spacingForUnified(spacing: SpacingValue): string {
  if (spacing.mode === "unified") return spacingSideToInputValue(spacing.unified);
  const values = [spacing.top, spacing.right, spacing.bottom, spacing.left].filter(
    (value): value is string => typeof value === "string"
  );
  return values.find((value) => value.trim() && value.trim() !== "0" && value.trim() !== "0px") ?? values[0] ?? "0";
}

function spacingValueForMode(raw: unknown, mode: SpacingModeOption): SpacingValue {
  const current = normalizeSpacingValue(raw);
  if (mode === "separate") {
    const unified = spacingForUnified(current);
    return {
      mode,
      top: current.mode === "separate" ? current.top : unified,
      right: current.mode === "separate" ? current.right : unified,
      bottom: current.mode === "separate" ? current.bottom : unified,
      left: current.mode === "separate" ? current.left : unified,
    };
  }
  return {
    mode,
    unified: spacingForUnified(current),
  };
}

function InspectorEmptyTabHint() {
  return <p className="inspector__muted">当前分类下暂无可编辑项。</p>;
}

export function Inspector({
  template,
  payload,
  selectedBlockRef,
  previewModel,
  onUpdate,
  onTemplateChange,
  emailKey = null,
  layoutVariantId = null,
  effectiveDesignTokens = null,
  tokenPresets = null,
  previewPayload = null,
  onDiscardPayloadSlotDraft,
}: Props) {
  const effectivePayload = previewPayload ?? payload;
  const selectedBlockId = selectedBlockRef ? resolvePhysicalBlockId(selectedBlockRef) : null;
  const root = template.blocks[template.rootBlockId];
  const canvasMode = selectedBlockRef === null;
  /** 切换区块时尽量保持上次选中的 Tab；当前区块无该 Tab 时回退「样式」 */
  const [inspectorTab, setInspectorTab] = useState<InspectorMainTab>("style");
  const preferredInspectorTabRef = useRef<InspectorMainTab>("style");
  const inspectorBlockKeyRef = useRef<string | null>(null);
  const [repeatModalOpen, setRepeatModalOpen] = useState(false);
  const [repeatModalViewOnly, setRepeatModalViewOnly] = useState(false);
  const [repeatUnbindModalOpen, setRepeatUnbindModalOpen] = useState(false);
  const [repeatSlotId, setRepeatSlotId] = useState("");
  const [repeatMappingDraft, setRepeatMappingDraft] = useState<Record<string, string>>({});
  const [textVarPillModalMeta, setTextVarPillModalMeta] = useState<TextBodyVariableRunMeta | null>(null);
  const inspectorTabContext = useMemo(() => {
    const rootBlock = template.blocks[template.rootBlockId];
    if (!rootBlock) {
      return buildInspectorTabAvailability(true, "emailRoot", false);
    }
    const activeBlock = canvasMode
      ? rootBlock
      : selectedBlockId
        ? template.blocks[selectedBlockId]
        : undefined;
    if (!activeBlock) {
      return buildInspectorTabAvailability(canvasMode, "layout", false);
    }
    const resolvedRepeat = canvasMode
      ? null
      : selectedBlockRef
        ? resolveRepeatContextForRef(template, selectedBlockRef)
        : null;
    const showRepeatRegionPanel =
      Boolean(resolvedRepeat) || (!canvasMode && activeBlock.type !== "emailRoot");
    return buildInspectorTabAvailability(canvasMode, activeBlock.type, showRepeatRegionPanel);
  }, [canvasMode, selectedBlockRef, template]);

  const inspectorBlockKey = canvasMode ? "__canvas__" : (selectedBlockId ?? "__none__");

  const setInspectorTabPersist = useCallback((tab: InspectorMainTab) => {
    preferredInspectorTabRef.current = tab;
    setInspectorTab(tab);
  }, []);

  useEffect(() => {
    const blockChanged = inspectorBlockKeyRef.current !== inspectorBlockKey;
    inspectorBlockKeyRef.current = inspectorBlockKey;

    if (blockChanged) {
      setInspectorTab(
        resolveInspectorTabForContext(preferredInspectorTabRef.current, inspectorTabContext)
      );
      return;
    }

    setInspectorTab((current) =>
      inspectorTabContext[current]
        ? current
        : resolveInspectorTabForContext(preferredInspectorTabRef.current, inspectorTabContext)
    );
  }, [inspectorBlockKey, inspectorTabContext]);

  useEffect(() => {
    setTextVarPillModalMeta(null);
  }, [selectedBlockId]);

  /** 与画布一致的 merge 预览（用于 Inspector 展示字面量） */
  const previewFlatTemplate = useMemo(() => {
    if (!previewModel) return null;
    return previewModelToFlatTemplate(previewModel, template);
  }, [previewModel, template]);
  const visibilitySlotCandidates = useMemo(
    () => buildVisibilitySlotCandidates(template, payload),
    [payload, template]
  );
  const externalVariableSlots = useMemo(
    () => collectPayloadVariableSlots(template, payload),
    [template, payload]
  );

  if (!root) return <div className="inspector">缺少根节点</div>;

  const block = canvasMode ? root : selectedBlockId ? template.blocks[selectedBlockId] : undefined;
  if (!block) return <div className="inspector">未找到该区块</div>;

  const parentBlock = block.parentId ? template.blocks[block.parentId] : undefined;
  const id = block.id;
  const blockDisplayLabel = blockDisplayName(template, id);
  const templatePathHint =
    emailKey && layoutVariantId
      ? layoutVariantTemplatePathHint(emailKey, layoutVariantId)
      : null;
  const panelLabel = canvasMode ? "画布设置（邮件根节点）" : "区块设置";
  const repeatExpansionGroupCount = useMemo(() => {
    if (!previewModel || !selectedBlockRef || selectedBlockRef.kind !== "repeat-item") return 0;
    return countRepeatExpansionGroupMembers(previewModel, selectedBlockRef);
  }, [previewModel, selectedBlockRef]);
  const buildCopyLocatorText = () => {
    if (!templatePathHint) return "";
    const lines = [
      `模板文件: ${templatePathHint}`,
      `面板: ${panelLabel}`,
      `区块 ID: ${id}`,
      `JSON 路径: blocks["${id}"]`,
      `区块类型: ${block.type}`,
      `区块名称: ${blockDisplayLabel}`,
    ];
    return lines.join("\n");
  };
  const onCopyLocator = async () => {
    const text = buildCopyLocatorText();
    if (!text) {
      message.error("当前缺少模板定位信息，无法复制");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      message.success("已复制定位信息");
    } catch {
      message.error("复制失败，请手动复制");
    }
  };

  const resolvedRepeatContext =
    canvasMode || !selectedBlockRef
      ? null
      : resolveRepeatContextForRef(template, selectedBlockRef);
  const repeatCollectionCandidates = buildRepeatCollectionCandidates(template, payload);
  const currentRepeat = resolvedRepeatContext?.repeat ?? null;
  // 绑定目标 = 当前选中的可作宿主容器自身（self-repeat：绑哪个容器复制哪个）。
  const repeatBindHostId = !canvasMode && isRepeatHostBlock(block) ? id : "";
  const ownRepeat = !canvasMode ? block.repeat ?? null : null;
  const repeatBindPrototypeChildIds = repeatBindHostId ? [repeatBindHostId] : [];
  // 外层 repeat：供「父项子列表」候选；行模板内子块查看绑定时跳过当前列表宿主本身。
  const enclosingParentRepeat = canvasMode
    ? null
    : findEnclosingParentRepeatBinding(template, id, {
        skipRepeatHostId:
          !repeatBindHostId && resolvedRepeatContext?.relation !== "host"
            ? resolvedRepeatContext?.hostId
            : null,
      });
  // 子列表来源：当前容器在某父级 repeat 行内时，列出父项的子列表字段（itemPath）。
  const parentSlotLabel =
    enclosingParentRepeat?.label?.trim() || enclosingParentRepeat?.slotId || "";
  const subListBindCandidates: RepeatCollectionCandidate[] = enclosingParentRepeat
    ? listNestedCollectionFields(enclosingParentRepeat.itemFields).map((f) => ({
        key: `${enclosingParentRepeat.slotId}::${f.path}`,
        slotId: enclosingParentRepeat.slotId,
        itemPath: f.path,
        itemFields: f.itemFields ?? [],
        label: f.label ?? f.path,
        minItems: f.minItems,
        maxItems: f.maxItems,
        parentSlotLabel,
        description: `「${parentSlotLabel}」父项的子列表`,
      }))
    : [];
  const repeatBindCandidates = mergeRepeatBindSlotCandidates(
    enclosingParentRepeat,
    subListBindCandidates,
    repeatCollectionCandidates
  );
  const repeatCandidate = repeatBindCandidates.find((candidate) => candidate.key === repeatSlotId);
  // 字段映射目标：行模板子树内、且不落在更深层 repeat 子树内的内容字段（决策 H）。
  const repeatTargetFieldOptions = repeatBindHostId
    ? buildRepeatTargetFieldOptions(template, repeatBindPrototypeChildIds).filter(
        (opt) => !hasIntermediateRepeatBetween(template, opt.blockId, repeatBindHostId)
      )
    : [];
  const repeatBindRowTemplateLabel = repeatBindHostId
    ? blockDisplayName(template, repeatBindHostId)
    : undefined;
  /** 弹窗上下文宿主：编辑时为当前选中宿主；查看绑定时为 enclosing 列表宿主 */
  const repeatModalHostId =
    repeatModalViewOnly && resolvedRepeatContext
      ? resolvedRepeatContext.hostId
      : repeatBindHostId;
  const repeatModalPrototypeChildIds = repeatModalHostId
    ? (() => {
        const proto = template.blocks[repeatModalHostId]?.repeat?.prototypeChildIds;
        return proto?.length ? [...proto] : [repeatModalHostId];
      })()
    : repeatBindPrototypeChildIds;
  const repeatModalTargetFieldOptions = repeatModalHostId
    ? buildRepeatTargetFieldOptions(template, repeatModalPrototypeChildIds).filter(
        (opt) => !hasIntermediateRepeatBetween(template, opt.blockId, repeatModalHostId)
      )
    : repeatTargetFieldOptions;
  const repeatModalRowTemplateLabel = repeatModalHostId
    ? blockDisplayName(template, repeatModalHostId)
    : repeatBindRowTemplateLabel;
  const repeatForInspectorStats = ownRepeat ?? currentRepeat;
  const repeatPreviewContexts =
    selectedBlockRef?.kind === "repeat-item" ? selectedBlockRef.contextStack : [];
  const repeatItemCount = repeatForInspectorStats
    ? repeatForInspectorStats.itemPath?.trim()
      ? resolveNestedRepeatPreviewItems(
          repeatForInspectorStats,
          payload,
          repeatPreviewContexts
        ).length
      : collectionItemCount(payload, repeatForInspectorStats, repeatPreviewContexts)
    : 0;
  const ownRepeatPreviewValues = ownRepeat?.itemPath?.trim()
    ? enrichNestedRepeatPreviewRowsForInspector(
        ownRepeat,
        payload,
        repeatPreviewContexts,
        enclosingParentRepeat
      )
    : undefined;
  const ownRepeatFixedLengthEdit = useMemo(() => {
    if (!ownRepeat) return null;
    const editability = collectionFixedLengthEditability(payload, ownRepeat.slotId, {
      nestedRepeatItemPath: Boolean(ownRepeat.itemPath?.trim()),
    });
    return {
      fixedLength: readPayloadCollectionFixedLength(payload, ownRepeat.slotId),
      editability,
    };
  }, [ownRepeat, payload]);
  /** 不可绑定时仅置灰按钮并用 title 说明，不再额外占一行提示文案 */
  const repeatBindDisabledReason = (() => {
    if (canvasMode) return "请先在画布中选中要作为行模板的区块。";
    if (!repeatBindHostId) {
      return "请选中布局容器、栅格或图片区块后再绑定；选中的容器即为列表行模板。";
    }
    if (repeatBindCandidates.length === 0) {
      return "当前没有可用列表变量，请先准备列表数据。";
    }
    return null;
  })();
  const repeatBindDisabled = Boolean(repeatBindDisabledReason);
  const showRepeatRegionPanel =
    Boolean(resolvedRepeatContext) || (!canvasMode && block.type !== "emailRoot");

  const resetRepeatBindDrafts = (candidate: RepeatCollectionCandidate | undefined) => {
    if (!candidate || !repeatBindHostId) {
      setRepeatMappingDraft({});
      return;
    }
    setRepeatMappingDraft(
      repeatMappingDraftFromSaved(
        template,
        listRepeatFieldMappingScalarFields(
          {
            mode: "collection",
            slotId: candidate.slotId,
            prototypeChildIds: [],
            itemFields: candidate.itemFields,
            itemPath: candidate.itemPath,
            fieldMappings: [],
          },
          enclosingParentRepeat
        ),
        repeatTargetFieldOptions,
        ownRepeat?.fieldMappings
      )
    );
  };

  const openRepeatModal = (viewOnly = false) => {
    setRepeatModalViewOnly(viewOnly);

    if (viewOnly && resolvedRepeatContext) {
      const hostRepeat = resolvedRepeatContext.repeat;
      const preferredSlot = hostRepeat.itemPath?.trim()
        ? `${hostRepeat.slotId}::${hostRepeat.itemPath.trim()}`
        : hostRepeat.slotId;
      const initialSlotId = repeatBindCandidates.some((c) => c.key === preferredSlot)
        ? preferredSlot
        : hostRepeat.slotId;
      setRepeatSlotId(initialSlotId);
      const hostId = resolvedRepeatContext.hostId;
      const protoIds = hostRepeat.prototypeChildIds?.length
        ? [...hostRepeat.prototypeChildIds]
        : [hostId];
      const targetOpts = buildRepeatTargetFieldOptions(template, protoIds).filter(
        (opt) => !hasIntermediateRepeatBetween(template, opt.blockId, hostId)
      );
      setRepeatMappingDraft(
        repeatMappingDraftFromSaved(
          template,
          listRepeatFieldMappingScalarFields(hostRepeat, enclosingParentRepeat),
          targetOpts,
          hostRepeat.fieldMappings
        )
      );
      setRepeatModalOpen(true);
      return;
    }

    // 已绑定时回显当前来源（顶层变量或父项子列表）；否则只在唯一候选时预选，多候选留空。
    const preferredSlot = ownRepeat
      ? ownRepeat.itemPath?.trim()
        ? `${ownRepeat.slotId}::${ownRepeat.itemPath.trim()}`
        : ownRepeat.slotId
      : "";
    const initialSlotId =
      (preferredSlot && repeatBindCandidates.some((c) => c.key === preferredSlot)
        ? preferredSlot
        : "") || (repeatBindCandidates.length === 1 ? repeatBindCandidates[0]!.key : "");
    setRepeatSlotId(initialSlotId);
    resetRepeatBindDrafts(repeatBindCandidates.find((c) => c.key === initialSlotId));
    setRepeatModalOpen(true);
  };

  const applyRepeatFromModal = () => {
    const candidate = repeatCandidate;
    if (!candidate) {
      message.error("请选择一个列表变量。");
      return;
    }
    if (!repeatBindHostId) {
      message.error("无法确定列表行模板，请先在画布中选中要循环的容器。");
      return;
    }
    try {
      onTemplateChange(
        applySingleLevelRepeatBinding(
          template,
          {
            hostId: repeatBindHostId,
            slotId: candidate.slotId,
            itemPath: candidate.itemPath,
            itemFields: candidate.itemFields,
            fieldMappings: buildRepeatFieldMappings(
              listRepeatFieldMappingScalarFields(
                {
                  mode: "collection",
                  slotId: candidate.slotId,
                  prototypeChildIds: [],
                  itemFields: candidate.itemFields,
                  itemPath: candidate.itemPath,
                  fieldMappings: [],
                },
                enclosingParentRepeat
              ),
              repeatTargetFieldOptions,
              repeatMappingDraft
            ),
            minItems: candidate.minItems,
            maxItems: candidate.maxItems,
            label: candidate.label,
            description: candidate.description,
          },
          payload
        )
      );
      setRepeatModalOpen(false);
      message.success("列表绑定已应用");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "列表绑定失败，请检查重复宿主。");
    }
  };

  const removeRepeat = () => {
    if (!repeatBindHostId) return;
    if (!template.blocks[repeatBindHostId]?.repeat) return;
    setRepeatUnbindModalOpen(true);
  };

  const confirmRepeatUnbind = (mode: RepeatUnbindMode) => {
    if (!repeatBindHostId) return;
    if (!template.blocks[repeatBindHostId]?.repeat) return;
    const next = removeUnifiedRepeatBinding(template, repeatBindHostId, payload, { mode });
    const nextId = resolveRepeatUnbindSelectionBlockId(template, next, repeatBindHostId);
    onTemplateChange(next, {
      selectBlockRef: nextId ? { kind: "physical", blockId: nextId } : null,
    });
    setRepeatUnbindModalOpen(false);
    setRepeatModalOpen(false);
    message.success("列表绑定已解除");
  };

  const handleRepeatSlotChange = (slotId: string) => {
    if (slotId === repeatSlotId) return;
    setRepeatSlotId(slotId);
    resetRepeatBindDrafts(repeatBindCandidates.find((c) => c.key === slotId));
  };

  const updateBlockVisibility = (nextVisibility: VisibilityRule | undefined) => {
    if (block.type === "emailRoot") return;
    const nextTemplate = structuredClone(template);
    const nextBlock = nextTemplate.blocks[id];
    if (!nextBlock) return;
    if (nextVisibility) {
      nextBlock.visibility = nextVisibility;
    } else {
      delete nextBlock.visibility;
    }
    onTemplateChange(nextTemplate);
  };

  const visibilityRule = block.type === "emailRoot" ? undefined : block.visibility;
  const visibilityCandidate = visibilityRule
    ? visibilitySlotCandidates.find((candidate) => candidate.slotId === visibilityRule.slotId)
    : undefined;
  const visibilityValueType = visibilityCandidate?.valueType ?? visibilityRule?.valueType;
  const visibilityOperators = visibilityValueType
    ? getVisibilityOperatorsForValueType(visibilityValueType)
    : [];
  const visibilityOperatorSpec =
    visibilityValueType && visibilityRule
      ? getVisibilityOperatorSpec(visibilityValueType, visibilityRule.operator)
      : null;
  const createVisibilityRule = (candidate: VisibilitySlotCandidate): VisibilityRule => {
    const operator = getVisibilityOperatorsForValueType(candidate.valueType)[0]?.operator ?? "isNotEmpty";
    return {
      slotId: candidate.slotId,
      valueType: candidate.valueType,
      operator,
      minItems: candidate.minItems,
      maxItems: candidate.maxItems,
      label: candidate.label,
      description: candidate.description,
    };
  };
  const commitBuiltinCollectionRules = (slotId: string, nextPayload: EmailPayload) => {
    onUpdate({ template, payload: nextPayload });
    onDiscardPayloadSlotDraft?.(slotId);
  };

  const renderRepeatBuiltinCollectionRules = (slotId: string) => {
    const sortPolicy = readBuiltinSortPolicyFromPayloadSlot(effectivePayload, slotId);
    if (!sortPolicy) return null;
    const slotLabel = effectivePayload.slots[slotId]?.label?.trim() || slotId;
    const slotDataSource = effectivePayload.slots[slotId]?.dataSource;
    const catalog =
      slotDataSource?.type === "remote" && slotDataSource.provider === "builtin"
        ? slotDataSource.catalog
        : "products";
    return (
      <BuiltinCollectionRulesFields
        slotId={slotId}
        payload={effectivePayload}
        catalog={catalog}
        sortPolicy={sortPolicy}
        syncNote={`与变量「${slotLabel}」的数据源配置为同一份（payload.slots.${slotId}.dataSource），在变量面板修改会同步反映于此。`}
        sortHint="排序作用于当前商品列表自身；与变量面板配置同步。"
        onSortPolicyChange={(nextPolicy: NormalizedBuiltinSortPolicy) => {
          commitBuiltinCollectionRules(
            slotId,
            patchPayloadBuiltinCollectionSortPolicy(payload, slotId, nextPolicy)
          );
        }}
      />
    );
  };

  const formatRepeatMappingLine = (mapping: {
    sourcePath: string;
    targetBlockId: string;
    targetBindPath: string;
    id: string;
  }) => {
    const repeatForLabel = currentRepeat ?? ownRepeat;
    const fieldLabel =
      (repeatForLabel
        ? resolveRepeatFieldMappingSourceMeta(
            repeatForLabel,
            enclosingParentRepeat,
            mapping.sourcePath
          )?.label
        : undefined) ?? mapping.sourcePath;
    return `${fieldLabel} → ${targetFieldLabel(template, mapping.targetBlockId, mapping.targetBindPath)}`;
  };

  const repeatRegionPanel = showRepeatRegionPanel ? (
      <InspectorPanelSection title="列表绑定">
        {ownRepeat ? (
          <>
            <RepeatRegionInspectorSummary
              template={template}
              hostId={id}
              repeat={ownRepeat}
              itemCount={repeatItemCount}
              payload={payload}
              relation="host"
              prototypeRootId={ownRepeat.prototypeChildIds[0]}
              formatMappingLine={formatRepeatMappingLine}
              onEdit={() => openRepeatModal(false)}
              editLabel="编辑绑定"
              onUnbind={removeRepeat}
              unbindTitle="选择解除方式：保留全部行，或仅保留行模板"
              onItemVisibilityChange={(itemVisibility) => {
                onUpdate({
                  template,
                  payload: patchPayloadCollectionSlot(payload, ownRepeat.slotId, { itemVisibility }),
                });
              }}
              collectionFixedLength={
                ownRepeatFixedLengthEdit?.fixedLength ??
                readPayloadCollectionFixedLength(payload, ownRepeat.slotId)
              }
              collectionFixedLengthDisabled={!ownRepeatFixedLengthEdit?.editability.editable}
              collectionFixedLengthDisabledReason={ownRepeatFixedLengthEdit?.editability.reason}
              onCollectionFixedLengthChange={(length: number) => {
                if (!ownRepeatFixedLengthEdit?.editability.editable) return;
                onUpdate({
                  template,
                  payload: applyPayloadCollectionFixedLength(payload, ownRepeat.slotId, length),
                });
              }}
              previewValues={ownRepeatPreviewValues}
            />
            {!ownRepeat.itemPath?.trim()
              ? renderRepeatBuiltinCollectionRules(ownRepeat.slotId)
              : null}
          </>
        ) : repeatBindHostId ? (
          <>
            {enclosingParentRepeat ? (
              <p className="inspector__muted" style={{ marginBottom: 8 }}>
                当前位于「{enclosingParentRepeat.label ?? enclosingParentRepeat.slotId}
                」的循环行内，可在此绑定该项的子列表或其他列表，实现嵌套复制。
              </p>
            ) : null}
            <ListBindInspectorEmpty
              disabled={repeatBindDisabled}
              disabledReason={repeatBindDisabledReason ?? undefined}
              onConfigure={() => openRepeatModal(false)}
            />
          </>
        ) : currentRepeat ? (
          <RepeatRegionInspectorSummary
            template={template}
            hostId={resolvedRepeatContext!.hostId}
            repeat={currentRepeat}
            itemCount={repeatItemCount}
            payload={payload}
            relation={resolvedRepeatContext!.relation}
            prototypeRootId={resolvedRepeatContext?.prototypeRootId}
            fieldMappingsOnBlock={resolvedRepeatContext?.fieldMappingsOnBlock}
            formatMappingLine={formatRepeatMappingLine}
            onEdit={() => openRepeatModal(true)}
            editLabel="查看绑定"
          />
        ) : (
          <ListBindInspectorEmpty
            disabled={repeatBindDisabled}
            disabledReason={repeatBindDisabledReason ?? undefined}
            onConfigure={() => openRepeatModal(false)}
          />
        )}
      </InspectorPanelSection>
    ) : null;

  const repeatModal = (
    <>
    <RepeatRegionBindModal
      visible={repeatModalOpen}
      viewOnly={repeatModalViewOnly}
      template={template}
      payload={payload}
      hasCurrentRepeat={Boolean(ownRepeat)}
      collectionCandidates={repeatBindCandidates}
      parentPrototypeChildIds={repeatModalPrototypeChildIds}
      parentRowTemplateLabel={repeatModalRowTemplateLabel}
      parentTargetFieldOptions={repeatModalTargetFieldOptions}
      repeatSlotId={repeatSlotId}
      parentMappingDraft={repeatMappingDraft}
      repeatCandidate={repeatCandidate}
      enclosingParentRepeat={enclosingParentRepeat}
      onClose={() => {
        setRepeatModalOpen(false);
        setRepeatModalViewOnly(false);
      }}
      onApply={applyRepeatFromModal}
      onRemove={ownRepeat ? removeRepeat : undefined}
      onParentMappingDraftChange={setRepeatMappingDraft}
      onSlotChange={handleRepeatSlotChange}
    />
    <RepeatUnbindChoiceModal
      visible={repeatUnbindModalOpen}
      itemCount={
        repeatBindHostId && template.blocks[repeatBindHostId]?.repeat
          ? collectionItemCount(payload, template.blocks[repeatBindHostId]!.repeat!)
          : 0
      }
      nestedHint={
        repeatBindHostId && hasNestedRepeatUnder(template, repeatBindHostId)
          ? "其子容器内的列表循环将一并解除。"
          : undefined
      }
      onClose={() => setRepeatUnbindModalOpen(false)}
      onChoose={confirmRepeatUnbind}
    />
    </>
  );


  const mergedBlockForRef = (ref: VirtualBlockRef): EmailBlock | null => {
    if (!previewModel) return null;
    return findPreviewNodeByRef(previewModel, ref)?.block ?? null;
  };
  const mergedBlockForId = (bid: string): EmailBlock | null => {
    if (selectedBlockRef && resolvePhysicalBlockId(selectedBlockRef) === bid) {
      return mergedBlockForRef(selectedBlockRef);
    }
    return mergedBlockForRef({ kind: "physical", blockId: bid });
  };
  const rd = (b: EmailBlock, bindPath: string) =>
    readInspectorDisplayValue(b, payload, mergedBlockForId(b.id), bindPath, template);

  const readDisplayColorString = (b: EmailBlock, bindPath: string): string => {
    const resolved = rd(b, bindPath);
    if (typeof resolved === "string" && resolved.trim()) return resolved.trim();
    const rawTemplate = readTemplateFieldOnly(b, bindPath);
    if (isThemeRef(rawTemplate)) {
      const refPath = parseThemeRefPath(rawTemplate);
      if (refPath && effectiveDesignTokens) {
        const preview = previewThemeTokenValue(effectiveDesignTokens, refPath);
        if (preview) return preview;
      }
    }
    const binding = b.bindings?.[bindPath];
    if (binding?.mode === "theme" && binding.tokenPath && effectiveDesignTokens) {
      const preview = previewThemeTokenValue(effectiveDesignTokens, binding.tokenPath);
      if (preview) return preview;
    }
    return "";
  };

  // K：当前容器处于某 repeat 内时，其「可绑定业务内容字段」由列表项映射决定，
  // 一律置灰只读（含尚未映射的字段），不在此手动改源/改值。
  const repeatContentBindPaths = !canvasMode ? listRepeatMappableContentBindPaths(block) : [];
  const isRepeatContentLocked = (blockId: string, bindPath: string): boolean =>
    blockId === id && Boolean(resolvedRepeatContext) && repeatContentBindPaths.includes(bindPath);
  const isBindPathLocked = (blockId: string, bindPath: string): boolean => {
    const b = template.blocks[blockId];
    if (!b) return false;
    if (isRepeatContentLocked(blockId, bindPath)) return true;
    const mode = getInspectFieldBindMode(template, b, payload, blockId, bindPath);
    return mode === "themeFollow" || mode === "variableFollow";
  };

  const pushRoot = (bindPath: string, value: unknown) => {
    if (isBindPathLocked(root.id, bindPath)) return;
    onUpdate(applyBlockField(template, payload, root.id, bindPath, value));
  };

  const pushBlock = (blockId: string, bindPath: string, value: unknown) => {
    if (isBindPathLocked(blockId, bindPath)) return;
    onUpdate(applyBlockField(template, payload, blockId, bindPath, value));
  };

  const pushBlockPatch = (blockId: string, patch: Record<string, unknown>) => {
    let next = { template, payload };
    for (const [bindPath, value] of Object.entries(patch)) {
      if (isBindPathLocked(blockId, bindPath)) continue;
      next = applyBlockField(next.template, next.payload, blockId, bindPath, value);
    }
    onUpdate(next);
  };

  /** 配置标题行右侧：来源胶囊（自由 / 样式令牌 / 变量） */
  const fieldBindHeader = (targetBlock: EmailBlock, bindPath: string): ReactNode => (
    <InspectorFieldSource
      template={template}
      payload={payload}
      block={targetBlock}
      mergedTemplate={previewFlatTemplate}
      effectiveDesignTokens={effectiveDesignTokens}
      tokenPresets={tokenPresets}
      bindPath={bindPath}
      onUpdate={onUpdate}
      onTemplateChange={onTemplateChange}
      disabled={isRepeatContentLocked(targetBlock.id, bindPath)}
    />
  );

  const renderColorInputRow = (opts: {
    label: string;
    value: string;
    hint?: string;
    onChange: (next: string) => void;
    disabled?: boolean;
    headerExtra?: ReactNode;
  }) => {
    return (
      <ColorField
        label={opts.label}
        value={opts.value}
        onChange={opts.onChange}
        hint={opts.hint}
        disabled={opts.disabled}
        headerExtra={opts.headerExtra}
      />
    );
  };

  const renderUnitInputRow = (opts: {
    label: string;
    value: string;
    unit: string;
    hint?: string;
    onChange: (next: string) => void;
    disabled?: boolean;
    headerExtra?: ReactNode;
  }) => {
    return (
      <Field label={opts.label} hint={opts.hint} headerExtra={opts.headerExtra}>
        <ShopUnitInput
          value={opts.value}
          unit={opts.unit}
          onChange={opts.onChange}
          min={0}
          step={0.1}
          disabled={opts.disabled}
        />
      </Field>
    );
  };

  const renderSelectInputRow = (opts: {
    label: string;
    value: string;
    hint?: string;
    onChange: (next: string) => void;
    options: Array<{ value: string; label: string; disabled?: boolean; title?: string }>;
    disabled?: boolean;
    headerExtra?: ReactNode;
  }) => {
    return (
      <Field label={opts.label} hint={opts.hint} headerExtra={opts.headerExtra}>
        <ShopSelect
          value={opts.value}
          disabled={opts.disabled}
          onChange={(v) => opts.onChange(String(v))}
        >
          {opts.options.map((opt) => (
            <ShopSelect.Option
              key={opt.value}
              value={opt.value}
              disabled={opt.disabled}
              title={opt.title}
            >
              {opt.label}
            </ShopSelect.Option>
          ))}
        </ShopSelect>
      </Field>
    );
  };

  const visibilityPanel =
    block.type === "emailRoot" ? null : (
      <>
        <h3 className="inspector__subtitle">显示条件</h3>
        <section className="inspector__section">
          {renderSelectInputRow({
            label: "显示方式",
            value: visibilityRule ? "conditional" : "always",
            hint: "选择条件显示后，仅在条件满足时显示。",
            onChange: (next) => {
              if (next === "always") {
                updateBlockVisibility(undefined);
                return;
              }
              if (visibilityRule) return;
              const candidate = visibilitySlotCandidates[0];
              if (!candidate) {
                message.error("当前没有可用变量，无法配置条件显示。");
                return;
              }
              updateBlockVisibility(createVisibilityRule(candidate));
            },
            options: [
              { value: "always", label: "始终显示" },
              { value: "conditional", label: "条件显示" },
            ],
          })}
          {visibilityRule ? (
            <>
          <Field
            label="条件变量"
            hint="配置后仅当条件满足时显示当前区块及其子区块。"
          >
            <ShopSelect
              value={visibilityRule.slotId}
              onChange={(value) => {
                const slotId = String(value);
                const candidate = visibilitySlotCandidates.find((item) => item.slotId === slotId);
                if (!candidate) return;
                updateBlockVisibility(createVisibilityRule(candidate));
              }}
            >
              {visibilitySlotCandidates.map((candidate) => (
                <ShopSelect.Option key={candidate.slotId} value={candidate.slotId}>
                  {candidate.label} · {candidate.valueType}
                </ShopSelect.Option>
              ))}
            </ShopSelect>
          </Field>
          {visibilityValueType ? (
            <>
              {renderSelectInputRow({
                label: "满足条件时显示",
                value: visibilityRule.operator,
                hint: "当前仅支持单条条件。",
                onChange: (nextOperator) => {
                  const nextSpec = getVisibilityOperatorSpec(
                    visibilityValueType,
                    nextOperator as VisibilityRule["operator"]
                  );
                  const { compareValue: _compareValue, ...rest } = visibilityRule;
                  updateBlockVisibility({
                    ...rest,
                    operator: nextOperator as VisibilityRule["operator"],
                    ...(nextSpec?.requiresCompareValue
                      ? {
                          compareValue:
                            nextSpec.compareValueType === "number"
                              ? 0
                              : nextSpec.compareValueType === "boolean"
                                ? true
                                : "",
                        }
                      : {}),
                  });
                },
                options: visibilityOperators.map((item) => ({
                  value: item.operator,
                  label: item.label,
                })),
              })}
              {visibilityOperatorSpec?.requiresCompareValue ? (
                visibilityOperatorSpec.compareValueType === "boolean" ? (
                  renderSelectInputRow({
                    label: "比较值",
                    value: visibilityRule.compareValue === false ? "false" : "true",
                    onChange: (next) =>
                      updateBlockVisibility({
                        ...visibilityRule,
                        compareValue: next === "true",
                      }),
                    options: [
                      { value: "true", label: "true" },
                      { value: "false", label: "false" },
                    ],
                  })
                ) : (
                  <Field label="比较值">
                    <ShopInput
                      type={visibilityOperatorSpec.compareValueType === "number" ? "number" : "text"}
                      value={String(visibilityRule.compareValue ?? "")}
                      onChange={(e) => {
                        const raw = e.target.value;
                        updateBlockVisibility({
                          ...visibilityRule,
                          compareValue:
                            visibilityOperatorSpec.compareValueType === "number" ? Number(raw) : raw,
                        });
                      }}
                    />
                  </Field>
                )
              ) : null}
              {visibilityValueType === "collection" ? (
                <p className="inspector__muted">
                  列表条件仅判断空、非空或长度，不判断行内字段。
                </p>
              ) : null}
            </>
          ) : null}
            </>
          ) : visibilitySlotCandidates.length === 0 ? (
            <p className="inspector__muted">
              当前没有可用变量，请先配置可判断的变量。
            </p>
          ) : null}
        </section>
      </>
    );

  const renderBorderEditor = (opts: {
    labelPrefix: string;
    basePath: string;
    value: unknown;
    getHint?: (path: string) => string | undefined;
    onChange: (path: string, value: unknown) => void;
    /** 样式令牌胶囊：放在「描边颜色」行（与 `…border.color` 绑定一致），避免子字段仅有颜色跟主题时误显示在「模式」行。 */
    bindTargetBlock?: EmailBlock;
    bindBasePath?: string;
    /** 禁用态只用 controlsDisabled 传给子控件：fieldset disabled 会连带禁用标题栏「自定义」等原生 button（HTML 规范）。 */
    controlsDisabled?: boolean;
  }) => {
    const rowLocked = (suffix: string) =>
      opts.bindTargetBlock
        ? isInspectFollowLocked(template, opts.bindTargetBlock, payload, `${opts.basePath}.${suffix}`)
        : opts.controlsDisabled === true;
    const border = normalizeBorderValue(opts.value);
    const prefixed = (label: string) => (opts.labelPrefix ? `${opts.labelPrefix}${label}` : label);
    const hint = (path: string) => opts.getHint?.(path) ?? BORDER_DEFAULT_HINT;
    const push = (suffix: string, value: unknown) => opts.onChange(`${opts.basePath}.${suffix}`, value);
    const onModeChange = (next: string) => {
      const mode: BorderModeOption = next === "custom" ? "custom" : "unified";
      opts.onChange(opts.basePath, borderValueForMode(border, mode));
    };

    return (
      <>
        <div
          className={
            border.mode === "custom"
              ? "inspector-field-row inspector-field-row--single-full"
              : "inspector-field-row"
          }
        >
          {renderSelectInputRow({
            label: prefixed("描边模式"),
            value: border.mode,
            hint: "统一模式用于四边相同；自定义模式可分别设置上、右、下、左宽度。",
            onChange: onModeChange,
            disabled: rowLocked("mode"),
            options: [
              { value: "unified", label: "四边统一" },
              { value: "custom", label: "四边独立" },
            ],
          })}
          {border.mode === "unified"
            ? renderUnitInputRow({
                label: prefixed("描边宽度"),
                value: border.width,
                unit: "px",
                hint: hint(`${opts.basePath}.width`),
                onChange: (next) => push("width", next.trim() || "0"),
                disabled: rowLocked("width"),
              })
            : null}
        </div>
        {border.mode === "custom" ? (
          <>
            <div className="inspector-field-row">
              {renderUnitInputRow({
                label: `${BORDER_SIDE_LABELS.top}宽度`,
                value: border.top.width,
                unit: "px",
                hint: hint(`${opts.basePath}.top.width`),
                onChange: (next) => push("top.width", next.trim() || "0"),
                disabled: rowLocked("top.width"),
              })}
              {renderUnitInputRow({
                label: `${BORDER_SIDE_LABELS.right}宽度`,
                value: border.right.width,
                unit: "px",
                hint: hint(`${opts.basePath}.right.width`),
                onChange: (next) => push("right.width", next.trim() || "0"),
                disabled: rowLocked("right.width"),
              })}
            </div>
            <div className="inspector-field-row">
              {renderUnitInputRow({
                label: `${BORDER_SIDE_LABELS.bottom}宽度`,
                value: border.bottom.width,
                unit: "px",
                hint: hint(`${opts.basePath}.bottom.width`),
                onChange: (next) => push("bottom.width", next.trim() || "0"),
                disabled: rowLocked("bottom.width"),
              })}
              {renderUnitInputRow({
                label: `${BORDER_SIDE_LABELS.left}宽度`,
                value: border.left.width,
                unit: "px",
                hint: hint(`${opts.basePath}.left.width`),
                onChange: (next) => push("left.width", next.trim() || "0"),
                disabled: rowLocked("left.width"),
              })}
            </div>
          </>
        ) : null}
        <div className="inspector-field-row">
          {renderSelectInputRow({
            label: prefixed("描边样式"),
            value: border.style,
            hint: hint(`${opts.basePath}.style`),
            onChange: (next) => push("style", next),
            disabled: rowLocked("style"),
            options: BORDER_STYLE_OPTIONS,
          })}
          {renderColorInputRow({
            label: prefixed("描边颜色"),
            value:
              opts.bindTargetBlock && opts.bindBasePath
                ? readDisplayColorString(opts.bindTargetBlock, `${opts.bindBasePath}.color`) ||
                  border.color
                : border.color,
            hint: hint(`${opts.basePath}.color`),
            onChange: (next) => push("color", next || TRANSPARENT_BORDER_COLOR),
            disabled: rowLocked("color"),
            headerExtra:
              opts.bindTargetBlock && opts.bindBasePath
                ? fieldBindHeader(opts.bindTargetBlock, `${opts.bindBasePath}.color`)
                : undefined,
          })}
        </div>
      </>
    );
  };

  const renderBorderRadiusEditor = (opts: {
    labelPrefix: string;
    basePath: string;
    value: unknown;
    getHint?: (path: string) => string | undefined;
    onChange: (path: string, value: unknown) => void;
    bindTargetBlock?: EmailBlock;
    bindBasePath?: string;
    controlsDisabled?: boolean;
  }) => {
    const rowLocked = (suffix: string) =>
      opts.bindTargetBlock
        ? isInspectFollowLocked(template, opts.bindTargetBlock, payload, `${opts.basePath}.${suffix}`)
        : opts.controlsDisabled === true;
    const prefixed = (label: string) => (opts.labelPrefix ? `${opts.labelPrefix}${label}` : label);

    const radius = normalizeBorderRadiusValue(opts.value);
    const hint = (path: string) => opts.getHint?.(path) ?? RADIUS_DEFAULT_HINT;
    const push = (suffix: string, value: unknown) => opts.onChange(`${opts.basePath}.${suffix}`, value);
    const onModeChange = (next: string) => {
      const mode: BorderRadiusModeOption = next === "corners" ? "corners" : "unified";
      opts.onChange(opts.basePath, borderRadiusValueForMode(radius, mode));
    };
    const bindHeader = (suffix: string) =>
      opts.bindTargetBlock && opts.bindBasePath
        ? fieldBindHeader(opts.bindTargetBlock, `${opts.bindBasePath}.${suffix}`)
        : undefined;

    return (
      <>
        <div
          className={
            radius.mode === "corners"
              ? "inspector-field-row inspector-field-row--single-full"
              : "inspector-field-row"
          }
        >
          {renderSelectInputRow({
            label: prefixed("圆角模式"),
            value: radius.mode,
            hint: "统一模式用于四角相同；四角独立模式可分别设置左上、右上、右下、左下。",
            onChange: onModeChange,
            disabled: rowLocked("mode"),
            options: [
              { value: "unified", label: "四角统一" },
              { value: "corners", label: "四角独立" },
            ],
          })}
          {radius.mode === "unified"
            ? renderUnitInputRow({
                label: prefixed("圆角"),
                value: radius.radius,
                unit: "px",
                hint: hint(`${opts.basePath}.radius`),
                onChange: (next) => push("radius", next.trim() || "0"),
                disabled: rowLocked("radius"),
                headerExtra: bindHeader("radius"),
              })
            : null}
        </div>
        {radius.mode === "corners" ? (
          <>
            <div className="inspector-field-row">
              {renderUnitInputRow({
                label: `${RADIUS_CORNER_LABELS.topLeft}圆角`,
                value: radius.topLeft,
                unit: "px",
                hint: hint(`${opts.basePath}.topLeft`),
                onChange: (next) => push("topLeft", next.trim() || "0"),
                disabled: rowLocked("topLeft"),
                headerExtra: bindHeader("topLeft"),
              })}
              {renderUnitInputRow({
                label: `${RADIUS_CORNER_LABELS.topRight}圆角`,
                value: radius.topRight,
                unit: "px",
                hint: hint(`${opts.basePath}.topRight`),
                onChange: (next) => push("topRight", next.trim() || "0"),
                disabled: rowLocked("topRight"),
                headerExtra: bindHeader("topRight"),
              })}
            </div>
            <div className="inspector-field-row">
              {renderUnitInputRow({
                label: `${RADIUS_CORNER_LABELS.bottomRight}圆角`,
                value: radius.bottomRight,
                unit: "px",
                hint: hint(`${opts.basePath}.bottomRight`),
                onChange: (next) => push("bottomRight", next.trim() || "0"),
                disabled: rowLocked("bottomRight"),
                headerExtra: bindHeader("bottomRight"),
              })}
              {renderUnitInputRow({
                label: `${RADIUS_CORNER_LABELS.bottomLeft}圆角`,
                value: radius.bottomLeft,
                unit: "px",
                hint: hint(`${opts.basePath}.bottomLeft`),
                onChange: (next) => push("bottomLeft", next.trim() || "0"),
                disabled: rowLocked("bottomLeft"),
                headerExtra: bindHeader("bottomLeft"),
              })}
            </div>
          </>
        ) : null}
      </>
    );
  };

  const renderSpacingEditor = (opts: {
    labelPrefix: string;
    basePath: string;
    value: unknown;
    getHint?: (path: string) => string | undefined;
    onChange: (path: string, value: unknown) => void;
    bindTargetBlock?: EmailBlock;
    bindBasePath?: string;
    controlsDisabled?: boolean;
  }) => {
    const rowLocked = (suffix: string) =>
      opts.bindTargetBlock
        ? isInspectFollowLocked(template, opts.bindTargetBlock, payload, `${opts.basePath}.${suffix}`)
        : opts.controlsDisabled === true;
    const spacing = normalizeSpacingValue(opts.value);
    const prefixed = (label: string) => (opts.labelPrefix ? `${opts.labelPrefix}${label}` : label);
    const hint = (path: string) => opts.getHint?.(path) ?? SPACING_DEFAULT_HINT;
    const push = (suffix: string, value: unknown) => opts.onChange(`${opts.basePath}.${suffix}`, value);
    const onModeChange = (next: string) => {
      const mode: SpacingModeOption = next === "separate" ? "separate" : "unified";
      opts.onChange(opts.basePath, spacingValueForMode(spacing, mode));
    };
    const bindHeader = (suffix: string) =>
      opts.bindTargetBlock && opts.bindBasePath
        ? fieldBindHeader(opts.bindTargetBlock, `${opts.bindBasePath}.${suffix}`)
        : undefined;

    return (
      <>
        <div
          className={
            spacing.mode === "separate"
              ? "inspector-field-row inspector-field-row--single-full"
              : "inspector-field-row"
          }
        >
          {renderSelectInputRow({
            label: prefixed("内边距模式"),
            value: spacing.mode,
            hint: "统一模式用于四边相同；四边独立模式可分别设置上、右、下、左。",
            onChange: onModeChange,
            disabled: rowLocked("mode"),
            options: [
              { value: "unified", label: "四边统一" },
              { value: "separate", label: "四边独立" },
            ],
          })}
          {spacing.mode === "unified"
            ? renderUnitInputRow({
                label: prefixed("内边距"),
                value: spacingSideToInputValue(spacing.unified),
                unit: "px",
                hint: hint(`${opts.basePath}.unified`),
                onChange: (next) => push("unified", next.trim() || "0"),
                disabled: rowLocked("unified"),
                headerExtra: bindHeader("unified"),
              })
            : null}
        </div>
        {spacing.mode === "separate" ? (
          <>
            <div className="inspector-field-row">
              {renderUnitInputRow({
                label: `${SPACING_SIDE_LABELS.top}内边距`,
                value: spacingSideToInputValue(spacing.top),
                unit: "px",
                hint: hint(`${opts.basePath}.top`),
                onChange: (next) => push("top", next.trim() || "0"),
                disabled: rowLocked("top"),
                headerExtra: bindHeader("top"),
              })}
              {renderUnitInputRow({
                label: `${SPACING_SIDE_LABELS.right}内边距`,
                value: spacingSideToInputValue(spacing.right),
                unit: "px",
                hint: hint(`${opts.basePath}.right`),
                onChange: (next) => push("right", next.trim() || "0"),
                disabled: rowLocked("right"),
                headerExtra: bindHeader("right"),
              })}
            </div>
            <div className="inspector-field-row">
              {renderUnitInputRow({
                label: `${SPACING_SIDE_LABELS.bottom}内边距`,
                value: spacingSideToInputValue(spacing.bottom),
                unit: "px",
                hint: hint(`${opts.basePath}.bottom`),
                onChange: (next) => push("bottom", next.trim() || "0"),
                disabled: rowLocked("bottom"),
                headerExtra: bindHeader("bottom"),
              })}
              {renderUnitInputRow({
                label: `${SPACING_SIDE_LABELS.left}内边距`,
                value: spacingSideToInputValue(spacing.left),
                unit: "px",
                hint: hint(`${opts.basePath}.left`),
                onChange: (next) => push("left", next.trim() || "0"),
                disabled: rowLocked("left"),
                headerExtra: bindHeader("left"),
              })}
            </div>
          </>
        ) : null}
      </>
    );
  };

  const renderWrapperPaddingEditor = (target: EmailBlock) => {
    const bgOverlayPadding = blockBackgroundImageRenderable(target);
    return (
      <fieldset className="inspector-bound-fieldset">
        {bgOverlayPadding ? (
          <p className="inspector__muted">
            已启用底图：容器内边距仅作用于叠放子内容。
          </p>
        ) : null}
        {renderSpacingEditor({
          labelPrefix: "容器",
          basePath: "wrapperStyle.padding",
          value: rd(target, "wrapperStyle.padding"),
          getHint: (path) => readDisplayHint(target, path),
          onChange: (path, value) => pushBlock(target.id, path, value),
          bindTargetBlock: target,
          bindBasePath: "wrapperStyle.padding",
          controlsDisabled: isInspectFollowLocked(
            template,
            target,
            payload,
            "wrapperStyle.padding"
          ),
        })}
      </fieldset>
    );
  };

  const textBodyDefaults = (textBlock: TextBlock): TextBodyDefaults => {
    const decRaw = rd(textBlock, "props.decoration");
    const decoration =
      decRaw === "underline" ||
      decRaw === "line-through" ||
      decRaw === "overline" ||
      decRaw === "none"
        ? decRaw
        : "none";
    return {
      bold: rd(textBlock, "props.bold") === true,
      italic: rd(textBlock, "props.italic") === true,
      decoration,
    };
  };

  const textBodyForEditor =
    block.type === "text"
      ? normalizeTextBody(block.props.textBody) ?? {
          paragraphs: [{ runs: [{ text: "" }] }],
        }
      : null;
  const textVariableRuns =
    block.type === "text" && textBodyForEditor
      ? collectTextBodyVariableRuns(textBodyForEditor, block.bindings, (bindPath) => {
          const v = rd(block, bindPath);
          return typeof v === "string" ? v : "";
        })
      : [];
  const textBodyContentMode =
    block.type === "text" && textBodyForEditor
      ? getTextBodyContentMode(block, textBodyForEditor)
      : "literal";
  const textBodyRepeatListItemBinding =
    block.type === "text" && textBodyForEditor
      ? resolveRepeatListItemFieldBinding(
          template,
          block.id,
          getTextBodyFieldSourceBindPath(block, textBodyForEditor, textBodyContentMode)
        )
      : null;
  const textBodyReadOnlyPreview =
    textBodyContentMode === "wholeVariable" || Boolean(textBodyRepeatListItemBinding);

  const commitTextBodySnapshot = (
    nextTemplate: EmailTemplate,
    nextPayload: EmailPayload,
    blockId: string,
    body: TextBody
  ) => {
    const tb = nextTemplate.blocks[blockId];
    if (!tb || tb.type !== "text") return { template: nextTemplate, payload: nextPayload };
    return applyBlockField(nextTemplate, nextPayload, blockId, "props.textBody", body);
  };

  const renderTextInputRow = (opts: {
    label: string;
    value: string;
    hint?: string;
    maxLength?: number;
    onChange: (next: string) => void;
    disabled?: boolean;
    headerExtra?: ReactNode;
  }) => {
    return (
      <Field label={opts.label} hint={opts.hint} headerExtra={opts.headerExtra}>
        {typeof opts.maxLength === "number" ? (
          <ShopCountInput
            value={opts.value}
            maxLength={opts.maxLength}
            onChange={opts.onChange}
            disabled={opts.disabled}
          />
        ) : (
          <ShopInput
            type="text"
            value={opts.value}
            disabled={opts.disabled}
            onChange={(e) => opts.onChange(e.target.value)}
          />
        )}
      </Field>
    );
  };

  function readDisplayString(current: EmailBlock, bindPath: string): string {
    const value = rd(current, bindPath);
    return typeof value === "string" ? value : "";
  }

  function readDisplayHint(current: EmailBlock, bindPath: string): string | undefined {
    const meta = bindingMeta(current, bindPath);
    return meta.fromPayload ? "来自变量赋值" : undefined;
  }

  function readVariableSeedValue(current: EmailBlock, bindPath: string): unknown {
    const spec = current.bindings?.[bindPath];
    if (!spec || spec.mode !== "variable" || spec.allowExternal !== true) return undefined;
    if (payload.detachedVariableSlotIds?.includes(spec.slotId)) return undefined;

    const readSlotValue = (raw: unknown): unknown => {
      if (raw === undefined) return undefined;
      if (!spec.slotPath) return raw;
      return getAtPath(raw as Record<string, unknown>, spec.slotPath);
    };

    const payloadValue = readSlotValue(payload.values?.[spec.slotId]);
    if (payloadValue !== undefined) return payloadValue;
    return readSlotValue(spec.defaultValue);
  }

  function readVariableSeedString(current: EmailBlock, bindPath: string): string {
    const value = readVariableSeedValue(current, bindPath);
    return typeof value === "string" ? value : "";
  }

  type LayoutBindPath = "props.gapMode" | "props.gap";
  type OverlayStackBlock =
    | Extract<EmailBlock, { type: "layout" }>
    | Extract<EmailBlock, { type: "image" }>
    | Extract<EmailBlock, { type: "emailRoot" }>;
  type TextBindPath = "props.fontSize" | "props.color";
  type WrapperContentAlignHBindPath = "wrapperStyle.contentAlign.horizontal";
  type WrapperContentAlignVBindPath = "wrapperStyle.contentAlign.vertical";
  type ButtonTextBindPath = "props.text" | "props.link";
  type ButtonColorBindPath = "props.buttonStyle.backgroundColor" | "props.buttonStyle.textColor";
  type ButtonBoolBindPath = "props.buttonStyle.bold" | "props.buttonStyle.italic";
  type ButtonBodyWidthBindPath = "props.buttonStyle.widthMode" | "props.buttonStyle.width";
  type DividerBindPath = "props.color" | "props.lineWidthMode" | "props.lineWidth" | "props.height";
  type ProgressBodyWidthBindPath = "props.barWidthMode" | "props.barWidth";
  type GridBindPath = "props.gap" | "props.cellWidth" | "props.cellHeight";
  type IconBindPath = "props.src" | "props.link" | "props.size" | "props.color";
  type IconUnitBindPath = Extract<IconBindPath, "props.size">;
  type LayoutContainerBgBindPath =
    | "wrapperStyle.backgroundImage.src"
    | "wrapperStyle.backgroundImage.alt"
    | "wrapperStyle.backgroundImage.link";
  type LayoutContainerBgSelectBindPath = "wrapperStyle.backgroundImage.fit";
  const overlayStackGapModeRow = (layoutBlock: OverlayStackBlock) => {
    const raw = rd(layoutBlock, "props.gapMode");
    const value = raw === "auto" ? "auto" : "fixed";
    return renderSelectInputRow({
      label: "间距模式",
      value,
      hint: readDisplayHint(layoutBlock, "props.gapMode"),
      onChange: (next) => pushBlock(layoutBlock.id, "props.gapMode", next),
      disabled: isInspectFollowLocked(template, layoutBlock, payload, "props.gapMode"),
      options: [
        { value: "fixed", label: "固定像素（gap）" },
        {
          value: "auto",
          label: "自动均分（主轴剩余空间）",
          title:
            "纵向时按容器高度、横向时按容器宽度，将主轴剩余空间均分到相邻子项之间；子项高度/宽度为 hug 且无剩余空间时与紧凑排列一致。",
        },
      ],
    });
  };

  const overlayStackTextRow = (
    layoutBlock: OverlayStackBlock,
    label: string,
    bindPath: Exclude<LayoutBindPath, "props.gapMode">
  ) =>
    renderUnitInputRow({
      label,
      value: readDisplayString(layoutBlock, bindPath) || "8px",
      unit: "px",
      hint: readDisplayHint(layoutBlock, bindPath),
      onChange: (next) => pushBlock(layoutBlock.id, bindPath, next),
      disabled: isInspectFollowLocked(template, layoutBlock, payload, bindPath),
      headerExtra: fieldBindHeader(layoutBlock, bindPath),
    });

  const textTextRow = (textBlock: TextBlock, label: string, bindPath: TextBindPath) =>
    renderUnitInputRow({
      label,
      value: readDisplayString(textBlock, bindPath),
      unit: "px",
      hint: readDisplayHint(textBlock, bindPath),
      onChange: (next) => pushBlock(textBlock.id, bindPath, next),
      disabled: isInspectFollowLocked(template, textBlock, payload, bindPath),
      headerExtra: fieldBindHeader(textBlock, bindPath),
    });

  const textColorRow = (
    textBlock: TextBlock,
    label: string,
    bindPath: Extract<TextBindPath, "props.color">
  ) =>
    renderColorInputRow({
      label,
      value: readDisplayColorString(textBlock, bindPath),
      hint: readDisplayHint(textBlock, bindPath),
      onChange: (next) => pushBlock(textBlock.id, bindPath, next),
      disabled: isInspectFollowLocked(template, textBlock, payload, bindPath),
      headerExtra: fieldBindHeader(textBlock, bindPath),
    });

  const contentAlignAxisRows = (
    targetBlock: EmailBlock,
    label: string,
    horizontalPath: WrapperContentAlignHBindPath,
    verticalPath: WrapperContentAlignVBindPath
  ) => {
    const rawH = rd(targetBlock, horizontalPath);
    const horizontal: "left" | "center" | "right" =
      rawH === "left" || rawH === "center" || rawH === "right" ? rawH : "left";
    const rawV = rd(targetBlock, verticalPath);
    const vertical: "top" | "center" | "bottom" =
      rawV === "top" || rawV === "center" || rawV === "bottom" ? rawV : "top";
    const locked =
      isInspectFollowLocked(template, targetBlock, payload, horizontalPath) ||
      isInspectFollowLocked(template, targetBlock, payload, verticalPath);
    const presentation = resolveContentAlignInspectorPresentation(template, targetBlock);
    return (
      <ContentAlignAxisControl
        label={label}
        horizontal={horizontal}
        vertical={vertical}
        horizontalAxis={presentation.horizontal}
        verticalAxis={presentation.vertical}
        hint={presentation.hint}
        disabled={locked}
        headerExtra={fieldBindHeader(targetBlock, horizontalPath)}
        onHorizontalChange={(next) => {
          onUpdate(applyBlockField(template, payload, targetBlock.id, horizontalPath, next));
        }}
        onVerticalChange={(next) => {
          onUpdate(applyBlockField(template, payload, targetBlock.id, verticalPath, next));
        }}
      />
    );
  };

  /** 容器背景图 / 图片块：画面位置只在 cover 裁切时控制裁切焦点。 */
  const layoutContainerBgPositionRow = (target: EmailBlock, label: string) => {
    const bindPath = "wrapperStyle.backgroundImage.position";
    const locked = isInspectFollowLocked(template, target, payload, bindPath);
    const fit = rd(target, "wrapperStyle.backgroundImage.fit");
    const containMode = fit === "contain";
    const bindHint = readDisplayHint(target, bindPath);
    const fitHint = containMode
      ? "完整显示（contain）不会裁切图片，画面位置不参与图像摆放；需要裁切焦点时请切换为 cover。"
      : "控制 cover 裁切时保留画面的哪个方向。";
    return (
      <ImageObjectPositionGrid
        label={label}
        value={readDisplayString(target, bindPath)}
        hint={bindHint ? `${fitHint} ${bindHint}` : fitHint}
        onChange={(next) => pushBlock(target.id, bindPath, next)}
        disabled={locked || containMode}
        headerExtra={fieldBindHeader(target, bindPath)}
      />
    );
  };

  const buttonTextRow = (
    buttonBlock: Extract<EmailBlock, { type: "button" }>,
    label: string,
    bindPath: ButtonTextBindPath
  ) =>
    renderTextInputRow({
      label,
      value: readDisplayString(buttonBlock, bindPath),
      maxLength: bindPath === "props.text" ? 100 : undefined,
      hint: readDisplayHint(buttonBlock, bindPath),
      onChange: (next) => pushBlock(buttonBlock.id, bindPath, next),
      disabled: isInspectFollowLocked(template, buttonBlock, payload, bindPath),
      headerExtra: fieldBindHeader(buttonBlock, bindPath),
    });

  const buttonColorRow = (
    buttonBlock: Extract<EmailBlock, { type: "button" }>,
    label: string,
    bindPath: ButtonColorBindPath
  ) =>
    renderColorInputRow({
      label,
      value: readDisplayColorString(buttonBlock, bindPath),
      hint: readDisplayHint(buttonBlock, bindPath),
      onChange: (next) => pushBlock(buttonBlock.id, bindPath, next),
      disabled: isInspectFollowLocked(template, buttonBlock, payload, bindPath),
      headerExtra: fieldBindHeader(buttonBlock, bindPath),
    });

  const buttonFontSizeRow = (buttonBlock: Extract<EmailBlock, { type: "button" }>) =>
    renderUnitInputRow({
      label: "按钮文字字号",
      value: readDisplayString(buttonBlock, "props.buttonStyle.fontSize") || "15px",
      unit: "px",
      hint: readDisplayHint(buttonBlock, "props.buttonStyle.fontSize"),
      onChange: (next) => pushBlock(buttonBlock.id, "props.buttonStyle.fontSize", next),
      disabled: isInspectFollowLocked(template, buttonBlock, payload, "props.buttonStyle.fontSize"),
      headerExtra: fieldBindHeader(buttonBlock, "props.buttonStyle.fontSize"),
    });

  const buttonBodyWidthRows = (buttonBlock: Extract<EmailBlock, { type: "button" }>) => {
    const modePath: Extract<ButtonBodyWidthBindPath, "props.buttonStyle.widthMode"> =
      "props.buttonStyle.widthMode";
    const widthPath: Extract<ButtonBodyWidthBindPath, "props.buttonStyle.width"> =
      "props.buttonStyle.width";
    const mode = rd(buttonBlock, modePath);
    const widthMode = mode === "fill" || mode === "fixed" ? mode : "hug";
    return (
      <>
        {renderSelectInputRow({
          label: "按钮宽度模式",
          value: widthMode,
          hint: "只控制按钮胶囊本体宽度；外层容器宽度仍在「布局」页签的「外层容器 · 布局」中配置。",
          onChange: (next) => pushBlock(buttonBlock.id, modePath, next),
          disabled: isInspectFollowLocked(template, buttonBlock, payload, modePath),
          headerExtra: fieldBindHeader(buttonBlock, modePath),
          options: [
            { value: "hug", label: "跟随文字（hug）" },
            { value: "fill", label: "铺满容器（fill）" },
            { value: "fixed", label: "自定义（fixed）" },
          ],
        })}
        {widthMode === "fixed"
          ? renderUnitInputRow({
              label: "按钮宽度",
              value: readDisplayString(buttonBlock, widthPath),
              unit: "px",
              hint: readDisplayHint(buttonBlock, widthPath),
              onChange: (next) => pushBlock(buttonBlock.id, widthPath, next),
              disabled: isInspectFollowLocked(template, buttonBlock, payload, widthPath),
              headerExtra: fieldBindHeader(buttonBlock, widthPath),
            })
          : null}
      </>
    );
  };

  const buttonTextStyleToggleRow = (buttonBlock: Extract<EmailBlock, { type: "button" }>) => {
    const readBool = (bindPath: ButtonBoolBindPath, defaultValue = false) => {
      const value = rd(buttonBlock, bindPath);
      return typeof value === "boolean" ? value : defaultValue;
    };
    const bold = readBool("props.buttonStyle.bold", true);
    const italic = readBool("props.buttonStyle.italic");
    const boldLocked = isInspectFollowLocked(template, buttonBlock, payload, "props.buttonStyle.bold");
    const italicLocked = isInspectFollowLocked(template, buttonBlock, payload, "props.buttonStyle.italic");
    const boldMode = getInspectFieldBindMode(
      template,
      buttonBlock,
      payload,
      buttonBlock.id,
      "props.buttonStyle.bold"
    );
    const italicMode = getInspectFieldBindMode(
      template,
      buttonBlock,
      payload,
      buttonBlock.id,
      "props.buttonStyle.italic"
    );
    const showStyleBindHeader = boldMode !== "free" || italicMode !== "free";
    const toggle = (bindPath: ButtonBoolBindPath, value: boolean) => {
      pushBlock(buttonBlock.id, bindPath, !value);
    };
    return (
        <Field
          label="按钮文字样式"
          hint="作用于整个按钮文字；按钮内边距由系统默认值统一控制。"
          headerExtra={
            showStyleBindHeader ? (
              <span className="inspector-field-bind inspector-field-bind--stack">
                {boldMode !== "free" ? fieldBindHeader(buttonBlock, "props.buttonStyle.bold") : null}
                {italicMode !== "free" ? fieldBindHeader(buttonBlock, "props.buttonStyle.italic") : null}
              </span>
            ) : undefined
          }
        >
          <div className="inspector-icon-toggle-row" role="toolbar" aria-label="按钮文字样式">
            <ShopSecondaryButton
              htmlType="button"
              title="加粗"
              aria-pressed={bold}
              disabled={boldLocked}
              className={`inspector-icon-toggle-row__btn ${bold ? "inspector-icon-toggle-row__btn--active" : ""}`}
              onClick={() => {
                if (boldLocked) return;
                toggle("props.buttonStyle.bold", bold);
              }}
            >
              <span className="inspector-rich-toolbar__icon inspector-rich-toolbar__icon--bold">B</span>
            </ShopSecondaryButton>
            <ShopSecondaryButton
              htmlType="button"
              title="斜体"
              aria-pressed={italic}
              disabled={italicLocked}
              className={`inspector-icon-toggle-row__btn ${italic ? "inspector-icon-toggle-row__btn--active" : ""}`}
              onClick={() => {
                if (italicLocked) return;
                toggle("props.buttonStyle.italic", italic);
              }}
            >
              <span className="inspector-rich-toolbar__icon inspector-rich-toolbar__icon--italic">I</span>
            </ShopSecondaryButton>
          </div>
        </Field>
    );
  };

  const dividerTextRow = (
    dividerBlock: Extract<EmailBlock, { type: "divider" }>,
    label: string,
    bindPath: DividerBindPath
  ) =>
    renderUnitInputRow({
      label,
      value: readDisplayString(dividerBlock, bindPath),
      unit: "px",
      hint: readDisplayHint(dividerBlock, bindPath),
      onChange: (next) => pushBlock(dividerBlock.id, bindPath, next),
      disabled: isInspectFollowLocked(template, dividerBlock, payload, bindPath),
      headerExtra: fieldBindHeader(dividerBlock, bindPath),
    });

  const fillFixedWidthRows = (
    targetBlock: Extract<EmailBlock, { type: "divider" }> | Extract<EmailBlock, { type: "progress" }>,
    opts: {
      modePath: Extract<DividerBindPath, "props.lineWidthMode"> | Extract<ProgressBodyWidthBindPath, "props.barWidthMode">;
      widthPath: Extract<DividerBindPath, "props.lineWidth"> | Extract<ProgressBodyWidthBindPath, "props.barWidth">;
      modeLabel: string;
      widthLabel: string;
      hint: string;
    }
  ) => {
    const rawMode = rd(targetBlock, opts.modePath);
    const mode = rawMode === "fixed" ? "fixed" : "fill";
    return (
      <>
        {renderSelectInputRow({
          label: opts.modeLabel,
          value: mode,
          hint: opts.hint,
          onChange: (next) => pushBlock(targetBlock.id, opts.modePath, next),
          disabled: isInspectFollowLocked(template, targetBlock, payload, opts.modePath),
          headerExtra: fieldBindHeader(targetBlock, opts.modePath),
          options: [
            { value: "fill", label: "铺满容器（fill）" },
            { value: "fixed", label: "自定义（fixed）" },
          ],
        })}
        {mode === "fixed"
          ? renderUnitInputRow({
              label: opts.widthLabel,
              value: readDisplayString(targetBlock, opts.widthPath),
              unit: "px",
              hint: readDisplayHint(targetBlock, opts.widthPath),
              onChange: (next) => pushBlock(targetBlock.id, opts.widthPath, next),
              disabled: isInspectFollowLocked(template, targetBlock, payload, opts.widthPath),
              headerExtra: fieldBindHeader(targetBlock, opts.widthPath),
            })
          : null}
      </>
    );
  };

  const progressBarHeightRow = (pb: Extract<EmailBlock, { type: "progress" }>) =>
    renderUnitInputRow({
      label: "条带高度",
      value: readDisplayString(pb, "props.barHeight"),
      unit: "px",
      hint:
        readDisplayHint(pb, "props.barHeight") ??
        "与分割线「线条粗细」一致：条带厚度写在 props，不占用外层容器 height。",
      onChange: (next) => pushBlock(pb.id, "props.barHeight", next),
      disabled: isInspectFollowLocked(template, pb, payload, "props.barHeight"),
      headerExtra: fieldBindHeader(pb, "props.barHeight"),
    });

  const dividerColorRow = (
    dividerBlock: Extract<EmailBlock, { type: "divider" }>,
    label: string,
    bindPath: Extract<DividerBindPath, "props.color">
  ) =>
    renderColorInputRow({
      label,
      value: readDisplayColorString(dividerBlock, bindPath),
      hint: readDisplayHint(dividerBlock, bindPath),
      onChange: (next) => pushBlock(dividerBlock.id, bindPath, next),
      disabled: isInspectFollowLocked(template, dividerBlock, payload, bindPath),
      headerExtra: fieldBindHeader(dividerBlock, bindPath),
    });

  const gridTextRow = (gridBlock: Extract<EmailBlock, { type: "grid" }>, label: string, bindPath: GridBindPath) =>
    renderUnitInputRow({
      label,
      value: readDisplayString(gridBlock, bindPath),
      unit: "px",
      hint: readDisplayHint(gridBlock, bindPath),
      onChange: (next) => pushBlock(gridBlock.id, bindPath, next),
      disabled: isInspectFollowLocked(template, gridBlock, payload, bindPath),
      headerExtra: fieldBindHeader(gridBlock, bindPath),
    });

  const iconUnitRow = (
    iconBlock: Extract<EmailBlock, { type: "icon" }>,
    label: string,
    bindPath: IconUnitBindPath
  ) =>
    renderUnitInputRow({
      label,
      value: readDisplayString(iconBlock, bindPath),
      unit: "px",
      hint: readDisplayHint(iconBlock, bindPath),
      onChange: (next) => pushBlock(iconBlock.id, bindPath, next),
      disabled: isInspectFollowLocked(template, iconBlock, payload, bindPath),
      headerExtra: fieldBindHeader(iconBlock, bindPath),
    });

  const iconColorRow = (
    iconBlock: Extract<EmailBlock, { type: "icon" }>,
    label: string,
    bindPath: Extract<IconBindPath, "props.color">
  ) =>
    renderColorInputRow({
      label,
      value: readDisplayColorString(iconBlock, bindPath),
      hint: readDisplayHint(iconBlock, bindPath) ?? "对线框类 SVG 生效；品牌多色图标可能无效。",
      onChange: (next) => pushBlock(iconBlock.id, bindPath, next),
      disabled: isInspectFollowLocked(template, iconBlock, payload, bindPath),
      headerExtra: fieldBindHeader(iconBlock, bindPath),
    });

  const iconTextRow = (
    iconBlock: Extract<EmailBlock, { type: "icon" }>,
    label: string,
    bindPath: Extract<IconBindPath, "props.link">
  ) =>
    renderTextInputRow({
      label,
      value: readDisplayString(iconBlock, bindPath),
      hint: readDisplayHint(iconBlock, bindPath) ?? "留空表示图标不可点击。",
      onChange: (next) => pushBlock(iconBlock.id, bindPath, next),
      disabled: isInspectFollowLocked(template, iconBlock, payload, bindPath),
      headerExtra: fieldBindHeader(iconBlock, bindPath),
    });

  const layoutContainerBgTextRow = (
    target: EmailBlock,
    label: string,
    bindPath: LayoutContainerBgBindPath
  ) =>
    renderTextInputRow({
      label,
      value: readDisplayString(target, bindPath),
      maxLength: bindPath === "wrapperStyle.backgroundImage.alt" ? 100 : undefined,
      hint: readDisplayHint(target, bindPath),
      onChange: (next) => pushBlock(target.id, bindPath, next),
      disabled: isInspectFollowLocked(template, target, payload, bindPath),
      headerExtra: fieldBindHeader(target, bindPath),
    });

  const layoutContainerBgSelectRow = (
    target: EmailBlock,
    label: string,
    bindPath: LayoutContainerBgSelectBindPath,
    options: Array<{ value: string; label: string }>
  ) =>
    renderSelectInputRow({
      label,
      value: readDisplayString(target, bindPath) || "cover",
      hint: readDisplayHint(target, bindPath),
      onChange: (next) => pushBlock(target.id, bindPath, next),
      disabled: isInspectFollowLocked(template, target, payload, bindPath),
      headerExtra: fieldBindHeader(target, bindPath),
      options,
    });

  const renderWrapperBackgroundImageStyleFields = (
    target: EmailBlock,
    opts: {
      fitLabel?: string;
      positionLabel?: string;
      borderRadiusLabelPrefix?: string;
      borderLabelPrefix?: string;
      cropRegionHint?: boolean;
    } = {}
  ) => {
    const {
      fitLabel = "背景填充策略",
      positionLabel = "背景画面位置",
      borderRadiusLabelPrefix = "背景",
      borderLabelPrefix = "背景",
      cropRegionHint = false,
    } = opts;
    return (
      <>
        {cropRegionHint ? (
          <p className="inspector__muted">
            裁切范围由「布局」页宽高设置决定。
          </p>
        ) : null}
        {layoutContainerBgSelectRow(target, fitLabel, "wrapperStyle.backgroundImage.fit", [
          { value: "cover", label: "裁切铺满（cover）" },
          { value: "contain", label: "完整显示（contain）" },
        ])}
        {layoutContainerBgPositionRow(target, positionLabel)}
        <fieldset className="inspector-bound-fieldset">
          {renderBorderRadiusEditor({
            labelPrefix: borderRadiusLabelPrefix,
            basePath: "wrapperStyle.backgroundImage.borderRadius",
            value: rd(target, "wrapperStyle.backgroundImage.borderRadius"),
            getHint: (path) => readDisplayHint(target, path),
            onChange: (path, value) => pushBlock(target.id, path, value),
            bindTargetBlock: target,
            bindBasePath: "wrapperStyle.backgroundImage.borderRadius",
            controlsDisabled: isInspectFollowLocked(
              template,
              target,
              payload,
              "wrapperStyle.backgroundImage.borderRadius"
            ),
          })}
        </fieldset>
        <fieldset className="inspector-bound-fieldset">
          {renderBorderEditor({
            labelPrefix: borderLabelPrefix,
            basePath: "wrapperStyle.backgroundImage.border",
            value: rd(target, "wrapperStyle.backgroundImage.border"),
            getHint: (path) => readDisplayHint(target, path),
            onChange: (path, value) => pushBlock(target.id, path, value),
            bindTargetBlock: target,
            bindBasePath: "wrapperStyle.backgroundImage.border",
            controlsDisabled: isInspectFollowLocked(
              template,
              target,
              payload,
              "wrapperStyle.backgroundImage.border"
            ),
          })}
        </fieldset>
      </>
    );
  };

  const renderWrapperBackgroundContentSection = () => {
    if (block.type !== "layout" && block.type !== "grid") return null;

    if (layoutHasBackgroundImage(block)) {
      return (
        <>
          {layoutContainerBgTextRow(block, "背景图地址", "wrapperStyle.backgroundImage.src")}
          {layoutContainerBgTextRow(block, "背景替代文本", "wrapperStyle.backgroundImage.alt")}
          {layoutContainerBgTextRow(block, "背景链接地址", "wrapperStyle.backgroundImage.link")}
          <div className="inspector-transform-actions">
            <ShopSecondaryButton
              onClick={() => {
                let nextState = applyBlockField(template, payload, block.id, "wrapperStyle.backgroundImage", null);
                const rawContainerBg = block.wrapperStyle?.backgroundColor;
                if (rawContainerBg === undefined || rawContainerBg === null || rawContainerBg === "") {
                  nextState = applyBlockField(
                    nextState.template,
                    nextState.payload,
                    block.id,
                    "wrapperStyle.backgroundColor",
                    IMAGE_BACKGROUND_FALLBACK_COLOR
                  );
                }
                onUpdate(nextState);
              }}
            >
              关闭背景图
            </ShopSecondaryButton>
          </div>
          {renderWrapperBackgroundImageStyleFields(block)}
        </>
      );
    }

    return (
      <div className="inspector-transform-actions">
        <ShopPrimaryButton
          onClick={() => {
            const patch: Record<string, unknown> = {
              "wrapperStyle.backgroundImage": {
                src: readVariableSeedString(block, "wrapperStyle.backgroundImage.src"),
                alt: readVariableSeedString(block, "wrapperStyle.backgroundImage.alt"),
                link: readVariableSeedString(block, "wrapperStyle.backgroundImage.link"),
                fit: "cover",
                position: "center",
                border: { mode: "unified", width: "0", style: "solid", color: TRANSPARENT_BORDER_COLOR },
                borderRadius: { mode: "unified", radius: "0" },
              },
            };
            pushBlockPatch(block.id, patch);
          }}
        >
          启用背景图
        </ShopPrimaryButton>
      </div>
    );
  };

  /** 结构性 wrapper 编辑：写入字段后协调本子树（fill → contentAlign）。 */
  const applyStructuralWrapperLayoutEdit = (bindPath: string, value: unknown) => {
    if (isInspectFollowLocked(template, block, payload, bindPath)) return;
    const nextState = applyBlockField(template, payload, id, bindPath, value);
    reconcileLayoutStructuralSubtreeInPlace(nextState.template, id);
    onUpdate(nextState);
  };

  const applyWrapperDimensionMode = (
    modePath: "wrapperStyle.widthMode" | "wrapperStyle.heightMode",
    next: string
  ) => {
    applyStructuralWrapperLayoutEdit(modePath, next);
  };

  const applyInlineVariableFromTextBody = (
    textBlock: TextBlock,
    args: {
      kind: "bind" | "create";
      slotId: string;
      label: string;
      defaultValue: string;
      nextTextBody: TextBody;
      valueType?: string;
    }
  ) => {
    let nextState = applyBlockField(template, payload, textBlock.id, "props.textBody", args.nextTextBody);

    const bound = applyInlineVariableFromTextBodySelection(
      nextState.template,
      nextState.payload,
      textBlock.id,
      {
        slotId: args.slotId,
        label: args.label,
        defaultValue: args.defaultValue,
        nextTextBody: args.nextTextBody,
        mode: args.kind,
        valueType: args.valueType,
      }
    );
    const body = normalizeTextBody(bound.template.blocks[textBlock.id]?.props.textBody);
    if (!body) {
      onUpdate(bound);
      return;
    }
    onUpdate(commitTextBodySnapshot(bound.template, bound.payload, textBlock.id, body));
  };


  const wrapperBg = readDisplayColorString(block, "wrapperStyle.backgroundColor");
  const wrapperBindMeta = bindingMeta(block, "wrapperStyle.backgroundColor");

  const rawWrapperWm = rd(block, "wrapperStyle.widthMode");
  const wrapperWidthModeUi =
    rawWrapperWm === "hug" || rawWrapperWm === "fill" || rawWrapperWm === "fixed"
      ? String(rawWrapperWm)
      : "fill";
  const disableWidthFillByParentRule = isChildFillBlockedByParentHug(parentBlock, "width");
  const widthModeHint = getWrapperModeHint("width", disableWidthFillByParentRule);
  const rawWrapperHm = rd(block, "wrapperStyle.heightMode");
  const wrapperHeightModeUi =
    rawWrapperHm === "hug" || rawWrapperHm === "fill" || rawWrapperHm === "fixed"
      ? String(rawWrapperHm)
      : "hug";
  const disableHeightFillByParentRule = isChildFillBlockedByParentHug(parentBlock, "height");
  const heightModeHint = getWrapperModeHint("height", disableHeightFillByParentRule);
  const onWrapperHeightModeChange = (next: string) => {
    if (isBindPathLocked(id, "wrapperStyle.heightMode")) return;
    applyWrapperDimensionMode("wrapperStyle.heightMode", next);
  };
  const onWrapperFixedHeightChange = (next: string) => {
    if (isBindPathLocked(id, "wrapperStyle.height")) return;
    onUpdate(applyBlockField(template, payload, id, "wrapperStyle.height", next));
  };

  if (canvasMode) {
    if (root.type !== "emailRoot") {
      return <div className="inspector">根节点类型错误（必须为 emailRoot）</div>;
    }
    return (
      <div className="inspector">
        <div className="inspector__title-row">
          <h2 className="inspector__title">画布设置（邮件根节点）</h2>
          <button
            type="button"
            className="inspector__title-copy-btn"
            onClick={() => void onCopyLocator()}
            title="复制定位信息"
            aria-label="复制定位信息"
          >
            ⧉
          </button>
        </div>
        <AdminInspectorTabs
          active={inspectorTab}
          onChange={setInspectorTabPersist}
          contentPane={
            <section className="inspector__section">
              <h3 className="inspector__subtitle">组件 · 内容</h3>
              {root.wrapperStyle?.backgroundImage ? (
                <>
                  <Field label="背景图地址" headerExtra={fieldBindHeader(root, "wrapperStyle.backgroundImage.src")}>
                    <ShopInput
                      type="text"
                      value={String(rd(root, "wrapperStyle.backgroundImage.src") ?? "")}
                      disabled={isInspectFollowLocked(template, root, payload, "wrapperStyle.backgroundImage.src")}
                      onChange={(e) => pushRoot("wrapperStyle.backgroundImage.src", e.target.value)}
                    />
                  </Field>
                  <Field label="背景替代文本" headerExtra={fieldBindHeader(root, "wrapperStyle.backgroundImage.alt")}>
                    <ShopCountInput
                      value={String(rd(root, "wrapperStyle.backgroundImage.alt") ?? "")}
                      maxLength={100}
                      disabled={isInspectFollowLocked(template, root, payload, "wrapperStyle.backgroundImage.alt")}
                      onChange={(next) => pushRoot("wrapperStyle.backgroundImage.alt", next)}
                    />
                  </Field>
                  <Field label="背景链接地址" headerExtra={fieldBindHeader(root, "wrapperStyle.backgroundImage.link")}>
                    <ShopInput
                      type="text"
                      value={String(rd(root, "wrapperStyle.backgroundImage.link") ?? "")}
                      disabled={isInspectFollowLocked(template, root, payload, "wrapperStyle.backgroundImage.link")}
                      onChange={(e) => pushRoot("wrapperStyle.backgroundImage.link", e.target.value)}
                    />
                  </Field>
                  <div className="inspector-transform-actions">
                    <ShopSecondaryButton onClick={() => pushRoot("wrapperStyle.backgroundImage", null)}>
                      关闭背景图
                    </ShopSecondaryButton>
                  </div>
                  {renderWrapperBackgroundImageStyleFields(root)}
                </>
              ) : (
                <div className="inspector-transform-actions">
                  <ShopPrimaryButton
                    onClick={() =>
                      pushRoot("wrapperStyle.backgroundImage", {
                        src: "",
                        alt: "",
                        link: "",
                        fit: "cover",
                        position: "center",
                        border: {
                          mode: "unified",
                          width: "0",
                          style: "solid",
                          color: TRANSPARENT_BORDER_COLOR,
                        },
                        borderRadius: { mode: "unified", radius: "0" },
                      })
                    }
                  >
                    启用背景图
                  </ShopPrimaryButton>
                </div>
              )}
            </section>
          }
          stylePane={
            <>
              <h3 className="inspector__subtitle">外层容器 · 样式</h3>
              <section className="inspector__section">
                <ColorField
                  label="内容区背景色"
                  value={readDisplayColorString(root, "props.backgroundColor")}
                  onChange={(v) => pushRoot("props.backgroundColor", v)}
                  disabled={isInspectFollowLocked(template, root, payload, "props.backgroundColor")}
                  headerExtra={fieldBindHeader(root, "props.backgroundColor")}
                />
              </section>
              <h3 className="inspector__subtitle">画布描边</h3>
              <section className="inspector__section">
                <fieldset className="inspector-bound-fieldset">
                  {renderBorderEditor({
                    labelPrefix: "",
                    basePath: "props.border",
                    value: rd(root, "props.border"),
                    onChange: pushRoot,
                    bindTargetBlock: root,
                    bindBasePath: "props.border",
                    controlsDisabled: isInspectFollowLocked(template, root, payload, "props.border"),
                  })}
                </fieldset>
              </section>
            </>
          }
          layoutPane={
            <>
              <h3 className="inspector__subtitle">组件 · 布局</h3>
              <section className="inspector__section">
                <fieldset className="inspector-bound-fieldset">
                  {blockBackgroundImageRenderable(root) ? (
                    <p className="inspector__muted">
                      已启用内容区底图：页面内边距仅作用于叠放内容。
                    </p>
                  ) : null}
                  {renderSpacingEditor({
                    labelPrefix: "页面",
                    basePath: "props.padding",
                    value: rd(root, "props.padding"),
                    onChange: pushRoot,
                    bindTargetBlock: root,
                    bindBasePath: "props.padding",
                    controlsDisabled: isInspectFollowLocked(template, root, payload, "props.padding"),
                  })}
                </fieldset>
                {overlayStackGapModeRow(root)}
                {rd(root, "props.gapMode") !== "auto"
                  ? renderUnitInputRow({
                      label: "间距",
                      value: readDisplayString(root, "props.gap") || "0",
                      unit: "px",
                      hint: readDisplayHint(root, "props.gap"),
                      onChange: (next) => pushRoot("props.gap", next.trim() || "0"),
                      disabled: isInspectFollowLocked(template, root, payload, "props.gap"),
                      headerExtra: fieldBindHeader(root, "props.gap"),
                    })
                  : null}
              </section>
              <h3 className="inspector__subtitle">外层容器 · 布局</h3>
              <section className="inspector__section">
                {(() => {
                  const w = root.props.width;
                  const widthStr = typeof w === "string" ? w.trim() : "";
                  const widthOk = widthStr === EMAIL_ROOT_FIXED_WIDTH;
                  return (
                    <>
                      {!widthOk ? (
                        <div className="app__banner app__banner--warn">
                          校验提示：{`blocks.${root.id}.props.width`}：{emailRootWidthMismatchReason(w)}
                        </div>
                      ) : null}
                      <Field label="画布宽度（固定）">
                        <ShopUnitInput
                          value={widthStr || EMAIL_ROOT_FIXED_WIDTH}
                          unit="px"
                          onChange={() => undefined}
                          disabled
                        />
                      </Field>
                    </>
                  );
                })()}
              </section>
            </>
          }
        />
        {repeatModal}
      </div>
    );
  }

  return (
    <div className="inspector">
      <div className="inspector__title-row">
        <InspectorBlockNameField
          blockId={id}
          displayName={blockDisplayLabel}
          onCommit={(name) =>
            onUpdate({ template: applyBlockMetaName(template, id, name), payload })
          }
        />
        <button
          type="button"
          className="inspector__title-copy-btn"
          onClick={() => void onCopyLocator()}
          title="复制定位信息"
          aria-label="复制定位信息"
        >
          ⧉
        </button>
      </div>
      {repeatExpansionGroupCount > 1 ? (
        <p className="inspector__repeat-group-hint" title="同一行模板在列表中的全部展开项已一并选中">
          列表展开：同组共 {repeatExpansionGroupCount} 项（编辑作用于行模板）
        </p>
      ) : null}

      <AdminInspectorTabs
        active={inspectorTab}
        onChange={setInspectorTabPersist}
        layoutPane={
          <>
          {block.type === "layout" || block.type === "image" ? (
            <>
              <h3 className="inspector__subtitle">
                {block.type === "image" ? "组件 · 叠放布局" : "组件 · 布局"}
              </h3>
              <section className="inspector__section">
                <Field label="排列方向">
                  <div className="inspector-text-toggle-row" role="toolbar" aria-label="排列方向">
                    <ShopSecondaryButton
                      htmlType="button"
                      aria-label="纵向排列"
                      aria-pressed={(block.props.direction ?? "vertical") === "vertical"}
                      className={`inspector-text-toggle-row__btn ${(block.props.direction ?? "vertical") === "vertical" ? "inspector-text-toggle-row__btn--active" : ""}`}
                      onClick={() => applyStructuralWrapperLayoutEdit("props.direction", "vertical")}
                    >
                      纵向排列
                    </ShopSecondaryButton>
                    <ShopSecondaryButton
                      htmlType="button"
                      aria-label="横向排列"
                      aria-pressed={(block.props.direction ?? "vertical") === "horizontal"}
                      className={`inspector-text-toggle-row__btn ${(block.props.direction ?? "vertical") === "horizontal" ? "inspector-text-toggle-row__btn--active" : ""}`}
                      onClick={() => applyStructuralWrapperLayoutEdit("props.direction", "horizontal")}
                    >
                      横向排列
                    </ShopSecondaryButton>
                  </div>
                </Field>
                {overlayStackGapModeRow(block)}
                {rd(block, "props.gapMode") !== "auto"
                  ? overlayStackTextRow(block, "间距", "props.gap")
                  : null}
              </section>
            </>
          ) : null}

          {block.type === "grid" ? (
            <>
              <h3 className="inspector__subtitle">组件 · 布局</h3>
              <section className="inspector__section">
                <Field label="每行列数">
                  <ShopInput
                    type="number"
                    min={1}
                    value={Number(block.props.columns ?? 2)}
                    onChange={(e) =>
                      pushBlock(id, "props.columns", Number(e.target.value) || 1)
                    }
                  />
                </Field>
                {gridTextRow(block, "间距", "props.gap")}
                {renderSelectInputRow({
                  label: "单元格宽度模式",
                  value: rd(block, "props.cellWidthMode") === "fixed" ? "fixed" : "auto",
                  hint: "只控制每个格子的宽度；grid 自己的外层宽度仍由下方「外层容器 · 布局」控制。",
                  onChange: (next) => {
                    let nextState = applyBlockField(template, payload, block.id, "props.cellWidthMode", next);
                    if (next === "fixed" && !readDisplayString(block, "props.cellWidth").trim()) {
                      nextState = applyBlockField(
                        nextState.template,
                        nextState.payload,
                        block.id,
                        "props.cellWidth",
                        GRID_FIXED_CELL_WIDTH_DEFAULT
                      );
                    }
                    onUpdate(nextState);
                  },
                  disabled: isInspectFollowLocked(template, block, payload, "props.cellWidthMode"),
                  headerExtra: fieldBindHeader(block, "props.cellWidthMode"),
                  options: [
                    { value: "auto", label: "自动均分（auto）" },
                    { value: "fixed", label: "固定宽度（fixed）" },
                  ],
                })}
                {rd(block, "props.cellWidthMode") === "fixed"
                  ? gridTextRow(block, "单元格宽度", "props.cellWidth")
                  : null}
                {renderSelectInputRow({
                  label: "单元格高度模式",
                  value: rd(block, "props.cellHeightMode") === "fixed" ? "fixed" : "content-max",
                  hint: "content-max 会按行取该行内最高内容统一格高；fixed 使用单元格高度。",
                  onChange: (next) => {
                    let nextState = applyBlockField(template, payload, block.id, "props.cellHeightMode", next);
                    if (next === "fixed" && !readDisplayString(block, "props.cellHeight").trim()) {
                      nextState = applyBlockField(
                        nextState.template,
                        nextState.payload,
                        block.id,
                        "props.cellHeight",
                        GRID_FIXED_CELL_HEIGHT_DEFAULT
                      );
                    }
                    onUpdate(nextState);
                  },
                  disabled: isInspectFollowLocked(template, block, payload, "props.cellHeightMode"),
                  headerExtra: fieldBindHeader(block, "props.cellHeightMode"),
                  options: [
                    { value: "content-max", label: "按行内容最大高度（content-max）" },
                    { value: "fixed", label: "固定高度（fixed）" },
                  ],
                })}
                {rd(block, "props.cellHeightMode") === "fixed"
                  ? gridTextRow(block, "单元格高度", "props.cellHeight")
                  : null}
              </section>
            </>
          ) : null}

          <h3 className="inspector__subtitle">外层容器 · 布局</h3>
          <section className="inspector__section">
            {contentAlignAxisRows(
              block,
              "容器内内容摆放",
              "wrapperStyle.contentAlign.horizontal",
              "wrapperStyle.contentAlign.vertical"
            )}
            {renderSelectInputRow({
              label: "宽度模式",
              value: wrapperWidthModeUi,
              hint: widthModeHint,
              onChange: (next) => applyWrapperDimensionMode("wrapperStyle.widthMode", next),
              options: [
                { value: "hug", label: "跟随内容（hug）" },
                {
                  value: "fill",
                  label: "铺满父级（fill）",
                  disabled: disableWidthFillByParentRule,
                  title: getFillOptionTitle("width", disableWidthFillByParentRule),
                },
                { value: "fixed", label: "自定义（fixed）" },
              ],
            })}
            {renderSelectInputRow({
              label: "高度模式",
              value: wrapperHeightModeUi,
              hint: heightModeHint,
              onChange: onWrapperHeightModeChange,
              options: [
                { value: "hug", label: "跟随内容（hug）" },
                {
                  value: "fill",
                  label: "铺满父级（fill）",
                  disabled: disableHeightFillByParentRule,
                  title: getFillOptionTitle("height", disableHeightFillByParentRule),
                },
                { value: "fixed", label: "自定义（fixed）" },
              ],
            })}
            {wrapperWidthModeUi === "fixed"
              ? renderUnitInputRow({
                  label: "固定宽度",
                  value: readDisplayString(block, "wrapperStyle.width"),
                  unit: "px",
                  hint: readDisplayHint(block, "wrapperStyle.width"),
                  onChange: (next) => pushBlock(id, "wrapperStyle.width", next),
                })
              : null}
            {wrapperHeightModeUi === "fixed"
              ? renderUnitInputRow({
                  label: "固定高度",
                  value: readDisplayString(block, "wrapperStyle.height"),
                  unit: "px",
                  hint: readDisplayHint(block, "wrapperStyle.height"),
                  onChange: onWrapperFixedHeightChange,
                })
              : null}
            <fieldset className="inspector-bound-fieldset">
              {renderWrapperPaddingEditor(block)}
            </fieldset>
          </section>
          </>
        }
        listPane={showRepeatRegionPanel ? repeatRegionPanel : undefined}
        visibilityPane={visibilityPanel}
        stylePane={
          <>
          {block.type === "text" ? (
            <>
              <h3 className="inspector__subtitle">组件 · 样式</h3>
              <section className="inspector__section">
                {textTextRow(block, "字号", "props.fontSize")}
                {textColorRow(block, "文字颜色", "props.color")}
              </section>
            </>
          ) : null}

          {block.type === "button" ? (
            <>
              <h3 className="inspector__subtitle">组件 · 样式</h3>
              <section className="inspector__section">
                {buttonBodyWidthRows(block)}
                {buttonColorRow(block, "按钮背景色", "props.buttonStyle.backgroundColor")}
                {buttonColorRow(block, "按钮文字颜色", "props.buttonStyle.textColor")}
                {buttonFontSizeRow(block)}
                {buttonTextStyleToggleRow(block)}
                <fieldset className="inspector-bound-fieldset">
                  {renderBorderRadiusEditor({
                    labelPrefix: "按钮",
                    basePath: "props.buttonStyle.borderRadius",
                    value: rd(block, "props.buttonStyle.borderRadius"),
                    getHint: (path) => readDisplayHint(block, path),
                    onChange: (path, value) => pushBlock(block.id, path, value),
                    bindTargetBlock: block,
                    bindBasePath: "props.buttonStyle.borderRadius",
                    controlsDisabled: isInspectFollowLocked(
                      template,
                      block,
                      payload,
                      "props.buttonStyle.borderRadius"
                    ),
                  })}
                </fieldset>
                <fieldset className="inspector-bound-fieldset">
                  {renderBorderEditor({
                    labelPrefix: "按钮",
                    basePath: "props.buttonStyle.border",
                    value: rd(block, "props.buttonStyle.border"),
                    getHint: (path) => readDisplayHint(block, path),
                    onChange: (path, value) => pushBlock(block.id, path, value),
                    bindTargetBlock: block,
                    bindBasePath: "props.buttonStyle.border",
                    controlsDisabled: isInspectFollowLocked(template, block, payload, "props.buttonStyle.border"),
                  })}
                </fieldset>
              </section>
            </>
          ) : null}

          {block.type === "divider" ? (
            <>
              <h3 className="inspector__subtitle">组件 · 样式</h3>
              <section className="inspector__section">
                {dividerColorRow(block, "分割线颜色", "props.color")}
                {fillFixedWidthRows(block, {
                  modePath: "props.lineWidthMode",
                  widthPath: "props.lineWidth",
                  modeLabel: "线条宽度模式",
                  widthLabel: "线条宽度",
                  hint: "只控制分割线本体长度；外层容器宽度仍在「布局」页签的「外层容器 · 布局」中配置。",
                })}
                {dividerTextRow(block, "线条粗细", "props.height")}
              </section>
            </>
          ) : null}

          {block.type === "progress" ? (
            <>
              <h3 className="inspector__subtitle">进度条 · 样式</h3>
              <section className="inspector__section">
                {renderColorInputRow({
                  label: "进度槽底色",
                  value: readDisplayColorString(block, "props.trackColor") || "#E8DCC8",
                  onChange: (next) => pushBlock(block.id, "props.trackColor", next),
                  disabled: isInspectFollowLocked(template, block, payload, "props.trackColor"),
                  headerExtra: fieldBindHeader(block, "props.trackColor"),
                })}
                {renderColorInputRow({
                  label: "已完成段颜色",
                  value: readDisplayColorString(block, "props.fillColor") || "#C9A227",
                  onChange: (next) => pushBlock(block.id, "props.fillColor", next),
                  disabled: isInspectFollowLocked(template, block, payload, "props.fillColor"),
                  headerExtra: fieldBindHeader(block, "props.fillColor"),
                })}
                {fillFixedWidthRows(block, {
                  modePath: "props.barWidthMode",
                  widthPath: "props.barWidth",
                  modeLabel: "条带宽度模式",
                  widthLabel: "条带宽度",
                  hint: "只控制进度条条带本体宽度；外层容器宽度仍在「布局」页签的「外层容器 · 布局」中配置。",
                })}
                {progressBarHeightRow(block)}
                <fieldset className="inspector-bound-fieldset">
                  {renderBorderRadiusEditor({
                    labelPrefix: "条带",
                    basePath: "props.barBorderRadius",
                    value: rd(block, "props.barBorderRadius"),
                    getHint: (path) => readDisplayHint(block, path),
                    onChange: (path, value) => pushBlock(block.id, path, value),
                    bindTargetBlock: block,
                    bindBasePath: "props.barBorderRadius",
                    controlsDisabled: isInspectFollowLocked(
                      template,
                      block,
                      payload,
                      "props.barBorderRadius"
                    ),
                  })}
                </fieldset>
              </section>
            </>
          ) : null}

          {block.type === "icon" ? (
            <>
              <h3 className="inspector__subtitle">组件 · 样式</h3>
              <section className="inspector__section">
                {iconColorRow(block, "图标颜色", "props.color")}
                {iconUnitRow(block, "尺寸", "props.size")}
              </section>
            </>
          ) : null}

          <h3 className="inspector__subtitle">外层容器 · 样式</h3>
          <section className="inspector__section">
            <ColorField
              label="容器背景色"
              value={wrapperBg}
              onChange={(v) => pushBlock(id, "wrapperStyle.backgroundColor", v)}
              hint={wrapperBindMeta.fromPayload ? "来自变量赋值" : undefined}
              disabled={isInspectFollowLocked(template, block, payload, "wrapperStyle.backgroundColor")}
              headerExtra={fieldBindHeader(block, "wrapperStyle.backgroundColor")}
            />
            <fieldset className="inspector-bound-fieldset">
              {renderBorderRadiusEditor({
                labelPrefix: "容器",
                basePath: "wrapperStyle.borderRadius",
                value: rd(block, "wrapperStyle.borderRadius"),
                getHint: (path) => readDisplayHint(block, path),
                onChange: (path, value) => pushBlock(id, path, value),
                bindTargetBlock: block,
                bindBasePath: "wrapperStyle.borderRadius",
                controlsDisabled: isInspectFollowLocked(template, block, payload, "wrapperStyle.borderRadius"),
              })}
            </fieldset>
            <fieldset className="inspector-bound-fieldset">
              {renderBorderEditor({
                labelPrefix: "容器",
                basePath: "wrapperStyle.border",
                value: rd(block, "wrapperStyle.border"),
                getHint: (path) => readDisplayHint(block, path),
                onChange: (path, value) => pushBlock(id, path, value),
                bindTargetBlock: block,
                bindBasePath: "wrapperStyle.border",
                controlsDisabled: isInspectFollowLocked(template, block, payload, "wrapperStyle.border"),
              })}
            </fieldset>
          </section>
          </>
        }
        contentPane={
          <div
            aria-disabled={resolvedRepeatContext ? true : undefined}
            style={resolvedRepeatContext ? { opacity: 0.55, pointerEvents: "none" } : undefined}
          >
          <h3 className="inspector__subtitle">组件 · 内容</h3>
          <section className="inspector__section">
            {block.type === "text" ? (
              <>
                <Field
                  label="正文（结构化）"
                  hint={
                    textBodyRepeatListItemBinding
                      ? `正文由列表「${textBodyRepeatListItemBinding.collectionLabel}」的字段「${textBodyRepeatListItemBinding.itemFieldLabel}」驱动，此处只读预览；可点胶囊切换列表字段，或到「列表」Tab 调整映射。`
                      : textBodyContentMode === "wholeVariable"
                        ? "整段正文跟随 payload 变量，此处只读预览合并结果；请在「变量赋值」中修改。"
                        : textBodyContentMode === "inlineVariable"
                          ? "正文可编辑；紫色边框胶囊内为 payload 变量回显（有链接时为蓝色下划线）。点击胶囊可改绑，变量值在「变量赋值」中修改。"
                          : "在正文中选中范围即可设置粗斜体、装饰与链接；工具条与「样式」里的字号、文字颜色配合使用，避免在两处重复切换区块默认字符样式。"
                  }
                  headerExtra={
                    textBodyForEditor ? (
                      <TextBodyFieldSource
                        template={template}
                        payload={payload}
                        block={block}
                        textBody={textBodyForEditor}
                        mergedTemplate={previewFlatTemplate}
                        effectiveDesignTokens={effectiveDesignTokens}
                        onUpdate={onUpdate}
                        onTemplateChange={onTemplateChange}
                        onAggregateLiteralize={
                          previewFlatTemplate
                            ? () => {
                                const baked = bakeTextBodyToLiteralByMode(
                                  template,
                                  payload,
                                  block.id,
                                  previewFlatTemplate,
                                  (bindPath) => readDisplayString(block, bindPath)
                                );
                                const body = normalizeTextBody(
                                  baked.template.blocks[block.id]?.props.textBody
                                );
                                if (!body) {
                                  onUpdate(baked);
                                  return;
                                }
                                onUpdate(commitTextBodySnapshot(baked.template, baked.payload, block.id, body));
                              }
                            : undefined
                        }
                      />
                    ) : undefined
                  }
                >
                  {textBodyReadOnlyPreview ? (
                    <div
                      className="text-rich-editor__area text-rich-editor__area--readonly"
                      aria-readonly="true"
                      dangerouslySetInnerHTML={{
                        __html: renderTextBodyToHtml(
                          normalizeTextBody(
                            (mergedBlockForId(block.id) ?? block).props.textBody
                          ) ?? textBodyForEditor!,
                          textBodyDefaults(block)
                        ),
                      }}
                    />
                  ) : (
                    <TextRichEditor
                      editorKey={`${block.id}-${textBodyContentMode}`}
                      textBody={textBodyForEditor!}
                      defaults={textBodyDefaults(block)}
                      variableRuns={
                        textBodyContentMode === "inlineVariable" ? textVariableRuns : []
                      }
                      onVariablePillClick={setTextVarPillModalMeta}
                      onVariablePillDetach={(meta) => {
                        if (!previewFlatTemplate) return;
                        const detached = detachRunVariableToLiteral(
                          template,
                          payload,
                          block.id,
                          meta.textBindPath,
                          meta.displayText,
                          previewFlatTemplate
                        );
                        const body = normalizeTextBody(detached.template.blocks[block.id]?.props.textBody);
                        if (!body) {
                          onUpdate(detached);
                          return;
                        }
                        onUpdate(commitTextBodySnapshot(detached.template, detached.payload, block.id, body));
                      }}
                      onVariableRunLinkChange={(meta, href) => {
                        let state = { template, payload };
                        if (meta.linkBindPath) {
                          const linkSpec = block.bindings?.[meta.linkBindPath];
                          if (linkSpec?.mode === "variable" && linkSpec.allowExternal) {
                            state = applyBlockField(
                              state.template,
                              state.payload,
                              block.id,
                              meta.linkBindPath,
                              href
                            );
                          }
                        }
                        const linked = setRunLinkBinding(
                          state.template,
                          state.payload,
                          block.id,
                          meta.paragraphIndex,
                          meta.runIndex,
                          href
                        );
                        const body = normalizeTextBody(linked.template.blocks[block.id]?.props.textBody);
                        if (!body) {
                          onUpdate(linked);
                          return;
                        }
                        onUpdate(commitTextBodySnapshot(linked.template, linked.payload, block.id, body));
                      }}
                      onVariableRunLinkClear={(meta) => {
                        const cleared = clearRunLink(template, payload, block.id, meta.paragraphIndex, meta.runIndex);
                        const body = normalizeTextBody(cleared.template.blocks[block.id]?.props.textBody);
                        if (!body) {
                          onUpdate(cleared);
                          return;
                        }
                        onUpdate(commitTextBodySnapshot(cleared.template, cleared.payload, block.id, body));
                      }}
                      payload={payload}
                      externalVariableSlots={externalVariableSlots}
                      onInlineVariableFromSelection={(args) => applyInlineVariableFromTextBody(block, args)}
                      onCommit={(next: TextBody) => {
                        if (textBodyReadOnlyPreview) return;
                        if (isBindPathLocked(block.id, "props.textBody")) {
                          return;
                        }
                        onUpdate(applyBlockField(template, payload, block.id, "props.textBody", next));
                      }}
                    />
                  )}
                </Field>
                <TextBodyVariablePillModal
                  visible={textVarPillModalMeta !== null}
                  meta={textVarPillModalMeta}
                  slots={externalVariableSlots}
                  payload={payload}
                  onClose={() => setTextVarPillModalMeta(null)}
                  onConfirmSlot={(slot) => {
                    if (!textVarPillModalMeta) return;
                    const valueType =
                      slot.valueType === "url" ||
                      slot.valueType === "image" ||
                      slot.valueType === "color" ||
                      slot.valueType === "number" ||
                      slot.valueType === "boolean"
                        ? slot.valueType
                        : "string";
                    const bound = applyRunVariableSlotBinding(
                      template,
                      payload,
                      block.id,
                      textVarPillModalMeta.textBindPath,
                      {
                        slotId: slot.slotId,
                        mode: "variable",
                        valueType,
                        allowExternal: true,
                        fieldKind: "content",
                        label: slot.label ?? slot.slotId,
                        defaultValue: textVarPillModalMeta.displayText,
                      },
                      textVarPillModalMeta.displayText
                    );
                    const body = normalizeTextBody(bound.template.blocks[block.id]?.props.textBody);
                    if (!body) {
                      onUpdate(bound);
                      setTextVarPillModalMeta(null);
                      return;
                    }
                    onUpdate(commitTextBodySnapshot(bound.template, bound.payload, block.id, body));
                    setTextVarPillModalMeta(null);
                  }}
                  onDetach={() => {
                    if (!textVarPillModalMeta || !previewFlatTemplate) return;
                    const detached = detachRunVariableToLiteral(
                      template,
                      payload,
                      block.id,
                      textVarPillModalMeta.textBindPath,
                      textVarPillModalMeta.displayText,
                      previewFlatTemplate
                    );
                    const body = normalizeTextBody(detached.template.blocks[block.id]?.props.textBody);
                    if (!body) {
                      onUpdate(detached);
                      setTextVarPillModalMeta(null);
                      return;
                    }
                    onUpdate(commitTextBodySnapshot(detached.template, detached.payload, block.id, body));
                    setTextVarPillModalMeta(null);
                  }}
                />
              </>
            ) : null}

            {block.type === "image" ? (
              <>
                {layoutContainerBgTextRow(block, "图片地址", "wrapperStyle.backgroundImage.src")}
                {layoutContainerBgTextRow(block, "替代文本", "wrapperStyle.backgroundImage.alt")}
                {layoutContainerBgTextRow(block, "链接地址", "wrapperStyle.backgroundImage.link")}
                {renderWrapperBackgroundImageStyleFields(block, {
                  fitLabel: "填充策略",
                  positionLabel: "画面位置",
                  borderRadiusLabelPrefix: "图片",
                  borderLabelPrefix: "图片",
                  cropRegionHint: true,
                })}
              </>
            ) : null}

            {renderWrapperBackgroundContentSection()}

            {block.type === "button" ? (
              <>
                {buttonTextRow(block, "按钮文字", "props.text")}
                {buttonTextRow(block, "链接地址", "props.link")}
              </>
            ) : null}

            {block.type === "progress" ? (
              <>
                <Field
                  label="当前进度值"
                  hint="与满槽值同量纲；可绑定 payload 数值变量。"
                  headerExtra={fieldBindHeader(block, "props.value")}
                >
                  <ShopInput
                    type="number"
                    value={String(
                      typeof rd(block, "props.value") === "number" &&
                        Number.isFinite(rd(block, "props.value") as number)
                        ? (rd(block, "props.value") as number)
                        : 0
                    )}
                    disabled={isInspectFollowLocked(template, block, payload, "props.value")}
                    onChange={(e) => {
                      const t = e.target.value.trim();
                      const n = t === "" ? 0 : Number(t);
                      if (Number.isFinite(n)) pushBlock(block.id, "props.value", n);
                    }}
                  />
                </Field>
                <Field
                  label="满槽刻度"
                  hint="须为正数；可绑定 payload 数值变量。"
                  headerExtra={fieldBindHeader(block, "props.max")}
                >
                  <ShopInput
                    type="number"
                    value={String(
                      typeof rd(block, "props.max") === "number" &&
                        Number.isFinite(rd(block, "props.max") as number)
                        ? (rd(block, "props.max") as number)
                        : 100
                    )}
                    disabled={isInspectFollowLocked(template, block, payload, "props.max")}
                    onChange={(e) => {
                      const t = e.target.value.trim();
                      const n = t === "" ? 100 : Number(t);
                      if (Number.isFinite(n) && n > 0) pushBlock(block.id, "props.max", n);
                    }}
                  />
                </Field>
              </>
            ) : null}

            {block.type === "icon" ? (
              <>
                <IconSrcEditor
                  block={block}
                  srcValue={readDisplayString(block, "props.src")}
                  srcLocked={isBindPathLocked(block.id, "props.src")}
                  srcHeaderExtra={fieldBindHeader(block, "props.src")}
                  onPatch={(patch) => pushBlockPatch(block.id, patch)}
                />
                {iconTextRow(block, "链接地址", "props.link")}
              </>
            ) : null}

            {![
              "layout",
              "text",
              "image",
              "button",
              "divider",
              "grid",
              "icon",
              "progress",
            ].includes(block.type) ? (
              <p className="inspector__muted">该类型暂无专用表单，可在后续迭代中扩展属性面板。</p>
            ) : null}
            {block.type === "divider" || block.type === "progress" ? (
              <InspectorEmptyTabHint />
            ) : null}
            {block.type === "grid" && !layoutHasBackgroundImage(block) ? (
              <InspectorEmptyTabHint />
            ) : null}
          </section>
          </div>
        }
      />
      {repeatModal}
    </div>
  );
}
