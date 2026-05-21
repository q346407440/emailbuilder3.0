#!/usr/bin/env node
/**
 * 检查并统一 layout / emailRoot 容器 padding：
 * 合法：四边相同，或左右相同且上下相同；否则四边改为解析后最小 px 对应的原值。
 *
 * 用法：npx tsx scripts/normalize-container-padding.mjs [--write]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listEmailTemplatePaths } from "./lib/list-email-template-paths.mjs";
import { resolveDesignTokens } from "../src/lib/resolveTokenPreset.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, "..");
const EMAILS = path.join(REPO, "data", "emails");
const write = process.argv.includes("--write");

function parsePx(raw) {
  if (raw == null) return NaN;
  const s = typeof raw === "string" ? raw : String(raw);
  const n = Number.parseFloat(s.replace(/px$/i, "").trim());
  return Number.isFinite(n) ? n : NaN;
}

function themeValue(theme, tokenPath) {
  if (!tokenPath?.startsWith("tokens.spacing.")) return undefined;
  const key = tokenPath.slice("tokens.spacing.".length);
  return theme.tokens.spacing[key];
}

function resolveSide(raw, theme) {
  if (raw == null) return { px: NaN, raw: undefined };
  if (typeof raw === "string") return { px: parsePx(raw), raw };
  if (typeof raw === "object" && raw.$themeRef) {
    const v = themeValue(theme, raw.$themeRef);
    return { px: parsePx(v), raw };
  }
  return { px: NaN, raw };
}

function paddingOk(px) {
  const { top, right, bottom, left } = px;
  const eq = (a, b) =>
    (Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 0.01) ||
    (!Number.isFinite(a) && !Number.isFinite(b));
  if (eq(top, right) && eq(top, bottom) && eq(top, left)) return true;
  if (eq(top, bottom) && eq(left, right)) return true;
  return false;
}

function pickMinSide(sides) {
  const entries = [
    ["top", sides.top],
    ["right", sides.right],
    ["bottom", sides.bottom],
    ["left", sides.left],
  ];
  let best = entries[0];
  for (const e of entries) {
    const bp = best[1].px;
    const ep = e[1].px;
    if (!Number.isFinite(bp) && Number.isFinite(ep)) best = e;
    else if (Number.isFinite(ep) && Number.isFinite(bp) && ep < bp) best = e;
  }
  return best[1].raw;
}

function syncPaddingBindings(block, pad) {
  if (!block.bindings || pad.mode !== "separate") return;
  const paths = [
    "wrapperStyle.padding.top",
    "wrapperStyle.padding.right",
    "wrapperStyle.padding.bottom",
    "wrapperStyle.padding.left",
    "props.padding.top",
    "props.padding.right",
    "props.padding.bottom",
    "props.padding.left",
  ];
  for (const bindPath of paths) {
    const spec = block.bindings[bindPath];
    if (!spec || spec.mode !== "theme") continue;
    const side = bindPath.includes(".top")
      ? "top"
      : bindPath.includes(".right")
        ? "right"
        : bindPath.includes(".bottom")
          ? "bottom"
          : "left";
    const sideRaw = pad[side];
    if (typeof sideRaw === "object" && sideRaw?.$themeRef) {
      spec.tokenPath = sideRaw.$themeRef;
      spec.slotId = sideRaw.$themeRef;
    }
  }
}

function normalizePaddingObject(pad, theme) {
  if (!pad || pad.mode === "unified") return { changed: false, pad };
  if (pad.mode !== "separate") return { changed: false, pad };

  const sides = {
    top: resolveSide(pad.top, theme),
    right: resolveSide(pad.right, theme),
    bottom: resolveSide(pad.bottom, theme),
    left: resolveSide(pad.left, theme),
  };
  const px = {
    top: sides.top.px,
    right: sides.right.px,
    bottom: sides.bottom.px,
    left: sides.left.px,
  };
  if (!Number.isFinite(px.top) && !Number.isFinite(px.right)) return { changed: false, pad };
  if (paddingOk(px)) return { changed: false, pad };

  const minRaw = pickMinSide(sides);
  if (minRaw === undefined) return { changed: false, pad };

  const next = {
    mode: "separate",
    top: structuredClone(minRaw),
    right: structuredClone(minRaw),
    bottom: structuredClone(minRaw),
    left: structuredClone(minRaw),
  };
  return { changed: true, pad: next };
}

function auditBlock(block, blockId, theme, issues, fixes) {
  const targets = [];
  if (block.wrapperStyle?.padding) targets.push(["wrapperStyle", block.wrapperStyle]);
  if (block.props?.padding) targets.push(["props", block.props]);

  for (const [where, bag] of targets) {
    const res = normalizePaddingObject(bag.padding, theme);
    if (!res.changed) {
      if (
        bag.padding?.mode === "separate" &&
        !paddingOk({
          top: resolveSide(bag.padding.top, theme).px,
          right: resolveSide(bag.padding.right, theme).px,
          bottom: resolveSide(bag.padding.bottom, theme).px,
          left: resolveSide(bag.padding.left, theme).px,
        })
      ) {
        /* unresolved px — skip */
      }
      continue;
    }
    const before = bag.padding;
    bag.padding = res.pad;
    syncPaddingBindings(block, res.pad);
    const label = `${blockId} (${block.type}) ${where}.padding`;
    issues.push(label);
    fixes.push({
      label,
      before: JSON.stringify(before),
      after: JSON.stringify(res.pad),
    });
  }
}

function processTemplate(tplPath) {
  const tpl = JSON.parse(fs.readFileSync(tplPath, "utf8"));
  const emailKey = tplPath.split(`${path.sep}data${path.sep}emails${path.sep}`)[1]?.split(path.sep)[0];
  const layoutDir = path.dirname(tplPath);
  const tokenPath = path.join(layoutDir, "tokenPresets.json");
  let tokenPresets = null;
  try {
    tokenPresets = JSON.parse(fs.readFileSync(tokenPath, "utf8"));
  } catch {
    tokenPresets = null;
  }
  const theme = resolveDesignTokens(tokenPresets);
  const issues = [];
  const fixes = [];

  for (const [blockId, block] of Object.entries(tpl.blocks ?? {})) {
    if (block.type !== "layout" && block.type !== "emailRoot") continue;
    auditBlock(block, blockId, theme, issues, fixes);
  }

  if (fixes.length && write) {
    fs.writeFileSync(tplPath, `${JSON.stringify(tpl, null, 2)}\n`, "utf8");
  }
  return { tplPath, emailKey, issues, fixes };
}

const paths = listEmailTemplatePaths(EMAILS);
let totalIssues = 0;
const report = [];

for (const tplPath of paths) {
  const r = processTemplate(tplPath);
  if (r.issues.length) {
    totalIssues += r.issues.length;
    report.push(r);
  }
}

console.log(`\n扫描 ${paths.length} 个 template，${totalIssues} 处 padding 不一致${write ? "（已写入）" : "（预览）"}\n`);
for (const r of report) {
  console.log(path.relative(REPO, r.tplPath));
  for (const f of r.fixes) {
    console.log(`  · ${f.label}`);
  }
}

if (!write && totalIssues > 0) {
  console.log("\n执行：npx tsx scripts/normalize-container-padding.mjs --write");
}

if (write && totalIssues > 0) {
  console.log("\n请运行：npm run validate:all");
}
