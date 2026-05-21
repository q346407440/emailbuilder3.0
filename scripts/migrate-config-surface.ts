#!/usr/bin/env tsx
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { EmailTemplate } from "../src/types/email";
import { createDefaultConfigSchema } from "../src/lib/defaultConfigSchema";
import { createDefaultTokenPresets } from "../src/lib/defaultTokenPresets";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const emailsRoot = path.join(repoRoot, "data", "emails");
const write = process.argv.includes("--write");

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return null;
    throw e;
  }
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function main(): Promise<void> {
  const entries = await fs.readdir(emailsRoot, { withFileTypes: true });
  let changed = 0;
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith("_")) continue;
    const emailDir = path.join(emailsRoot, entry.name);
    const template = await readJson<EmailTemplate>(path.join(emailDir, "template.json"));
    if (!template) continue;
    const configSchema = createDefaultConfigSchema(template);
    const tokenPresets = createDefaultTokenPresets();
    changed += 1;
    if (write) {
      await writeJson(path.join(emailDir, "configSchema.json"), configSchema);
      await writeJson(path.join(emailDir, "tokenPresets.json"), tokenPresets);
      process.stdout.write(`[write] ${entry.name}: configSchema.json, tokenPresets.json\n`);
    } else {
      process.stdout.write(`[dry]   ${entry.name}: 将生成 configSchema.json 与 tokenPresets.json\n`);
    }
  }
  process.stdout.write(
    write
      ? `完成：已处理 ${changed} 个邮件目录\n`
      : `预览：将处理 ${changed} 个邮件目录；加 --write 写入\n`
  );
}

void main().catch((e) => {
  process.stderr.write(`${e instanceof Error ? e.stack ?? e.message : String(e)}\n`);
  process.exit(1);
});
