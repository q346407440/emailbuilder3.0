import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EMAILS_DIR = path.join(__dirname, "data", "emails");

function isValidHorizontalAlign(value) {
  return value === "left" || value === "center" || value === "right";
}

function ensureObject(value) {
  return value && typeof value === "object" ? value : {};
}

async function listTemplatePaths(rootDir) {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .map((entry) => path.join(rootDir, entry.name, "template.json"));
}

async function migrateTemplate(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  const json = JSON.parse(raw);
  const blocks = json?.blocks;
  if (!blocks || typeof blocks !== "object") {
    return { filePath, updated: false, blockCount: 0 };
  }

  let changed = false;
  let blockCount = 0;
  for (const block of Object.values(blocks)) {
    if (!block || typeof block !== "object") continue;
    blockCount += 1;

    const wrapperStyle = ensureObject(block.wrapperStyle);
    if (wrapperStyle !== block.wrapperStyle) {
      block.wrapperStyle = wrapperStyle;
      changed = true;
    }

    if (block.type === "emailRoot") {
      if (wrapperStyle.selfAlign !== undefined) {
        delete wrapperStyle.selfAlign;
        changed = true;
      }
      continue;
    }

    const selfAlign = ensureObject(wrapperStyle.selfAlign);
    if (selfAlign !== wrapperStyle.selfAlign) {
      wrapperStyle.selfAlign = selfAlign;
      changed = true;
    }

    if (!isValidHorizontalAlign(selfAlign.horizontal)) {
      selfAlign.horizontal = "center";
      changed = true;
    }
  }

  if (changed) {
    await fs.writeFile(filePath, `${JSON.stringify(json, null, 2)}\n`, "utf8");
  }

  return { filePath, updated: changed, blockCount };
}

async function main() {
  const templatePaths = await listTemplatePaths(EMAILS_DIR);
  const results = [];
  for (const templatePath of templatePaths) {
    try {
      const result = await migrateTemplate(templatePath);
      results.push(result);
    } catch (error) {
      console.error(`迁移失败：${templatePath}`);
      console.error(error);
      process.exitCode = 1;
      return;
    }
  }

  const updatedCount = results.filter((item) => item.updated).length;
  console.log(`迁移完成：共 ${results.length} 个模板，更新 ${updatedCount} 个。`);
  for (const item of results) {
    const status = item.updated ? "已更新" : "无变化";
    console.log(`- ${status} ${path.relative(__dirname, item.filePath)}（${item.blockCount} 个 block）`);
  }
}

await main();
