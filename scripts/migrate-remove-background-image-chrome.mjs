/**
 * 从全仓库 template.json 剥离 wrapperStyle.backgroundImage.border / borderRadius 及对应 bindings。
 *
 *   npm run migrate:remove-background-image-chrome
 *   npm run migrate:remove-background-image-chrome:write
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { enumerateAllEmailTemplatePaths } from "../src/lib/emailLayoutVariant";
import { parseTemplateFromDisk, serializeTemplateToDisk } from "../src/lib/templateTreeAdapter";
import { stripForbiddenBackgroundImageChromeFromTemplate } from "../src/render-defaults-contract/forbiddenBackgroundImageChrome";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");

function main() {
  const args = process.argv.slice(2);
  const shouldWrite = args.includes("--write");
  const emailsDir = resolve(REPO_ROOT, "data", "emails");
  const files = enumerateAllEmailTemplatePaths(emailsDir);
  const changedFiles = [];

  for (const file of files) {
    const graph = parseTemplateFromDisk(JSON.parse(readFileSync(file, "utf8")));
    if (!stripForbiddenBackgroundImageChromeFromTemplate(graph)) continue;
    changedFiles.push(file);
    if (shouldWrite) {
      writeFileSync(file, `${JSON.stringify(serializeTemplateToDisk(graph), null, 2)}\n`, "utf8");
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
