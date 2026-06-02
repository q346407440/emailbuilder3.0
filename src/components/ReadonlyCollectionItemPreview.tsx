import { CollectionItemPreview } from "./collectionItemPreview/CollectionItemPreview";
import type { CollectionPreviewField } from "./collectionItemPreview/types";
import { resolveCollectionPreviewTabIndices } from "./collectionItemPreview/collectionItemPreviewUtils";

export type ReadonlyCollectionPreviewField = CollectionPreviewField;

export type ReadonlyCollectionItemPreviewProps = {
  slotId: string;
  fields: ReadonlyCollectionPreviewField[];
  values: unknown;
  tabCount?: number;
  padToTabCount?: boolean;
  requireNonemptyRow?: boolean;
  itemVisibility?: boolean[];
  onItemHiddenChange?: (index: number, hidden: boolean) => void;
  visibilityDisabled?: boolean;
};

/** @deprecated 请使用 resolveCollectionPreviewTabIndices */
export const resolveReadonlyPreviewTabIndices = resolveCollectionPreviewTabIndices;

export function ReadonlyCollectionItemPreview({
  slotId,
  fields,
  values,
  tabCount,
  padToTabCount = false,
  requireNonemptyRow = false,
  itemVisibility,
  onItemHiddenChange,
  visibilityDisabled = false,
}: ReadonlyCollectionItemPreviewProps) {
  return (
    <CollectionItemPreview
      slotId={slotId}
      fields={fields}
      values={values}
      mode="readonly"
      tabCount={tabCount}
      padToTabCount={padToTabCount}
      requireNonemptyRow={requireNonemptyRow}
      itemVisibility={itemVisibility}
      onItemHiddenChange={onItemHiddenChange}
      visibilityDisabled={visibilityDisabled}
      emptyHint="暂无预览数据 · 配置数据源后可在此查看每条内容"
    />
  );
}
