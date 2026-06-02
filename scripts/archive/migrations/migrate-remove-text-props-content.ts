/**
 * 移除 text 区块 props.content 及 bindings.props.content，统一以 props.textBody 为唯一正文真源。
 *
 *   npx tsx scripts/migrate-remove-text-props-content.ts
 *   npx tsx scripts/migrate-remove-text-props-content.ts --write
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import type { BindingSpec, EmailBlock, EmailTemplate, TextBlockProps, TextDecoration } from "../../../src/types/email";
import { htmlFragmentToTextBody } from "../../../src/lib/htmlFragmentToTextBody";
import { normalizeTextBody } from "../../../src/lib/textBodyFormat";
import { getTextBodyFieldSourceBindPath } from "../../../src/lib/textBodyContentMode";
import type { TextBlock } from "../../../src/types/email";
import { parseTemplateFromDisk, serializeTemplateToDisk } from "../../../src/lib/templateTreeAdapter";

const EMAILS_ROOT = path.resolve(process.cwd(), "data");

type Stats = {
  filesScanned: number;
  filesChanged: number;
  contentRemoved: number;
  bindingsMoved: number;
  textBodyCreated: number;
  repeatMappingsUpdated: number;
};

function normalizeDecoration(raw: unknown): TextDecoration {
  if (raw === "underline" || raw === "line-through" || raw === "overline" || raw === "none") {
    return raw;
  }
  return "none";
}

function textDefaults(props: TextBlockProps): {
  bold: boolean;
  italic: boolean;
  decoration: TextDecoration;
} {
  return {
    bold: props.bold === true,
    italic: props.italic === true,
    decoration: normalizeDecoration(props.decoration),
  };
}

async function listTemplateFiles(root: string): Promise<string[]> {
  const out: string[] = [];

  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.startsWith("_") || entry.name === "node_modules") continue;
        await walk(full);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith(".json")) {
        out.push(full);
      }
    }
  }

  await walk(root);
  return out.sort();
}

function canonicalTextBodyBindPath(block: TextBlock, body: NonNullable<ReturnType<typeof normalizeTextBody>>): string {
  const contentBinding = block.bindings?.["props.content"];
  if (contentBinding?.mode === "variable") {
    const runs = body.paragraphs.flatMap((p, pi) =>
      (p.runs ?? []).map((_, ri) => `props.textBody.paragraphs.${pi}.runs.${ri}.text`)
    );
    if (runs.length === 1) return runs[0]!;
    return "props.textBody";
  }
  return getTextBodyFieldSourceBindPath(block, body, "literal");
}

function migrateBindingToTextBody(
  block: TextBlock,
  body: NonNullable<ReturnType<typeof normalizeTextBody>>,
  fromPath: string,
  spec: BindingSpec
): string | null {
  if (fromPath !== "props.content") return null;
  const target = canonicalTextBodyBindPath(block, body);
  block.bindings ??= {};
  block.bindings[target] = { ...spec };
  delete block.bindings["props.content"];
  return target;
}

function migrateTemplate(template: EmailTemplate): {
  changed: boolean;
  contentRemoved: number;
  bindingsMoved: number;
  textBodyCreated: number;
  repeatMappingsUpdated: number;
} {
  let changed = false;
  let contentRemoved = 0;
  let bindingsMoved = 0;
  let textBodyCreated = 0;
  let repeatMappingsUpdated = 0;

  for (const block of Object.values(template.blocks)) {
    if (block.type !== "text") continue;
    const textBlock = block as Extract<EmailBlock, { type: "text" }>;
    const props = textBlock.props as TextBlockProps & { content?: string };
    let blockChanged = false;

    let body = normalizeTextBody(props.textBody);
    if (!body && typeof props.content === "string" && props.content.trim()) {
      body = htmlFragmentToTextBody(props.content, textDefaults(props as TextBlockProps));
      props.textBody = body;
      textBodyCreated += 1;
      blockChanged = true;
    }
    if (!body) {
      body = { paragraphs: [{ runs: [{ text: "" }] }] };
      props.textBody = body;
      textBodyCreated += 1;
      blockChanged = true;
    }

    const contentBinding = textBlock.bindings?.["props.content"];
    if (contentBinding) {
      const target = migrateBindingToTextBody(textBlock, body, "props.content", contentBinding);
      if (target) {
        bindingsMoved += 1;
        blockChanged = true;

        for (const other of Object.values(template.blocks)) {
          const repeat = other.repeat;
          if (!repeat?.fieldMappings?.length) continue;
          for (const mapping of repeat.fieldMappings) {
            if (mapping.targetBlockId !== textBlock.id || mapping.targetBindPath !== "props.content") continue;
            mapping.targetBindPath = target;
            repeatMappingsUpdated += 1;
            blockChanged = true;
          }
        }
      }
    }

    if ("content" in props) {
      delete props.content;
      contentRemoved += 1;
      blockChanged = true;
    }

    if (blockChanged) changed = true;
  }

  return { changed, contentRemoved, bindingsMoved, textBodyCreated, repeatMappingsUpdated };
}

async function main() {
  const write = process.argv.includes("--write");
  const roots = [path.join(EMAILS_ROOT, "emails"), path.join(EMAILS_ROOT, "masters")];
  const files: string[] = [];
  for (const root of roots) {
    try {
      await fs.access(root);
      files.push(...(await listTemplateFiles(root)));
    } catch {
      /* 目录不存在则跳过 */
    }
  }

  const stats: Stats = {
    filesScanned: files.length,
    filesChanged: 0,
    contentRemoved: 0,
    bindingsMoved: 0,
    textBodyCreated: 0,
    repeatMappingsUpdated: 0,
  };

  if (!files.length) {
    console.log("未找到 template.json");
    return;
  }

  for (const file of files) {
    let graph: EmailTemplate;
    try {
      graph = parseTemplateFromDisk(JSON.parse(await fs.readFile(file, "utf8")) as EmailTemplate);
    } catch {
      continue;
    }
    const result = migrateTemplate(graph);
    if (!result.changed) continue;

    stats.filesChanged += 1;
    stats.contentRemoved += result.contentRemoved;
    stats.bindingsMoved += result.bindingsMoved;
    stats.textBodyCreated += result.textBodyCreated;
    stats.repeatMappingsUpdated += result.repeatMappingsUpdated;

    const rel = path.relative(process.cwd(), file);
    console.log(
      `${write ? "已迁移" : "将迁移"} ${rel}：删 content ${result.contentRemoved}，移绑定 ${result.bindingsMoved}，补 textBody ${result.textBodyCreated}，repeat 映射 ${result.repeatMappingsUpdated}`
    );

    if (write) {
      await fs.writeFile(file, `${JSON.stringify(serializeTemplateToDisk(graph), null, 2)}\n`, "utf8");
    }
  }

  console.log(
    `\n${write ? "完成" : "干跑"}：扫描 ${stats.filesScanned} 个模板，变更 ${stats.filesChanged} 个；删 content 字段 ${stats.contentRemoved}，移 bindings ${stats.bindingsMoved}，新建 textBody ${stats.textBodyCreated}，更新 repeat 映射 ${stats.repeatMappingsUpdated}`
  );
  if (!write && stats.filesChanged > 0) {
    console.log("加 --write 写回");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
