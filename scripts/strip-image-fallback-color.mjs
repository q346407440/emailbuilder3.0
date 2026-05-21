#!/usr/bin/env node
/**
 * 从邮件 template 与母版 JSON 中移除 wrapperStyle.backgroundImage.fallbackColor 及对应 bindings。
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

function walkJsonFiles(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkJsonFiles(p, acc);
    else if (name.endsWith(".json")) acc.push(p);
  }
  return acc;
}

function stripDocument(doc) {
  let changed = 0;
  const blocks = doc.blocks;
  if (!blocks || typeof blocks !== "object") return changed;

  for (const block of Object.values(blocks)) {
    if (!block || typeof block !== "object") continue;
    const bg = block.wrapperStyle?.backgroundImage;
    if (bg && typeof bg === "object" && "fallbackColor" in bg) {
      delete bg.fallbackColor;
      changed += 1;
    }
    const bindings = block.bindings;
    if (bindings && typeof bindings === "object") {
      for (const key of Object.keys(bindings)) {
        if (key === "wrapperStyle.backgroundImage.fallbackColor" || key.endsWith(".fallbackColor")) {
          delete bindings[key];
          changed += 1;
        }
      }
    }
  }

  if (Array.isArray(doc.scopes)) {
    for (const scope of doc.scopes) {
      if (!scope?.fields) continue;
      const before = scope.fields.length;
      scope.fields = scope.fields.filter(
        (f) =>
          f?.target?.path !== "wrapperStyle.backgroundImage.fallbackColor" &&
          !String(f?.key ?? "").includes("fallbackColor")
      );
      if (scope.fields.length !== before) changed += before - scope.fields.length;
    }
  }

  if (doc.configSchema?.scopes) {
    for (const scope of doc.configSchema.scopes) {
      if (!scope?.fields) continue;
      const before = scope.fields.length;
      scope.fields = scope.fields.filter(
        (f) =>
          f?.target?.path !== "wrapperStyle.backgroundImage.fallbackColor" &&
          !String(f?.key ?? "").includes("fallbackColor")
      );
      if (scope.fields.length !== before) changed += before - scope.fields.length;
    }
  }

  return changed;
}

const targets = [
  ...walkJsonFiles(join(ROOT, "data", "emails")),
  ...walkJsonFiles(join(ROOT, "data", "masters")),
];

let files = 0;
let edits = 0;
for (const filePath of targets) {
  const raw = readFileSync(filePath, "utf8");
  const doc = JSON.parse(raw);
  const n = stripDocument(doc);
  if (n > 0) {
    writeFileSync(filePath, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
    files += 1;
    edits += n;
    console.log(`已清理 ${filePath}（${n} 处）`);
  }
}

console.log(`完成：${files} 个文件，共 ${edits} 处。`);
