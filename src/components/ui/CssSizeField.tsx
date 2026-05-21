import { useEffect, useState } from "react";
import { Field } from "./Field";
import { ShopInput, ShopSelect, ShopUnitInput } from "./ShopFormControls";
import { cssSizeStringPrefersUnitNumericInput } from "../../lib/cssSizeString";

export type CssSizeValueKind = "auto" | "percent" | "px" | "custom";

type Props = {
  label: string;
  value: string;
  onChange: (next: string) => void;
  hint?: string;
  /** 为 true 时可选「自动（auto）」（如 intrinsic 视口） */
  allowAuto?: boolean;
  /** 切换到「像素」且无法从当前值解析出数字时的默认值（如 260px） */
  defaultPxFallback: string;
  disabled?: boolean;
};

function inferKind(raw: string, allowAuto: boolean): CssSizeValueKind {
  const t = raw.trim();
  if (!t) return "custom";
  if (allowAuto && t === "auto") return "auto";
  if (t === "auto" && !allowAuto) return "custom";
  if (/^\d*\.?\d+%$/i.test(t)) return "percent";
  if (cssSizeStringPrefersUnitNumericInput(t)) return "px";
  return "custom";
}

function parsePxOrFallback(raw: string, fallback: string): string {
  const t = raw.trim();
  const m = t.match(/^(-?\d*\.?\d+)px$/i) ?? t.match(/^(-?\d*\.?\d+)$/);
  if (m) return `${m[1]}px`;
  return fallback;
}

function parsePercentOrDefault(raw: string): string {
  const t = raw.trim();
  const m = t.match(/^(\d*\.?\d+)%$/i);
  if (m) return `${m[1]}%`;
  return "100%";
}

function percentNumericPart(raw: string): string {
  const m = raw.trim().match(/^(\d*\.?\d+)%$/i);
  return m ? m[1] : "100";
}

/**
 * CSS 长度编辑：先选「值类型」，再出现对应控件（auto / 百分比 / 像素 / 自定义）。
 * 对外仍只读写单一字符串，与模板 JSON 一致。
 */
export function CssSizeField({
  label,
  value,
  onChange,
  hint,
  allowAuto = false,
  defaultPxFallback,
  disabled,
}: Props) {
  const [kind, setKind] = useState<CssSizeValueKind>(() => inferKind(value, allowAuto));

  useEffect(() => {
    setKind(inferKind(value, allowAuto));
  }, [value, allowAuto]);

  const kindOptions: Array<{ value: CssSizeValueKind; label: string }> = [
    ...(allowAuto ? [{ value: "auto" as const, label: "自动（auto）" }] : []),
    { value: "percent", label: "百分比（%）" },
    { value: "px", label: "像素（px）" },
    { value: "custom", label: "自定义 CSS 长度" },
  ];

  const applyKind = (nextKind: CssSizeValueKind) => {
    setKind(nextKind);
    if (nextKind === "auto") {
      onChange("auto");
      return;
    }
    if (nextKind === "percent") {
      onChange(parsePercentOrDefault(value));
      return;
    }
    if (nextKind === "px") {
      onChange(parsePxOrFallback(value, defaultPxFallback));
      return;
    }
    // custom：保留当前字符串，便于从其它类型切回并继续改
    onChange(value);
  };

  const defaultHint =
    "先选择值类型，再使用下方控件；保存到模板时仍为一条字符串（如 100%、120px、auto），不改动 JSON 结构。";

  return (
    <Field label={label} hint={hint ?? defaultHint}>
      <div className="css-size-field">
        <ShopSelect
          disabled={disabled}
          value={kind}
          onChange={(v) => applyKind(String(v) as CssSizeValueKind)}
        >
          {kindOptions.map((opt) => (
            <ShopSelect.Option key={opt.value} value={opt.value}>
              {opt.label}
            </ShopSelect.Option>
          ))}
        </ShopSelect>
        {kind === "auto" ? (
          <p className="inspector__muted css-size-field__sub">当前值为 auto。</p>
        ) : null}
        {kind === "percent" ? (
          <ShopUnitInput
            disabled={disabled}
            value={`${percentNumericPart(value)}%`}
            unit="%"
            min={0}
            step={0.1}
            onChange={onChange}
          />
        ) : null}
        {kind === "px" ? (
          <ShopUnitInput
            disabled={disabled}
            value={parsePxOrFallback(value, defaultPxFallback)}
            unit="px"
            min={0}
            step={0.1}
            onChange={onChange}
          />
        ) : null}
        {kind === "custom" ? (
          <ShopInput
            disabled={disabled}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="如 calc(100% - 20px)、3em、80vh"
          />
        ) : null}
      </div>
    </Field>
  );
}
