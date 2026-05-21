import { useEffect, useMemo, useState } from "react";
import ColumnOutlined from "@shoplazza/sds-icons/ColumnOutlined";
import MenuOutlined from "@shoplazza/sds-icons/MenuOutlined";
import CopyOutlined from "@shoplazza/sds-icons/CopyOutlined";
import { message } from "@shoplazza/sds";
import type {
  BorderRadiusValue,
  BorderValue,
  EmailBlock,
  EmailPayload,
  EmailTemplate,
  RepeatFieldMapping,
  SpacingValue,
  WrapperStyle,
} from "../types/email";
import { applyBlockField, bindingMeta } from "../lib/applyEdit";
import { readInspectorDisplayFontFamily, readInspectorDisplayValue } from "../lib/inspectorBindingDisplay";
import { blockTypeLabel } from "../lib/blockTypeLabel";
import {
  coercePersistedFontFamily,
  EMAIL_FONT_FAMILY_OPTIONS,
} from "../font-family-contract";
import { Field } from "./ui/Field";
import { ColorField } from "./ui/ColorField";
import { AlignmentGrid } from "./ui/AlignmentGrid";
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
import { buildInspectorDebugClipboardText } from "../lib/buildInspectorDebugClipboardText";
import {
  getFillOptionTitle,
  getWrapperModeHint,
  isChildFillBlockedByParentHug,
} from "../lib/wrapperFillConstraint";
import { placementParentKindForBlock } from "../lib/placementParentContext";
import {
  normalizeBlockWrapperPlacement,
  resolvePlacementConfigurability,
  resolveRelativePlacementUiMode,
} from "../lib/placementConfigurability";
import { RelativePlacementControl } from "./ui/RelativePlacementControl";
import { RepeatRegionBindModal } from "./RepeatRegionBindModal";
import { RepeatRegionInspectorSummary } from "./RepeatRegionInspectorSummary";
import {
  BuiltinCollectionRulesFields,
  readBuiltinRulesFromPayloadSlot,
} from "./BuiltinCollectionRulesFields";
import {
  patchPayloadBuiltinCollectionExtract,
  patchPayloadBuiltinCollectionSort,
} from "../lib/collectionBuiltinRulesPayload";
import type { BuiltinCollectionExtract } from "../payload-contract/collection-builtin-extract";
import type { BuiltinCollectionSortId } from "../payload-contract/collection-builtin-sort";
import { listCollectionSlotIdsForExtract } from "../lib/resolveBuiltinCollectionItems";
import { buildPlacementResolveInputFromWrapper } from "../lib/resolvePlacement";
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
import { getTextBodyContentMode } from "../lib/textBodyContentMode";
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
import type { TextBodyV1 } from "../types/email";
import type { ExpandedTheme } from "../types/theme";
import type { TokenPresets } from "../types/tokenPreset";
import type { ReactNode } from "react";
import { AdminInspectorTabs, type InspectorMainTab } from "./AdminInspectorTabs";
import { IconSrcEditor } from "./IconSrcEditor";
import { InspectorFieldSource } from "./InspectorFieldSource";
import { getInspectFieldBindMode, isInspectFollowLocked } from "../lib/inspectFieldBindMode";
import { mergeTemplatePayload } from "../lib/merge";
import { applyVisibilityRules } from "../lib/visibility";
import { filterSlotsForVisibilityPicker } from "../lib/variableSlotCompatibility";
import {
  buildRepeatPrototypeIdSet,
  collectionItemCount,
  expandRepeatRegions,
  isRepeatHostBlock,
  resolveRepeatContextForBlock,
} from "../lib/repeatRegion";
import { remapRepeatFieldMappingTargets } from "../lib/repeatMaterializedNormalize";
import type { RepeatLoopScope } from "../lib/repeatNestedBinding";
import {
  applyUnifiedRepeatBinding,
  buildRepeatBindPreviewCounts,
  deriveUnifiedRepeatPlanFromTemplate,
  filterChildRepeatMappingTargets,
  filterParentRepeatMappingTargets,
  formatRepeatBindScopePreview,
  childRepeatPrototypeOptionKeyFromBinding,
  isChildRepeatPrototypeReservedByParent,
  listChildRepeatPrototypeOptions,
  listNestedCollectionFields,
  preferredChildRepeatPrototypeOptionKey,
  removeUnifiedRepeatBinding,
  resolveUnifiedBindParentHostId,
} from "../lib/repeatNestedBinding";
import {
  parentScalarItemFieldsFromItemFields,
  pickRepeatCollectionCandidateForHost,
} from "../lib/repeatNestedBindingUi";
import { resolveThemeInTemplate } from "../lib/resolveThemeInTemplate";
import { containsThemeRefDeep, readTemplateFieldOnly } from "../lib/themeBindingEdit";
import { IMAGE_BACKGROUND_FALLBACK_COLOR } from "../lib/imageBackgroundFallback";
import { EMAIL_ROOT_FIXED_WIDTH, emailRootWidthMismatchReason } from "../render-defaults-contract/values";
import { getAtPath } from "../lib/paths";
import { interpolateTextValue } from "../lib/interpolateText";
import { collectPayloadVariableSlots } from "../lib/payloadSlots";
import { ShopSectionModal } from "./ui/ShopSectionModal";
import { classifyField } from "../lib/blockFieldClassification";
import {
  listRepeatMappableContentBindPaths,
  repeatMappingTargetLabel,
} from "../lib/repeatMappableContentBindPaths";
import { isSlotValueType } from "../payload-contract/value-types";
import { isThemeRef, parseThemeRefPath } from "../types/themeRef";
import { previewThemeTokenValue } from "../lib/themeTokenCandidates";
import type { SlotValueType } from "../payload-contract/types";
import { findCollectionFieldByPath } from "../payload-contract/collection-item-fields";
import {
  defaultExpandedCollectionGroupPaths,
  flattenItemFieldsForFieldMap,
} from "../lib/collectionFieldMappingTree";
import {
  getVisibilityOperatorSpec,
  getVisibilityOperatorsForValueType,
  type VisibilityRule,
} from "../visibility-contract";

type Props = {
  template: EmailTemplate;
  payload: EmailPayload;
  selectedBlockId: string | null;
  onUpdate: (next: { template: EmailTemplate; payload: EmailPayload }) => void;
  onTemplateChange: (nextTemplate: EmailTemplate) => void;
  /** 当前场景目录名，用于复制调试定位文案 */
  emailKey?: string | null;
  /** 当前版式变体 id（有 layout-manifest 时） */
  layoutVariantId?: string | null;
  /** 与画布一致的合并/解析后模板，用于 Inspector 展示字面量 */
  mergedTemplate?: EmailTemplate | null;
  /**
   * 当前生效的设计令牌（与画布解析同源）。在 App 未传入 mergedTemplate 时，Inspector 用其本地合并并解析，
   * 以便「改为字面量」能拿到烘焙值（避免字面量选项整行禁用）。
   */
  effectiveDesignTokens?: ExpandedTheme | null;
  /** 与画布同源；字体 Inspector 回显落盘 tokenPresets 值（不经 CSS 栈展开） */
  tokenPresets?: TokenPresets | null;
  /** 多版式场景：用于 payload 孤儿槽展示名（如其它版式仍声明 storeName） */
  /** 含变量草稿的预览 payload；列表规则展示与锚点选项与之对齐 */
  previewPayload?: EmailPayload | null;
  /** 从区块 Inspector 直接写入 payload 后，丢弃该槽未保存草稿以免与真源冲突 */
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
type RepeatPrototypeOption = {
  key: string;
  hostId: string;
  prototypeChildIds: string[];
  label: string;
  description: string;
  source: "container" | "leaf-self" | "leaf-parent" | "global";
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
  itemFields?: NonNullable<EmailBlock["repeat"]>["itemFields"];
  minItems?: number;
  maxItems?: number;
};
const BORDER_DEFAULT_HINT = "默认值：宽度 0、样式 solid、颜色 rgba(0,0,0,0)（透明）。";
const RADIUS_DEFAULT_HINT = "默认值：0。";
const SPACING_DEFAULT_HINT = "默认值：0。";
const GRID_FIXED_CELL_WIDTH_DEFAULT = "160px";
const GRID_FIXED_CELL_HEIGHT_DEFAULT = "220px";
const TRANSPARENT_BORDER_COLOR = "rgba(0,0,0,0)";
const BORDER_STYLE_OPTIONS: Array<{ value: BorderStyleOption; label: string }> = [
  { value: "solid", label: "实线（solid）" },
  { value: "dashed", label: "虚线（dashed）" },
  { value: "dotted", label: "点线（dotted）" },
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

/** 列表重复可选变量：仅 payload.slots 中声明的 collection 槽（与变量面板一致） */
function buildHostRepeatPrototypeOptions(
  template: EmailTemplate,
  hostId: string
): RepeatPrototypeOption[] {
  const host = template.blocks[hostId];
  if (!host || !isRepeatHostBlock(host)) return [];
  return host.children
    .filter((childId) => Boolean(template.blocks[childId]))
    .map((childId) => ({
      key: repeatOptionKey(hostId, [childId]),
      hostId,
      prototypeChildIds: [childId],
      label: `${blockDisplayName(template, childId)}（当前容器子区块）`,
      description: "父级列表宿主下的行模板子区块。",
      source: "container" as const,
    }));
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
    itemFields: slot.itemFields,
    minItems: slot.minItems,
    maxItems: slot.maxItems,
  }));
}

function repeatOptionKey(hostId: string, prototypeChildIds: string[]): string {
  return `${hostId}:${prototypeChildIds.join("+")}`;
}

/** 从已绑定的 repeat 还原行模板选项（子项进入弹窗时展示宿主侧配置，不可改选） */
function repeatPrototypeOptionFromBinding(
  template: EmailTemplate,
  hostId: string,
  prototypeChildIds: string[]
): RepeatPrototypeOption {
  const labels = prototypeChildIds.map((childId) => blockDisplayName(template, childId));
  const label =
    labels.length === 1
      ? `${labels[0]}（列表行模板）`
      : `${labels.join("、")}（列表行模板）`;
  return {
    key: repeatOptionKey(hostId, prototypeChildIds),
    hostId,
    prototypeChildIds,
    label,
    description: "行模板已在列表宿主绑定；从子项区块进入时不可更换。",
    source: "container",
  };
}

function blockDisplayName(template: EmailTemplate, blockId: string): string {
  return template.blockMeta?.[blockId]?.name?.trim() || blockId;
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

function inferRepeatMappingDraft(
  template: EmailTemplate,
  slotId: string,
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
      continue;
    }
    const targetBlock = template.blocks[target.blockId];
    const existingSpec = targetBlock?.bindings?.[target.bindPath];
    if (
      existingSpec?.mode === "variable" &&
      existingSpec.allowExternal === true &&
      existingSpec.valueType === "collection" &&
      existingSpec.slotId === slotId &&
      typeof existingSpec.slotPath === "string"
    ) {
      const existingFieldPath = existingSpec.slotPath.replace(/^\d+\./, "");
      if (findCollectionFieldByPath(itemFields, existingFieldPath)) {
        draft[target.key] = existingFieldPath;
        continue;
      }
    }
    const normalizedTarget = target.bindPath.toLowerCase();
    const leaf = target.bindPath.split(".").slice(-1)[0]?.toLowerCase() ?? "";
    const leafPaths = flattenItemFieldsForFieldMap(
      itemFields,
      defaultExpandedCollectionGroupPaths(itemFields)
    )
      .filter((entry) => entry.kind === "leaf")
      .map((entry) => entry.path);
    const matchedPath = leafPaths.find((path) => {
      const key = path.split(".").slice(-1)[0]?.toLowerCase() ?? "";
      if (key === leaf || path.toLowerCase().endsWith(`.${leaf}`)) return true;
      if (leaf === "src" && (key.includes("image") || key.includes("icon") || path.includes("image")))
        return true;
      if (leaf === "alt" && key.includes("alt")) return true;
      if (
        leaf === "link" &&
        (key.includes("url") || key.includes("link") || key.includes("href"))
      ) {
        return true;
      }
      return normalizedTarget.includes(key);
    });
    if (matchedPath) draft[target.key] = matchedPath;
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

function spacingForUnified(spacing: SpacingValue): string {
  if (spacing.mode === "unified") return spacing.unified ?? "0";
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

function InspectorDebugCopyButton({ clipboardText }: { clipboardText: string }) {
  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(clipboardText);
      message.info("已复制调试定位信息");
    } catch {
      message.error("复制失败，请检查浏览器权限");
    }
  };
  return (
    <button
      type="button"
      className="inspector__copy-debug-ref"
      title="复制调试定位信息（模板路径、区块 ID、JSON 路径等）"
      aria-label="复制调试定位信息"
      onClick={() => void onClick()}
    >
      <CopyOutlined />
    </button>
  );
}

type TextInterpolationBinding = {
  bindPath: string;
  templateValue: string;
  slots: NonNullable<EmailBlock["bindings"]>[string]["interpolationSlots"];
};

const INTERPOLATION_TOKEN_RE = /\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g;

function collectTextInterpolationBindings(block: TextBlock): TextInterpolationBinding[] {
  const out: TextInterpolationBinding[] = [];
  for (const [bindPath, spec] of Object.entries(block.bindings ?? {})) {
    if (spec.mode !== "interpolate" || !bindPath.startsWith("props.textBody.")) continue;
    const value = getAtPath(block.props as Record<string, unknown>, bindPath.replace(/^props\./, ""));
    if (typeof value !== "string") continue;
    out.push({
      bindPath,
      templateValue: value,
      slots: spec.interpolationSlots,
    });
  }
  return out;
}

function firstTextRunBindPath(block: TextBlock): string | undefined {
  const body = normalizeTextBody(block.props.textBody);
  const run = body?.paragraphs[0]?.runs[0];
  if (!run || typeof run.text !== "string") return undefined;
  return "props.textBody.paragraphs.0.runs.0.text";
}

function renderInterpolationTemplateParts(binding: TextInterpolationBinding): ReactNode[] {
  const slots = new Map((binding.slots ?? []).map((slot) => [slot.slotId, slot]));
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let index = 0;
  for (const match of binding.templateValue.matchAll(INTERPOLATION_TOKEN_RE)) {
    const [token, slotId] = match;
    const start = match.index ?? 0;
    if (start > lastIndex) parts.push(binding.templateValue.slice(lastIndex, start));
    const slot = slots.get(slotId);
    parts.push(
      <span key={`${slotId}-${index}`} className="text-interpolation-preview__pill" title={slotId}>
        {slot?.label ?? slotId}
      </span>
    );
    lastIndex = start + token.length;
    index += 1;
  }
  if (lastIndex < binding.templateValue.length) parts.push(binding.templateValue.slice(lastIndex));
  return parts;
}

function InterpolatedTextBodyPreview({
  bindings,
  payload,
}: {
  bindings: TextInterpolationBinding[];
  payload: EmailPayload;
}) {
  return (
    <div className="text-interpolation-preview">
      {bindings.map((binding) => (
        <div key={binding.bindPath} className="text-interpolation-preview__item">
          <div className="text-interpolation-preview__template">
            {renderInterpolationTemplateParts(binding)}
          </div>
          <div className="text-interpolation-preview__result">
            预览：{interpolateTextValue(binding.templateValue, binding.slots, payload.values)}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Inspector({
  template,
  payload,
  selectedBlockId,
  onUpdate,
  onTemplateChange,
  emailKey,
  layoutVariantId = null,
  mergedTemplate = null,
  effectiveDesignTokens = null,
  tokenPresets = null,
  previewPayload = null,
  onDiscardPayloadSlotDraft,
}: Props) {
  const effectivePayload = previewPayload ?? payload;
  const root = template.blocks[template.rootBlockId];
  const canvasMode = selectedBlockId === null;
  /** 默认打开「样式」：组件级配色、画面位置等在样式页；切换选中区块时与画布一致回到样式，避免误以为未生效 */
  const [inspectorTab, setInspectorTab] = useState<InspectorMainTab>("style");
  const [repeatModalOpen, setRepeatModalOpen] = useState(false);
  const [repeatSlotId, setRepeatSlotId] = useState("");
  const [repeatPrototypeOptionKey, setRepeatPrototypeOptionKey] = useState("");
  const [repeatLoopScope, setRepeatLoopScope] = useState<RepeatLoopScope>("parentOnly");
  const [repeatChildItemPath, setRepeatChildItemPath] = useState("");
  const [repeatChildPrototypeOptionKey, setRepeatChildPrototypeOptionKey] = useState("");
  const [repeatAnchorItemIndex, setRepeatAnchorItemIndex] = useState(0);
  const [repeatParentMappingDraft, setRepeatParentMappingDraft] = useState<Record<string, string>>({});
  const [repeatChildMappingDraft, setRepeatChildMappingDraft] = useState<Record<string, string>>({});
  const [textVarPillModalMeta, setTextVarPillModalMeta] = useState<TextBodyVariableRunMeta | null>(null);
  useEffect(() => {
    setInspectorTab("style");
  }, [canvasMode, selectedBlockId]);
  useEffect(() => {
    setTextVarPillModalMeta(null);
  }, [selectedBlockId]);

  /** 与 InspectorFieldSource 解除主题跟随时的烘焙同源；App 未传 merged 时在此用 payload 合并 + 令牌解析补一份 */
  const mergedForInspector = useMemo(() => {
    if (mergedTemplate) return mergedTemplate;
    if (!effectiveDesignTokens) return null;
    const visible = applyVisibilityRules(template, payload);
    const expanded = expandRepeatRegions(visible, payload);
    const base = mergeTemplatePayload(expanded, payload);
    if (!containsThemeRefDeep(base)) return base;
    return resolveThemeInTemplate(base, effectiveDesignTokens).template;
  }, [effectiveDesignTokens, mergedTemplate, payload, template]);
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
  const blockName = template.blockMeta?.[id]?.name?.trim();

  const blockRepeatPrototypeOptions: RepeatPrototypeOption[] = (() => {
    if (canvasMode) return [];
    if (isRepeatHostBlock(block)) {
      return block.children
        .filter((childId) => Boolean(template.blocks[childId]))
        .map((childId) => ({
          key: repeatOptionKey(block.id, [childId]),
          hostId: block.id,
          prototypeChildIds: [childId],
          label: `${blockDisplayName(template, childId)}（当前容器子区块）`,
          description: "从容器进入时，当前 layout/grid 是重复宿主；只选择它的子区块作为行模板。",
          source: "container" as const,
        }));
    }

    const options: RepeatPrototypeOption[] = [];
    if (isRepeatHostBlock(parentBlock) && parentBlock.children.includes(block.id)) {
      options.push({
        key: repeatOptionKey(parentBlock.id, [block.id]),
        hostId: parentBlock.id,
        prototypeChildIds: [block.id],
        label: `${blockName ?? block.id}（仅复制当前区块）`,
        description: "从非容器进入时，默认由直接父级 layout/grid 承载列表重复，只复制当前区块。",
        source: "leaf-self",
      });
    }
    const grandParentBlock = parentBlock?.parentId ? template.blocks[parentBlock.parentId] : undefined;
    if (isRepeatHostBlock(parentBlock) && isRepeatHostBlock(grandParentBlock)) {
      options.push({
        key: repeatOptionKey(grandParentBlock.id, [parentBlock.id]),
        hostId: grandParentBlock.id,
        prototypeChildIds: [parentBlock.id],
        label: `${blockDisplayName(template, parentBlock.id)}（连同父容器一起复制）`,
        description: "把重复宿主提升到祖父级 layout/grid，用父级商品卡等容器作为行模板。",
        source: "leaf-parent",
      });
    }
    return options;
  })();

  /** 画布根 Inspector 不提供列表重复入口；与 block-contract 中 emailRoot 禁止 repeat 壳键一致 */
  const repeatPrototypeOptions = canvasMode ? [] : blockRepeatPrototypeOptions;
  const resolvedRepeatContext = canvasMode ? null : resolveRepeatContextForBlock(template, id);
  const repeatCollectionCandidates = buildRepeatCollectionCandidates(template, payload);
  const currentRepeat = resolvedRepeatContext?.repeat ?? null;
  const unifiedBindParentHostId = canvasMode
    ? ""
    : resolveUnifiedBindParentHostId(template, id, repeatPrototypeOptions[0]?.hostId ?? id);
  const parentHostRepeat = unifiedBindParentHostId
    ? template.blocks[unifiedBindParentHostId]?.repeat
    : undefined;
  const unifiedModalPrototypeOptions = (() => {
    if (!unifiedBindParentHostId) return repeatPrototypeOptions;
    if (parentHostRepeat?.prototypeChildIds.length) {
      return [
        repeatPrototypeOptionFromBinding(
          template,
          unifiedBindParentHostId,
          parentHostRepeat.prototypeChildIds
        ),
      ];
    }
    return buildHostRepeatPrototypeOptions(template, unifiedBindParentHostId);
  })();
  const lockRepeatRowTemplate =
    !canvasMode && unifiedBindParentHostId !== id && Boolean(parentHostRepeat);
  const effectiveRepeatPrototypeOptions =
    lockRepeatRowTemplate && parentHostRepeat
      ? unifiedModalPrototypeOptions
      : repeatPrototypeOptions.length > 0
        ? repeatPrototypeOptions
        : unifiedModalPrototypeOptions;
  const repeatCandidate = repeatCollectionCandidates.find((candidate) => candidate.key === repeatSlotId);
  const selectedRepeatPrototypeOption =
    effectiveRepeatPrototypeOptions.find((option) => option.key === repeatPrototypeOptionKey) ??
    effectiveRepeatPrototypeOptions[0];
  const nestedCollectionFields = repeatCandidate
    ? listNestedCollectionFields(repeatCandidate.itemFields)
    : [];
  const showRepeatLoopScope = nestedCollectionFields.length > 0;
  const childRepeatPrototypeOptions = selectedRepeatPrototypeOption
    ? listChildRepeatPrototypeOptions(template, selectedRepeatPrototypeOption.prototypeChildIds)
    : [];
  const selectedChildRepeatPrototypeOption =
    childRepeatPrototypeOptions.find((option) => option.key === repeatChildPrototypeOptionKey) ??
    childRepeatPrototypeOptions[0];
  const repeatChildHostId = selectedChildRepeatPrototypeOption?.hostId ?? "";
  const allRepeatTargetFieldOptions = selectedRepeatPrototypeOption
    ? buildRepeatTargetFieldOptions(template, selectedRepeatPrototypeOption.prototypeChildIds)
    : [];
  const parentRepeatTargetFieldOptions = filterParentRepeatMappingTargets(
    template,
    selectedRepeatPrototypeOption?.prototypeChildIds ?? [],
    selectedChildRepeatPrototypeOption?.prototypeChildIds,
    allRepeatTargetFieldOptions
  );
  const childRepeatTargetFieldOptions = filterChildRepeatMappingTargets(
    template,
    selectedRepeatPrototypeOption?.prototypeChildIds ?? [],
    selectedChildRepeatPrototypeOption?.prototypeChildIds ??
      childRepeatPrototypeOptions[0]?.prototypeChildIds,
    allRepeatTargetFieldOptions
  );
  const nestedChildField = nestedCollectionFields.find((field) => field.path === repeatChildItemPath);
  const repeatItemCount = currentRepeat ? collectionItemCount(payload, currentRepeat) : 0;
  const repeatScopePreview =
    repeatCandidate && showRepeatLoopScope
      ? formatRepeatBindScopePreview(repeatLoopScope, {
          parentSlotLabel: repeatCandidate.label,
          childListLabel: nestedChildField?.label ?? repeatChildItemPath,
          ...buildRepeatBindPreviewCounts(
            payload,
            repeatCandidate.slotId,
            repeatLoopScope === "parentOnly" ? undefined : repeatChildItemPath || nestedCollectionFields[0]?.path,
            repeatLoopScope === "childOnly" ? repeatAnchorItemIndex : undefined
          ),
          anchorItemIndex: repeatLoopScope === "childOnly" ? repeatAnchorItemIndex : undefined,
        })
      : "";
  const isNestedChildRepeatHost =
    !canvasMode &&
    isRepeatHostBlock(block) &&
    Boolean(block.repeat?.itemPath?.trim()) &&
    unifiedBindParentHostId !== id;
  const repeatUnavailableReason =
    !canvasMode && block.type !== "emailRoot" && !isRepeatHostBlock(block) && parentBlock?.type === "emailRoot"
      ? "当前区块的直接父级是邮件根节点，不能把 root 作为重复父级。请先在本业务段外包一层 layout，或把列表放进已有 layout/grid 后再绑定。"
      : !canvasMode && repeatPrototypeOptions.length === 0 && unifiedModalPrototypeOptions.length === 0
        ? "当前区块没有可作为重复宿主的 layout/grid 容器。请先放入 layout/grid 后再绑定列表重复。"
        : null;
  const canConfigureRepeat =
    repeatPrototypeOptions.length > 0 || unifiedModalPrototypeOptions.length > 0;

  const resetRepeatBindDrafts = (
    candidate: RepeatCollectionCandidate | undefined,
    option: RepeatPrototypeOption | undefined,
    opts?: {
      parentRepeat?: typeof parentHostRepeat;
      childRepeat?: typeof parentHostRepeat;
      childHostId?: string;
      childPrototypeChildIds?: string[];
      childItemPath?: string;
    }
  ) => {
    if (!candidate || !option) {
      setRepeatParentMappingDraft({});
      setRepeatChildMappingDraft({});
      return;
    }
    const parentScalars = parentScalarItemFieldsFromItemFields(candidate.itemFields);
    const childHost = opts?.childHostId ?? repeatChildHostId;
    const childProtoIds =
      opts?.childPrototypeChildIds ?? selectedChildRepeatPrototypeOption?.prototypeChildIds ?? [];
    setRepeatParentMappingDraft(
      inferRepeatMappingDraft(
        template,
        candidate.slotId,
        parentScalars,
        filterParentRepeatMappingTargets(
          template,
          option.prototypeChildIds,
          childProtoIds.length ? childProtoIds : undefined,
          buildRepeatTargetFieldOptions(template, option.prototypeChildIds)
        ),
        opts?.parentRepeat?.fieldMappings
      )
    );
    const childPath = opts?.childItemPath ?? repeatChildItemPath;
    const childItemFields = nestedCollectionFields.find((f) => f.path === childPath)?.itemFields ?? [];
    setRepeatChildMappingDraft(
      inferRepeatMappingDraft(
        template,
        candidate.slotId,
        childItemFields,
        filterChildRepeatMappingTargets(
          template,
          option.prototypeChildIds,
          childProtoIds.length ? childProtoIds : childRepeatPrototypeOptions[0]?.prototypeChildIds,
          buildRepeatTargetFieldOptions(template, option.prototypeChildIds)
        ),
        opts?.childRepeat?.fieldMappings
      )
    );
  };

  const syncChildRepeatDefaults = (
    candidate: RepeatCollectionCandidate,
    option: RepeatPrototypeOption,
    scope: RepeatLoopScope,
    overrideItemPath?: string
  ) => {
    if (scope === "parentOnly") return;
    const nested = listNestedCollectionFields(candidate.itemFields);
    const itemPath = (overrideItemPath ?? repeatChildItemPath) || nested[0]?.path || "";
    const protos = listChildRepeatPrototypeOptions(template, option.prototypeChildIds);
    const selectableProtos = protos.filter(
      (p) => !isChildRepeatPrototypeReservedByParent(p, option)
    );
    const derived = deriveUnifiedRepeatPlanFromTemplate(template, unifiedBindParentHostId, candidate.itemFields);
    const keyFromDerived =
      derived?.childHostId && derived.childPrototypeChildIds?.length
        ? childRepeatPrototypeOptionKeyFromBinding(
            template,
            option.prototypeChildIds,
            derived.childHostId,
            derived.childPrototypeChildIds
          )
        : undefined;
    const pickKey = (key: string | undefined) =>
      key && selectableProtos.some((p) => p.key === key) ? key : undefined;
    const nextKey =
      pickKey(repeatChildPrototypeOptionKey) ??
      pickKey(keyFromDerived) ??
      pickKey(preferredChildRepeatPrototypeOptionKey(template, selectableProtos)) ??
      selectableProtos[0]?.key ??
      "";
    setRepeatChildItemPath(itemPath);
    setRepeatChildPrototypeOptionKey(nextKey);
  };

  const openRepeatModal = () => {
    const preferredSlot = parentHostRepeat?.slotId || currentRepeat?.slotId;
    const defaultCandidate = pickRepeatCollectionCandidateForHost(
      repeatCollectionCandidates,
      unifiedBindParentHostId,
      preferredSlot
    );
    const initialSlotId = preferredSlot || defaultCandidate?.key || "";
    const initialCandidate =
      repeatCollectionCandidates.find((candidate) => candidate.key === initialSlotId) ??
      defaultCandidate;
    const derived =
      initialCandidate && unifiedBindParentHostId
        ? deriveUnifiedRepeatPlanFromTemplate(
            template,
            unifiedBindParentHostId,
            initialCandidate.itemFields
          )
        : null;
    const initialScope = derived?.scope ?? "parentOnly";
    const initialOption =
      unifiedModalPrototypeOptions.find(
        (option) =>
          option.key ===
          repeatOptionKey(
            unifiedBindParentHostId,
            derived?.parentPrototypeChildIds ?? parentHostRepeat?.prototypeChildIds ?? []
          )
      ) ?? unifiedModalPrototypeOptions[0] ?? effectiveRepeatPrototypeOptions[0];
    setRepeatSlotId(initialSlotId);
    setRepeatLoopScope(initialScope);
    setRepeatAnchorItemIndex(derived?.anchorItemIndex ?? 0);
    setRepeatChildItemPath(derived?.childItemPath ?? listNestedCollectionFields(initialCandidate?.itemFields ?? [])[0]?.path ?? "");
    const initialChildKey =
      derived?.childHostId && derived.childPrototypeChildIds?.length && initialOption
        ? childRepeatPrototypeOptionKeyFromBinding(
            template,
            initialOption.prototypeChildIds,
            derived.childHostId,
            derived.childPrototypeChildIds
          )
        : "";
    setRepeatChildPrototypeOptionKey(initialChildKey ?? "");
    setRepeatPrototypeOptionKey(initialOption?.key ?? "");
    if (initialCandidate && initialOption) {
      syncChildRepeatDefaults(initialCandidate, initialOption, initialScope);
      const childRepeatBlock = derived?.childHostId
        ? template.blocks[derived.childHostId]?.repeat
        : undefined;
      resetRepeatBindDrafts(initialCandidate, initialOption, {
        parentRepeat: parentHostRepeat,
        childRepeat: childRepeatBlock,
        childHostId: derived?.childHostId,
        childPrototypeChildIds: derived?.childPrototypeChildIds,
      });
    }
    setRepeatModalOpen(true);
  };

  const applyRepeatFromModal = () => {
    const candidate = repeatCandidate;
    const prototypeOption = selectedRepeatPrototypeOption;
    if (!candidate) {
      message.error("请选择一个父级列表变量。");
      return;
    }
    if (repeatLoopScope !== "childOnly" && !prototypeOption) {
      message.error("请选择一个父级行模板。");
      return;
    }
    if (repeatLoopScope !== "parentOnly") {
      if (!repeatChildItemPath.trim()) {
        message.error("请选择要循环的子级列表列。");
        return;
      }
      if (!selectedChildRepeatPrototypeOption) {
        message.error("请选择子级行模板。");
        return;
      }
    }
    const parentHostId = unifiedBindParentHostId || prototypeOption?.hostId;
    if (!parentHostId) {
      message.error("未找到父级列表宿主。");
      return;
    }
    try {
      onTemplateChange(
        applyUnifiedRepeatBinding(
          template,
          {
            scope: repeatLoopScope,
            slotId: candidate.slotId,
            parentHostId,
            parentPrototypeChildIds: prototypeOption?.prototypeChildIds ?? [],
            parentItemFields: candidate.itemFields,
            parentFieldMappings: buildRepeatFieldMappings(
              parentScalarItemFieldsFromItemFields(candidate.itemFields),
              parentRepeatTargetFieldOptions,
              repeatParentMappingDraft
            ),
            parentMinItems: candidate.minItems,
            parentMaxItems: candidate.maxItems,
            parentLabel: candidate.label,
            parentDescription: candidate.description,
            childItemPath: repeatChildItemPath,
            childHostId: selectedChildRepeatPrototypeOption.hostId,
            childPrototypeChildIds: selectedChildRepeatPrototypeOption.prototypeChildIds,
            childItemFields: nestedChildField?.itemFields,
            childFieldMappings: buildRepeatFieldMappings(
              nestedChildField?.itemFields ?? [],
              childRepeatTargetFieldOptions,
              repeatChildMappingDraft
            ),
            childMinItems: nestedChildField?.minItems,
            childMaxItems: nestedChildField?.maxItems,
            childLabel: nestedChildField?.label,
            anchorItemIndex: repeatLoopScope === "childOnly" ? repeatAnchorItemIndex : undefined,
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
    if (!unifiedBindParentHostId) return;
    onTemplateChange(removeUnifiedRepeatBinding(template, unifiedBindParentHostId, payload));
    setRepeatModalOpen(false);
  };

  const handleRepeatSlotOrPrototypeChange = (slotId: string, prototypeKey: string) => {
    const nextSlotId = showRepeatLoopScope ? repeatSlotId || slotId : slotId;
    const nextCandidate =
      repeatCollectionCandidates.find((candidate) => candidate.key === nextSlotId) ??
      repeatCandidate;
    const nextOption =
      effectiveRepeatPrototypeOptions.find((option) => option.key === prototypeKey) ??
      effectiveRepeatPrototypeOptions[0];
    if (!showRepeatLoopScope && slotId !== repeatSlotId) {
      setRepeatSlotId(slotId);
    }
    setRepeatPrototypeOptionKey(prototypeKey);
    if (nextCandidate && nextOption) {
      syncChildRepeatDefaults(nextCandidate, nextOption, repeatLoopScope);
      resetRepeatBindDrafts(nextCandidate, nextOption);
    }
  };

  const handleRepeatLoopScopeChange = (scope: RepeatLoopScope) => {
    setRepeatLoopScope(scope);
    if (repeatCandidate && selectedRepeatPrototypeOption) {
      syncChildRepeatDefaults(repeatCandidate, selectedRepeatPrototypeOption, scope);
      resetRepeatBindDrafts(repeatCandidate, selectedRepeatPrototypeOption);
    }
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
      itemFields: candidate.itemFields,
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
    const rules = readBuiltinRulesFromPayloadSlot(effectivePayload, slotId);
    if (!rules) return null;
    const slotLabel = effectivePayload.slots[slotId]?.label?.trim() || slotId;
    return (
      <BuiltinCollectionRulesFields
        slotId={slotId}
        payload={effectivePayload}
        sort={rules.sort}
        extract={rules.extract}
        syncNote={`与变量「${slotLabel}」的数据源配置为同一份（payload.slots.${slotId}.dataSource），在变量面板修改会同步反映于此。`}
        extractHint="相似品依赖另一列表槽首项；子列表请在父级 itemFields 中声明 collection，并在列表绑定里选择子列表路径。"
        sortHint="在商品目录范围内排序后，再取列表长度条数用于预览。"
        onSortChange={(sort: BuiltinCollectionSortId) => {
          commitBuiltinCollectionRules(
            slotId,
            patchPayloadBuiltinCollectionSort(payload, slotId, sort)
          );
        }}
        onExtractKindChange={(kind: BuiltinCollectionExtract["kind"]) => {
          const anchorOptions = listCollectionSlotIdsForExtract(payload, slotId);
          const nextExtract: BuiltinCollectionExtract =
            kind === "similarTo"
              ? {
                  kind: "similarTo",
                  fromSlotId: anchorOptions[0] ?? "",
                  matchField: "href",
                }
              : { kind: "none" };
          commitBuiltinCollectionRules(
            slotId,
            patchPayloadBuiltinCollectionExtract(payload, slotId, nextExtract)
          );
        }}
        onExtractFromSlotChange={(fromSlotId: string) => {
          commitBuiltinCollectionRules(
            slotId,
            patchPayloadBuiltinCollectionExtract(payload, slotId, {
              kind: "similarTo",
              fromSlotId,
              matchField: "href",
            })
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
    const sourceKey = mapping.sourcePath.replace(/^\d+\./, "");
    const fieldLabel =
      currentRepeat?.itemFields?.find((field) => field.key === sourceKey)?.label ?? sourceKey;
    return `${fieldLabel} → ${targetFieldLabel(template, mapping.targetBlockId, mapping.targetBindPath)}`;
  };

  const repeatRegionPanel =
    resolvedRepeatContext || canConfigureRepeat || repeatUnavailableReason ? (
      <>
        <h3 className="inspector__subtitle">列表重复</h3>
        <section className="inspector__section">
          {isNestedChildRepeatHost && currentRepeat ? (
            <>
              <p className="inspector__muted">
                子级列表循环（<code>{currentRepeat.itemPath}</code>）已在父级行绑定中统一配置；此处仅展示当前子级宿主状态。
              </p>
              <RepeatRegionInspectorSummary
                template={template}
                hostId={resolvedRepeatContext!.hostId}
                repeat={currentRepeat}
                itemCount={repeatItemCount}
                relation="host"
                prototypeRootId={currentRepeat.prototypeChildIds[0]}
                formatMappingLine={formatRepeatMappingLine}
              />
              <div className="inspector-actions-row">
                <ShopSecondaryButton htmlType="button" onClick={openRepeatModal}>
                  在整体列表绑定中修改
                </ShopSecondaryButton>
              </div>
            </>
          ) : currentRepeat ? (
            <>
              <RepeatRegionInspectorSummary
                template={template}
                hostId={resolvedRepeatContext!.hostId}
                repeat={currentRepeat}
                itemCount={repeatItemCount}
                relation={resolvedRepeatContext!.relation}
                prototypeRootId={resolvedRepeatContext?.prototypeRootId}
                fieldMappingsOnBlock={resolvedRepeatContext?.fieldMappingsOnBlock}
                formatMappingLine={formatRepeatMappingLine}
              />
              {resolvedRepeatContext?.relation === "host" && !currentRepeat.itemPath?.trim()
                ? renderRepeatBuiltinCollectionRules(currentRepeat.slotId)
                : null}
              <div className="inspector-actions-row">
                <ShopSecondaryButton htmlType="button" onClick={openRepeatModal}>
                  {resolvedRepeatContext?.relation === "host" && id === unifiedBindParentHostId
                    ? "编辑列表绑定"
                    : "查看/更换绑定"}
                </ShopSecondaryButton>
                {id === unifiedBindParentHostId && (parentHostRepeat || currentRepeat) ? (
                  <ShopSecondaryButton
                    htmlType="button"
                    onClick={removeRepeat}
                    title="将物化为静态预览行，并清除父级与子级（如 skus）列表循环"
                  >
                    解除列表绑定（含子级 skus）
                  </ShopSecondaryButton>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <p className="inspector__muted">
                {canvasMode
                  ? "从全局入口选择一个 layout/grid 容器下的行模板，再把列表字段映射到模板字段。"
                  : "将当前上下文绑定到列表变量后，画布会按列表长度复制行模板；列表为空时不保留占位高度。"}
              </p>
              {repeatUnavailableReason ? (
                <p className="inspector__muted">{repeatUnavailableReason}</p>
              ) : null}
              <ShopPrimaryButton
                htmlType="button"
                onClick={openRepeatModal}
                disabled={repeatCollectionCandidates.length === 0 || !canConfigureRepeat}
              >
                绑定列表重复
              </ShopPrimaryButton>
              {repeatCollectionCandidates.length === 0 ? (
                <p className="inspector__muted">
                  当前没有可用列表变量。请先在 payload 中配置列表数据，或在变量赋值里声明 collection 槽。
                </p>
              ) : null}
            </>
          )}
        </section>
      </>
    ) : null;

  const repeatModal = (
    <RepeatRegionBindModal
      visible={repeatModalOpen}
      canvasMode={canvasMode}
      template={template}
      payload={payload}
      hasCurrentRepeat={Boolean(parentHostRepeat || currentRepeat)}
      collectionCandidates={repeatCollectionCandidates}
      prototypeOptions={effectiveRepeatPrototypeOptions}
      rowTemplateLocked={lockRepeatRowTemplate}
      parentListHostId={unifiedBindParentHostId}
      parentListSlotLocked={showRepeatLoopScope}
      showLoopScope={showRepeatLoopScope}
      loopScope={repeatLoopScope}
      scopePreview={repeatScopePreview}
      nestedChildListLabel={nestedChildField?.label}
      nestedCollectionOptions={nestedCollectionFields}
      parentPrototypeChildIds={selectedRepeatPrototypeOption?.prototypeChildIds ?? []}
      childPrototypeOptions={childRepeatPrototypeOptions}
      childItemPath={repeatChildItemPath}
      childPrototypeOptionKey={repeatChildPrototypeOptionKey}
      childPrototypeChildIds={selectedChildRepeatPrototypeOption?.prototypeChildIds ?? []}
      anchorItemIndex={repeatAnchorItemIndex}
      parentTargetFieldOptions={parentRepeatTargetFieldOptions}
      childTargetFieldOptions={childRepeatTargetFieldOptions}
      repeatSlotId={repeatSlotId}
      repeatPrototypeOptionKey={repeatPrototypeOptionKey}
      parentMappingDraft={repeatParentMappingDraft}
      childMappingDraft={repeatChildMappingDraft}
      repeatCandidate={repeatCandidate}
      selectedPrototypeOption={selectedRepeatPrototypeOption}
      onClose={() => setRepeatModalOpen(false)}
      onApply={applyRepeatFromModal}
      onRemove={parentHostRepeat || currentRepeat ? removeRepeat : undefined}
      onLoopScopeChange={handleRepeatLoopScopeChange}
      onChildItemPathChange={(path) => {
        if (repeatCandidate && selectedRepeatPrototypeOption) {
          syncChildRepeatDefaults(
            repeatCandidate,
            selectedRepeatPrototypeOption,
            repeatLoopScope,
            path
          );
          resetRepeatBindDrafts(repeatCandidate, selectedRepeatPrototypeOption, {
            childItemPath: path,
          });
        } else {
          setRepeatChildItemPath(path);
        }
      }}
      onChildPrototypeOptionKeyChange={(key) => {
        setRepeatChildPrototypeOptionKey(key);
        const selected = childRepeatPrototypeOptions.find((option) => option.key === key);
        if (repeatCandidate && selectedRepeatPrototypeOption && selected) {
          resetRepeatBindDrafts(repeatCandidate, selectedRepeatPrototypeOption, {
            childHostId: selected.hostId,
            childPrototypeChildIds: selected.prototypeChildIds,
          });
        }
      }}
      onAnchorItemIndexChange={setRepeatAnchorItemIndex}
      onRepeatPrototypeOptionKeyChange={setRepeatPrototypeOptionKey}
      onParentMappingDraftChange={setRepeatParentMappingDraft}
      onChildMappingDraftChange={setRepeatChildMappingDraft}
      onSlotOrPrototypeChange={handleRepeatSlotOrPrototypeChange}
    />
  );


  const mergedBlockForId = (bid: string): EmailBlock | null => mergedForInspector?.blocks[bid] ?? null;
  const rd = (b: EmailBlock, bindPath: string) =>
    readInspectorDisplayValue(b, payload, mergedBlockForId(b.id), bindPath, template);

  /** ColorPicker 色块：样式令牌绑定时 rd 可能仍为非字符串，用预设展开值回显 */
  const readDisplayFontFamilyString = (b: EmailBlock, bindPath: string): string =>
    readInspectorDisplayFontFamily(
      b,
      payload,
      mergedBlockForId(b.id),
      bindPath,
      template,
      tokenPresets
    );

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

  const isBindPathLocked = (blockId: string, bindPath: string): boolean => {
    const b = template.blocks[blockId];
    if (!b) return false;
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
      mergedTemplate={mergedForInspector}
      effectiveDesignTokens={effectiveDesignTokens}
      tokenPresets={tokenPresets}
      bindPath={bindPath}
      onUpdate={onUpdate}
      onTemplateChange={onTemplateChange}
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
            hint: "始终显示不会写入 visibility；选择条件显示后，当前区块仅在条件满足时渲染。",
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
                hint: "v1 仅支持单条规则，不支持 AND / OR / 括号。",
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
                  collection 条件只判断整条列表（空、非空、长度），不会读取 itemFields 中某一行字段。
                </p>
              ) : null}
            </>
          ) : null}
            </>
          ) : visibilitySlotCandidates.length === 0 ? (
            <p className="inspector__muted">
              当前没有可用变量。请先在字段变量、列表重复或 payload 中准备可判断的槽位。
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
              { value: "unified", label: "四边统一（unified）" },
              { value: "custom", label: "自定义四边（custom）" },
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
              { value: "unified", label: "四角统一（unified）" },
              { value: "corners", label: "四角独立（corners）" },
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
              { value: "unified", label: "四边统一（unified）" },
              { value: "separate", label: "四边独立（separate）" },
            ],
          })}
          {spacing.mode === "unified"
            ? renderUnitInputRow({
                label: prefixed("内边距"),
                value: spacing.unified ?? "0",
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
                value: spacing.top ?? "0",
                unit: "px",
                hint: hint(`${opts.basePath}.top`),
                onChange: (next) => push("top", next.trim() || "0"),
                disabled: rowLocked("top"),
                headerExtra: bindHeader("top"),
              })}
              {renderUnitInputRow({
                label: `${SPACING_SIDE_LABELS.right}内边距`,
                value: spacing.right ?? "0",
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
                value: spacing.bottom ?? "0",
                unit: "px",
                hint: hint(`${opts.basePath}.bottom`),
                onChange: (next) => push("bottom", next.trim() || "0"),
                disabled: rowLocked("bottom"),
                headerExtra: bindHeader("bottom"),
              })}
              {renderUnitInputRow({
                label: `${SPACING_SIDE_LABELS.left}内边距`,
                value: spacing.left ?? "0",
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
    const bgOverlayPadding =
      target.type === "layout" || target.type === "image"
        ? blockBackgroundImageRenderable(target)
        : false;
    return (
      <fieldset className="inspector-bound-fieldset">
        {bgOverlayPadding ? (
          <p className="inspector__muted">
            此块已启用底图：容器内边距仅推叠放在图上的子内容，不缩小底图铺满区域。
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

  const renderLayoutContentSection = () => {
    if (block.type !== "layout") return null;

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

  if (canvasMode) {
    if (root.type !== "emailRoot") {
      return <div className="inspector">根节点类型错误（必须为 emailRoot）</div>;
    }
    return (
      <div className="inspector">
        <div className="inspector__title-row">
          <h2 className="inspector__title">画布设置（邮件根节点）</h2>
          <InspectorDebugCopyButton
            clipboardText={buildInspectorDebugClipboardText({
              templatePathKey: emailKey,
              layoutVariantId,
              templateId: template.templateId,
              blockId: root.id,
              blockType: root.type,
              blockMetaName: template.blockMeta?.[root.id]?.name,
              isCanvasRoot: true,
            })}
          />
        </div>
        <AdminInspectorTabs
          active={inspectorTab}
          onChange={setInspectorTab}
          contentPane={
            <section className="inspector__section">
              <h3 className="inspector__subtitle">组件 · 内容</h3>
              <p className="inspector__muted">
                邮件根无正文；底图地址与文案类字段与带底图的 layout 一致，放在「内容」页。启用后请在下方填写地址；有背景图时「页面内边距」在「布局」页，仅推叠放在图上的子内容。
              </p>
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
              {root.wrapperStyle?.backgroundImage ? (
                <>
                  <h3 className="inspector__subtitle">组件 · 样式（容器背景图）</h3>
                  <section className="inspector__section">
                    <Field label="背景填充策略" headerExtra={fieldBindHeader(root, "wrapperStyle.backgroundImage.fit")}>
                      <ShopSelect
                        value={String(rd(root, "wrapperStyle.backgroundImage.fit") ?? "cover")}
                        disabled={isInspectFollowLocked(template, root, payload, "wrapperStyle.backgroundImage.fit")}
                        onChange={(next) => pushRoot("wrapperStyle.backgroundImage.fit", next)}
                      >
                        <ShopSelect.Option value="cover">裁切铺满（cover）</ShopSelect.Option>
                        <ShopSelect.Option value="contain">完整显示（contain）</ShopSelect.Option>
                      </ShopSelect>
                    </Field>
                    <ImageObjectPositionGrid
                      label="背景画面位置"
                      value={String(rd(root, "wrapperStyle.backgroundImage.position") ?? "center")}
                      hint={
                        rd(root, "wrapperStyle.backgroundImage.fit") === "contain"
                          ? "完整显示（contain）不会裁切图片，画面位置不参与图像摆放；需要裁切焦点时请切换为 cover。"
                          : "控制 cover 裁切时保留画面的哪个方向。"
                      }
                      disabled={
                        rd(root, "wrapperStyle.backgroundImage.fit") === "contain" ||
                        isInspectFollowLocked(template, root, payload, "wrapperStyle.backgroundImage.position")
                      }
                      headerExtra={fieldBindHeader(root, "wrapperStyle.backgroundImage.position")}
                      onChange={(next) => pushRoot("wrapperStyle.backgroundImage.position", next)}
                    />
                    <fieldset className="inspector-bound-fieldset">
                      {renderBorderRadiusEditor({
                        labelPrefix: "背景",
                        basePath: "wrapperStyle.backgroundImage.borderRadius",
                        value: rd(root, "wrapperStyle.backgroundImage.borderRadius"),
                        getHint: () => undefined,
                        onChange: (path, value) => pushRoot(path, value),
                        bindTargetBlock: root,
                        bindBasePath: "wrapperStyle.backgroundImage.borderRadius",
                        controlsDisabled: isInspectFollowLocked(
                          template,
                          root,
                          payload,
                          "wrapperStyle.backgroundImage.borderRadius"
                        ),
                      })}
                    </fieldset>
                    <fieldset className="inspector-bound-fieldset">
                      {renderBorderEditor({
                        labelPrefix: "背景",
                        basePath: "wrapperStyle.backgroundImage.border",
                        value: rd(root, "wrapperStyle.backgroundImage.border"),
                        getHint: () => undefined,
                        onChange: (path, value) => pushRoot(path, value),
                        bindTargetBlock: root,
                        bindBasePath: "wrapperStyle.backgroundImage.border",
                        controlsDisabled: isInspectFollowLocked(
                          template,
                          root,
                          payload,
                          "wrapperStyle.backgroundImage.border"
                        ),
                      })}
                    </fieldset>
                  </section>
                </>
              ) : null}
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
              <h3 className="inspector__subtitle">外层容器 · 布局</h3>
              <section className="inspector__section">
                {(() => {
                  const w = root.props.width;
                  const widthStr = typeof w === "string" ? w.trim() : "";
                  const widthOk = widthStr === EMAIL_ROOT_FIXED_WIDTH;
                  return (
                    <>
                      {!widthOk ? (
                        <div className="app__banner app__banner--warn" style={{ marginBottom: 12 }}>
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
                <p className="inspector__muted">画布根节点固定纵向排列；子区块间距与页面内边距在此配置。</p>
                <h3 className="inspector__subtitle">页面内边距</h3>
                <fieldset className="inspector-bound-fieldset">
                  {blockBackgroundImageRenderable(root) ? (
                    <p className="inspector__muted">
                      当前已启用内容区底图：此处内边距仅推叠放内容，不缩小底图铺满区域。
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
                <Field label="间距模式">
                  <ShopSelect
                    value={root.props.gapMode === "auto" ? "auto" : "fixed"}
                    disabled={isInspectFollowLocked(template, root, payload, "props.gapMode")}
                    onChange={(v) => pushRoot("props.gapMode", String(v))}
                  >
                    <ShopSelect.Option value="fixed">固定像素（gap）</ShopSelect.Option>
                    <ShopSelect.Option
                      value="auto"
                      title="纵向时按容器高度、横向时按容器宽度，将主轴剩余空间均分到相邻子项之间。"
                    >
                      自动均分（主轴剩余空间）
                    </ShopSelect.Option>
                  </ShopSelect>
                </Field>
                {(root.props.gapMode ?? "fixed") !== "auto" ? (
                  <Field label="间距" headerExtra={fieldBindHeader(root, "props.gap")}>
                    <ShopUnitInput
                      value={String(rd(root, "props.gap") ?? "0")}
                      unit="px"
                      min={0}
                      step={0.1}
                      disabled={isInspectFollowLocked(template, root, payload, "props.gap")}
                      onChange={(next) => pushRoot("props.gap", next.trim() || "0")}
                    />
                  </Field>
                ) : null}
              </section>
            </>
          }
        />
        {repeatModal}
      </div>
    );
  }

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
          version: 1 as const,
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

  const commitTextBodySnapshot = (
    nextTemplate: EmailTemplate,
    nextPayload: EmailPayload,
    blockId: string,
    body: TextBodyV1
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
    | Extract<EmailBlock, { type: "image" }>;
  type TextBindPath = "props.fontFamily" | "props.fontSize" | "props.color";
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
  type WrapperPlacementHBindPath = "wrapperStyle.placement.horizontal";
  type WrapperPlacementVBindPath = "wrapperStyle.placement.vertical";

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

  const contentAlignGridRow = (
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
    return (
      <AlignmentGrid
        label={label}
        horizontal={horizontal}
        vertical={vertical}
        hint="控制内容在当前区块自己的外层容器里如何摆放。"
        disabled={locked}
        options={[
          { horizontal: "left", vertical: "top", label: "左上" },
          { horizontal: "center", vertical: "top", label: "上中" },
          { horizontal: "right", vertical: "top", label: "右上" },
          { horizontal: "left", vertical: "center", label: "左中" },
          { horizontal: "center", vertical: "center", label: "正中" },
          { horizontal: "right", vertical: "center", label: "右中" },
          { horizontal: "left", vertical: "bottom", label: "左下" },
          { horizontal: "center", vertical: "bottom", label: "下中" },
          { horizontal: "right", vertical: "bottom", label: "右下" },
        ]}
        onChange={(next) => {
          let nextState = applyBlockField(template, payload, targetBlock.id, horizontalPath, next.horizontal);
          nextState = applyBlockField(
            nextState.template,
            nextState.payload,
            targetBlock.id,
            verticalPath,
            next.vertical
          );
          onUpdate(nextState);
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

  const buttonFontFamilyRow = (buttonBlock: Extract<EmailBlock, { type: "button" }>) => (
    <Field label="按钮字体" headerExtra={fieldBindHeader(buttonBlock, "props.buttonStyle.fontFamily")}>
      <ShopSelect
        value={coercePersistedFontFamily(
          readDisplayFontFamilyString(buttonBlock, "props.buttonStyle.fontFamily")
        )}
        disabled={isInspectFollowLocked(template, buttonBlock, payload, "props.buttonStyle.fontFamily")}
        onChange={(v) =>
          pushBlock(buttonBlock.id, "props.buttonStyle.fontFamily", coercePersistedFontFamily(v))
        }
      >
        {EMAIL_FONT_FAMILY_OPTIONS.map((font) => (
          <ShopSelect.Option key={font.value} value={font.value}>
            {font.label}
          </ShopSelect.Option>
        ))}
      </ShopSelect>
    </Field>
  );

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

  const applyWrapperDimensionMode = (
    modePath: "wrapperStyle.widthMode" | "wrapperStyle.heightMode",
    next: string
  ) => {
    let nextState = applyBlockField(template, payload, id, modePath, next);
    const parentKind = placementParentKindForBlock(nextState.template, id);
    const blockAfter = nextState.template.blocks[id];
    const { wrapperStyle, changed } = normalizeBlockWrapperPlacement(
      blockAfter?.wrapperStyle as WrapperStyle | undefined,
      parentKind
    );
    if (changed && blockAfter) {
      blockAfter.wrapperStyle = wrapperStyle;
    }
    onUpdate(nextState);
  };

  /** 相对父级内容区的水平 + 竖直放置（wrapperStyle.placement） */
  const wrapperSelfAlignPairRow = (
    currentBlock: EmailBlock,
    horizontalPath: WrapperPlacementHBindPath,
    verticalPath: WrapperPlacementVBindPath
  ) => {
    const placementParent = placementParentKindForBlock(template, currentBlock.id);
    const placementInput = buildPlacementResolveInputFromWrapper(
      currentBlock.wrapperStyle as WrapperStyle,
      placementParent
    );
    const placementMode = resolveRelativePlacementUiMode(placementInput);
    if (placementMode === "none") {
      return null;
    }

    const pH = rd(currentBlock, horizontalPath);
    const horizontal: "start" | "center" | "end" =
      pH === "start" || pH === "center" || pH === "end" ? pH : "start";
    const pV = rd(currentBlock, verticalPath);
    const vertical: "start" | "center" | "end" =
      pV === "start" || pV === "center" || pV === "end" ? pV : "start";

    const placementCfg = resolvePlacementConfigurability(placementInput);
    const placementHintParts: string[] = [
      "控制当前区块的外层容器在父级内容区里如何摆放。",
    ];
    if (placementMode === "horizontal") {
      placementHintParts.push("纵排父级：调整相对父级的水平摆放（左 / 中 / 右）。");
    } else if (placementMode === "vertical") {
      placementHintParts.push("横排父级：调整相对父级的竖直摆放（上 / 中 / 下）。");
    }
    if (!placementCfg.horizontal.configurable && placementCfg.horizontal.degradeReason) {
      placementHintParts.push(placementCfg.horizontal.degradeReason);
    }
    if (!placementCfg.vertical.configurable && placementCfg.vertical.degradeReason) {
      placementHintParts.push(placementCfg.vertical.degradeReason);
    }

    return (
      <RelativePlacementControl
        mode={placementMode}
        horizontal={horizontal}
        vertical={vertical}
        hint={placementHintParts.join(" ")}
        onHorizontalChange={(next) => {
          onUpdate(
            applyBlockField(template, payload, currentBlock.id, horizontalPath, next)
          );
        }}
        onVerticalChange={(next) => {
          onUpdate(
            applyBlockField(template, payload, currentBlock.id, verticalPath, next)
          );
        }}
      />
    );
  };

  const applyInlineVariableFromTextBody = (
    textBlock: TextBlock,
    args: {
      kind: "bind" | "create";
      slotId: string;
      label: string;
      defaultValue: string;
      nextTextBody: TextBodyV1;
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

  return (
    <div className="inspector">
      <div className="inspector__title-row">
        <h2 className="inspector__title">
          {blockName ? `${blockName} · ` : ""}
          {blockTypeLabel(block.type)} · {block.id.slice(0, 10)}
        </h2>
        <InspectorDebugCopyButton
          clipboardText={buildInspectorDebugClipboardText({
            templatePathKey: emailKey,
            layoutVariantId,
            templateId: template.templateId,
            blockId: id,
            blockType: block.type,
            blockMetaName: blockName ?? template.blockMeta?.[id]?.name,
          })}
        />
      </div>

      <AdminInspectorTabs
        active={inspectorTab}
        onChange={setInspectorTab}
        layoutPane={
          <>
          {block.type === "layout" || block.type === "image" ? (
            <>
              <h3 className="inspector__subtitle">
                {block.type === "image" ? "组件 · 叠放布局" : "组件 · 布局"}
              </h3>
              <section className="inspector__section">
                <Field label="排列方向">
                  <div className="inspector-icon-toggle-row" role="toolbar" aria-label="排列方向">
                    <ShopSecondaryButton
                      htmlType="button"
                      title="纵向排列"
                      aria-pressed={(block.props.direction ?? "vertical") === "vertical"}
                      className={`inspector-icon-toggle-row__btn ${(block.props.direction ?? "vertical") === "vertical" ? "inspector-icon-toggle-row__btn--active" : ""}`}
                      onClick={() => pushBlock(id, "props.direction", "vertical")}
                    >
                      <span className="inspector-sds-icon-btn-inner" aria-hidden>
                        <ColumnOutlined />
                      </span>
                    </ShopSecondaryButton>
                    <ShopSecondaryButton
                      htmlType="button"
                      title="横向排列"
                      aria-pressed={(block.props.direction ?? "vertical") === "horizontal"}
                      className={`inspector-icon-toggle-row__btn ${(block.props.direction ?? "vertical") === "horizontal" ? "inspector-icon-toggle-row__btn--active" : ""}`}
                      onClick={() => pushBlock(id, "props.direction", "horizontal")}
                    >
                      <span className="inspector-sds-icon-btn-inner" aria-hidden>
                        <MenuOutlined />
                      </span>
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
                <p className="inspector__muted">
                  列间隙与行间隙为同一数值（画布以 spacer 列与 spacer 行模拟）。
                </p>
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
            {wrapperSelfAlignPairRow(
              block,
              "wrapperStyle.placement.horizontal",
              "wrapperStyle.placement.vertical"
            )}
            {contentAlignGridRow(
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
        listPane={resolvedRepeatContext || canConfigureRepeat || repeatUnavailableReason ? repeatRegionPanel : undefined}
        visibilityPane={visibilityPanel}
        stylePane={
          <>
          {block.type === "text" ? (
            <>
              <h3 className="inspector__subtitle">组件 · 样式</h3>
              <section className="inspector__section">
                <Field label="字体" headerExtra={fieldBindHeader(block, "props.fontFamily")}>
                  <ShopSelect
                    value={coercePersistedFontFamily(
                      readDisplayFontFamilyString(block, "props.fontFamily")
                    )}
                    disabled={isInspectFollowLocked(template, block, payload, "props.fontFamily")}
                    onChange={(v) => pushBlock(id, "props.fontFamily", coercePersistedFontFamily(v))}
                  >
                    {EMAIL_FONT_FAMILY_OPTIONS.map((font) => (
                      <ShopSelect.Option key={font.value} value={font.value}>
                        {font.label}
                      </ShopSelect.Option>
                    ))}
                  </ShopSelect>
                </Field>
                {textTextRow(block, "字号", "props.fontSize")}
                {textColorRow(block, "文字颜色", "props.color")}
              </section>
            </>
          ) : null}

          {block.type === "image" ? (
            <>
              <h3 className="inspector__subtitle">组件 · 样式（图片）</h3>
              <section className="inspector__section">
                <p className="inspector__muted">
                  裁切区域由本 Inspector 顶部「布局」分页中的宽度/高度模式与数值决定；与「布局 + 容器背景图」渲染同源。
                </p>
                {layoutContainerBgSelectRow(block, "填充策略", "wrapperStyle.backgroundImage.fit", [
                  { value: "cover", label: "裁切铺满（cover）" },
                  { value: "contain", label: "完整显示（contain）" },
                ])}
                {layoutContainerBgPositionRow(block, "画面位置")}
                <fieldset className="inspector-bound-fieldset">
                  {renderBorderRadiusEditor({
                    labelPrefix: "图片",
                    basePath: "wrapperStyle.backgroundImage.borderRadius",
                    value: rd(block, "wrapperStyle.backgroundImage.borderRadius"),
                    getHint: (path) => readDisplayHint(block, path),
                    onChange: (path, value) => pushBlock(block.id, path, value),
                    bindTargetBlock: block,
                    bindBasePath: "wrapperStyle.backgroundImage.borderRadius",
                    controlsDisabled: isInspectFollowLocked(
                      template,
                      block,
                      payload,
                      "wrapperStyle.backgroundImage.borderRadius"
                    ),
                  })}
                </fieldset>
                <fieldset className="inspector-bound-fieldset">
                  {renderBorderEditor({
                    labelPrefix: "图片",
                    basePath: "wrapperStyle.backgroundImage.border",
                    value: rd(block, "wrapperStyle.backgroundImage.border"),
                    getHint: (path) => readDisplayHint(block, path),
                    onChange: (path, value) => pushBlock(block.id, path, value),
                    bindTargetBlock: block,
                    bindBasePath: "wrapperStyle.backgroundImage.border",
                    controlsDisabled: isInspectFollowLocked(
                      template,
                      block,
                      payload,
                      "wrapperStyle.backgroundImage.border"
                    ),
                  })}
                </fieldset>
              </section>
            </>
          ) : null}

          {block.type === "layout" && layoutHasBackgroundImage(block) ? (
            <>
              <h3 className="inspector__subtitle">组件 · 样式（容器背景图）</h3>
              <section className="inspector__section">
                {layoutContainerBgSelectRow(block, "背景填充策略", "wrapperStyle.backgroundImage.fit", [
                  { value: "cover", label: "裁切铺满（cover）" },
                  { value: "contain", label: "完整显示（contain）" },
                ])}
                {layoutContainerBgPositionRow(block, "背景画面位置")}
                <fieldset className="inspector-bound-fieldset">
                  {renderBorderRadiusEditor({
                    labelPrefix: "背景",
                    basePath: "wrapperStyle.backgroundImage.borderRadius",
                    value: rd(block, "wrapperStyle.backgroundImage.borderRadius"),
                    getHint: (path) => readDisplayHint(block, path),
                    onChange: (path, value) => pushBlock(block.id, path, value),
                    bindTargetBlock: block,
                    bindBasePath: "wrapperStyle.backgroundImage.borderRadius",
                    controlsDisabled: isInspectFollowLocked(
                      template,
                      block,
                      payload,
                      "wrapperStyle.backgroundImage.borderRadius"
                    ),
                  })}
                </fieldset>
                <fieldset className="inspector-bound-fieldset">
                  {renderBorderEditor({
                    labelPrefix: "背景",
                    basePath: "wrapperStyle.backgroundImage.border",
                    value: rd(block, "wrapperStyle.backgroundImage.border"),
                    getHint: (path) => readDisplayHint(block, path),
                    onChange: (path, value) => pushBlock(block.id, path, value),
                    bindTargetBlock: block,
                    bindBasePath: "wrapperStyle.backgroundImage.border",
                    controlsDisabled: isInspectFollowLocked(
                      template,
                      block,
                      payload,
                      "wrapperStyle.backgroundImage.border"
                    ),
                  })}
                </fieldset>
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
                {buttonFontFamilyRow(block)}
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
          <>
          <h3 className="inspector__subtitle">组件 · 内容</h3>
          <section className="inspector__section">
            {block.type === "text" ? (
              <>
                <Field
                  label="正文（结构化）"
                  hint={
                    textBodyContentMode === "wholeVariable"
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
                        mergedTemplate={mergedForInspector}
                        effectiveDesignTokens={effectiveDesignTokens}
                        onUpdate={onUpdate}
                        onTemplateChange={onTemplateChange}
                        onAggregateLiteralize={
                          mergedForInspector
                            ? () => {
                                const baked = bakeTextBodyToLiteralByMode(
                                  template,
                                  payload,
                                  block.id,
                                  mergedForInspector,
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
                  {textBodyContentMode === "wholeVariable" ? (
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
                        if (!mergedForInspector) return;
                        const detached = detachRunVariableToLiteral(
                          template,
                          payload,
                          block.id,
                          meta.textBindPath,
                          meta.displayText,
                          mergedForInspector
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
                      onCommit={(next: TextBodyV1) => {
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
                    if (!textVarPillModalMeta || !mergedForInspector) return;
                    const detached = detachRunVariableToLiteral(
                      template,
                      payload,
                      block.id,
                      textVarPillModalMeta.textBindPath,
                      textVarPillModalMeta.displayText,
                      mergedForInspector
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
              </>
            ) : null}

            {renderLayoutContentSection()}

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
            {block.type === "grid" || block.type === "divider" || block.type === "progress" ? (
              <InspectorEmptyTabHint />
            ) : null}
          </section>
          </>
        }
      />
      {repeatModal}
    </div>
  );
}
