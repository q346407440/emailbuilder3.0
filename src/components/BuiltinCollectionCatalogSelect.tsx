import type { BuiltinCollectionCatalogId } from "../payload-contract/collection-data-source";
import { BUILTIN_COLLECTION_CATALOG_IDS } from "../payload-contract/collection-data-source";
import { builtinCatalogLabel } from "../lib/builtinCollectionCatalog";

type Props = {
  value: BuiltinCollectionCatalogId;
  disabled?: boolean;
  onChange: (catalog: BuiltinCollectionCatalogId) => void;
};

export function BuiltinCollectionCatalogSelect({ value, disabled, onChange }: Props) {
  return (
    <select
      className="payload-collection-config__select"
      value={value}
      disabled={disabled}
      aria-label="内置目录"
      onChange={(e) => onChange(e.target.value as BuiltinCollectionCatalogId)}
    >
      {BUILTIN_COLLECTION_CATALOG_IDS.map((id) => (
        <option key={id} value={id}>
          {builtinCatalogLabel(id)}
        </option>
      ))}
    </select>
  );
}
