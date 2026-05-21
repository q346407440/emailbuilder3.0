/**
 * 将 `type: "image"` 从历史 `props.src/viewport/...` 迁到 `wrapperStyle.backgroundImage` + 宽高语义，
 * `props` 仅保留叠放子内容的方向与间距字段。
 *
 * 用法：tsx scripts/migrate-image-wrapper-background.ts --write
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { EmailBlock, EmailTemplate } from "../src/types/email";
import { normalizeImageBlockToWrapperBackgroundShape } from "../src/lib/imageBlockWrapperBackground";
import { validateTemplate } from "../src/lib/validate";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..");
const EMAILS = join(REPO, "data", "emails");
const WRITE = process.argv.includes("--write");

function migrateTemplate(template: EmailTemplate): EmailTemplate {
  const root = template.blocks[template.rootBlockId];
  const rootWidth =
    root?.type === "emailRoot" && typeof root.props.width === "string" ? root.props.width : "600px";
  const nextBlocks = { ...template.blocks };
  for (const [id, block] of Object.entries(nextBlocks)) {
    if (block.type === "image") {
      nextBlocks[id] = normalizeImageBlockToWrapperBackgroundShape(
        block as EmailBlock & { type: "image" },
        rootWidth
      );
    }
  }
  return { ...template, blocks: nextBlocks };
}

function main() {
  const dirs = readdirSync(EMAILS).filter((n) => existsSync(join(EMAILS, n, "template.json")));
  console.log(`扫描 ${dirs.length} 份模板（${WRITE ? "直写" : "dry-run"}）`);
  for (const dir of dirs) {
    const tp = join(EMAILS, dir, "template.json");
    const raw = JSON.parse(readFileSync(tp, "utf8")) as EmailTemplate;
    const next = migrateTemplate(raw);
    const issues = validateTemplate(next);
    if (issues.length) {
      console.error(`${dir} 校验失败：`, issues);
      process.exit(1);
    }
    if (WRITE && JSON.stringify(raw) !== JSON.stringify(next)) {
      writeFileSync(tp, `${JSON.stringify(next, null, 2)}\n`, "utf8");
      console.log(`  · 已写入 ${dir}`);
    } else if (!WRITE) {
      const changed = JSON.stringify(raw) !== JSON.stringify(next);
      console.log(`  · ${dir}: ${changed ? "有变更（加 --write 写入）" : "无变更"}`);
    }
  }
  console.log("完成");
}

main();
