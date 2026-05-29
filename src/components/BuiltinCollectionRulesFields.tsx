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
  BUILTIN_ALBUM_SORT_IDS,
  BUILTIN_PRODUCT_SORT_IDS,
  builtinCollectionSortLabel,
  DEFAULT_BUILTIN_COLLECTION_SORT,
  type BuiltinCollectionSortId,
} from "../payload-contract/collection-builtin-sort";
import type { BuiltinCollectionCatalogId } from "../payload-contract/collection-data-source";
import { listCollectionSlotIdsForExtract } from "../lib/resolveBuiltinCollectionItems";
import { Field } from "./ui/Field";
import { ShopInput } from "./ui/ShopFormControls";

export type BuiltinCollectionRulesFieldsProps = {
  slotId: string;
  payload: EmailPayload;
  catalog: BuiltinCollectionCatalogId;
  sort: BuiltinCollectionSortId;
  extract: BuiltinCollectionExtract;
  disabled?: boolean;
  syncNote?: string;
  extractHint?: string;
  sortHint?: string;
  onSortChange: (sort: BuiltinCollectionSortId) => void;
  onExtractKindChange: (kind: BuiltinCollectionExtract["kind"]) => void;
  onExtractFromSlotChange: (fromSlotId: string) => void;
  onAnchorItemIndexChange?: (index: number) => void;
};

export function BuiltinCollectionRulesFields({
  slotId,
  payload,
  catalog,
  sort,
  extract,
  disabled = false,
  syncNote,
  extractHint = "相似品/搭配品为 SPU 级算法；锚点为另一商品列表槽的第 N 条。",
  sortHint = "仅当抽取逻辑为「无」时可配置排序。",
  onSortChange,
  onExtractKindChange,
  onExtractFromSlotChange,
  onAnchorItemIndexChange,
}: BuiltinCollectionRulesFieldsProps) {
  const anchorOptions = listCollectionSlotIdsForExtract(payload, slotId);
  const showSort = extract.kind === "none";
  const sortIds =
    catalog === "albums" ? BUILTIN_ALBUM_SORT_IDS : BUILTIN_PRODUCT_SORT_IDS;
  const anchorIndex =
    builtinCollectionExtractNeedsAnchorSlot(extract) ? (extract.anchorItemIndex ?? 1) : 1;

  return (
    <section className="builtin-collection-rules-fields">
      {syncNote ? (
        <p className="inspector__muted builtin-collection-rules-fields__sync-note">{syncNote}</p>
      ) : null}
      {catalog === "products" ? (
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
            <>
              <select
                className="payload-collection-config__select builtin-collection-rules-fields__anchor-from"
                value={extract.fromSlotId}
                disabled={disabled || anchorOptions.length === 0}
                onChange={(e) => onExtractFromSlotChange(e.target.value)}
              >
                {anchorOptions.length === 0 ? (
                  <option value="">无可用锚点商品列表槽</option>
                ) : (
                  anchorOptions.map((id) => (
                    <option key={id} value={id}>
                      {payload.slots[id]?.label ?? id}（{id}）
                    </option>
                  ))
                )}
              </select>
              <label className="builtin-collection-rules-fields__anchor-index">
                <span className="inspector__muted">锚定第</span>
                <ShopInput
                  type="number"
                  min={1}
                  max={10}
                  value={String(anchorIndex)}
                  disabled={disabled}
                  onChange={(e) => {
                    const n = Math.max(1, Math.floor(Number(e.target.value) || 1));
                    onAnchorItemIndexChange?.(n);
                  }}
                />
                <span className="inspector__muted">条 SPU</span>
              </label>
            </>
          ) : null}
          {extract.kind !== "none" ? (
            <p className="inspector__muted builtin-collection-rules-fields__summary">
              {builtinCollectionExtractLabel(extract)}
            </p>
          ) : null}
        </Field>
      ) : null}
      {showSort ? (
        <Field label="排序方式" hint={sortHint}>
          <select
            className="payload-collection-config__select"
            value={sort}
            disabled={disabled}
            onChange={(e) => onSortChange(e.target.value as BuiltinCollectionSortId)}
          >
            {sortIds.map((id) => (
              <option key={id} value={id}>
                {builtinCollectionSortLabel(id, catalog)}
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <p className="inspector__muted">抽取为相似品/搭配品时，顺序由算法决定，不配置排序。</p>
      )}
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
