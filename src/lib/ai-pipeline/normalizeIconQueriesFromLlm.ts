import { ICON_PACKS, type IconPack } from "./compactTypes";
import type { IconQueryItem } from "./types";
import { HEX_COLOR_RE } from "./schemas/shared";

type LlmIconItem = {
  id?: unknown;
  regionId?: unknown;
  pack?: unknown;
  iconQuery?: unknown;
  colorHex?: unknown;
  label?: unknown;
};

const SOCIAL_SLUGS = new Set([
  "instagram",
  "tiktok",
  "youtube",
  "facebook",
  "twitter",
  "x",
  "linkedin",
  "pinterest",
]);

/** 将 LLM 输出的 JSON 数组规范化为 IconQueryItem[]（非法项丢弃）。 */
export function normalizeIconQueriesFromLlm(parsed: unknown): IconQueryItem[] {
  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((raw) => normalizeIconItem((raw && typeof raw === "object" ? raw : {}) as LlmIconItem))
    .filter((item): item is IconQueryItem => item != null);
}

function normalizeIconItem(item: LlmIconItem): IconQueryItem | null {
  const id = stringifyId(item.id);
  const regionId = typeof item.regionId === "string" ? item.regionId.trim() : "";
  const iconQuery = typeof item.iconQuery === "string" ? item.iconQuery.trim() : "";
  if (!id || !regionId || !iconQuery) return null;

  const pack = inferPack(item.pack, iconQuery);
  const colorHex = normalizeColorHex(item.colorHex);
  const label = typeof item.label === "string" ? item.label.trim() : undefined;

  return {
    id,
    regionId,
    pack,
    iconQuery: iconQuery.toLowerCase().replace(/\s+/g, "-"),
    colorHex,
    ...(label ? { label } : {}),
  };
}

function stringifyId(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return `icon_${value}`;
  return "";
}

function inferPack(rawPack: unknown, iconQuery: string): IconPack {
  const packStr = typeof rawPack === "string" ? rawPack.trim().toLowerCase() : "";
  if (packStr === "simple-icons" || packStr === "simpleicons" || packStr === "social") {
    return "simple-icons";
  }
  if (packStr === "lucide") return "lucide";
  if (packStr === "tabler") return "tabler";

  const slug = iconQuery.toLowerCase();
  if (SOCIAL_SLUGS.has(slug)) return "simple-icons";

  if (ICON_PACKS.includes(packStr as IconPack)) return packStr as IconPack;
  return "tabler";
}

function normalizeColorHex(value: unknown): string {
  if (typeof value !== "string") return "#000000";
  let s = value.trim();
  if (/^[0-9a-fA-F]{6}$/.test(s)) s = `#${s}`;
  if (HEX_COLOR_RE.test(s)) return s.toUpperCase();
  if (/^[0-9a-fA-F]{3}$/.test(s)) {
    const expanded = s
      .split("")
      .map((c) => c + c)
      .join("");
    return `#${expanded}`.toUpperCase();
  }
  return "#000000";
}
