#!/usr/bin/env node
/**
 * 按 design-sources.json 将 Downloads 原图批量复制到各夹具 design.png。
 *
 * 用法：
 *   npx tsx scripts/fixtures/sync-restore-ast-designs.mjs
 *   npx tsx scripts/fixtures/sync-restore-ast-designs.mjs --fixture forever21-template46
 *   npx tsx scripts/fixtures/sync-restore-ast-designs.mjs --dry-run
 */

import { copyFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MANIFEST = join(__dirname, "restore-ast/design-sources.json");
const FIXTURES_ROOT = join(__dirname, "restore-ast");

function parseArgs(argv) {
  const opts = { fixture: "", dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--fixture") opts.fixture = argv[++i] ?? "";
    else if (arg === "--dry-run") opts.dryRun = true;
    else if (arg === "-h" || arg === "--help") {
      console.log(`用法：npx tsx scripts/fixtures/sync-restore-ast-designs.mjs [--fixture <name>] [--dry-run]`);
      process.exit(0);
    }
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
  const baseDir = manifest.baseDir;
  const entries = Object.entries(manifest.fixtures).filter(
    ([name]) => !opts.fixture || name === opts.fixture
  );

  if (opts.fixture && entries.length === 0) {
    console.error(`未知夹具：${opts.fixture}`);
    process.exit(1);
  }

  let ok = 0;
  for (const [fixture, filename] of entries) {
    const src = join(baseDir, filename);
    const dest = join(FIXTURES_ROOT, fixture, "design.png");
    if (!existsSync(src)) {
      console.error(`✗ ${fixture}：源文件不存在 ${src}`);
      continue;
    }
    if (opts.dryRun) {
      console.log(`[dry-run] ${filename} → ${fixture}/design.png`);
      ok += 1;
      continue;
    }
    await copyFile(src, dest);
    console.log(`✓ ${fixture} ← ${filename}`);
    ok += 1;
  }

  console.log(`\n完成：${ok}/${entries.length} 个夹具`);
  if (ok < entries.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
