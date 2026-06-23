#!/usr/bin/env node
/**
 * RestoreAst JSON → template.json + tokenPresets.json 组装冒烟脚本。
 *
 * 推荐（测试邮件 ai-2，夹具材料自动写回 restore-ast 目录）：
 *   npx tsx scripts/fixtures/ast-to-template-smoke.mjs \
 *     --email ai-2 \
 *     --new-layout \
 *     --in scripts/fixtures/restore-ast/forever21-template46/restore-ast.json
 *
 * `--in` 为 `…/restore-ast.json` 时自动：
 *   - 读取同目录 assets-resolved.json
 *   - 写出 assets.json、block-id-map.json、out/template.json + tokenPresets.json
 *
 * 手动指定输出目录（覆盖该目录，不增版式）：
 *   npx tsx scripts/fixtures/ast-to-template-smoke.mjs \
 *     --in <restore-ast.json> \
 *     --out data/emails/<emailKey>/layouts/<layoutId>
 *
 * 选项：
 *   --in <path>              RestoreAstDocument JSON（必填）
 *   --out <dir>              输出 layouts/<id>/ 目录（与 --new-layout 二选一）
 *   --email <emailKey>       目标邮件场景，如 ai-2（配合 --new-layout）
 *   --new-layout             每次运行新建 restore-run-N 版式并更新 layout-manifest
 *   --layout-label-base <s>  无夹具目录时的版式名前缀（默认「还原」）；有夹具时用文件夹名 → forever21-template46-1
 *   --email-id <id>          template emailId（默认：emailKey 或从 --out 推导）
 *   --locale <locale>        默认 en-US
 *   --id-prefix <prefix>     block id 前缀（--new-layout 时自动按版式生成）
 *   --assets-in <path>       assets-resolved.json（回填 URL）
 *   --assets-out <path>      写出资产请求清单
 *   --map-out <path>         写出 blockId→astPath 映射
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { astToTemplate } from "../../src/restore-ast-contract/astToTemplate.ts";
import { backfillTemplateFromManifest, remapResolvedManifestToRequests } from "../../src/restore-ast-contract/backfillAssets.ts";
import { allocateRestoreTestLayoutRun } from "../../src/lib/restoreAstTestLayoutRun.ts";
import { serializeTemplateToDisk } from "../../src/lib/templateTreeAdapter.ts";
import { validateTemplate, blockingValidationIssues } from "../../src/lib/validate.ts";
import { validateTokenPresets } from "../../src/token-preset-contract/validate.ts";
import { restoreAstFixturePaths } from "./restore-ast/fixturePaths.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../..");
const EMAILS_ROOT = join(REPO_ROOT, "data", "emails");

function printHelp() {
  console.log(`RestoreAst 组装冒烟脚本

推荐：
  npx tsx scripts/fixtures/ast-to-template-smoke.mjs --email ai-2 --new-layout --in <restore-ast.json>

详见脚本头部注释。`);
}

function parseArgs(argv) {
  const opts = {
    inPath: "",
    outDir: "",
    emailKey: "",
    newLayout: false,
    layoutLabelBase: "还原",
    emailId: "",
    locale: "en-US",
    idPrefix: "",
    assetsIn: "",
    assetsOut: "",
    mapOut: "",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") {
      printHelp();
      process.exit(0);
    }
    if (arg === "--in") {
      opts.inPath = argv[++i] ?? "";
      continue;
    }
    if (arg === "--out") {
      opts.outDir = argv[++i] ?? "";
      continue;
    }
    if (arg === "--email") {
      opts.emailKey = argv[++i] ?? "";
      continue;
    }
    if (arg === "--new-layout") {
      opts.newLayout = true;
      continue;
    }
    if (arg === "--layout-label-base") {
      opts.layoutLabelBase = argv[++i] ?? "还原";
      continue;
    }
    if (arg === "--email-id") {
      opts.emailId = argv[++i] ?? "";
      continue;
    }
    if (arg === "--locale") {
      opts.locale = argv[++i] ?? "en-US";
      continue;
    }
    if (arg === "--id-prefix") {
      opts.idPrefix = argv[++i] ?? "";
      continue;
    }
    if (arg === "--assets-in") {
      opts.assetsIn = argv[++i] ?? "";
      continue;
    }
    if (arg === "--assets-out") {
      opts.assetsOut = argv[++i] ?? "";
      continue;
    }
    if (arg === "--map-out") {
      opts.mapOut = argv[++i] ?? "";
      continue;
    }
    throw new Error(`未知参数：${arg}`);
  }

  if (!opts.inPath) {
    printHelp();
    throw new Error("必须提供 --in");
  }

  if (opts.newLayout && !opts.emailKey) {
    throw new Error("--new-layout 须配合 --email <emailKey>（如 ai-2）");
  }

  if (!opts.newLayout && !opts.outDir) {
    throw new Error("请提供 --out，或使用 --email <key> --new-layout");
  }

  if (opts.newLayout && opts.outDir) {
    throw new Error("--new-layout 与 --out 不要同时使用（新版式目录由脚本自动分配）");
  }

  return opts;
}

function deriveEmailIdFromOutDir(outDir) {
  const parts = outDir.split(/[/\\]/);
  const emailsIdx = parts.lastIndexOf("emails");
  if (emailsIdx >= 0 && parts[emailsIdx + 1]) {
    return parts[emailsIdx + 1];
  }
  return basename(outDir) || "ast_smoke";
}

function inferAssetsIn(inPath, explicit) {
  if (explicit) return resolve(explicit);
  const paths = restoreAstFixturePaths(inPath);
  if (paths && existsSync(paths.assetsResolved)) {
    return paths.assetsResolved;
  }
  const sibling = join(dirname(inPath), "assets-resolved.json");
  return existsSync(sibling) ? sibling : "";
}

function resolveFixtureSidecarPaths(inPath, opts) {
  const paths = restoreAstFixturePaths(inPath);
  if (!paths) {
    return {
      assetsOut: opts.assetsOut ? resolve(opts.assetsOut) : "",
      mapOut: opts.mapOut ? resolve(opts.mapOut) : "",
      fixtureOutDir: "",
    };
  }
  return {
    assetsOut: opts.assetsOut ? resolve(opts.assetsOut) : paths.assets,
    mapOut: opts.mapOut ? resolve(opts.mapOut) : paths.blockIdMap,
    fixtureOutDir: paths.out,
  };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const inPath = resolve(opts.inPath);
  const fixtureName = basename(dirname(inPath));
  const assetsInPath = inferAssetsIn(inPath, opts.assetsIn);
  const sidecar = resolveFixtureSidecarPaths(inPath, opts);

  let outDir = opts.outDir ? resolve(opts.outDir) : "";
  let emailId = opts.emailId;
  let idPrefix = opts.idPrefix;
  let layoutVariantId = "";
  let layoutLabel = "";

  if (opts.newLayout) {
    const emailBaseDir = join(EMAILS_ROOT, opts.emailKey);
    if (!existsSync(join(emailBaseDir, "layout-manifest.json"))) {
      throw new Error(`邮件场景不存在或缺少 layout-manifest：${emailBaseDir}`);
    }
    const allocated = allocateRestoreTestLayoutRun(emailBaseDir, {
      labelBase: opts.layoutLabelBase,
      fixtureName,
    });
    outDir = allocated.outDir;
    emailId = emailId || allocated.emailKey;
    idPrefix = idPrefix || allocated.idPrefix;
    layoutVariantId = allocated.layoutVariantId;
    layoutLabel = allocated.label;
    console.log(
      `[ast-to-template] 新版式: ${layoutLabel}（id=${layoutVariantId}，序号 #${allocated.sequence}）`
    );
  } else {
    emailId = emailId || deriveEmailIdFromOutDir(outDir);
    idPrefix = idPrefix || "ast";
  }

  const raw = JSON.parse(await readFile(inPath, "utf8"));
  if (!raw?.theme || raw?.tree?.t !== "email") {
    throw new Error("输入 JSON 须为 RestoreAstDocument：{ theme, tree: { t: 'email', ... } }");
  }

  const result = astToTemplate(raw, {
    emailId,
    templateId: emailId,
    locale: opts.locale,
    idPrefix,
    tokenPresetLabel: layoutLabel || `还原 · ${fixtureName}`,
  });

  let template = result.template;

  if (assetsInPath) {
    const manifest = JSON.parse(await readFile(assetsInPath, "utf8"));
    const mapped = remapResolvedManifestToRequests(manifest, result.assets);
    const backfilled = backfillTemplateFromManifest(template, mapped, result.assets);
    template = backfilled.template;
    console.log(
      `[ast-to-template] 资产回填: ${backfilled.resolvedCount}/${result.assets.length}（未命中 ${backfilled.unresolvedOptional.length}）`
    );
    if (backfilled.unresolvedOptional.length > 0) {
      console.warn("⚠️  资产未回填（多为 icon 未命中）：");
      for (const req of backfilled.unresolvedOptional) {
        console.warn(`  - ${req.blockId}: ${req.query}`);
      }
    }
  } else {
    console.log("[ast-to-template] 未提供 assets-resolved.json，图片/图标仍为占位 src");
  }

  await mkdir(outDir, { recursive: true });

  const templateDisk = serializeTemplateToDisk(template);
  await writeFile(join(outDir, "template.json"), `${JSON.stringify(templateDisk, null, 2)}\n`, "utf8");
  await writeFile(
    join(outDir, "tokenPresets.json"),
    `${JSON.stringify(result.tokenPresets, null, 2)}\n`,
    "utf8"
  );

  if (sidecar.assetsOut) {
    await writeFile(sidecar.assetsOut, `${JSON.stringify(result.assets, null, 2)}\n`, "utf8");
    console.log(`[ast-to-template] 夹具资产槽: ${sidecar.assetsOut}`);
  }
  if (sidecar.mapOut) {
    const mapObj = Object.fromEntries(result.blockIdToAstPath.entries());
    await writeFile(sidecar.mapOut, `${JSON.stringify(mapObj, null, 2)}\n`, "utf8");
    console.log(`[ast-to-template] 夹具映射: ${sidecar.mapOut}`);
  }
  if (sidecar.fixtureOutDir) {
    await mkdir(sidecar.fixtureOutDir, { recursive: true });
    await writeFile(
      join(sidecar.fixtureOutDir, "template.json"),
      `${JSON.stringify(templateDisk, null, 2)}\n`,
      "utf8"
    );
    await writeFile(
      join(sidecar.fixtureOutDir, "tokenPresets.json"),
      `${JSON.stringify(result.tokenPresets, null, 2)}\n`,
      "utf8"
    );
    console.log(`[ast-to-template] 夹具快照: ${sidecar.fixtureOutDir}`);
  }

  const templateIssues = validateTemplate(template);
  const blocking = blockingValidationIssues(templateIssues);
  const tokenIssues = validateTokenPresets(result.tokenPresets);

  console.log(`[ast-to-template] 输入: ${inPath}`);
  console.log(`[ast-to-template] 输出: ${outDir}`);
  if (opts.newLayout) {
    console.log(`[ast-to-template] 邮件: ${opts.emailKey} → 编辑器顶栏选「测试新的AI还原工作流模板」`);
  }
  console.log(`[ast-to-template] 块数: ${Object.keys(template.blocks).length}`);
  console.log(`[ast-to-template] 资产槽: ${result.assets.length}`);

  if (blocking.length > 0) {
    console.error("\n❌ validateTemplate blocking 错误：");
    for (const issue of blocking) {
      console.error(`  - ${issue.path}: ${issue.reason}`);
    }
    process.exit(1);
  }

  if (tokenIssues.length > 0) {
    console.error("\n❌ tokenPresets 校验错误：");
    for (const issue of tokenIssues) {
      console.error(`  - ${issue.path}: ${issue.reason}`);
    }
    process.exit(1);
  }

  const warnings = templateIssues.filter((i) => i.level === "warning");
  if (warnings.length > 0) {
    console.log(`\n⚠️  非阻断质量问题 ${warnings.length} 条`);
    for (const issue of warnings.slice(0, 5)) {
      console.log(`  - ${issue.path}: ${issue.reason}`);
    }
  }

  console.log("\n✅ 组装完成，blocking 校验通过");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
