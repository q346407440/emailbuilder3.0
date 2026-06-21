import { basename, dirname, join, resolve } from "node:path";

/** `--in` 指向 `…/<夹具名>/restore-ast.json` 时返回该夹具目录，否则 null。 */
export function restoreAstFixtureDir(inPath) {
  const resolved = resolve(inPath);
  if (basename(resolved) !== "restore-ast.json") {
    return null;
  }
  return dirname(resolved);
}

/** 单套 RestoreAst 夹具的标准文件布局（测试材料集中在此目录）。 */
export function restoreAstFixturePaths(inPath) {
  const dir = restoreAstFixtureDir(inPath);
  if (!dir) return null;
  return {
    dir,
    restoreAst: join(dir, "restore-ast.json"),
    design: join(dir, "design.png"),
    assets: join(dir, "assets.json"),
    assetsResolved: join(dir, "assets-resolved.json"),
    blockIdMap: join(dir, "block-id-map.json"),
    out: join(dir, "out"),
    mediaImages: join(dir, "media", "images"),
    mediaIcons: join(dir, "media", "icons"),
    assetsMirrored: join(dir, "assets-mirrored.json"),
  };
}
