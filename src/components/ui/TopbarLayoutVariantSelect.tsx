import { useCallback, useMemo } from "react";
import type { LayoutManifest } from "../../layout-variant-contract/types";
import { resolveShopSelectStringValue } from "../../lib/shopSelectValue";
import { ShopSelect } from "./ShopFormControls";

type TopbarLayoutVariantSelectProps = {
  manifest: LayoutManifest | null;
  value: string | null;
  disabled?: boolean;
  onSelect: (layoutVariantId: string) => void;
};

/** 场景级版式切换（大结构变体）；无 manifest 时不渲染 */
export function TopbarLayoutVariantSelect({
  manifest,
  value,
  disabled,
  onSelect,
}: TopbarLayoutVariantSelectProps) {
  const options = useMemo(() => manifest?.variants ?? [], [manifest]);

  const handlePick = useCallback(
    (raw: unknown) => {
      const nextId = resolveShopSelectStringValue(raw);
      if (!nextId || nextId === value) return;
      onSelect(nextId);
    },
    [onSelect, value]
  );

  if (!manifest || options.length === 0) return null;

  return (
    <div className="topbar__select-wrap">
      <span className="topbar__select-label">版式结构</span>
      <div className="topbar__select-slot">
        <ShopSelect
          className="topbar__select"
          disabled={disabled}
          value={value ?? manifest.activeLayoutVariantId}
          onChange={handlePick}
          placeholder="选择版式"
        >
          {options.map((v) => (
            <ShopSelect.Option key={v.id} value={v.id}>
              {v.label}
            </ShopSelect.Option>
          ))}
        </ShopSelect>
      </div>
    </div>
  );
}
