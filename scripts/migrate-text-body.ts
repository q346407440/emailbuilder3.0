import { promises as fs } from "node:fs";
import path from "node:path";
import type { EmailBlock, EmailTemplate, TextBlockProps, TextDecoration } from "../src/types/email";
import { htmlFragmentToTextBody } from "../src/lib/htmlFragmentToTextBody";
import {
  normalizeTextBody,
  renderTextBodyToHtml,
  type TextBodyDefaults,
} from "../src/lib/textBodyFormat";

type MigrateStats = {
  filesScanned: number;
  filesChanged: number;
  blocksUpdated: number;
  blocksCreated: number;
};

const EMAILS_ROOT = path.resolve(process.cwd(), "data/emails");

function normalizeDecoration(raw: unknown): TextDecoration {
  if (raw === "underline" || raw === "line-through" || raw === "overline" || raw === "none") {
    return raw;
  }
  return "none";
}

function textDefaults(props: TextBlockProps): TextBodyDefaults {
  return {
    bold: props.bold === true,
    italic: props.italic === true,
    decoration: normalizeDecoration(props.decoration),
  };
}

async function listTemplateFiles(root: string): Promise<string[]> {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const out: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith("_")) continue;
    const base = path.join(root, entry.name);
    const manifestPath = path.join(base, "layout-manifest.json");
    try {
      await fs.access(manifestPath);
      const raw = await fs.readFile(manifestPath, "utf8");
      const manifest = JSON.parse(raw) as { variants?: Array<{ id?: string }> };
      for (const v of manifest.variants ?? []) {
        if (!v?.id) continue;
        const tpl = path.join(base, "layouts", v.id, "template.json");
        try {
          await fs.access(tpl);
          out.push(tpl);
        } catch {
          /* 缺版式包 */
        }
      }
      continue;
    } catch {
      /* 无 manifest */
    }
    const legacy = path.join(base, "template.json");
    try {
      await fs.access(legacy);
      out.push(legacy);
    } catch {
      /* 忽略 */
    }
  }
  return out.sort();
}

function migrateTemplate(template: EmailTemplate): {
  changed: boolean;
  blocksUpdated: number;
  blocksCreated: number;
} {
  let changed = false;
  let blocksUpdated = 0;
  let blocksCreated = 0;

  for (const block of Object.values(template.blocks)) {
    if (block.type !== "text") continue;
    const textBlock = block as Extract<EmailBlock, { type: "text" }>;
    const props = textBlock.props as TextBlockProps;
    const defaults = textDefaults(props);
    const legacyContent =
      props && typeof props === "object" && "content" in props
        ? (props as { content?: string }).content
        : undefined;
    const currentBody = normalizeTextBody(props.textBody);
    const nextBody =
      currentBody ??
      htmlFragmentToTextBody(typeof legacyContent === "string" ? legacyContent : "", defaults);

    const bodyChanged = JSON.stringify(props.textBody) !== JSON.stringify(nextBody);
    const hadContent = props && typeof props === "object" && "content" in props;

    if (!bodyChanged && !hadContent) continue;

    props.textBody = nextBody;
    if (hadContent) {
      delete (props as { content?: string }).content;
    }
    changed = true;
    blocksUpdated += 1;
    if (!currentBody) blocksCreated += 1;
  }

  return { changed, blocksUpdated, blocksCreated };
}

async function main() {
  const write = process.argv.includes("--write");
  const files = await listTemplateFiles(EMAILS_ROOT);
  const stats: MigrateStats = {
    filesScanned: files.length,
    filesChanged: 0,
    blocksUpdated: 0,
    blocksCreated: 0,
  };

  if (!files.length) {
    console.log("未找到任何模板文件：data/emails/*/template.json");
    return;
  }

  for (const file of files) {
    const raw = await fs.readFile(file, "utf8");
    const template = JSON.parse(raw) as EmailTemplate;
    const result = migrateTemplate(template);
    if (!result.changed) continue;

    stats.filesChanged += 1;
    stats.blocksUpdated += result.blocksUpdated;
    stats.blocksCreated += result.blocksCreated;

    if (write) {
      await fs.writeFile(file, `${JSON.stringify(template, null, 2)}\n`, "utf8");
    }
    console.log(
      `${write ? "已迁移" : "将迁移"} ${path.relative(process.cwd(), file)}: 更新 ${result.blocksUpdated} 个 text 区块（新增 textBody ${result.blocksCreated} 个）`
    );
  }

  console.log("");
  console.log(
    `扫描 ${stats.filesScanned} 个模板，${write ? "实际修改" : "待修改"} ${stats.filesChanged} 个模板；更新 ${stats.blocksUpdated} 个 text 区块（其中新增 textBody ${stats.blocksCreated} 个）。`
  );
  if (!write && stats.filesChanged > 0) {
    console.log("使用 --write 参数执行写回，例如：npm run migrate:text-body -- --write");
  }
}

void main();
