/**
 * 生成脚本落盘：单版式场景写入 layouts/default/ 并维护 layout-manifest。
 */
import fs from "node:fs";
import path from "node:path";

export const DEFAULT_LAYOUT_VARIANT_ID = "default";

/** @param {string} emailOutDir data/emails/<emailKey> */
export function defaultLayoutDir(emailOutDir) {
  return path.join(emailOutDir, "layouts", DEFAULT_LAYOUT_VARIANT_ID);
}

/**
 * @param {string} emailOutDir
 * @param {{ label: string; description?: string }} variant
 */
export function ensureLayoutManifest(emailOutDir, variant) {
  const manifestPath = path.join(emailOutDir, "layout-manifest.json");
  const manifest = {
    schemaVersion: "1.0.0",
    activeLayoutVariantId: DEFAULT_LAYOUT_VARIANT_ID,
    variants: [
      {
        id: DEFAULT_LAYOUT_VARIANT_ID,
        label: variant.label,
        description: variant.description ?? "默认版式",
      },
    ],
  };
  fs.mkdirSync(emailOutDir, { recursive: true });
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}
