/**
 * 补齐不需要设计判断的模板结构默认值，避免 Inspector 出现空配置。
 * 与 legacy `normalize-template-defaults.mjs` 行为一致；补齐 grid padding、button/layout contentAlign、剥离禁止字段等。
 *
 * 用法：
 *   npx tsx scripts/normalize-template-defaults.ts
 *   npx tsx scripts/normalize-template-defaults.ts --write
 *   npx tsx scripts/normalize-template-defaults.ts path/to/template.json
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { EmailTemplate } from "../src/types/email";
import { normalizeTemplateBlockDefaults } from "../src/lib/templateBlockDefaults";

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
    if (!normalizeTemplateBlockDefaults(template)) continue;
    changedFiles.push(file);
    if (shouldWrite) {
      writeFileSync(file, `${JSON.stringify(template, null, 2)}\n`, "utf8");
    }
  }

  const action = shouldWrite ? "已补齐" : "需要补齐";
  if (changedFiles.length === 0) {
    console.log("模板默认值已完整，无需修改");
    return;
  }
  console.log(`${action} ${changedFiles.length} 个模板文件:`);
  for (const file of changedFiles) {
    console.log(`- ${relative(REPO_ROOT, file)}`);
  }
  if (!shouldWrite) {
    process.exitCode = 1;
  }
}

main();
