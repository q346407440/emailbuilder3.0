import type { EmailTemplate, RepeatFieldMapping, RepeatRegionBinding } from "../types/email";
import { sanitizeListRepeatUserLabel } from "./repeatNestedBindingUi";

function blockDisplayName(template: EmailTemplate, blockId: string): string {
  const raw = template.blockMeta?.[blockId]?.name?.trim() || blockId;
  return sanitizeListRepeatUserLabel(raw);
}

/** 列表绑定在 Inspector 中的展示条数文案 */
export function repeatBindingDisplayCountLabel(
  itemCount: number,
  repeat: RepeatRegionBinding
): string {
  const fixed =
    repeat.minItems != null && repeat.minItems === repeat.maxItems ? repeat.minItems : null;
  if (fixed != null) {
    return `固定展示 ${fixed} 行`;
  }
  if (repeat.minItems != null && repeat.maxItems != null) {
    return `约 ${repeat.minItems}–${repeat.maxItems} 行（当前数据 ${itemCount} 条）`;
  }
  if (itemCount > 0) {
    return `随数据展示，当前 ${itemCount} 条`;
  }
  return "随数据条数展示（当前无数据）";
}

/** 行结构说明（运营可读，不含宿主/行模板等术语） */
export function repeatBindingRowStructureLabel(
  template: EmailTemplate,
  hostId: string,
  repeat: RepeatRegionBinding
): string {
  const prototypes = repeat.prototypeChildIds.filter((id) => Boolean(template.blocks[id]));
  if (prototypes.length === 0) {
    return "—";
  }
  if (prototypes.length === 1 && prototypes[0] === hostId) {
    return "每条数据复制当前区块";
  }
  const names = prototypes.map((id) => blockDisplayName(template, id));
  if (names.length === 1) {
    return `每条数据复制「${names[0]}」`;
  }
  return `每条数据复制：${names.join("、")}`;
}

/** 一句话说明绑定效果 */
export function repeatBindingLeadSentence(
  template: EmailTemplate,
  hostId: string,
  repeat: RepeatRegionBinding,
  itemCount: number
): string {
  const variableLabel = repeat.label?.trim() || repeat.slotId;
  const structure = repeatBindingRowStructureLabel(template, hostId, repeat);
  const childPath = repeat.itemPath?.trim();
  if (childPath) {
    const nested = repeat.itemFields?.find((f) => f.key === childPath)?.label ?? childPath;
    return `使用「${variableLabel}」中每条数据的「${nested}」子列表展开显示。`;
  }
  if (itemCount > 0) {
    return `使用「${variableLabel}」共 ${itemCount} 条数据，${structure}。`;
  }
  return `已关联「${variableLabel}」，${structure}。`;
}

export type RepeatBindingRelationOpsLabel = {
  /** 顶栏角色标签（简短） */
  roleLabel: string;
  /** 选中非宿主时的一行提示 */
  contextHint?: string;
};

export function repeatBindingRelationOpsLabel(
  relation: "host" | "row-template" | "mapped-field",
  template: EmailTemplate,
  hostId: string,
  prototypeRootId?: string
): RepeatBindingRelationOpsLabel {
  const hostName = blockDisplayName(template, hostId);
  switch (relation) {
    case "host":
      return { roleLabel: "循环容器" };
    case "row-template":
      return {
        roleLabel: "行内区块",
        contextHint: prototypeRootId
          ? `属于「${hostName}」列表绑定中的行结构「${blockDisplayName(template, prototypeRootId)}」。`
          : `属于「${hostName}」的列表绑定。`,
      };
    case "mapped-field":
      return {
        roleLabel: "列表字段",
        contextHint: `字段由「${hostName}」的列表绑定填充，请在下方查看映射。`,
      };
    default:
      return { roleLabel: "列表绑定" };
  }
}

export type RepeatBindingPreviewField = {
  key: string;
  label: string;
};

/** 预览区优先展示已映射到模板的列 */
export function repeatBindingPreviewFields(repeat: RepeatRegionBinding): RepeatBindingPreviewField[] {
  const out: RepeatBindingPreviewField[] = [];
  const seen = new Set<string>();
  for (const mapping of repeat.fieldMappings ?? []) {
    const key = mapping.sourcePath;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ key, label: mapping.label?.trim() || key });
  }
  for (const field of repeat.itemFields ?? []) {
    if (field.valueType === "collection") continue;
    if (seen.has(field.key)) continue;
    seen.add(field.key);
    out.push({ key: field.key, label: field.label?.trim() || field.key });
  }
  return out;
}

export function repeatBindingOverviewRowCount(itemCount: number, repeat: RepeatRegionBinding): string {
  const fixed =
    repeat.minItems != null && repeat.minItems === repeat.maxItems ? repeat.minItems : null;
  if (fixed != null) return `${fixed} 行`;
  if (itemCount > 0) return `${itemCount} 行`;
  return "随数据";
}

export function repeatBindingOverviewStructureShort(
  template: EmailTemplate,
  hostId: string,
  repeat: RepeatRegionBinding
): string {
  const prototypes = repeat.prototypeChildIds.filter((id) => Boolean(template.blocks[id]));
  if (prototypes.length === 1 && prototypes[0] === hostId) {
    return "复制当前区块";
  }
  if (prototypes.length === 1) {
    return blockDisplayName(template, prototypes[0]!);
  }
  return `${prototypes.length} 段结构`;
}

export function repeatBindingMappingRows(
  repeat: RepeatRegionBinding,
  formatLine: (mapping: RepeatFieldMapping) => string
): string[] {
  return (repeat.fieldMappings ?? []).map((mapping) => formatLine(mapping));
}
