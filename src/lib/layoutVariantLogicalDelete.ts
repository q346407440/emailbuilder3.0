import type { LayoutManifest, LayoutVariantEntry } from "../layout-variant-contract/types";
import { isLogicallyDeleted, logicalDeleteTimestamp } from "./logicalDelete";
import { sortLayoutVariantsByCreatedDesc } from "./layoutVariantOps";

export function listVisibleLayoutVariants(variants: LayoutVariantEntry[]): LayoutVariantEntry[] {
  return variants.filter((v) => !isLogicallyDeleted(v));
}

export function sortVisibleLayoutVariantsByCreatedDesc(
  variants: LayoutVariantEntry[]
): LayoutVariantEntry[] {
  return sortLayoutVariantsByCreatedDesc(listVisibleLayoutVariants(variants));
}

/** 解析当前应使用的版式 id（跳过已逻辑删除的项；active 指向已删除时回落到首个可见版式）。 */
export function resolveEffectiveLayoutVariantId(
  manifest: LayoutManifest,
  layoutQuery?: string | null
): { layoutVariantId: string; error: string | null } {
  const visible = listVisibleLayoutVariants(manifest.variants);
  if (visible.length === 0) {
    return { layoutVariantId: manifest.activeLayoutVariantId, error: "没有可用的版式（均已逻辑删除）" };
  }
  const requested = (layoutQuery ?? "").trim();
  if (requested) {
    const hit = manifest.variants.find((v) => v.id === requested);
    if (!hit) {
      return { layoutVariantId: requested, error: `未知版式变体：${requested}` };
    }
    if (isLogicallyDeleted(hit)) {
      return { layoutVariantId: requested, error: `版式「${requested}」已逻辑删除` };
    }
    return { layoutVariantId: requested, error: null };
  }
  const active = manifest.variants.find((v) => v.id === manifest.activeLayoutVariantId);
  if (active && !isLogicallyDeleted(active)) {
    return { layoutVariantId: manifest.activeLayoutVariantId, error: null };
  }
  const fallback = sortLayoutVariantsByCreatedDesc(visible)[0]!;
  return { layoutVariantId: fallback.id, error: null };
}

export function softDeleteLayoutVariant(
  manifest: LayoutManifest,
  layoutVariantId: string
): LayoutManifest {
  const target = manifest.variants.find((v) => v.id === layoutVariantId);
  if (!target) {
    throw new Error(`未知版式：${layoutVariantId}`);
  }
  if (isLogicallyDeleted(target)) {
    throw new Error(`版式「${layoutVariantId}」已逻辑删除`);
  }
  const visibleBefore = listVisibleLayoutVariants(manifest.variants);
  if (visibleBefore.length <= 1) {
    throw new Error("至少保留一个未删除的版式");
  }

  const deletedAt = logicalDeleteTimestamp();
  const variants = manifest.variants.map((v) =>
    v.id === layoutVariantId ? { ...v, deletedAt } : v
  );

  let activeLayoutVariantId = manifest.activeLayoutVariantId;
  if (activeLayoutVariantId === layoutVariantId) {
    const nextVisible = sortLayoutVariantsByCreatedDesc(
      listVisibleLayoutVariants(variants)
    )[0];
    if (!nextVisible) {
      throw new Error("至少保留一个未删除的版式");
    }
    activeLayoutVariantId = nextVisible.id;
  }

  return { ...manifest, variants, activeLayoutVariantId };
}
