import type { EmailPayload } from "../types/email";
import {
  builtinAlbumSortUiOptionIds,
  builtinProductSortUiOptionIds,
  builtinSortUiOptionLabel,
  policyFromSortUiOption,
  readSortPolicyFromBuiltinDataSource,
  regularSortFromPolicy,
  type NormalizedBuiltinSortPolicy,
} from "../payload-contract/collection-builtin-sort-policy";
import type { BuiltinCollectionCatalogId } from "../payload-contract/collection-data-source";
import { Field } from "./ui/Field";

export type BuiltinCollectionRulesFieldsProps = {
  slotId: string;
  payload: EmailPayload;
  catalog: BuiltinCollectionCatalogId;
  sortPolicy: NormalizedBuiltinSortPolicy;
  disabled?: boolean;
  syncNote?: string;
  sortHint?: string;
  onSortPolicyChange: (policy: NormalizedBuiltinSortPolicy) => void;
};

export function BuiltinCollectionRulesFields({
  catalog,
  sortPolicy,
  disabled = false,
  syncNote,
  sortHint = "排序作用于当前商品列表自身。",
  onSortPolicyChange,
}: BuiltinCollectionRulesFieldsProps) {
  const sortOptionIds =
    catalog === "albums" ? builtinAlbumSortUiOptionIds() : builtinProductSortUiOptionIds();
  const selectedOption = regularSortFromPolicy(sortPolicy);

  const handleOptionChange = (optionId: (typeof sortOptionIds)[number]) => {
    onSortPolicyChange(policyFromSortUiOption(optionId));
  };

  return (
    <section className="builtin-collection-rules-fields">
      {syncNote ? (
        <p className="inspector__muted builtin-collection-rules-fields__sync-note">{syncNote}</p>
      ) : null}
      <Field label="排序方式" hint={sortHint}>
        <select
          className="payload-collection-config__select"
          value={selectedOption}
          disabled={disabled}
          onChange={(e) =>
            handleOptionChange(e.target.value as (typeof sortOptionIds)[number])
          }
        >
          {sortOptionIds.map((id) => (
            <option key={id} value={id}>
              {builtinSortUiOptionLabel(id, catalog)}
            </option>
          ))}
        </select>
      </Field>
    </section>
  );
}

/** 从 payload 槽读取 builtin 排序/派生策略；非 builtin 槽返回 null */
export function readBuiltinSortPolicyFromPayloadSlot(
  payload: EmailPayload,
  slotId: string
): NormalizedBuiltinSortPolicy | null {
  const entry = payload.slots[slotId];
  const ds = entry?.dataSource;
  if (ds?.type !== "remote" || ds.provider !== "builtin") return null;
  return readSortPolicyFromBuiltinDataSource(ds);
}
