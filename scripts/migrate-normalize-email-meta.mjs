/**
 * 全量剥离 meta.json 已下线字段（status / supersededBy / campaignTag / designSource 等）。
 * 真源：src/meta-contract/removed-fields.ts + normalize.ts
 *
 *   npm run migrate:normalize-email-meta
 *   npm run migrate:normalize-email-meta:write
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { normalizePersistedEmailMeta } from "../src/meta-contract/normalize.ts";

const EMAILS_DIR = path.resolve(process.cwd(), "data", "emails");
const SCRIPTS_DIR = path.resolve(process.cwd(), "scripts");
const write = process.argv.includes("--write");

const stats = { metaFiles: 0, metaChanged: 0, generators: 0, generatorsChanged: 0 };

async function listMetaFiles() {
  const out = [];
  const entries = await fs.readdir(EMAILS_DIR, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const metaPath = path.join(EMAILS_DIR, entry.name, "meta.json");
    try {
      await fs.access(metaPath);
      out.push(metaPath);
    } catch {
      /* 无 meta */
    }
  }
  return out.sort();
}

async function migrateMetaFile(metaPath) {
  stats.metaFiles += 1;
  const raw = await fs.readFile(metaPath, "utf8");
  const prev = JSON.parse(raw);
  const next = normalizePersistedEmailMeta(prev);
  const prevText = JSON.stringify(prev, null, 2) + "\n";
  const nextText = JSON.stringify(next, null, 2) + "\n";
  if (prevText !== nextText) {
    stats.metaChanged += 1;
    if (write) await fs.writeFile(metaPath, nextText, "utf8");
    process.stdout.write(`[${write ? "write" : "dry"}] ${metaPath}\n`);
  }
}

function stripLegacyMetaFromGeneratorSource(source) {
  let next = source;
  next = next.replace(/\n\s*status:\s*"draft",/g, "");
  next = next.replace(/\n\s*designSource:\s*\{[^}]+\},?/g, "");
  next = next.replace(
    /\n\s*designSource:\s*\{\n\s*type:\s*"[^"]+",\n\s*url:\s*"[^"]*",\n\s*\},?/g,
    ""
  );
  return next;
}

async function migrateGeneratorScripts() {
  const names = await fs.readdir(SCRIPTS_DIR);
  const targets = names.filter(
    (n) =>
      n.endsWith(".mjs") &&
      (n.startsWith("build-email-") || n === "scaffold-made-in-england-gift.mjs" || n === "build-align-inspector-test-email.mjs")
  );
  for (const name of targets) {
    const filePath = path.join(SCRIPTS_DIR, name);
    const raw = await fs.readFile(filePath, "utf8");
    if (!raw.includes("status:") && !raw.includes("designSource:")) continue;
    stats.generators += 1;
    const next = stripLegacyMetaFromGeneratorSource(raw);
    if (next !== raw) {
      stats.generatorsChanged += 1;
      if (write) await fs.writeFile(filePath, next, "utf8");
      process.stdout.write(`[${write ? "write" : "dry"}] ${filePath}\n`);
    }
  }
}

async function main() {
  for (const metaPath of await listMetaFiles()) {
    await migrateMetaFile(metaPath);
  }
  await migrateGeneratorScripts();
  process.stdout.write(
    `\nmeta: ${stats.metaFiles}  scanned, ${stats.metaChanged} changed; generators: ${stats.generators} touched, ${stats.generatorsChanged} changed${write ? "" : " (dry-run, pass --write)"}\n`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
