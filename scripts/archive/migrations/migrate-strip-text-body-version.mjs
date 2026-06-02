import { readTemplateDisk, writeTemplateDisk } from "../../lib/template-disk-io.mjs";
/**
 * 从含 blocks 的 JSON（template、母版、夹具）的 text.props.textBody 中移除 version 字段。
 * 正文形态迭代由 template.schemaVersion + 迁移脚本负责，不再嵌套 textBody.version。
 *
 *   node scripts/migrate-strip-text-body-version.mjs
 *   node scripts/migrate-strip-text-body-version.mjs --write
 */
import { promises as fs } from "node:fs";
import path from "node:path";

const SCAN_ROOTS = [
  path.resolve(process.cwd(), "data"),
  path.resolve(process.cwd(), "tests/fixtures"),
];
const write = process.argv.includes("--write");

const stats = { filesScanned: 0, filesChanged: 0, versionRemoved: 0 };

async function listJsonWithBlocks(root) {
  const out = [];
  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.startsWith("_") || entry.name === "node_modules") continue;
        await walk(full);
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
      out.push(full);
    }
  }
  await walk(root);
  return out.sort();
}

function stripTextBodyVersion(template) {
  let changed = false;
  for (const block of Object.values(template.blocks ?? {})) {
    if (!block || typeof block !== "object") continue;
    const props = block.props;
    if (!props || typeof props !== "object" || Array.isArray(props)) continue;
    const textBody = props.textBody;
    if (!textBody || typeof textBody !== "object" || Array.isArray(textBody)) continue;
    if (!("version" in textBody)) continue;
    delete textBody.version;
    stats.versionRemoved += 1;
    changed = true;
  }
  return changed;
}

async function main() {
  const files = (
    await Promise.all(SCAN_ROOTS.map((root) => listJsonWithBlocks(root)))
  ).flat();
  for (const file of files) {
    stats.filesScanned += 1;
    let graph;
    let ctx;
    try {
      ({ graph, ctx } = readTemplateDisk(file));
    } catch {
      continue;
    }
    if (!stripTextBodyVersion(graph)) continue;
    stats.filesChanged += 1;
    if (write) {
      writeTemplateDisk(file, graph, ctx);
    }
  }
  const mode = write ? "已写入" : "预览（加 --write 落盘）";
  console.log(
    `${mode}：扫描 ${stats.filesScanned} 个 JSON，${write ? "修改" : "待修改"} ${stats.filesChanged} 个；移除 textBody.version ${stats.versionRemoved} 处。`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
