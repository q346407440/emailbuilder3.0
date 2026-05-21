export type ThemeRef = {
  $themeRef: string;
};

export type ThemeableString = string | ThemeRef;

export function isThemeRef(value: unknown): value is ThemeRef {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return Object.keys(record).length === 1 && typeof record.$themeRef === "string";
}

export function parseThemeRefPath(value: ThemeRef): string {
  return value.$themeRef.trim();
}
