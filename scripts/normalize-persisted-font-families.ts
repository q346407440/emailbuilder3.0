#!/usr/bin/env tsx
/**
 * 收敛 tokenPresets.json 与 template.json 中落盘的字体为单一主字体（禁止 CSS 字体栈）。
 *
 * 用法：tsx scripts/normalize-persisted-font-families.ts [--write]
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeTokenPresetFontStorageValue } from "../src/lib/emailFontFamily";
import type { EmailBlock, EmailTemplate } from "../src/types/email";
import type { TokenPresets } from "../src/types/tokenPreset";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");

function walkFiles(dir: string, fileName: string): string[] {
  const out: string[] = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walkFiles(p, fileName));
    else if (name === fileName) out.push(p);
  }
  return out;
}

function normalizeTokenPresetFile(filePath: string): string[] {
  const rel = filePath.replace(`${REPO}/`, "");
  const doc = JSON.parse(readFileSync(filePath, "utf8")) as TokenPresets;
  const changes: string[] = [];

  for (const [presetId, preset] of Object.entries(doc.presets ?? {})) {
    const fonts = preset.tokens?.fonts;
    if (!fonts) continue;
    for (const scale of ["heading", "body"] as const) {
      const value = fonts[scale];
      if (typeof value !== "string") continue;
      const next = normalizeTokenPresetFontStorageValue(value);
      if (!next || next === value) continue;
      fonts[scale] = next;
      changes.push(
        `${rel} presets.${presetId}.fonts.${scale}: ${JSON.stringify(value)} → ${JSON.stringify(next)}`
      );
    }
  }

  if (changes.length > 0 && WRITE) {
    writeFileSync(filePath, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
  }
  return changes;
}

const FONT_PATHS: Array<(block: EmailBlock) => unknown> = [
  (b) => (b.type === "text" ? b.props?.fontFamily : undefined),
  (b) =>
    b.type === "button"
      ? (b.props as { buttonStyle?: { fontFamily?: unknown } })?.buttonStyle?.fontFamily
      : undefined,
];

function normalizeTemplateFile(filePath: string): string[] {
  const rel = filePath.replace(`${REPO}/`, "");
  const doc = JSON.parse(readFileSync(filePath, "utf8")) as EmailTemplate;
  const changes: string[] = [];

  for (const [blockId, block] of Object.entries(doc.blocks ?? {})) {
    if (!block || typeof block !== "object") continue;
    for (const read of FONT_PATHS) {
      const value = read(block as EmailBlock);
      if (typeof value !== "string" || !value.includes(",")) continue;
      const next = normalizeTokenPresetFontStorageValue(value);
      if (!next || next === value) continue;
      if (block.type === "text" && block.props) {
        (block.props as { fontFamily: string }).fontFamily = next;
        changes.push(`${rel} blocks.${blockId}.props.fontFamily → ${JSON.stringify(next)}`);
      }
      if (block.type === "button") {
        const props = block.props as { buttonStyle?: { fontFamily?: string } };
        if (props.buttonStyle) {
          props.buttonStyle.fontFamily = next;
          changes.push(
            `${rel} blocks.${blockId}.props.buttonStyle.fontFamily → ${JSON.stringify(next)}`
          );
        }
      }
    }
  }

  if (changes.length > 0 && WRITE) {
    writeFileSync(filePath, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
  }
  return changes;
}

const tokenFiles = [
  ...walkFiles(join(REPO, "data", "emails"), "tokenPresets.json"),
  ...readdirSync(join(REPO, "data", "token-presets"))
    .filter((n) => n.endsWith(".json"))
    .map((n) => join(REPO, "data", "token-presets", n)),
];
const templateFiles = walkFiles(join(REPO, "data", "emails"), "template.json");

let total = 0;
for (const file of tokenFiles) {
  for (const line of normalizeTokenPresetFile(file)) {
    console.log(WRITE ? "[write]" : "[dry-run]", line);
    total += 1;
  }
}
for (const file of templateFiles) {
  for (const line of normalizeTemplateFile(file)) {
    console.log(WRITE ? "[write]" : "[dry-run]", line);
    total += 1;
  }
}

if (total === 0) {
  console.log("未发现需收敛的字体栈。");
} else if (!WRITE) {
  console.log(`\n共 ${total} 处；追加 --write 落盘。`);
}
