#!/usr/bin/env npx tsx
/**
 * 将不可配轴上的 contentAlign 回落为中性值（left / top），与 contentAlignConfigurability 真源一致。
 *
 * 用法：
 *   npx tsx scripts/migrate-content-align-hug-neutral.ts              # 干跑
 *   npx tsx scripts/migrate-content-align-hug-neutral.ts --write    # 写回
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { EmailTemplate } from "../../../src/types/email";
import type { BlockMaster, SectionMaster } from "../../../src/types/master";
import { enumerateAllEmailTemplatePaths } from "../../../src/lib/emailLayoutVariant";
import { normalizeTemplateContentAlignEffectiveness } from "../../../src/lib/contentAlignConfigurability";
import {
  nestedMasterToEditorGraph,
  nestedMasterToEditorMaster,
  parseMasterFromDisk,
  parseTemplateFromDisk,
  serializeEditorMasterToDisk,
  serializeTemplateToDisk,
} from "../../../src/lib/templateTreeAdapter";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../..");
const EMAILS_DIR = join(REPO_ROOT, "data", "emails");
const MASTERS_DIR = join(REPO_ROOT, "data", "masters");
const write = process.argv.includes("--write");
const explicit = process.argv.filter((a) => !a.startsWith("--") && a.endsWith(".json"));

function listMasterJsonPaths(): string[] {
  const out: string[] = [];
  for (const sub of ["blocks", "sections"] as const) {
    const dir = join(MASTERS_DIR, sub);
    try {
      for (const name of readdirSync(dir)) {
        if (name.endsWith(".json")) out.push(join(dir, name));
      }
    } catch {
      /* skip */
    }
  }
  return out;
}

function listTemplatePaths(): string[] {
  if (explicit.length > 0) {
    return explicit.map((f) => resolve(process.cwd(), f));
  }
  return [...enumerateAllEmailTemplatePaths(EMAILS_DIR), ...listMasterJsonPaths()];
}

function readGraph(
  tplPath: string,
  raw: EmailTemplate | BlockMaster | SectionMaster
): { graph: EmailTemplate; isMaster: boolean; raw: BlockMaster | SectionMaster | EmailTemplate } {
  const isMaster =
    typeof (raw as BlockMaster).masterId === "string" &&
    typeof (raw as BlockMaster).catalogRootBlockId === "string" &&
    !(raw as EmailTemplate).emailId;
  if (isMaster) {
    const master = parseMasterFromDisk(raw);
    return {
      graph: nestedMasterToEditorGraph(master),
      isMaster: true,
      raw: raw as BlockMaster | SectionMaster,
    };
  }
  return { graph: parseTemplateFromDisk(raw), isMaster: false, raw: raw as EmailTemplate };
}

function writeGraph(
  tplPath: string,
  graph: EmailTemplate,
  isMaster: boolean,
  raw: BlockMaster | SectionMaster | EmailTemplate
): void {
  if (isMaster) {
    const editorMaster = nestedMasterToEditorMaster(parseMasterFromDisk(raw));
    editorMaster.blocks = graph.blocks;
    editorMaster.blockMeta = graph.blockMeta;
    writeFileSync(tplPath, `${JSON.stringify(serializeEditorMasterToDisk(editorMaster), null, 2)}\n`, "utf8");
    return;
  }
  writeFileSync(tplPath, `${JSON.stringify(serializeTemplateToDisk(graph), null, 2)}\n`, "utf8");
}

let changedFiles = 0;
for (const tplPath of listTemplatePaths()) {
  const raw = JSON.parse(readFileSync(tplPath, "utf8")) as
    | EmailTemplate
    | BlockMaster
    | SectionMaster;
  const { graph, isMaster } = readGraph(tplPath, raw);
  const { template: next, changes } = normalizeTemplateContentAlignEffectiveness(graph);
  if (changes.length === 0) {
    console.log(`[skip] ${tplPath}`);
    continue;
  }
  changedFiles += 1;
  console.log(`[${write ? "write" : "dry"}] ${tplPath} (${changes.length} 轴修正)`);
  if (write) {
    writeGraph(tplPath, next, isMaster, raw);
  }
}

console.log("");
console.log(
  `扫描 ${listTemplatePaths().length} 个 template，${write ? "已修改" : "待修改"} ${changedFiles} 个。未加 --write 时为干跑。`
);
if (changedFiles > 0 && !write) {
  process.exitCode = 1;
}
