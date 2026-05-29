import { useState } from "react";
import {
  normalizeBuiltinAlbumListConfig,
  type BuiltinAlbumListConfig,
} from "../payload-contract/collection-builtin-catalog-config";
import { summarizeBuiltinAlbumListSelection } from "../lib/builtinPickerCatalog";
import { BuiltinAlbumPickerModal } from "./BuiltinAlbumPickerModal";
import { Field } from "./ui/Field";
import { ShopSecondaryButton } from "./ui/ShopFormControls";

type Props = {
  config: BuiltinAlbumListConfig;
  disabled?: boolean;
  onChange: (config: BuiltinAlbumListConfig) => void;
};

export function BuiltinAlbumListConfigFields({ config, disabled, onChange }: Props) {
  const normalized = normalizeBuiltinAlbumListConfig(config);
  const [pickerOpen, setPickerOpen] = useState(false);
  const ids = normalized.selectedAlbumIds ?? [];

  return (
    <section className="builtin-album-list-config">
      <Field label="专辑范围" hint="列表行 = 所选商品专辑；支持多选（与店匠专辑列表一致）。">
        <p className="builtin-product-list-config__summary">
          {summarizeBuiltinAlbumListSelection(ids)}
        </p>
        <ShopSecondaryButton
          htmlType="button"
          disabled={disabled}
          onClick={() => setPickerOpen(true)}
        >
          选择专辑…
        </ShopSecondaryButton>
      </Field>

      <BuiltinAlbumPickerModal
        visible={pickerOpen}
        title="选择专辑"
        selectionMode="multiple"
        selectedIds={ids}
        disabled={disabled}
        onClose={() => setPickerOpen(false)}
        onConfirm={(selectedAlbumIds) => {
          onChange({ selectedAlbumIds });
          setPickerOpen(false);
        }}
      />
    </section>
  );
}
