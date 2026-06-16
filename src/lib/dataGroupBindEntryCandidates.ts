import type { BindingCollectionField } from "../types/email";
import type { EmailPayload } from "../types/email";
import { formatRepeatCollectionCandidateListSummary } from "./repeatListItemField";

export type DataGroupBindEntryCandidate = {
  key: string;
  slotId: string;
  valueType: "collection" | "object";
  label: string;
  description?: string;
  summary: string;
  /** 父项子列表列路径（嵌套 repeat 绑定时） */
  itemPath?: string;
  /** 父级列表变量展示名（嵌套子列表行 tag / 提示） */
  parentSlotLabel?: string;
};

type RepeatBindEntrySource = {
  key: string;
  slotId: string;
  itemPath?: string;
  label: string;
  description?: string;
  parentSlotLabel?: string;
  itemFields: BindingCollectionField[];
  minItems?: number;
  maxItems?: number;
};

type ObjectBindEntrySource = {
  key: string;
  slotId: string;
  label: string;
  description?: string;
  objectFields: BindingCollectionField[];
};

function collectionEntrySummary(
  payload: EmailPayload | null,
  candidate: RepeatBindEntrySource
): string {
  const itemPath = candidate.itemPath?.trim();
  if (itemPath) {
    return formatRepeatCollectionCandidateListSummary(payload, {
      slotId: candidate.slotId,
      itemPath,
      itemFields: candidate.itemFields,
    });
  }
  if (candidate.minItems !== undefined && candidate.maxItems === candidate.minItems) {
    return `${candidate.minItems} 行固定`;
  }
  return `${candidate.itemFields.length} 列`;
}

/**
 * 数据组绑定入口：列表候选与 Inspector repeatBindCandidates 同源（含父项子列表、排除父级 slotId）；
 * 对象候选为 payload 顶层 object 槽。
 */
export function buildDataGroupBindEntryCandidates(
  repeatCandidates: RepeatBindEntrySource[],
  objectCandidates: ObjectBindEntrySource[],
  payload: EmailPayload | null
): DataGroupBindEntryCandidate[] {
  const listRows: DataGroupBindEntryCandidate[] = repeatCandidates.map((candidate) => ({
    key: candidate.key,
    slotId: candidate.slotId,
    valueType: "collection",
    label: candidate.label,
    description: candidate.description,
    itemPath: candidate.itemPath,
    parentSlotLabel: candidate.parentSlotLabel,
    summary: collectionEntrySummary(payload, candidate),
  }));

  const objectRows: DataGroupBindEntryCandidate[] = objectCandidates.map((candidate) => ({
    key: candidate.key,
    slotId: candidate.slotId,
    valueType: "object",
    label: candidate.label,
    description: candidate.description,
    summary: `${candidate.objectFields.length} 个字段`,
  }));

  return [...listRows, ...objectRows].sort((a, b) => a.label.localeCompare(b.label, "zh-Hans-CN"));
}
