#!/usr/bin/env node
/**
 * 废弃画布根字体与 text.fontMode:inherit：
 * - emailRoot 移除 fontFamily / headingFontFamily / bodyFontFamily 及对应 bindings
 * - text 移除 fontMode；缺 fontFamily 时补 fonts.body
 * - button 补 buttonStyle.fontFamily → fonts.body
 *
 * 用法：node scripts/migrate-deprecate-root-fonts.mjs --write
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");

const ROOT_FONT_KEYS = ["fontFamily", "headingFontFamily", "bodyFontFamily"];
const ROOT_FONT_BINDINGS = ROOT_FONT_KEYS.map((k) => `props.${k}`);
const FONT_BODY_REF = { $themeRef: "fonts.body" };
const FONT_BODY_BINDING = {
  slotId: "fonts.body",
  mode: "theme",
  tokenPath: "fonts.body",
  fieldKind: "style",
};

function walkJsonFiles(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walkJsonFiles(p));
    else if (name.endsWith(".json") && !name.startsWith("_")) out.push(p);
  }
  return out;
}

function migrateDocument(data) {
  const blocks = data.blocks;
  if (!blocks || typeof blocks !== "object") return false;
  let changed = false;

  for (const block of Object.values(blocks)) {
    if (!block || typeof block !== "object") continue;

    if (block.type === "emailRoot" && block.props) {
      for (const key of ROOT_FONT_KEYS) {
        if (key in block.props) {
          delete block.props[key];
          changed = true;
        }
      }
      if (block.bindings) {
        for (const path of ROOT_FONT_BINDINGS) {
          if (path in block.bindings) {
            delete block.bindings[path];
            changed = true;
          }
        }
      }
    }

    if (block.type === "text" && block.props) {
      if ("fontMode" in block.props) {
        delete block.props.fontMode;
        changed = true;
      }
      const ff = block.props.fontFamily;
      const hasFont =
        (typeof ff === "string" && ff.trim()) ||
        (ff && typeof ff === "object" && typeof ff.$themeRef === "string");
      if (!hasFont) {
        block.props.fontFamily = { ...FONT_BODY_REF };
        block.bindings = { ...(block.bindings ?? {}) };
        if (!block.bindings["props.fontFamily"]) {
          block.bindings["props.fontFamily"] = { ...FONT_BODY_BINDING };
          changed = true;
        }
      }
    }

    if (block.type === "button") {
      const props = (block.props = block.props ?? {});
      const bs = (props.buttonStyle =
        props.buttonStyle && typeof props.buttonStyle === "object" ? props.buttonStyle : {});
      const ff = bs.fontFamily;
      const hasFont =
        (typeof ff === "string" && ff.trim()) ||
        (ff && typeof ff === "object" && typeof ff.$themeRef === "string");
      if (!hasFont) {
        bs.fontFamily = { ...FONT_BODY_REF };
        block.bindings = { ...(block.bindings ?? {}) };
        if (!block.bindings["props.buttonStyle.fontFamily"]) {
          block.bindings["props.buttonStyle.fontFamily"] = { ...FONT_BODY_BINDING };
        }
        changed = true;
      }
    }
  }

  return changed;
}

const targets = [
  ...walkJsonFiles(join(REPO, "data", "emails")).filter((p) => p.endsWith("template.json")),
  ...walkJsonFiles(join(REPO, "data", "masters")),
];

let touched = 0;
for (const filePath of targets) {
  const raw = readFileSync(filePath, "utf8");
  const data = JSON.parse(raw);
  if (!migrateDocument(data)) continue;
  touched += 1;
  const label = filePath.replace(`${REPO}/`, "");
  console.log(`[touch] ${label}`);
  if (WRITE) writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

console.log(
  WRITE ? `完成：已更新 ${touched} 个文件` : `dry-run：将更新 ${touched} 个文件（加 --write 写入）`
);
