import fs from "node:fs/promises";
import path from "node:path";
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

async function statMtimeMs(targetPath: string): Promise<number> {
  try {
    const st = await fs.stat(targetPath);
    return Number.isFinite(st.mtimeMs) ? st.mtimeMs : 0;
  } catch {
    return 0;
  }
}

function parseIsoMs(value: string | undefined): number {
  if (!value?.trim()) return 0;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

/** 为缺 createdAt / updatedAt 的版式条目回填（不落盘），便于按最近编辑时间排序展示。 */
export async function enrichLayoutVariantTimestamps(
  emailDir: string,
  entry: LayoutVariantEntry
): Promise<LayoutVariantEntry> {
  const dir = layoutVariantDir(emailDir, entry.id);
  const fromDir = await statCreatedAtIso(dir);
  const [templateMtimeMs, tokenPresetsMtimeMs] = await Promise.all([
    statMtimeMs(path.join(dir, "template.json")),
    statMtimeMs(path.join(dir, "tokenPresets.json")),
  ]);
  const updatedAtMs = Math.max(
    parseIsoMs(entry.updatedAt),
    templateMtimeMs,
    tokenPresetsMtimeMs
  );
  return {
    ...entry,
    createdAt: entry.createdAt?.trim() || fromDir,
    updatedAt: updatedAtMs > 0 ? new Date(updatedAtMs).toISOString() : entry.updatedAt,
  };
}

export async function enrichLayoutManifestTimestamps(
  emailDir: string,
  manifest: LayoutManifest
): Promise<LayoutManifest> {
  const variants = await Promise.all(
    manifest.variants.map((v) => enrichLayoutVariantTimestamps(emailDir, v))
  );
  return { ...manifest, variants };
}

/** @deprecated 使用 enrichLayoutManifestTimestamps。 */
export const enrichLayoutManifestCreatedAt = enrichLayoutManifestTimestamps;
