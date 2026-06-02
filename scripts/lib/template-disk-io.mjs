/**
 * 脚本层统一 template / 母版 JSON 读写：经 templateTreeAdapter 展开/序列化为 nested 4.0.0。
 */
import { readFileSync, writeFileSync } from "node:fs";
import {
  nestedMasterToEditorGraph,
  nestedMasterToEditorMaster,
  parseMasterFromDisk,
  parseTemplateFromDisk,
  serializeEditorMasterToDisk,
  serializeTemplateToDisk,
} from "../../src/lib/templateTreeAdapter.ts";

export function readJsonFromPath(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

/** @returns {{ graph: import("../../src/types/email").EmailTemplate, ctx: { isMaster: boolean, raw: unknown } }} */
export function readTemplateDisk(path) {
  const raw = readJsonFromPath(path);
  const isMaster =
    typeof raw?.masterId === "string" &&
    typeof raw?.catalogRootBlockId === "string" &&
    !raw?.emailId;
  if (isMaster) {
    const master = parseMasterFromDisk(raw);
    return { graph: nestedMasterToEditorGraph(master), ctx: { isMaster: true, raw } };
  }
  return { graph: parseTemplateFromDisk(raw), ctx: { isMaster: false, raw } };
}

/** @param {import("../../src/types/email").EmailTemplate} graph */
export function writeTemplateDisk(path, graph, ctx) {
  if (ctx?.isMaster) {
    const editorMaster = nestedMasterToEditorMaster(parseMasterFromDisk(ctx.raw));
    editorMaster.blocks = graph.blocks;
    editorMaster.blockMeta = graph.blockMeta;
    writeFileSync(path, `${JSON.stringify(serializeEditorMasterToDisk(editorMaster), null, 2)}\n`, "utf8");
    return;
  }
  writeFileSync(path, `${JSON.stringify(serializeTemplateToDisk(graph), null, 2)}\n`, "utf8");
}

/** 内存 EditorBlockGraph → nested 落盘 JSON（build 脚本写盘用） */
export function graphToDiskJson(graph) {
  return serializeTemplateToDisk(graph);
}
