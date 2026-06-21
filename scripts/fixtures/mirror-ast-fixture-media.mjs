#!/usr/bin/env node
/**
 * 将 assets-resolved.json 中的远程图片/图标下载到夹具目录 media/ 下（离线查阅用）。
 *
 * 用法：
 *   npx tsx scripts/fixtures/mirror-ast-fixture-media.mjs \
 *     --in scripts/fixtures/restore-ast/forever21-template46/restore-ast.json
 *
 * 产出（与 restore-ast.json 同目录）：
 *   media/images/<query-slug>.jpg
 *   media/icons/<query-slug>.svg
 *   assets-mirrored.json   （原 manifest + localFile 相对路径）
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { restoreAstFixturePaths } from "./restore-ast/fixturePaths.mjs";

function slugify(query) {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function parseArgs(argv) {
  const opts = { inPath: "", manifestPath: "" };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--in") opts.inPath = argv[++i] ?? "";
    else if (arg === "--manifest") opts.manifestPath = argv[++i] ?? "";
    else throw new Error(`未知参数：${arg}`);
  }
  if (!opts.inPath) {
    throw new Error("必须提供 --in <restore-ast.json>");
  }
  return opts;
}

async function downloadTo(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(destPath, buf);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const inPath = resolve(opts.inPath);
  const paths = restoreAstFixturePaths(inPath);
  if (!paths) {
    throw new Error("--in 须为 …/<夹具名>/restore-ast.json");
  }

  const manifestPath = opts.manifestPath
    ? resolve(opts.manifestPath)
    : paths.assetsResolved;
  if (!existsSync(manifestPath)) {
    throw new Error(`缺少 ${manifestPath}，请先运行 resolve-ast-assets.mjs`);
  }

  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  await mkdir(paths.mediaImages, { recursive: true });
  await mkdir(paths.mediaIcons, { recursive: true });

  const items = [];
  let okCount = 0;

  for (const item of manifest.items ?? []) {
    if (!item.ok || !item.url) {
      items.push({ ...item });
      continue;
    }

    const slug = slugify(item.query);
    const isIcon = item.kind === "icon";
    const ext = isIcon ? "svg" : "jpg";
    const sub = isIcon ? "icons" : "images";
    const filename = `${slug}.${ext}`;
    const absPath = join(isIcon ? paths.mediaIcons : paths.mediaImages, filename);
    const localFile = `media/${sub}/${filename}`;

    try {
      await downloadTo(item.url, absPath);
      okCount += 1;
      items.push({ ...item, localFile });
      console.log(`  ✓ ${localFile}`);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      items.push({ ...item, localFile: null, mirrorError: detail });
      console.log(`  ✗ ${item.query}: ${detail}`);
    }
  }

  const out = {
    mirroredAt: new Date().toISOString(),
    sourceManifest: manifestPath,
    items,
  };
  await writeFile(paths.assetsMirrored, `${JSON.stringify(out, null, 2)}\n`, "utf8");

  console.log(`[mirror-ast-fixture-media] 已写入: ${paths.assetsMirrored}`);
  console.log(`[mirror-ast-fixture-media] 下载成功 ${okCount} / ${manifest.items?.length ?? 0}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
