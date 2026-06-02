/**
 * 将每个区块的 wrapperStyle.selfAlign.cross 统一设为 start（横向 flex 父级下为顶部对齐）。
 *
 * 用法：
 *   npx tsx scripts/migrate-self-align-cross-top.ts           # 干跑
 *   npx tsx scripts/migrate-self-align-cross-top.ts --write  # 写回磁盘
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import type { EmailBlock, EmailTemplate } from "../../../src/types/email";
import { enumerateAllEmailTemplatePaths } from "../../../src/lib/emailLayoutVariant";
import { parseTemplateFromDisk, serializeTemplateToDisk } from "../../../src/lib/templateTreeAdapter";

const EMAILS_ROOT = path.resolve(process.cwd(), "data/emails");

type Stats = {
  filesScanned: number;
  filesChanged: number;
  blocksUpdated: number;
};

async function listTemplateFiles(root: string): Promise<string[]> {
  return enumerateAllEmailTemplatePaths(root);
}

function migrateTemplate(template: EmailTemplate): { changed: boolean; blocksUpdated: number } {
  let changed = false;
  let blocksUpdated = 0;

  for (const block of Object.values(template.blocks)) {
    if (block.type === "emailRoot") {
      const ws = block.wrapperStyle as Record<string, unknown> | undefined;
      if (ws && typeof ws === "object" && !Array.isArray(ws) && ws.selfAlign !== undefined) {
        delete ws.selfAlign;
        changed = true;
        blocksUpdated += 1;
      }
      continue;
    }

    const ws = (block as EmailBlock).wrapperStyle as Record<string, unknown> | undefined;
    if (!ws || typeof ws !== "object" || Array.isArray(ws)) continue;

    const selfRaw = ws.selfAlign;
    const selfAlign =
      selfRaw && typeof selfRaw === "object" && !Array.isArray(selfRaw)
        ? { ...(selfRaw as Record<string, unknown>) }
        : {};

    if (selfAlign.cross === "start") continue;

    selfAlign.cross = "start";
    ws.selfAlign = selfAlign;
    changed = true;
    blocksUpdated += 1;
  }

  return { changed, blocksUpdated };
}

async function main() {
  const write = process.argv.includes("--write");
  const files = await listTemplateFiles(EMAILS_ROOT);
  const stats: Stats = {
    filesScanned: files.length,
    filesChanged: 0,
    blocksUpdated: 0,
  };

  if (!files.length) {
    console.log("未找到模板：data/emails/*/layouts/*/template.json");
    return;
  }

  for (const file of files) {
    const raw = await fs.readFile(file, "utf8");
    const graph = parseTemplateFromDisk(JSON.parse(raw) as EmailTemplate);
    const { changed, blocksUpdated } = migrateTemplate(graph);
    if (!changed) continue;

    stats.filesChanged += 1;
    stats.blocksUpdated += blocksUpdated;

    if (write) {
      await fs.writeFile(file, `${JSON.stringify(serializeTemplateToDisk(graph), null, 2)}\n`, "utf8");
    }
    console.log(
      `${write ? "已更新" : "将更新"} ${path.relative(process.cwd(), file)}：写入 selfAlign.cross=start 共 ${blocksUpdated} 个区块`
    );
  }

  console.log("");
  console.log(
    `扫描 ${stats.filesScanned} 个模板，${write ? "实际修改" : "待修改"} ${stats.filesChanged} 个；共 ${stats.blocksUpdated} 个区块设为 cross=start（顶部对齐）。`
  );
  if (!write && stats.filesChanged > 0) {
    console.log("写回请执行：npm run migrate:self-align-cross-top -- --write");
  }
}

void main();
