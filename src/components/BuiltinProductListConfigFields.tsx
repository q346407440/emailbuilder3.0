import { useState } from "react";
import {
  BUILTIN_PRODUCT_ROW_GRANULARITIES,
  builtinProductRowGranularityLabel,
  normalizeBuiltinProductListConfig,
  type BuiltinProductListConfig,
  type BuiltinProductRowGranularity,
} from "../payload-contract/collection-builtin-catalog-config";
import { summarizeBuiltinProductListConfig } from "../lib/builtinPickerCatalog";
import { BuiltinProductPickerModal } from "./BuiltinProductPickerModal";
import { Field } from "./ui/Field";
import { ShopSecondaryButton } from "./ui/ShopFormControls";

type Props = {
  config: BuiltinProductListConfig;
  disabled?: boolean;
  onChange: (config: BuiltinProductListConfig) => void;
};

export function BuiltinProductListConfigFields({ config, disabled, onChange }: Props) {
  const normalized = normalizeBuiltinProductListConfig(config);
  const [pickerOpen, setPickerOpen] = useState(false);

  const onGranularityChange = (rowGranularity: BuiltinProductRowGranularity) => {
    if (rowGranularity === normalized.rowGranularity) return;
    onChange(
      normalizeBuiltinProductListConfig({
        ...normalized,
        rowGranularity,
        selectedSpuIds: rowGranularity === "spu" ? normalized.selectedSpuIds : [],
        skuSelection: rowGranularity === "sku" ? normalized.skuSelection : [],
      })
    );
  };

  const showSkuTreeAfterCollection =
    normalized.rangeMode === "byCollection" &&
    normalized.rowGranularity === "sku" &&
    (normalized.selectedCollectionIds?.length ?? 0) > 0;

  return (
    <section className="builtin-product-list-config">
      <Field
        label="商品范围"
        hint="与店匠「选择商品」一致：SPU 多选、SKU 树形多选、专辑单选、或全部商品。"
      >
        <p className="builtin-product-list-config__summary">
          {summarizeBuiltinProductListConfig(normalized)}
        </p>
        <ShopSecondaryButton
          htmlType="button"
          disabled={disabled}
          onClick={() => setPickerOpen(true)}
        >
          选择商品…
        </ShopSecondaryButton>
      </Field>

      <BuiltinProductPickerModal
        visible={pickerOpen}
        config={normalized}
        disabled={disabled}
        onClose={() => setPickerOpen(false)}
        onConfirm={(next) => {
          onChange(next);
          setPickerOpen(false);
        }}
      />

      <Field
        label="列表行粒度"
        hint="按 SKU 时邮件仅父级循环；选「专辑 / 全部商品」后在此切换 SPU 或 SKU 扁平行。"
      >
        <select
          className="payload-collection-config__select"
          value={normalized.rowGranularity}
          disabled={disabled || normalized.rangeMode === "allProducts"}
          onChange={(e) => onGranularityChange(e.target.value as BuiltinProductRowGranularity)}
        >
          {BUILTIN_PRODUCT_ROW_GRANULARITIES.map((g) => (
            <option key={g} value={g}>
              {builtinProductRowGranularityLabel(g)}
            </option>
          ))}
        </select>
      </Field>

      {showSkuTreeAfterCollection ? (
        <p className="inspector__muted">
          已选专辑内商品为候选池；请再次打开「选择商品…」并切换到 SKU 页签勾选规格。
        </p>
      ) : null}
    </section>
  );
}
