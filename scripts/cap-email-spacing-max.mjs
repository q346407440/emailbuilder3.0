#!/usr/bin/env node
/**
 * 将 spacing 标准键与 layout/emailRoot 容器 padding 压到 ≤24px（见 src/lib/spacingPxCap.ts）。
 * 用法：npx tsx scripts/cap-email-spacing-max.mjs [--write]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  EMAIL_CONTAINER_SPACING_MAX_PX,
  clampSpacingPxString,
  spacingPxExceedsMax,
} from "../src/lib/spacingPxCap.ts";
import { listEmailTemplatePaths } from "./lib/list-email-template-paths.mjs";
import { normalizeTokenPresetTokens } from "./lib/token-preset-standard-order.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, "..");
const EMAILS = path.join(REPO, "data", "emails");
const PUBLIC_PRESETS = path.join(REPO, "data", "token-presets");
const write = process.argv.includes("--write");

function capTokenPresetsFile(filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  let changed = false;
  for (const preset of Object.values(raw.presets ?? {})) {
    const spacing = preset?.tokens?.spacing;
    if (!spacing || typeof spacing !== "object") continue;
    for (const key of ["section", "gap", "pageInline"]) {
      if (typeof spacing[key] !== "string") continue;
      if (!spacingPxExceedsMax(spacing[key])) continue;
      const next = clampSpacingPxString(spacing[key]);
      if (next && next !== spacing[key]) {
        spacing[key] = next;
        changed = true;
      }
    }
    if (preset.tokens) {
      preset.tokens = normalizeTokenPresetTokens(preset.tokens);
    }
  }
  if (changed && write) {
    fs.writeFileSync(filePath, `${JSON.stringify(raw, null, 2)}\n`, "utf8");
  }
  return changed;
}

function capPaddingValue(val) {
  if (val == null) return { val, changed: false };
  if (typeof val === "string" || typeof val === "object") {
    if (typeof val === "object" && val.$themeRef) return { val, changed: false };
    const s = typeof val === "string" ? val : String(val);
    if (!spacingPxExceedsMax(s)) return { val, changed: false };
    const next = clampSpacingPxString(s);
    return { val: next ?? val, changed: true };
  }
  return { val, changed: false };
}

function capPaddingObject(pad) {
  if (!pad || typeof pad !== "object") return { pad, changed: false };
  let changed = false;
  if (pad.mode === "unified") {
    const r = capPaddingValue(pad.unified);
    if (r.changed) {
      pad.unified = r.val;
      changed = true;
    }
    return { pad, changed };
  }
  if (pad.mode === "separate") {
    for (const side of ["top", "right", "bottom", "left"]) {
      const r = capPaddingValue(pad[side]);
      if (r.changed) {
        pad[side] = r.val;
        changed = true;
      }
    }
  }
  return { pad, changed };
}

function capTemplateFile(tplPath) {
  const tpl = JSON.parse(fs.readFileSync(tplPath, "utf8"));
  let changed = false;
  for (const block of Object.values(tpl.blocks ?? {})) {
    if (block.type !== "layout" && block.type !== "emailRoot") continue;
    for (const bag of [block.wrapperStyle, block.props]) {
      if (!bag?.padding) continue;
      const r = capPaddingObject(bag.padding);
      if (r.changed) changed = true;
    }
  }
  if (changed && write) {
    fs.writeFileSync(tplPath, `${JSON.stringify(tpl, null, 2)}\n`, "utf8");
  }
  return changed;
}

const touched = [];

for (const dir of [EMAILS, PUBLIC_PRESETS]) {
  if (!fs.existsSync(dir)) continue;
  const walk = (base) => {
    for (const name of fs.readdirSync(base)) {
      const p = path.join(base, name);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (name === "tokenPresets.json" && capTokenPresetsFile(p)) {
        touched.push(path.relative(REPO, p));
      }
    }
  };
  walk(dir);
}

for (const tplPath of listEmailTemplatePaths(EMAILS)) {
  if (capTemplateFile(tplPath)) touched.push(path.relative(REPO, tplPath));
}

console.log(
  `\n${write ? "已压限" : "将压限"} ${touched.length} 个文件（容器间距 ≤${EMAIL_CONTAINER_SPACING_MAX_PX}px）`
);
for (const f of touched) console.log(`  · ${f}`);
if (!write && touched.length) {
  console.log("\n执行：npx tsx scripts/cap-email-spacing-max.mjs --write");
} else if (write && touched.length) {
  console.log("\n请运行：npm run validate:all");
}
