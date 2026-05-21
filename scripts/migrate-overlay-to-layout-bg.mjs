#!/usr/bin/env node
/**
 * 一次性迁移：type=overlay → layout + wrapperStyle.backgroundImage
 * 用法：node scripts/migrate-overlay-to-layout-bg.mjs --write
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function collectTemplatePaths(emailsDir) {
  const out = [];
  if (!existsSync(emailsDir)) return out;
  for (const name of readdirSync(emailsDir)) {
    const sub = join(emailsDir, name);
    if (!statSync(sub).isDirectory()) continue;
    const t = join(sub, "template.json");
    if (existsSync(t)) out.push(t);
  }
  return out;
}

function migrateOverlayBlock(block) {
  if (block.type !== "overlay") return block;
  const canvas = block.props?.canvas ?? {};
  const bg = block.props?.background ?? {};
  const ws = { ...(block.wrapperStyle && typeof block.wrapperStyle === "object" ? block.wrapperStyle : {}) };
  if (typeof canvas.height === "string" && canvas.height.trim() && canvas.height !== "auto") {
    ws.heightMode = "fixed";
    ws.height = canvas.height;
  }
  if (
    typeof canvas.width === "string" &&
    canvas.width.trim() &&
    canvas.width !== "auto" &&
    canvas.width !== "100%"
  ) {
    ws.widthMode = "fixed";
    ws.width = canvas.width;
  }
  ws.backgroundImage = {
    src: typeof bg.src === "string" ? bg.src : "",
    alt: typeof bg.alt === "string" ? bg.alt : "",
    link: typeof bg.link === "string" ? bg.link : "",
    fit: bg.sizeMode === "contain" ? "contain" : "cover",
    position: typeof bg.position === "string" ? bg.position : "center",
    borderRadius: typeof bg.borderRadius === "string" ? bg.borderRadius : "0",
    border: bg.border,
  };
  if (block.props?.contentAlign && typeof block.props.contentAlign === "object") {
    ws.backgroundContentAlign = block.props.contentAlign;
  }
  return {
    ...block,
    type: "layout",
    props: { gap: "0", direction: "vertical" },
    wrapperStyle: ws,
  };
}

function migrateTemplateJson(doc) {
  let changed = false;
  if (doc.blockTypeSystem?.types && Array.isArray(doc.blockTypeSystem.types)) {
    const nextTypes = doc.blockTypeSystem.types.filter((t) => t !== "layout.overlay");
    if (nextTypes.length !== doc.blockTypeSystem.types.length) {
      doc.blockTypeSystem.types = nextTypes;
      changed = true;
    }
  }
  if (doc.blockMeta && typeof doc.blockMeta === "object") {
    for (const [bid, meta] of Object.entries(doc.blockMeta)) {
      if (meta?.blockType === "layout.overlay") {
        doc.blockMeta[bid] = { ...meta, blockType: "layout.container" };
        if (typeof meta.name === "string") {
          doc.blockMeta[bid].name = meta.name.replace(/（可叠加）$/, "");
        }
        changed = true;
      }
    }
  }
  if (doc.blocks && typeof doc.blocks === "object") {
    for (const [bid, block] of Object.entries(doc.blocks)) {
      if (block?.type === "overlay") {
        doc.blocks[bid] = migrateOverlayBlock(block);
        changed = true;
      }
    }
  }
  return changed;
}

const write = process.argv.includes("--write");
const paths = [
  ...collectTemplatePaths(join(ROOT, "data/emails")),
  join(ROOT, "tests/fixtures/email-template-yaml/golden-minimal.expected.json"),
];

for (const p of paths) {
  let raw;
  try {
    raw = readFileSync(p, "utf8");
  } catch {
    continue;
  }
  const doc = JSON.parse(raw);
  const changed = migrateTemplateJson(doc);
  if (!changed) continue;
  const out = `${JSON.stringify(doc, null, 2)}\n`;
  if (write) {
    writeFileSync(p, out, "utf8");
    console.log("updated", p);
  } else {
    console.log("would update", p);
  }
}

if (!write) {
  console.log("Dry run. Pass --write to apply.");
}
