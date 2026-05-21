import type { EmailPayload } from "../types/email";
import {
  BUILTIN_COLLECTION_EXTRACT_KINDS,
  builtinCollectionExtractKindUiLabel,
  builtinCollectionExtractLabel,
  builtinCollectionExtractNeedsAnchorSlot,
  DEFAULT_BUILTIN_COLLECTION_EXTRACT,
  type BuiltinCollectionExtract,
} from "../payload-contract/collection-builtin-extract";
import {
  BUILTIN_COLLECTION_SORT_IDS,
  builtinCollectionSortLabel,
  DEFAULT_BUILTIN_COLLECTION_SORT,
  type BuiltinCollectionSortId,
} from "../payload-contract/collection-builtin-sort";
import { listCollectionSlotIdsForExtract } from "../lib/resolveBuiltinCollectionItems";
import { Field } from "./ui/Field";

export type BuiltinCollectionRulesFieldsProps = {
  slotId: string;
  payload: EmailPayload;
  sort: BuiltinCollectionSortId;
  extract: BuiltinCollectionExtract;
  disabled?: boolean;
  syncNote?: string;
  extractHint?: string;
  sortHint?: string;
  onSortChange: (sort: BuiltinCollectionSortId) => void;
  onExtractKindChange: (kind: BuiltinCollectionExtract["kind"]) => void;
  onExtractFromSlotChange: (fromSlotId: string) => void;
};

export function BuiltinCollectionRulesFields({
  slotId,
  payload,
  sort,
  extract,
  disabled = false,
  syncNote,
  extractHint = "从另一列表槽首项排除锚点商品后取相似 mock；子列表请在父级 itemFields 中声明 collection，并在列表绑定里选择子列表路径。",
  sortHint = "在商品目录范围内排序后，再取列表长度条数作为预览。",
  onSortChange,
  onExtractKindChange,
  onExtractFromSlotChange,
}: BuiltinCollectionRulesFieldsProps) {
  const anchorOptions = listCollectionSlotIdsForExtract(payload, slotId);

  return (
    <section className="builtin-collection-rules-fields">
      {syncNote ? (
        <p className="inspector__muted builtin-collection-rules-fields__sync-note">{syncNote}</p>
      ) : null}
      <Field label="提取 / 衍生" hint={extractHint}>
        <select
          className="payload-collection-config__select"
          value={extract.kind}
          disabled={disabled}
          onChange={(e) =>
            onExtractKindChange(e.target.value as BuiltinCollectionExtract["kind"])
          }
        >
          {BUILTIN_COLLECTION_EXTRACT_KINDS.map((id) => (
            <option key={id} value={id}>
              {builtinCollectionExtractKindUiLabel(id)}
            </option>
          ))}
        </select>
        {builtinCollectionExtractNeedsAnchorSlot(extract) ? (
          <select
            className="payload-collection-config__select builtin-collection-rules-fields__anchor-from"
            value={extract.fromSlotId}
            disabled={disabled || anchorOptions.length === 0}
            onChange={(e) => onExtractFromSlotChange(e.target.value)}
          >
            {anchorOptions.length === 0 ? (
              <option value="">无可用锚点列表槽</option>
            ) : (
              anchorOptions.map((id) => (
                <option key={id} value={id}>
                  {payload.slots[id]?.label ?? id}（{id}）
                </option>
              ))
            )}
          </select>
        ) : null}
        {extract.kind !== "none" ? (
          <p className="inspector__muted builtin-collection-rules-fields__summary">
            {builtinCollectionExtractLabel(extract)}
          </p>
        ) : null}
      </Field>
      <Field label="排序逻辑" hint={sortHint}>
        <select
          className="payload-collection-config__select"
          value={sort}
          disabled={disabled}
          onChange={(e) => onSortChange(e.target.value as BuiltinCollectionSortId)}
        >
          {BUILTIN_COLLECTION_SORT_IDS.map((id) => (
            <option key={id} value={id}>
              {builtinCollectionSortLabel(id)}
            </option>
          ))}
        </select>
      </Field>
    </section>
  );
}

/** 从 payload 槽读取 builtin 规则；非 builtin 槽返回 null */
export function readBuiltinRulesFromPayloadSlot(
  payload: EmailPayload,
  slotId: string
): {
  sort: BuiltinCollectionSortId;
  extract: BuiltinCollectionExtract;
} | null {
  const entry = payload.slots[slotId];
  const ds = entry?.dataSource;
  if (ds?.type !== "remote" || ds.provider !== "builtin") return null;
  return {
    sort: ds.sort ?? DEFAULT_BUILTIN_COLLECTION_SORT,
    extract: ds.extract ?? DEFAULT_BUILTIN_COLLECTION_EXTRACT,
  };
}
