import fs from "node:fs/promises";
import path from "node:path";
import type { EmailTemplate } from "../src/types/email";
import type { TokenPresets } from "../src/types/tokenPreset";
import type { LayoutManifest } from "../src/layout-variant-contract/types";
import { layoutVariantDir } from "../src/lib/emailLayoutVariant";
import { appendLayoutVariant } from "../src/lib/layoutVariantOps";
import { DEFAULT_PUBLISH_STATUS } from "../src/publish-status-contract";
import { serializeTemplateToDisk } from "../src/lib/templateTreeAdapter";
import { layoutManifestPath } from "./emailLayoutContext";
import { validateSchemaArtifact } from "../src/schema-registry";

export type PersistNewLayoutVariantInput = {
  base: string;
  manifest: LayoutManifest;
  label: string;
  newId: string;
  sourceTemplate: EmailTemplate;
  sourceTokenPresets: TokenPresets;
  variantDescription: string;
};

export type PersistNewLayoutVariantResult = {
  layoutVariantId: string;
  label: string;
  activeLayoutVariantId: string;
  manifest: LayoutManifest;
};

export async function persistNewLayoutVariantOnDisk(
  input: PersistNewLayoutVariantInput,
  atomicWriteJson: (filePath: string, data: unknown) => Promise<void>
): Promise<PersistNewLayoutVariantResult> {
  const { base, manifest, label, newId, sourceTemplate, sourceTokenPresets, variantDescription } =
    input;

  const destDir = layoutVariantDir(base, newId);
  try {
    await fs.access(destDir);
    throw Object.assign(new Error(`版式目录「${newId}」已存在`), { statusCode: 409 });
  } catch (e: unknown) {
    const code = (e as NodeJS.ErrnoException).code;
    if ((e as { statusCode?: number }).statusCode === 409) throw e;
    if (code !== "ENOENT") throw e;
  }

  let nextManifest: LayoutManifest;
  try {
    nextManifest = appendLayoutVariant(
      manifest,
      {
        id: newId,
        label,
        description: variantDescription,
        createdAt: new Date().toISOString(),
        publishStatus: DEFAULT_PUBLISH_STATUS,
      },
      { makeActive: true }
    );
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "无法追加版式");
  }

  const manifestIssues = validateSchemaArtifact("layoutManifest", nextManifest);
  if (manifestIssues.length) {
    throw Object.assign(new Error("版式清单校验失败"), {
      statusCode: 422,
      details: manifestIssues,
    });
  }

  await fs.mkdir(destDir, { recursive: true });
  await atomicWriteJson(path.join(destDir, "template.json"), serializeTemplateToDisk(sourceTemplate));
  await atomicWriteJson(path.join(destDir, "tokenPresets.json"), sourceTokenPresets);
  await atomicWriteJson(layoutManifestPath(base), nextManifest);

  return {
    layoutVariantId: newId,
    label,
    activeLayoutVariantId: nextManifest.activeLayoutVariantId,
    manifest: nextManifest,
  };
}
