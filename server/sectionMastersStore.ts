import fs from "node:fs/promises";
import path from "node:path";
import type { SectionMaster } from "../src/types/master";
import { collectMasterValidationIssues } from "../src/lib/masterCatalog";
import {
  isLogicallyDeleted,
  logicalDeleteTimestamp,
} from "../src/lib/logicalDelete";
import {
  nestedMasterToEditorMaster,
  serializeEditorMasterToDisk,
} from "../src/lib/templateTreeAdapter";
import { assertNestedMasterDisk } from "../src/template-disk-contract";
import {
  isNestedSectionMaster,
  type NestedSectionMaster,
} from "../src/template-disk-contract/masters";

export function resolveSectionMastersDir(projectRoot: string): string {
  return (
    process.env.SECTION_MASTERS_ROOT?.trim() ||
    path.join(projectRoot, "data", "masters", "sections")
  );
}

async function readSectionMasterFile(filePath: string): Promise<SectionMaster> {
  const raw = JSON.parse(await fs.readFile(filePath, "utf8")) as unknown;
  const nested = assertNestedMasterDisk(raw);
  if (!isNestedSectionMaster(nested)) {
    throw new Error("不是 section 母版文件");
  }
  return nestedMasterToEditorMaster(nested) as SectionMaster;
}

export async function listSectionMasters(projectRoot: string): Promise<SectionMaster[]> {
  const dir = resolveSectionMastersDir(projectRoot);
  let names: string[] = [];
  try {
    names = (await fs.readdir(dir)).filter((n) => n.endsWith(".json"));
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return [];
    throw e;
  }

  const masters: SectionMaster[] = [];
  for (const name of names.sort()) {
    const master = await readSectionMasterFile(path.join(dir, name));
    if (!isLogicallyDeleted(master)) {
      masters.push(master);
    }
  }
  return masters;
}

/** 含已逻辑删除记录（按 masterId 查落盘文件）。 */
export async function getSectionMaster(
  projectRoot: string,
  masterId: string
): Promise<SectionMaster | null> {
  const safe = masterId.trim();
  if (!safe || safe.includes("..") || safe.includes("/")) return null;
  const filePath = path.join(resolveSectionMastersDir(projectRoot), `${safe}.json`);
  try {
    const master = await readSectionMasterFile(filePath);
    if (isLogicallyDeleted(master)) return null;
    return master;
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw e;
  }
}

async function getSectionMasterIncludingDeleted(
  projectRoot: string,
  masterId: string
): Promise<SectionMaster | null> {
  const safe = masterId.trim();
  if (!safe || safe.includes("..") || safe.includes("/")) return null;
  const filePath = path.join(resolveSectionMastersDir(projectRoot), `${safe}.json`);
  try {
    return await readSectionMasterFile(filePath);
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw e;
  }
}

function validateForPersist(master: SectionMaster): void {
  const issues = collectMasterValidationIssues(master);
  if (issues.length > 0) {
    const detail = issues
      .slice(0, 8)
      .map((i) => `${i.path} ${i.reason}`)
      .join("; ");
    throw new Error(`模块校验未通过：${detail}`);
  }
}

async function writeSectionMaster(projectRoot: string, master: SectionMaster): Promise<SectionMaster> {
  validateForPersist(master);
  const dir = resolveSectionMastersDir(projectRoot);
  await fs.mkdir(dir, { recursive: true });
  const wire = serializeEditorMasterToDisk(master);
  await fs.writeFile(
    path.join(dir, `${master.masterId}.json`),
    `${JSON.stringify(wire, null, 2)}\n`,
    "utf8"
  );
  return master;
}

export async function createSectionMaster(
  projectRoot: string,
  master: SectionMaster
): Promise<SectionMaster> {
  const existing = await getSectionMasterIncludingDeleted(projectRoot, master.masterId);
  if (existing && !isLogicallyDeleted(existing)) {
    throw new Error(`模块 id 已存在：${master.masterId}`);
  }
  const next: SectionMaster = {
    ...master,
    version: new Date().toISOString(),
  };
  delete next.deletedAt;
  return writeSectionMaster(projectRoot, next);
}

export async function updateSectionMasterName(
  projectRoot: string,
  masterId: string,
  name: string
): Promise<SectionMaster> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("模块名称不能为空");
  }
  const master = await getSectionMaster(projectRoot, masterId);
  if (!master) {
    throw new Error("模块不存在");
  }
  return writeSectionMaster(projectRoot, {
    ...master,
    name: trimmed,
    version: new Date().toISOString(),
  });
}

/** 逻辑删除：写入 deletedAt，保留落盘文件；已插入版式中的实例不受影响。 */
export async function deleteSectionMaster(projectRoot: string, masterId: string): Promise<void> {
  const master = await getSectionMasterIncludingDeleted(projectRoot, masterId);
  if (!master) {
    throw new Error("模块不存在");
  }
  if (isLogicallyDeleted(master)) {
    return;
  }
  await writeSectionMaster(projectRoot, {
    ...master,
    deletedAt: logicalDeleteTimestamp(),
    version: new Date().toISOString(),
  });
}
