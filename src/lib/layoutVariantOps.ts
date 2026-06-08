import type { LayoutManifest, LayoutVariantEntry } from "../layout-variant-contract/types";
import { LAYOUT_MANIFEST_SCHEMA_VERSION } from "../layout-variant-contract/types";
import type { PublishStatus } from "../publish-status-contract/types";
import { compareByCreatedAtDesc } from "./sortByCreatedAt";
import { assertLayoutVariantIdSafe } from "./emailLayoutVariant";

/** 顶栏版式下拉：按 createdAt 倒序（缺省排后，再按 id 稳定排序）。 */
export function sortLayoutVariantsByCreatedDesc(
  variants: LayoutVariantEntry[]
): LayoutVariantEntry[] {
  return [...variants].sort((a, b) =>
    compareByCreatedAtDesc(a.createdAt, b.createdAt, () =>
      b.id.localeCompare(a.id, "zh-CN", { numeric: true, sensitivity: "base" })
    )
  );
}

/** 由展示名称推导唯一版式 id（无法 slug 时用 layout-<base36>）。 */
export function deriveLayoutVariantIdFromLabel(
  label: string,
  existingIds: Iterable<string>
): string {
  const taken = new Set(existingIds);
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  let base = slug;
  if (!base || assertLayoutVariantIdSafe(base)) {
    base = `layout-${Date.now().toString(36)}`;
  }
  if (!/^[a-zA-Z0-9]/.test(base)) {
    base = `l-${base}`;
  }

  if (!taken.has(base)) return base;
  for (let i = 2; i < 10_000; i += 1) {
    const candidate = `${base}-${i}`;
    if (!taken.has(candidate) && !assertLayoutVariantIdSafe(candidate)) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export function createDefaultLayoutManifest(
  primary: LayoutVariantEntry,
  activeLayoutVariantId = primary.id
): LayoutManifest {
  return {
    schemaVersion: LAYOUT_MANIFEST_SCHEMA_VERSION,
    activeLayoutVariantId,
    variants: [primary],
  };
}

export function appendLayoutVariant(
  manifest: LayoutManifest,
  entry: LayoutVariantEntry,
  options?: { makeActive?: boolean }
): LayoutManifest {
  if (manifest.variants.some((v) => v.id === entry.id)) {
    throw new Error(`版式 id「${entry.id}」已存在`);
  }
  const variants = [...manifest.variants, entry];
  return {
    ...manifest,
    variants,
    activeLayoutVariantId: options?.makeActive ? entry.id : manifest.activeLayoutVariantId,
  };
}

export function updateLayoutVariantLabel(
  manifest: LayoutManifest,
  layoutVariantId: string,
  label: string
): LayoutManifest {
  const normalized = label.trim();
  if (!normalized) {
    throw new Error("版式名称不能为空");
  }
  let found = false;
  const variants = manifest.variants.map((v) => {
    if (v.id !== layoutVariantId) return v;
    found = true;
    return { ...v, label: normalized };
  });
  if (!found) {
    throw new Error(`未知版式：${layoutVariantId}`);
  }
  return { ...manifest, variants };
}

export function updateLayoutVariantPublishStatus(
  manifest: LayoutManifest,
  layoutVariantId: string,
  publishStatus: PublishStatus
): LayoutManifest {
  let found = false;
  const variants = manifest.variants.map((v) => {
    if (v.id !== layoutVariantId) return v;
    found = true;
    return { ...v, publishStatus };
  });
  if (!found) {
    throw new Error(`未知版式：${layoutVariantId}`);
  }
  return { ...manifest, variants };
}
