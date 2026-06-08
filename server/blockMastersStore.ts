import fs from "node:fs/promises";
import path from "node:path";
import type { BlockMaster } from "../src/types/master";
import {
  applyInsertPrototypeToBlockMaster,
  validateBlockMasterForPersist,
} from "../src/lib/blockMasterInsertPrototype";
import type { BlockInsertPrototype } from "../src/block-insert-default-contract";
import { buildBlockMasters } from "../src/lib/masterCatalog";
import { nestedMasterToEditorMaster, serializeEditorMasterToDisk } from "../src/lib/templateTreeAdapter";
import { assertNestedMasterDisk } from "../src/template-disk-contract";
import type { NestedBlockMaster } from "../src/template-disk-contract/masters";
import { BLOCK_CATALOG_ENTRIES } from "../src/lib/blockDefaults";

export function resolveBlockMastersDir(projectRoot: string): string {
  return (
    process.env.BLOCK_MASTERS_ROOT?.trim() ||
    path.join(projectRoot, "data", "masters", "blocks")
  );
}

async function readMasterFile(filePath: string): Promise<BlockMaster> {
  const raw = JSON.parse(await fs.readFile(filePath, "utf8")) as unknown;
  const nested = assertNestedMasterDisk(raw) as NestedBlockMaster;
  return nestedMasterToEditorMaster(nested) as BlockMaster;
}

export async function listBlockMasters(projectRoot: string): Promise<BlockMaster[]> {
  const dir = resolveBlockMastersDir(projectRoot);
  let names: string[] = [];
  try {
    names = (await fs.readdir(dir)).filter((n) => n.endsWith(".json"));
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return buildBlockMasters();
    throw e;
  }
  if (names.length === 0) return buildBlockMasters();

  const masters: BlockMaster[] = [];
  for (const name of names.sort()) {
    masters.push(await readMasterFile(path.join(dir, name)));
  }
  return masters;
}

export async function getBlockMaster(
  projectRoot: string,
  masterId: string
): Promise<BlockMaster | null> {
  const safe = masterId.trim();
  if (!safe || safe.includes("..") || safe.includes("/")) return null;
  const filePath = path.join(resolveBlockMastersDir(projectRoot), `${safe}.json`);
  try {
    return await readMasterFile(filePath);
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw e;
  }
}

export async function putBlockMasterInsertPrototype(
  projectRoot: string,
  masterId: string,
  prototype: BlockInsertPrototype
): Promise<BlockMaster> {
  const entry = BLOCK_CATALOG_ENTRIES.find((e) => e.masterId === masterId);
  if (!entry) {
    throw new Error(`未知组件母版：${masterId}`);
  }

  let master = await getBlockMaster(projectRoot, masterId);
  if (!master) {
    master = buildBlockMasters().find((m) => m.masterId === masterId) ?? null;
  }
  if (!master) {
    throw new Error(`无法加载组件母版：${masterId}`);
  }

  const next = applyInsertPrototypeToBlockMaster(master, prototype);
  next.version = new Date().toISOString();

  const issues = validateBlockMasterForPersist(next);
  if (issues.length > 0) {
    const detail = issues
      .slice(0, 8)
      .map((i) => `${i.path} ${i.reason}`)
      .join("; ");
    throw new Error(`母版校验未通过：${detail}`);
  }

  const dir = resolveBlockMastersDir(projectRoot);
  await fs.mkdir(dir, { recursive: true });
  const wire = serializeEditorMasterToDisk(next);
  await fs.writeFile(
    path.join(dir, `${masterId}.json`),
    `${JSON.stringify(wire, null, 2)}\n`,
    "utf8"
  );
  return next;
}
