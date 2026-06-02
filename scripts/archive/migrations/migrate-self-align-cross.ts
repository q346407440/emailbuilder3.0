/**
 * 将 layout.props.crossAlign 下沉为各子区块 wrapperStyle.selfAlign.cross，并删除 layout 上的 crossAlign。
 *
 * 用法：
 *   npx tsx scripts/migrate-self-align-cross.ts           # 干跑
 *   npx tsx scripts/migrate-self-align-cross.ts --write  # 写回磁盘
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import type { EmailBlock, EmailTemplate, SelfAlignCross } from "../../../src/types/email";
import { enumerateAllEmailTemplatePaths } from "../../../src/lib/emailLayoutVariant";
import { parseTemplateFromDisk, serializeTemplateToDisk } from "../../../src/lib/templateTreeAdapter";

const EMAILS_ROOT = path.resolve(process.cwd(), "data/emails");

type Stats = {
  filesScanned: number;
  filesChanged: number;
  layoutsMigrated: number;
  childrenUpdated: number;
};

async function listTemplateFiles(root: string): Promise<string[]> {
  return enumerateAllEmailTemplatePaths(root);
}

function mapCrossAlignToSelfCross(raw: unknown): SelfAlignCross | null {
  if (raw === "start" || raw === "center" || raw === "end" || raw === "stretch") return raw;
  return null;
}

function migrateTemplate(template: EmailTemplate): {
  changed: boolean;
  layoutsMigrated: number;
  childrenUpdated: number;
} {
  let changed = false;
  let layoutsMigrated = 0;
  let childrenUpdated = 0;

  for (const block of Object.values(template.blocks)) {
    if (block.type !== "layout") continue;
    const props = (block as Extract<EmailBlock, { type: "layout" }>).props as Record<
      string,
      unknown
    >;
    if (!("crossAlign" in props)) continue;

    const mapped = mapCrossAlignToSelfCross(props.crossAlign);
    delete props.crossAlign;
    changed = true;
    layoutsMigrated += 1;

    if (mapped === null || mapped === "stretch") continue;

    for (const cid of block.children) {
      const child = template.blocks[cid];
      if (!child) continue;
      if (!child.wrapperStyle || typeof child.wrapperStyle !== "object") child.wrapperStyle = {};
      const ws = child.wrapperStyle as Record<string, unknown>;
      const selfAlign =
        ws.selfAlign && typeof ws.selfAlign === "object" && !Array.isArray(ws.selfAlign)
          ? (ws.selfAlign as Record<string, unknown>)
          : {};
      ws.selfAlign = selfAlign;
      selfAlign.cross = mapped;
      childrenUpdated += 1;
      changed = true;
    }
  }

  return { changed, layoutsMigrated, childrenUpdated };
}

async function main() {
  const write = process.argv.includes("--write");
  const files = await listTemplateFiles(EMAILS_ROOT);
  const stats: Stats = {
    filesScanned: files.length,
    filesChanged: 0,
    layoutsMigrated: 0,
    childrenUpdated: 0,
  };

  if (!files.length) {
    console.log("未找到模板：data/emails/*/layouts/*/template.json");
    return;
  }

  for (const file of files) {
    const raw = await fs.readFile(file, "utf8");
    const graph = parseTemplateFromDisk(JSON.parse(raw) as EmailTemplate);
    const { changed, layoutsMigrated, childrenUpdated } = migrateTemplate(graph);
    if (!changed) continue;

    stats.filesChanged += 1;
    stats.layoutsMigrated += layoutsMigrated;
    stats.childrenUpdated += childrenUpdated;

    if (write) {
      await fs.writeFile(file, `${JSON.stringify(serializeTemplateToDisk(graph), null, 2)}\n`, "utf8");
    }
    console.log(
      `${write ? "已迁移" : "将迁移"} ${path.relative(process.cwd(), file)}：处理 layout ${layoutsMigrated} 个，写入子块 cross ${childrenUpdated} 处`
    );
  }

  console.log("");
  console.log(
    `扫描 ${stats.filesScanned} 个模板，${write ? "实际修改" : "待修改"} ${stats.filesChanged} 个；共迁移 layout.crossAlign ${stats.layoutsMigrated} 处，更新子块 selfAlign.cross ${stats.childrenUpdated} 处。`
  );
  if (!write && stats.filesChanged > 0) {
    console.log("写回请执行：npm run migrate:self-align-cross -- --write");
  }
}

void main();
