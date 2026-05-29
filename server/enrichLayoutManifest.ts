import fs from "node:fs/promises";
import type { LayoutManifest, LayoutVariantEntry } from "../src/layout-variant-contract/types";
import { layoutVariantDir } from "../src/lib/emailLayoutVariant";

/** 目录或文件的创建时间（优先 birthtime，回退 mtime） */
export async function statCreatedAtIso(targetPath: string): Promise<string | undefined> {
  try {
    const st = await fs.stat(targetPath);
    const ms = st.birthtimeMs > 0 ? st.birthtimeMs : st.mtimeMs;
    return Number.isFinite(ms) && ms > 0 ? new Date(ms).toISOString() : undefined;
  } catch {
    return undefined;
  }
}

/** 为缺 createdAt 的版式条目回填（不落盘），便于按创建时间排序展示。 */
export async function enrichLayoutVariantCreatedAt(
  emailDir: string,
  entry: LayoutVariantEntry
): Promise<LayoutVariantEntry> {
  if (entry.createdAt?.trim()) return entry;
  const fromDir = await statCreatedAtIso(layoutVariantDir(emailDir, entry.id));
  return fromDir ? { ...entry, createdAt: fromDir } : entry;
}

export async function enrichLayoutManifestCreatedAt(
  emailDir: string,
  manifest: LayoutManifest
): Promise<LayoutManifest> {
  const variants = await Promise.all(
    manifest.variants.map((v) => enrichLayoutVariantCreatedAt(emailDir, v))
  );
  return { ...manifest, variants };
}
