#!/usr/bin/env node
/**
 * 列表重复「绑哪层复制哪层」统一迁移：把旧版「宿主复制其单个子级」(prototypeChildIds=[child])
 * 改为「子级自复制」(把 repeat 下移到该子级，prototypeChildIds=[self]、fallbackChildIds=[self])。
 *
 * 适配新模型：repeat 永远写在被复制的容器自身上。嵌套(itemPath)同理逐层下移。
 *
 * 用法：node scripts/migrate-repeat-self-host.mjs [--write]
 */
import { globSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readTemplateDisk, writeTemplateDisk } from "../../lib/template-disk-io.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../../..");
const WRITE = process.argv.includes("--write");

const files = globSync("data/emails/*/layouts/*/template.json", { cwd: ROOT }).map((f) =>
  join(ROOT, f)
);

let totalMoved = 0;
const report = [];

for (const file of files) {
  const { graph, ctx } = readTemplateDisk(file);
  const blocks = graph.blocks ?? {};
  const moves = [];

  for (const [hostId, host] of Object.entries(blocks)) {
    const repeat = host?.repeat;
    if (!repeat || repeat.mode !== "collection") continue;
    const proto = repeat.prototypeChildIds ?? [];
    // 已是 self-repeat：跳过
    if (proto.length === 1 && proto[0] === hostId) continue;
    if (proto.length !== 1) {
      report.push(`! ${file}: ${hostId} prototypeChildIds 非单子级(${JSON.stringify(proto)})，跳过`);
      continue;
    }
    const childId = proto[0];
    const child = blocks[childId];
    if (!child) {
      report.push(`! ${file}: ${hostId} 原型子级 ${childId} 不存在，跳过`);
      continue;
    }
    if (!(host.children ?? []).includes(childId)) {
      report.push(`! ${file}: ${hostId} 原型 ${childId} 非直接子级，跳过`);
      continue;
    }
    if (child.repeat) {
      report.push(`! ${file}: 子级 ${childId} 已有 repeat，跳过`);
      continue;
    }
    moves.push({ hostId, childId });
  }

  if (moves.length === 0) continue;

  for (const { hostId, childId } of moves) {
    const host = blocks[hostId];
    const child = blocks[childId];
    child.repeat = {
      ...host.repeat,
      prototypeChildIds: [childId],
      fallbackChildIds: [childId],
    };
    delete host.repeat;
    totalMoved += 1;
    report.push(`  ${shortFile(file)}: repeat ${hostId} → ${childId}（self）`);
  }

  if (WRITE) {
    writeTemplateDisk(file, graph, ctx);
  }
}

function shortFile(f) {
  return f.replace(`${ROOT}/`, "");
}

console.log(`${WRITE ? "写入" : "预览"}：下移 ${totalMoved} 处 repeat 为 self-repeat`);
for (const line of report) console.log(line);
