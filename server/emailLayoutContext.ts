import path from "node:path";
import type { LayoutManifest } from "../src/layout-variant-contract/types";
import {
  allLayoutTemplatePaths,
  layoutManifestPath,
  resolveEmailFilePaths,
  resolveLayoutVariantId,
  type ResolvedLayoutContext,
} from "../src/lib/emailLayoutVariant";

export type { ResolvedLayoutContext };

export async function readLayoutManifestOptional(
  readJson: <T>(filePath: string) => Promise<T | null>,
  emailBaseDir: string
): Promise<LayoutManifest | null> {
  return readJson<LayoutManifest>(layoutManifestPath(emailBaseDir));
}

export async function resolveEmailLayoutContext(
  readJson: <T>(filePath: string) => Promise<T | null>,
  emailBaseDir: string,
  layoutQuery: string | undefined
): Promise<
  | { ok: true; manifest: LayoutManifest; ctx: ResolvedLayoutContext }
  | { ok: false; message: string; status: 400 | 404 }
> {
  const manifest = await readLayoutManifestOptional(readJson, emailBaseDir);
  if (!manifest) {
    return {
      ok: false,
      message: "layout-manifest.json 不存在，须使用 layouts/<id>/ 版式结构",
      status: 404,
    };
  }
  const { layoutVariantId, error } = resolveLayoutVariantId(manifest, layoutQuery);
  if (error || !layoutVariantId) {
    return { ok: false, message: error ?? "版式 id 无效", status: 400 };
  }
  const ctx = resolveEmailFilePaths(emailBaseDir, manifest, layoutVariantId);
  const hasTpl = await readJson(ctx.templatePath);
  if (!hasTpl) {
    return {
      ok: false,
      message: `版式「${layoutVariantId}」的 template.json 不存在`,
      status: 404,
    };
  }
  return { ok: true, manifest, ctx };
}

export function emailBaseDir(dataRoot: string, emailKey: string): string {
  return path.join(dataRoot, emailKey);
}

export { allLayoutTemplatePaths, layoutManifestPath };
