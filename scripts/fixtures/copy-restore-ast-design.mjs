#!/usr/bin/env node
/**
 * 将用户提供的**设计图源文件**二进制复制到 RestoreAst 夹具目录的 design.png。
 *
 * 勿从 Cursor 聊天 assets 目录复制（多为窄条 JPEG 预览，非原图）。
 *
 * 用法：
 *   npx tsx scripts/fixtures/copy-restore-ast-design.mjs \
 *     --fixture methodical-template30 \
 *     --from "/Users/you/Downloads/邮件学习模板/客户感谢 2（模板 30）.png"
 *
 * 选项：
 *   --fixture <name>   夹具子目录名（scripts/fixtures/restore-ast/<name>/）
 *   --from <path>      源设计图绝对或相对路径（必填）
 *   --dry-run          只打印将执行的复制，不写文件
 */

import { copyFile, mkdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_ROOT = join(__dirname, "restore-ast");

function printHelp() {
  console.log(`复制设计图源文件到 RestoreAst 夹具 design.png

用法：
  npx tsx scripts/fixtures/copy-restore-ast-design.mjs \\
    --fixture methodical-template30 \\
    --from "/path/to/source.png"

说明：使用 Node copyFile 二进制复制，不做压缩或重编码。`);
}

function parseArgs(argv) {
  const opts = { fixture: "", from: "", dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") {
      printHelp();
      process.exit(0);
    }
    if (arg === "--fixture") {
      opts.fixture = argv[++i] ?? "";
    } else if (arg === "--from") {
      opts.from = argv[++i] ?? "";
    } else if (arg === "--dry-run") {
      opts.dryRun = true;
    } else {
      console.error(`未知参数：${arg}`);
      process.exit(1);
    }
  }
  if (!opts.fixture || !opts.from) {
    console.error("缺少 --fixture 或 --from");
    printHelp();
    process.exit(1);
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const fixtureDir = join(FIXTURES_ROOT, opts.fixture);
  const src = resolve(opts.from);
  const dest = join(fixtureDir, "design.png");

  if (!existsSync(src)) {
    console.error(`源文件不存在：${src}`);
    process.exit(1);
  }

  const srcStat = await stat(src);
  if (!srcStat.isFile()) {
    console.error(`--from 必须是文件：${src}`);
    process.exit(1);
  }

  if (opts.dryRun) {
    console.log(`[dry-run] cp "${src}" → "${dest}"`);
    return;
  }

  await mkdir(fixtureDir, { recursive: true });
  await copyFile(src, dest);

  console.log(`已复制设计图（二进制，无重编码）：`);
  console.log(`  源：${src} (${srcStat.size} bytes)`);
  console.log(`  目标：${dest}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
