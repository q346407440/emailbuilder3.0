import type { LayoutManifest } from "../src/layout-variant-contract/types";
import { layoutManifestPath } from "./emailLayoutContext";

/** 读取 layout-manifest.json；不存在时抛错。 */
export async function requireLayoutManifest(
  emailDir: string,
  readJson: <T>(filePath: string) => Promise<T | null>
): Promise<LayoutManifest> {
  const manifest = await readJson<LayoutManifest>(layoutManifestPath(emailDir));
  if (!manifest) {
    throw new Error("layout-manifest.json 不存在，须使用 layouts/<id>/ 版式结构");
  }
  return manifest;
}
