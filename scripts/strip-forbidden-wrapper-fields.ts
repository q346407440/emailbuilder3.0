/**
 * 从 template.json 剥离项目禁止持久化的 wrapperStyle 字段。
 *
 *   npx tsx scripts/strip-forbidden-wrapper-fields.ts
 *   npx tsx scripts/strip-forbidden-wrapper-fields.ts --write
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { EmailTemplate } from "../src/types/email";
import { stripForbiddenRenderDefaultsFromTemplate } from "../src/lib/render-defaults-contract/validate";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");

function collectTemplateFiles(args: string[]): string[] {
  const explicit = args.filter((arg) => !arg.startsWith("--"));
  if (explicit.length > 0) {
    return explicit.map((arg) => resolve(REPO_ROOT, arg));
  }
  const emailsDir = join(REPO_ROOT, "data", "emails");
  return readdirSync(emailsDir)
    .map((dir) => join(emailsDir, dir, "template.json"))
    .filter((file) => existsSync(file));
}

function main() {
  const args = process.argv.slice(2);
  const shouldWrite = args.includes("--write");
  const files = collectTemplateFiles(args);
  const changedFiles: string[] = [];

  for (const file of files) {
    const template = JSON.parse(readFileSync(file, "utf8")) as EmailTemplate;
    if (!stripForbiddenRenderDefaultsFromTemplate(template)) continue;
    changedFiles.push(file);
    if (shouldWrite) {
      writeFileSync(file, `${JSON.stringify(template, null, 2)}\n`, "utf8");
    }
  }

  if (changedFiles.length === 0) {
    console.log("无变更");
    return;
  }
  console.log(shouldWrite ? "已写入：" : "将变更（加 --write）：");
  for (const file of changedFiles) {
    console.log(`  ${relative(REPO_ROOT, file)}`);
  }
}

main();
