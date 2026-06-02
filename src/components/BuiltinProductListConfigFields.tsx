import { useState } from "react";
import {
  isSpuOnlyBuiltinProductSelection,
  normalizeBuiltinProductListConfig,
  type BuiltinProductListConfig,
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
  const spuOnly = isSpuOnlyBuiltinProductSelection(normalized);
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <section className="builtin-product-list-config">
      <Field
        label="商品范围"
        hint={
          spuOnly
            ? "选择主 SPU 候选池：指定商品、按专辑或全部商品。子级相似品/搭配品由系统按主 SPU 生成，不支持按 SKU 勾选。"
            : "选择候选商品池：指定商品、按 SKU 规格、按专辑或全部商品。列表行固定为 SPU，SKU 展示由模板嵌套 repeat 控制。"
        }
      >
        <p className="builtin-product-list-config__summary">
          {summarizeBuiltinProductListConfig(normalized)}
        </p>
        <ShopSecondaryButton
          htmlType="button"
          className="builtin-product-list-config__action"
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
    </section>
  );
}
