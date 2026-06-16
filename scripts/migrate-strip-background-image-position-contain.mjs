/**
 * contain 模式下剥离 backgroundImage.position 及对应 bindings。
 *
 *   npm run migrate:strip-background-image-position-contain
 *   npm run migrate:strip-background-image-position-contain:write
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { enumerateAllEmailTemplatePaths } from "../src/lib/emailLayoutVariant";
import { parseTemplateFromDisk, serializeTemplateToDisk } from "../src/lib/templateTreeAdapter";
import { stripBackgroundImagePositionWhenContainFromTemplate } from "../src/render-defaults-contract/backgroundImageFitSemantics";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");

function main() {
  const shouldWrite = process.argv.includes("--write");
  const files = enumerateAllEmailTemplatePaths(resolve(REPO_ROOT, "data", "emails"));
  const changedFiles = [];

  for (const file of files) {
    const graph = parseTemplateFromDisk(JSON.parse(readFileSync(file, "utf8")));
    if (!stripBackgroundImagePositionWhenContainFromTemplate(graph)) continue;
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
