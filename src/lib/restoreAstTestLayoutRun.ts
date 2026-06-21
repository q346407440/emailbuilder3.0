import fs from "node:fs";
import path from "node:path";
import {
  LAYOUT_MANIFEST_SCHEMA_VERSION,
  type LayoutManifest,
  type LayoutVariantEntry,
} from "../layout-variant-contract/types";
import { layoutManifestPath, layoutVariantDir } from "./emailLayoutVariant";
import { layoutVariantBlockIdPrefix } from "./scaffoldNewEmail";

const RESTORE_RUN_LAYOUT_ID_PREFIX = "restore-run-";

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 从 manifest 与磁盘目录取某前缀下的最大序号（id / label 均为 `{prefix}-{n}`）。 */
function nextLayoutSequenceForPrefix(
  manifest: LayoutManifest,
  emailBaseDir: string,
  prefix: string
): number {
  const idPattern = new RegExp(`^${escapeRegExp(prefix)}-(\\d+)$`);
  let max = 0;

  for (const variant of manifest.variants) {
    const idMatch = idPattern.exec(variant.id);
    if (idMatch) max = Math.max(max, Number(idMatch[1]));
    const labelMatch = idPattern.exec(variant.label);
    if (labelMatch) max = Math.max(max, Number(labelMatch[1]));
  }

  const layoutsDir = path.join(emailBaseDir, "layouts");
  if (fs.existsSync(layoutsDir)) {
    for (const name of fs.readdirSync(layoutsDir)) {
      const match = idPattern.exec(name);
      if (match) max = Math.max(max, Number(match[1]));
    }
  }

  return max + 1;
}

/** 无夹具名时的全局序号（legacy：`restore-run-N` / `还原-N`）。 */
export function nextRestoreTestLayoutSequence(
  manifest: LayoutManifest,
  emailBaseDir: string,
  labelBase: string
): number {
  void labelBase;
  return nextLayoutSequenceForPrefix(manifest, emailBaseDir, RESTORE_RUN_LAYOUT_ID_PREFIX.slice(0, -1));
}

/** 按夹具目录名递增序号（`forever21-template46-1`、`huckberry-template48-2`…）。 */
export function nextFixtureLayoutSequence(
  manifest: LayoutManifest,
  emailBaseDir: string,
  fixtureName: string
): number {
  return nextLayoutSequenceForPrefix(manifest, emailBaseDir, fixtureName);
}

export function buildFixtureLayoutSlot(
  manifest: LayoutManifest,
  emailBaseDir: string,
  fixtureName: string
): { layoutVariantId: string; label: string; sequence: number; outDir: string } {
  const sequence = nextFixtureLayoutSequence(manifest, emailBaseDir, fixtureName);
  const layoutVariantId = `${fixtureName}-${sequence}`;
  const label = layoutVariantId;
  return {
    layoutVariantId,
    label,
    sequence,
    outDir: layoutVariantDir(emailBaseDir, layoutVariantId),
  };
}

export function buildRestoreTestLayoutSlot(
  manifest: LayoutManifest,
  emailBaseDir: string,
  labelBase = "还原"
): { layoutVariantId: string; label: string; sequence: number; outDir: string } {
  const prefix = RESTORE_RUN_LAYOUT_ID_PREFIX.slice(0, -1);
  const sequence = nextRestoreTestLayoutSequence(manifest, emailBaseDir, labelBase);
  const layoutVariantId = `${prefix}-${sequence}`;
  const label = `${labelBase}-${sequence}`;
  return {
    layoutVariantId,
    label,
    sequence,
    outDir: layoutVariantDir(emailBaseDir, layoutVariantId),
  };
}

export function appendLayoutManifestVariant(
  manifest: LayoutManifest,
  entry: LayoutVariantEntry,
  makeActive = true
): LayoutManifest {
  if (manifest.variants.some((v) => v.id === entry.id)) {
    throw new Error(`版式 id 已存在：${entry.id}`);
  }
  const now = new Date().toISOString();
  const nextVariant: LayoutVariantEntry = {
    ...entry,
    createdAt: entry.createdAt ?? now,
    updatedAt: entry.updatedAt ?? now,
  };
  return {
    schemaVersion: LAYOUT_MANIFEST_SCHEMA_VERSION,
    activeLayoutVariantId: makeActive ? entry.id : manifest.activeLayoutVariantId,
    variants: [...manifest.variants, nextVariant],
  };
}

export function readLayoutManifest(emailBaseDir: string): LayoutManifest {
  const raw = JSON.parse(fs.readFileSync(layoutManifestPath(emailBaseDir), "utf8")) as LayoutManifest;
  return raw;
}

export function writeLayoutManifest(emailBaseDir: string, manifest: LayoutManifest): void {
  fs.writeFileSync(layoutManifestPath(emailBaseDir), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

/** 为 AI 还原测试跑次分配新版式目录，并更新 layout-manifest。 */
export function allocateRestoreTestLayoutRun(
  emailBaseDir: string,
  options: { labelBase?: string; fixtureName?: string } = {}
): {
  emailKey: string;
  layoutVariantId: string;
  label: string;
  sequence: number;
  outDir: string;
  idPrefix: string;
  manifest: LayoutManifest;
} {
  const manifest = readLayoutManifest(emailBaseDir);
  const slot = options.fixtureName
    ? buildFixtureLayoutSlot(manifest, emailBaseDir, options.fixtureName)
    : buildRestoreTestLayoutSlot(manifest, emailBaseDir, options.labelBase ?? "还原");
  const emailKey = path.basename(emailBaseDir);
  const description = options.fixtureName
    ? `RestoreAst 夹具 ${options.fixtureName} 跑次 #${slot.sequence}`
    : `RestoreAst 测试跑次 #${slot.sequence}`;

  const nextManifest = appendLayoutManifestVariant(manifest, {
    id: slot.layoutVariantId,
    label: slot.label,
    description,
    publishStatus: "draft",
  });

  writeLayoutManifest(emailBaseDir, nextManifest);

  return {
    emailKey,
    layoutVariantId: slot.layoutVariantId,
    label: slot.label,
    sequence: slot.sequence,
    outDir: slot.outDir,
    idPrefix: layoutVariantBlockIdPrefix(emailKey, slot.layoutVariantId),
    manifest: nextManifest,
  };
}
