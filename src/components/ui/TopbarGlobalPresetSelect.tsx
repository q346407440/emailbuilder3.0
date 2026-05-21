import { ShopSelect } from "./ShopFormControls";

type PresetOption = {
  presetId: string;
  label: string;
};

type Props = {
  options: PresetOption[];
  value: string | null;
  disabled?: boolean;
  onChange: (presetId: string) => void;
};

export function TopbarGlobalPresetSelect({ options, value, disabled, onChange }: Props) {
  return (
    <div className="topbar__select-wrap">
      <span className="topbar__select-label">公共样式预设</span>
      <div className="topbar__select-slot">
        <ShopSelect
          value={value ?? undefined}
          placeholder={options.length ? undefined : "暂无公共预设"}
          disabled={disabled || options.length === 0}
          onChange={(v) => {
            if (v != null && String(v) !== "") onChange(String(v));
          }}
        >
          {options.map((opt) => (
            <ShopSelect.Option key={opt.presetId} value={opt.presetId}>
              {opt.label} ({opt.presetId})
            </ShopSelect.Option>
          ))}
        </ShopSelect>
      </div>
    </div>
  );
}
