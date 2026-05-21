/** 将 SDS Select 的 onChange/onSelect 值规范为字符串（兼容 labelInValue 等形态）。 */
export function resolveShopSelectStringValue(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "object" && "value" in value) {
    return resolveShopSelectStringValue((value as { value: unknown }).value);
  }
  return null;
}
