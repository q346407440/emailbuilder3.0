#!/usr/bin/env node
/**
 * 由 Inspector「复制定位信息」或 CLI 参数，定位 restore-ast 日志中的 AST 节点。
 *
 * 用法：
 *   npx tsx scripts/restore-ast-locate.mjs --block-id template-mqhos2xu-10-grid-3
 *   npx tsx scripts/restore-ast-locate.mjs --template data/emails/template-mqhos2xu/layouts/10/template.json --block-id template-mqhos2xu-10-grid-3
 *   npx tsx scripts/restore-ast-locate.mjs --locator "$(pbpaste)"
 *   npx tsx scripts/restore-ast-locate.mjs --log-dir logs/restore-ast-9e20cca4 --block-id template-mqhos2xu-10-grid-3
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const LOGS_ROOT = join(REPO_ROOT, "logs");

function usage() {
  console.error(`用法:
  npx tsx scripts/restore-ast-locate.mjs --block-id <id> [--template <path>] [--log-dir <dir>] [--locator <text>] [--json]

选项:
  --block-id, -b     区块 ID（必填，除非 --locator 含「区块 ID」）
  --template, -t     模板文件路径（从 data/emails/<emailKey>/layouts/<id>/template.json 解析场景）
  --log-dir, -l      指定 restore 日志目录（跳过按场景搜索）
  --locator          Inspector 复制的多行定位文案（可含模板文件 + 区块 ID）
  --json             仅输出 JSON（机器可读）
  --all-runs         列出该场景所有 restore run，不定位节点
`);
  process.exit(1);
}

function parseArgs(argv) {
  const opts = { json: false, allRuns: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") opts.json = true;
    else if (a === "--all-runs") opts.allRuns = true;
    else if (a === "--block-id" || a === "-b") opts.blockId = argv[++i];
    else if (a === "--template" || a === "-t") opts.templatePath = argv[++i];
    else if (a === "--log-dir" || a === "-l") opts.logDir = resolve(argv[++i]);
    else if (a === "--locator") opts.locator = argv[++i];
    else if (a === "--help" || a === "-h") usage();
    else {
      console.error(`未知参数: ${a}`);
      usage();
    }
  }
  return opts;
}

/** @param {string} text */
function parseLocatorText(text) {
  const out = {};
  const templateMatch = text.match(/模板文件:\s*(\S+)/);
  if (templateMatch) out.templatePath = templateMatch[1].trim();
  const blockMatch = text.match(/区块 ID:\s*(\S+)/);
  if (blockMatch) out.blockId = blockMatch[1].trim();
  const nameMatch = text.match(/区块名称:\s*(.+)/);
  if (nameMatch) out.blockName = nameMatch[1].trim();
  const typeMatch = text.match(/区块类型:\s*(\S+)/);
  if (typeMatch) out.blockType = typeMatch[1].trim();
  return out;
}

/** @param {string} templatePath */
function parseTemplatePath(templatePath) {
  const normalized = templatePath.replace(/\\/g, "/");
  const m = normalized.match(
    /data\/emails\/([^/]+)\/layouts\/([^/]+)\/template\.json$/
  );
  if (!m) {
    throw new Error(
      `无法从模板路径解析 emailKey/layoutVariantId: ${templatePath}\n期望形如 data/emails/<emailKey>/layouts/<layoutVariantId>/template.json`
    );
  }
  return { emailKey: m[1], layoutVariantId: m[2] };
}

/** @returns {Array<{ logDir: string; meta: Record<string, unknown> }>} */
function findRestoreRuns(emailKey, layoutVariantId) {
  if (!existsSync(LOGS_ROOT)) return [];
  const runs = [];
  for (const name of readdirSync(LOGS_ROOT)) {
    if (!name.startsWith("restore-ast-")) continue;
    const logDir = join(LOGS_ROOT, name);
    const metaPath = join(logDir, "00-run-meta.json");
    if (!existsSync(metaPath)) continue;
    try {
      const meta = JSON.parse(readFileSync(metaPath, "utf8"));
      if (meta.emailKey === emailKey && meta.layoutVariantId === layoutVariantId) {
        runs.push({ logDir, meta });
      }
    } catch {
      /* 跳过损坏 meta */
    }
  }
  runs.sort((a, b) =>
    String(b.meta.startedAt ?? "").localeCompare(String(a.meta.startedAt ?? ""))
  );
  return runs;
}

/** @param {string} astPath e.g. tree.children[1].children[0] */
function resolveAstNode(tree, astPath) {
  if (!astPath || astPath === "tree") return tree;
  let cur = tree;
  const segments = astPath.replace(/^tree\.?/, "").split(".").filter(Boolean);
  for (const seg of segments) {
    const m = seg.match(/^children\[(\d+)\]$/);
    if (!m) throw new Error(`无法解析 astPath 片段: ${seg}（完整路径: ${astPath}）`);
    const idx = Number(m[1]);
    if (!cur.children || !Array.isArray(cur.children)) {
      throw new Error(`astPath 在 ${seg} 处无 children 数组（完整路径: ${astPath}）`);
    }
    if (idx >= cur.children.length) {
      throw new Error(
        `astPath 索引越界: ${seg}（children 长度 ${cur.children.length}，路径: ${astPath}）`
      );
    }
    cur = cur.children[idx];
  }
  return cur;
}

/** @param {string} logDir @param {string} blockId */
function locateInLogDir(logDir, blockId) {
  const mapPath = join(logDir, "07-block-id-map.json");
  const astPath = join(logDir, "02-restore-ast.json");
  if (!existsSync(mapPath)) {
    throw new Error(`缺少 block-id-map: ${mapPath}`);
  }
  if (!existsSync(astPath)) {
    throw new Error(`缺少 restore-ast.json: ${astPath}`);
  }
  const map = JSON.parse(readFileSync(mapPath, "utf8"));
  const astPathStr = map[blockId];
  if (!astPathStr) {
    const known = Object.keys(map).filter((k) => k.includes(blockId.split("-").slice(-2).join("-")));
    let hint = "";
    if (known.length) hint = `\n相近 blockId: ${known.slice(0, 5).join(", ")}`;
    throw new Error(`block-id-map 中未找到: ${blockId}${hint}`);
  }
  const doc = JSON.parse(readFileSync(astPath, "utf8"));
  const node = resolveAstNode(doc.tree, astPathStr);
  return {
    logDir,
    blockId,
    astPath: astPathStr,
    restoreAstFile: astPath,
    blockIdMapFile: mapPath,
    node,
    runMeta: existsSync(join(logDir, "00-run-meta.json"))
      ? JSON.parse(readFileSync(join(logDir, "00-run-meta.json"), "utf8"))
      : null,
  };
}

function main() {
  const opts = parseArgs(process.argv);

  if (opts.locator) {
    const parsed = parseLocatorText(opts.locator);
    opts.blockId ??= parsed.blockId;
    opts.templatePath ??= parsed.templatePath;
    opts.blockName ??= parsed.blockName;
    opts.blockType ??= parsed.blockType;
  }

  if (!opts.blockId && !opts.allRuns) {
    console.error("缺少 --block-id 或含「区块 ID」的 --locator");
    usage();
  }

  let emailKey;
  let layoutVariantId;
  if (opts.templatePath) {
    ({ emailKey, layoutVariantId } = parseTemplatePath(opts.templatePath));
  } else if (opts.blockId) {
    const prefixMatch = opts.blockId.match(/^(.*)-([a-z]+)-\d+$/);
    if (prefixMatch) {
      const prefix = prefixMatch[1];
      const parts = prefix.split("-");
      if (parts.length >= 2) {
        layoutVariantId = parts[parts.length - 1];
        emailKey = parts.slice(0, -1).join("-");
      }
    }
  }

  if (opts.allRuns) {
    if (!emailKey || !layoutVariantId) {
      console.error("--all-runs 需要 --template 或可从 block-id 推断的场景");
      process.exit(1);
    }
    const runs = findRestoreRuns(emailKey, layoutVariantId);
    if (opts.json) {
      console.log(JSON.stringify({ emailKey, layoutVariantId, runs }, null, 2));
      return;
    }
    console.log(`场景: ${emailKey} / 版式 ${layoutVariantId}`);
    console.log(`共 ${runs.length} 次 restore run:\n`);
    for (const { logDir, meta } of runs) {
      console.log(`  ${meta.startedAt ?? "?"}  ${logDir}  ok=${meta.ok ?? "?"}`);
    }
    return;
  }

  let logDir = opts.logDir;
  if (!logDir) {
    if (!emailKey || !layoutVariantId) {
      console.error("需要 --template 或 --log-dir，或 block-id 可解析出 emailKey/layoutVariantId");
      process.exit(1);
    }
    const runs = findRestoreRuns(emailKey, layoutVariantId);
    if (runs.length === 0) {
      console.error(
        `未找到 restore 日志: emailKey=${emailKey}, layoutVariantId=${layoutVariantId}\n` +
          `请确认 logs/restore-ast-*/00-run-meta.json 存在，或用 --log-dir 指定。`
      );
      process.exit(1);
    }
    logDir = runs[0].logDir;
    if (runs.length > 1 && !opts.json) {
      console.error(
        `提示: 该版式有 ${runs.length} 次 run，已选用最新: ${logDir}\n` +
          `（更早: ${runs.slice(1, 3).map((r) => r.logDir).join(", ")}${runs.length > 3 ? " …" : ""}）\n`
      );
    }
  }

  const result = locateInLogDir(logDir, opts.blockId);

  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const relLog = result.logDir.replace(REPO_ROOT + "/", "");
  const relAst = result.restoreAstFile.replace(REPO_ROOT + "/", "");
  console.log("## RestoreAst 定位结果\n");
  console.log(`| 项 | 值 |`);
  console.log(`|----|-----|`);
  if (emailKey) console.log(`| 场景 | \`${emailKey}\` / 版式 \`${layoutVariantId}\` |`);
  console.log(`| 区块 ID | \`${result.blockId}\` |`);
  if (opts.blockName) console.log(`| 区块名称 | ${opts.blockName} |`);
  console.log(`| astPath | \`${result.astPath}\` |`);
  console.log(`| restore 日志 | \`${relLog}\` |`);
  console.log(`| restore-ast.json | \`${relAst}\` |`);
  console.log(`| block-id-map | \`${result.blockIdMapFile.replace(REPO_ROOT + "/", "")}\` |`);
  if (result.runMeta?.startedAt) {
    console.log(`| 还原时间 | ${result.runMeta.startedAt} |`);
  }
  console.log("\n### AST 节点片段\n");
  console.log("```json");
  console.log(JSON.stringify(result.node, null, 2));
  console.log("```");
}

main();
