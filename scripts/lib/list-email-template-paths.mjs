/**
 * 枚举 data/emails 下全部 template.json（layouts/<id>/ 路径；须有 layout-manifest.json）。
 */
import fs from "node:fs";
import path from "node:path";

/**
 * @param {string} emailsRoot
 * @returns {string[]}
 */
export function listEmailTemplatePaths(emailsRoot) {
  if (!fs.existsSync(emailsRoot)) return [];
  const paths = [];
  for (const name of fs.readdirSync(emailsRoot)) {
    if (name.startsWith("_")) continue;
    const base = path.join(emailsRoot, name);
    let st;
    try {
      st = fs.statSync(base);
    } catch {
      continue;
    }
    if (!st.isDirectory()) continue;

    const manifestPath = path.join(base, "layout-manifest.json");
    if (!fs.existsSync(manifestPath)) continue;
    let manifest;
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    } catch {
      continue;
    }
    const variants = Array.isArray(manifest?.variants) ? manifest.variants : [];
    for (const v of variants) {
      if (!v?.id) continue;
      const tpl = path.join(base, "layouts", v.id, "template.json");
      if (fs.existsSync(tpl)) paths.push(tpl);
    }
  }
  return paths.sort();
}

/**
 * @param {string} emailsRoot
 * @returns {string[]} emailKey 列表
 */
export function listEmailKeys(emailsRoot) {
  if (!fs.existsSync(emailsRoot)) return [];
  return fs
    .readdirSync(emailsRoot)
    .filter((name) => {
      if (name.startsWith("_")) return false;
      try {
        return fs.statSync(path.join(emailsRoot, name)).isDirectory();
      } catch {
        return false;
      }
    })
    .sort();
}
