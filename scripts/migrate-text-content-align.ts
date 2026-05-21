/**
 * 为历史模板补齐 text 区块 wrapperStyle.contentAlign。
 *
 * 用法：
 *   npx tsx scripts/migrate-text-content-align.ts                    # 干跑（默认模式：preserve）
 *   npx tsx scripts/migrate-text-content-align.ts --write            # 写回
 *   npx tsx scripts/migrate-text-content-align.ts --mode center      # 缺失时补 center
 *   npx tsx scripts/migrate-text-content-align.ts --mode center --write
 *
 * mode:
 * - preserve（默认）：若缺失，则按现有渲染行为补 left；已有值保持不变
 * - center：若缺失，则补 center；已有值保持不变
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import type { EmailTemplate, HorizontalAlign } from "../src/types/email";

const EMAILS_ROOT = path.resolve(process.cwd(), "data/emails");

type Mode = "preserve" | "center";

type Stats = {
  filesScanned: number;
  filesChanged: number;
  textBlocksScanned: number;
  textBlocksUpdated: number;
};

function parseMode(argv: string[]): Mode {
  const idx = argv.findIndex((arg) => arg === "--mode");
  if (idx >= 0) {
    const raw = argv[idx + 1];
    if (raw === "preserve" || raw === "center") return raw;
  }
  const withEq = argv.find((arg) => arg.startsWith("--mode="));
  if (withEq) {
    const raw = withEq.slice("--mode=".length);
    if (raw === "preserve" || raw === "center") return raw;
  }
  return "preserve";
}

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
      // 忽略无模板目录
    }
  }
  return out.sort();
}

function normalizeHorizontalAlign(raw: unknown): HorizontalAlign | null {
  if (raw === "left" || raw === "center" || raw === "right") return raw;
  return null;
}

function migrateTemplate(
  template: EmailTemplate,
  mode: Mode
): { changed: boolean; textBlocksScanned: number; textBlocksUpdated: number } {
  let changed = false;
  let textBlocksScanned = 0;
  let textBlocksUpdated = 0;

  for (const block of Object.values(template.blocks)) {
    if (block.type !== "text") continue;
    textBlocksScanned += 1;

    if (!block.wrapperStyle || typeof block.wrapperStyle !== "object" || Array.isArray(block.wrapperStyle)) {
      block.wrapperStyle = {};
      changed = true;
    }
    const ws = block.wrapperStyle as Record<string, unknown>;
    const contentAlign =
      ws.contentAlign && typeof ws.contentAlign === "object" && !Array.isArray(ws.contentAlign)
        ? (ws.contentAlign as Record<string, unknown>)
        : {};

    const currentHorizontal = normalizeHorizontalAlign(contentAlign.horizontal);
    if (currentHorizontal === null) {
      contentAlign.horizontal = mode === "center" ? "center" : "left";
      textBlocksUpdated += 1;
      changed = true;
    }
    if (contentAlign.vertical !== "top" && contentAlign.vertical !== "center" && contentAlign.vertical !== "bottom") {
      contentAlign.vertical = "top";
      changed = true;
    }
    ws.contentAlign = contentAlign;
  }

  return { changed, textBlocksScanned, textBlocksUpdated };
}

async function main() {
  const write = process.argv.includes("--write");
  const mode = parseMode(process.argv.slice(2));
  const files = await listTemplateFiles(EMAILS_ROOT);
  const stats: Stats = {
    filesScanned: files.length,
    filesChanged: 0,
    textBlocksScanned: 0,
    textBlocksUpdated: 0,
  };

  if (!files.length) {
    console.log("未找到模板：data/emails/*/template.json");
    return;
  }

  for (const file of files) {
    const raw = await fs.readFile(file, "utf8");
    const template = JSON.parse(raw) as EmailTemplate;
    const { changed, textBlocksScanned, textBlocksUpdated } = migrateTemplate(template, mode);
    stats.textBlocksScanned += textBlocksScanned;
    stats.textBlocksUpdated += textBlocksUpdated;
    if (!changed) continue;

    stats.filesChanged += 1;
    if (write) {
      await fs.writeFile(file, `${JSON.stringify(template, null, 2)}\n`, "utf8");
    }
    console.log(
      `${write ? "已迁移" : "将迁移"} ${path.relative(process.cwd(), file)}：补齐 contentAlign.horizontal ${textBlocksUpdated} 处`
    );
  }

  console.log("");
  console.log(
    `扫描 ${stats.filesScanned} 个模板，${write ? "实际修改" : "待修改"} ${stats.filesChanged} 个；text 区块 ${stats.textBlocksScanned} 个，补齐 horizontal ${stats.textBlocksUpdated} 处（mode=${mode}）。`
  );
  if (!write && stats.filesChanged > 0) {
    console.log(`写回请执行：npm run migrate:text-content-align -- --mode ${mode} --write`);
  }
}

void main();
