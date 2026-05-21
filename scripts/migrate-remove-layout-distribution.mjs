import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const EMAILS_DIR = path.join(ROOT, "data", "emails");
const GOLDEN_FILE = path.join(ROOT, "tests", "fixtures", "email-template-yaml", "golden-minimal.expected.json");

function stripLayoutDistribution(template) {
  if (!template || typeof template !== "object") return 0;
  const blocks = template.blocks;
  if (!blocks || typeof blocks !== "object") return 0;
  let changed = 0;
  for (const block of Object.values(blocks)) {
    if (!block || typeof block !== "object") continue;
    if (block.type !== "layout") continue;
    const props = block.props;
    if (!props || typeof props !== "object") continue;
    if (!Object.prototype.hasOwnProperty.call(props, "distribution")) continue;
    delete props.distribution;
    changed += 1;
  }
  return changed;
}

async function migrateFile(filePath) {
  const raw = await readFile(filePath, "utf-8");
  const json = JSON.parse(raw);
  const changed = stripLayoutDistribution(json);
  if (changed === 0) return 0;
  await writeFile(filePath, `${JSON.stringify(json, null, 2)}\n`, "utf-8");
  return changed;
}

async function run() {
  const entries = await readdir(EMAILS_DIR, { withFileTypes: true });
  let fileCount = 0;
  let blockCount = 0;
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const templatePath = path.join(EMAILS_DIR, entry.name, "template.json");
    const changed = await migrateFile(templatePath);
    if (changed > 0) {
      fileCount += 1;
      blockCount += changed;
    }
  }

  const goldenChanged = await migrateFile(GOLDEN_FILE);
  if (goldenChanged > 0) {
    fileCount += 1;
    blockCount += goldenChanged;
  }

  console.log(`已迁移 ${fileCount} 个文件，清理 ${blockCount} 个 layout.props.distribution 字段。`);
}

void run();
