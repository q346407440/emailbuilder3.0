#!/usr/bin/env node
/**
 * 根据 RestoreAst JSON 搜索图片（Pexels）与图标（CDN），落盘 assets-resolved.json。
 *
 * 用法：
 *   npx tsx scripts/fixtures/resolve-ast-assets.mjs \
 *     --in scripts/fixtures/restore-ast/forever21-template46/restore-ast.json
 *
 * `--in` 为 `…/restore-ast.json` 时默认写出同目录 assets-resolved.json 与 assets.json。
 *
 * 依赖：项目根 .env 中的 PEXELS_API_KEY（图标走 jsDelivr，无需 key）。
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadProjectRootEnvFile } from "../../server/loadEnvFile.ts";
import { astToTemplate } from "../../src/restore-ast-contract/astToTemplate.ts";
import { resolveAstAssetRequests } from "../../src/restore-ast-contract/backfillAssets.ts";
import { restoreAstFixturePaths } from "./restore-ast/fixturePaths.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../..");

function parseArgs(argv) {
  const opts = { inPath: "", outPath: "", idPrefix: "ast", emailId: "ast_smoke" };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--in") opts.inPath = argv[++i] ?? "";
    else if (arg === "--out") opts.outPath = argv[++i] ?? "";
    else if (arg === "--id-prefix") opts.idPrefix = argv[++i] ?? "ast";
    else if (arg === "--email-id") opts.emailId = argv[++i] ?? "ast_smoke";
    else throw new Error(`未知参数：${arg}`);
  }
  if (!opts.inPath) {
    throw new Error("必须提供 --in");
  }
  return opts;
}

function resolveOutPaths(inPath, explicitOut) {
  const paths = restoreAstFixturePaths(inPath);
  if (explicitOut) {
    return {
      assetsResolved: resolve(explicitOut),
      assets: paths?.assets ?? join(dirname(inPath), "assets.json"),
    };
  }
  if (paths) {
    return { assetsResolved: paths.assetsResolved, assets: paths.assets };
  }
  throw new Error("请提供 --out，或 --in 使用 …/restore-ast.json 以自动落盘到夹具目录");
}

async function main() {
  loadProjectRootEnvFile(REPO_ROOT);
  const opts = parseArgs(process.argv.slice(2));
  const inPath = resolve(opts.inPath);
  const { assetsResolved: outPath, assets: assetsListPath } = resolveOutPaths(inPath, opts.outPath);

  const raw = JSON.parse(await readFile(inPath, "utf8"));
  if (!raw?.theme || raw?.tree?.t !== "email") {
    throw new Error("输入须为 RestoreAstDocument");
  }

  const { assets } = astToTemplate(raw, {
    emailId: opts.emailId,
    templateId: opts.emailId,
    locale: "en-US",
    idPrefix: opts.idPrefix,
  });

  console.log(`[resolve-ast-assets] 资产槽 ${assets.length} 个，开始搜索…`);
  const manifest = await resolveAstAssetRequests(assets);

  const ok = manifest.items.filter((i) => i.ok);
  const failed = manifest.items.filter((i) => !i.ok);
  const requiredFailed = failed.filter((i) => i.required);

  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await writeFile(assetsListPath, `${JSON.stringify(assets, null, 2)}\n`, "utf8");

  console.log(`[resolve-ast-assets] 已写入: ${outPath}`);
  console.log(`[resolve-ast-assets] 资产槽清单: ${assetsListPath}`);
  console.log(`[resolve-ast-assets] 成功 ${ok.length} / 失败 ${failed.length}`);

  for (const item of ok) {
    console.log(`  ✓ ${item.blockId} (${item.kind}) → ${item.url}`);
  }
  for (const item of failed) {
    console.log(`  ✗ ${item.blockId} (${item.kind}) ${item.reason}${item.detail ? `: ${item.detail}` : ""}`);
  }

  if (requiredFailed.length > 0) {
    console.error("\n❌ 必需资产未命中：");
    for (const item of requiredFailed) {
      console.error(`  - ${item.blockId}: ${item.query}`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
