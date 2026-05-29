import fs from "node:fs/promises";
import path from "node:path";
import type { EmailMeta } from "../src/types/email";
import type { LayoutManifest } from "../src/layout-variant-contract/types";
import { layoutVariantDir } from "../src/lib/emailLayoutVariant";
import { createDefaultLayoutManifest } from "../src/lib/layoutVariantOps";
import { layoutManifestPath, readLayoutManifestOptional } from "./emailLayoutContext";

async function moveFileIfExists(from: string, to: string): Promise<boolean> {
  try {
    await fs.access(from);
  } catch {
    return false;
  }
  await fs.mkdir(path.dirname(to), { recursive: true });
  try {
    await fs.rename(from, to);
  } catch {
    await fs.copyFile(from, to);
    await fs.unlink(from);
  }
  return true;
}

/** legacy 单文件场景迁移为 layouts/default + layout-manifest.json；已有 manifest 则原样返回。 */
export async function ensureEmailLayoutManifest(
  emailDir: string,
  emailKey: string,
  readJson: <T>(filePath: string) => Promise<T | null>,
  atomicWriteJson: (filePath: string, data: unknown) => Promise<void>
): Promise<LayoutManifest> {
  const existing = await readLayoutManifestOptional(readJson, emailDir);
  if (existing) return existing;

  const rootTplPath = path.join(emailDir, "template.json");
  const rootTpl = await readJson(rootTplPath);
  if (!rootTpl) {
    throw new Error("模板文件不存在，无法启用版式变体");
  }

  const defaultId = "default";
  const meta = await readJson<EmailMeta>(path.join(emailDir, "meta.json"));
  const label = meta?.displayName?.trim() || emailKey;
  const variantDir = layoutVariantDir(emailDir, defaultId);

  const movedTemplate = await moveFileIfExists(
    rootTplPath,
    path.join(variantDir, "template.json")
  );
  if (!movedTemplate) {
    throw new Error("迁移默认版式失败：template.json 不存在");
  }
  await moveFileIfExists(
    path.join(emailDir, "tokenPresets.json"),
    path.join(variantDir, "tokenPresets.json")
  );

  const migratedAt = new Date().toISOString();
  const manifest = createDefaultLayoutManifest({
    id: defaultId,
    label,
    description: "自单文件结构迁移的默认版式",
    createdAt: meta?.createdAt ?? migratedAt,
  });
  await atomicWriteJson(layoutManifestPath(emailDir), manifest);
  return manifest;
}
