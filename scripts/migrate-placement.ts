/**
 * 将各区块 legacy `wrapperStyle.selfAlign` 收敛为 `wrapperStyle.placement`（start/center/end），并在可无损表达时删除冗余 selfAlign 字段。
 *
 * 用法：
 *   npx tsx scripts/migrate-placement.ts              # 干跑
 *   npx tsx scripts/migrate-placement.ts --write      # 写回磁盘
 *   npx tsx scripts/migrate-placement.ts path/to/template.json   # 指定文件
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import type { EmailTemplate } from "../src/types/email";
import { applyPlacementPrimaryMigrationToBlock } from "../src/lib/placementMigration";

const EMAILS_ROOT = path.resolve(process.cwd(), "data/emails");

async function listTemplateFiles(root: string): Promise<string[]> {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const out: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const p = path.join(root, entry.name, "template.json");
    try {
      await fs.access(p);
      out.push(p);
    } catch {
      /* 跳过 */
    }
  }
  return out.sort();
}

function migrateTemplate(template: EmailTemplate): boolean {
  let changed = false;
  for (const block of Object.values(template.blocks)) {
    if (!block) continue;
    if (applyPlacementPrimaryMigrationToBlock(template, block)) changed = true;
  }
  return changed;
}

async function main() {
  const write = process.argv.includes("--write");
  const explicit = process.argv.filter((a) => !a.startsWith("--") && a.endsWith(".json"));
  const files =
    explicit.length > 0
      ? explicit.map((f) => path.resolve(process.cwd(), f))
      : await listTemplateFiles(EMAILS_ROOT);

  let scanned = 0;
  let modified = 0;

  if (!files.length) {
    console.log("未找到模板：请指定 *.json 路径或确保存在 data/emails/*/template.json");
    return;
  }

  for (const file of files) {
    scanned += 1;
    const raw = await fs.readFile(file, "utf8");
    const template = JSON.parse(raw) as EmailTemplate;
    const changed = migrateTemplate(template);
    if (!changed) continue;
    modified += 1;
    if (write) {
      await fs.writeFile(file, `${JSON.stringify(template, null, 2)}\n`, "utf8");
    }
    console.log(`${write ? "已迁移" : "将迁移"} ${path.relative(process.cwd(), file)}`);
  }

  console.log("");
  console.log(
    `扫描 ${scanned} 个文件，${write ? "已修改" : "待修改"} ${modified} 个。未加 --write 时为干跑。`
  );
  if (modified > 0 && !write) {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
