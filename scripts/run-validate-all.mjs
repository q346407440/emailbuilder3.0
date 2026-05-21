#!/usr/bin/env node
/**
 * 一键回归校验：
 *  1. 跑 lib 层单测（含 validate / textBody 等）
 *  2. 对 data/emails/<id>/ legacy 或 layouts/<variant>/ template 跑 validateTemplate
 *  3. 对同目录 payload.json 跑 validatePayloadAgainstTemplate（版式场景对每个版式 template 校验）
 *  4. 校验 configSchema.json / tokenPresets.json
 *  5. 校验 data/token-presets/*.json（公共样式预设）
 *  6. 跑 template-yaml:golden（防止 YAML 夹具展开输出与 expected 漂移）
 *
 * 任一步失败则非零退出。
 *
 * 日常开发可缩小范围（比全量快很多）：
 *   npm run validate:all -- --email member-welcome --skip-unit --skip-yaml --skip-public-presets
 *   npm run validate:email -- member-welcome
 *
 * 选项：
 *   --email <id>              只校验 data/emails/<id>/
 *   --skip-unit               跳过 npm run test:unit
 *   --skip-yaml               跳过 template-yaml:golden
 *   --skip-public-presets     跳过 data/token-presets/*.json
 *   -h, --help
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { validateTemplate, validatePayloadAgainstTemplate } from "../src/lib/validate.ts";
import { validateConfigSchema } from "../src/lib/validateConfigSchema.ts";
import { validateTokenPresets } from "../src/token-preset-contract/validate.ts";
import {
  allLayoutTemplatePaths,
  isLayoutManifestShape,
  validateLayoutManifest,
} from "../src/lib/emailLayoutVariant.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const EMAILS_DIR = join(REPO_ROOT, "data", "emails");
const PUBLIC_TOKEN_PRESETS_DIR = join(REPO_ROOT, "data", "token-presets");

/** @param {string[]} argv process.argv.slice(2) */
function parseCliArgs(argv) {
  const opts = {
    email: null,
    skipUnit: false,
    skipYaml: false,
    skipPublicPresets: false,
    help: false,
  };
  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") opts.help = true;
    else if (arg === "--skip-unit") opts.skipUnit = true;
    else if (arg === "--skip-yaml") opts.skipYaml = true;
    else if (arg === "--skip-public-presets") opts.skipPublicPresets = true;
    else if (arg.startsWith("--email=")) opts.email = arg.slice("--email=".length).trim() || null;
    else if (!arg.startsWith("-")) opts.email = arg.trim() || opts.email;
  }
  return opts;
}

function printHelp() {
  process.stdout.write(`用法: npm run validate:all [-- 选项] [emailKey]

全量（默认）: npm run validate:all

只校验当前邮件（推荐日常）:
  npm run validate:email -- member-welcome

等价于:
  npm run validate:all -- --email member-welcome --skip-unit --skip-yaml --skip-public-presets

改 font-family-contract / validate.ts 时补跑单测:
  node --test --import tsx src/font-family-contract/*.test.ts src/token-preset-contract/*.test.ts

提交前仍须: npm run validate:all
`);
}

function listEmailDirs() {
  if (!statSync(EMAILS_DIR, { throwIfNoEntry: false })?.isDirectory()) return [];
  return readdirSync(EMAILS_DIR)
    .map((name) => join(EMAILS_DIR, name))
    .filter((p) => statSync(p).isDirectory());
}

function runStep(label, args) {
  process.stdout.write(`\n=== ${label} ===\n`);
  const r = spawnSync(args[0], args.slice(1), { cwd: REPO_ROOT, stdio: "inherit" });
  if ((r.status ?? 1) !== 0) {
    process.stderr.write(`[run-validate-all] 步骤失败：${label}\n`);
    process.exit(r.status ?? 1);
  }
}

function validateTemplateBundle(tplPath, configPath, tokenPath, label) {
  const issues = [];
  const tpl = JSON.parse(readFileSync(tplPath, "utf8"));
  issues.push(...validateTemplate(tpl));
  if (statSync(configPath, { throwIfNoEntry: false })?.isFile()) {
    const configSchema = JSON.parse(readFileSync(configPath, "utf8"));
    issues.push(...validateConfigSchema(configSchema, tpl));
  }
  if (statSync(tokenPath, { throwIfNoEntry: false })?.isFile()) {
    const tokenPresets = JSON.parse(readFileSync(tokenPath, "utf8"));
    issues.push(...validateTokenPresets(tokenPresets));
  }
  const errors = issues.filter((i) => i.level !== "warning");
  const warnings = issues.filter((i) => i.level === "warning");
  if (errors.length === 0) {
    process.stdout.write(`[ok]   ${label}\n`);
    for (const issue of warnings) {
      process.stdout.write(`        [warn] ${issue.path}: ${issue.reason}\n`);
    }
    return { ok: true, template: tpl };
  }
  process.stdout.write(`[fail] ${label}\n`);
  for (const issue of errors) {
    process.stdout.write(`        ${issue.path}: ${issue.reason}\n`);
  }
  for (const issue of warnings) {
    process.stdout.write(`        [warn] ${issue.path}: ${issue.reason}\n`);
  }
  return { ok: false, template: tpl };
}

function validatePayloadForTemplates(payloadPath, templates, labelPrefix) {
  const payload = JSON.parse(readFileSync(payloadPath, "utf8"));
  let failed = false;
  for (const { layoutVariantId, template } of templates) {
    const payloadIssues = validatePayloadAgainstTemplate(template, payload);
    const tag = layoutVariantId ? `${labelPrefix} (layout:${layoutVariantId})` : labelPrefix;
    if (payloadIssues.length === 0) {
      process.stdout.write(`[ok]   ${tag} payload\n`);
    } else {
      failed = true;
      process.stdout.write(`[fail] ${tag} payload\n`);
      for (const issue of payloadIssues) {
        process.stdout.write(`        ${issue.path}: ${issue.reason}\n`);
      }
    }
  }
  return !failed;
}

function validateAllTemplates(emailKey) {
  const scopeLabel = emailKey ? `data/emails/${emailKey}/**` : "data/emails/**";
  process.stdout.write(`\n=== validate ${scopeLabel} ===\n`);
  let dirs = listEmailDirs();
  if (emailKey) {
    const target = join(EMAILS_DIR, emailKey);
    dirs = dirs.filter((d) => d === target);
    if (dirs.length === 0) {
      process.stderr.write(`[run-validate-all] 未找到邮件场景：${emailKey}（目录 ${target}）\n`);
      process.exit(1);
    }
  }
  let failed = 0;
  for (const dir of dirs) {
    const manifestPath = join(dir, "layout-manifest.json");
    const payloadPath = join(dir, "payload.json");
    let manifest = null;
    try {
      manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    } catch {
      manifest = null;
    }

    if (manifest && isLayoutManifestShape(manifest)) {
      const manifestIssues = validateLayoutManifest(manifest);
      if (manifestIssues.length) {
        failed += 1;
        process.stdout.write(`[fail] ${manifestPath}\n`);
        for (const issue of manifestIssues) {
          process.stdout.write(`        ${issue.path}: ${issue.reason}\n`);
        }
        continue;
      }
      process.stdout.write(`[ok]   ${manifestPath}\n`);

      const templates = [];
      for (const { layoutVariantId, templatePath } of allLayoutTemplatePaths(dir, manifest)) {
        const configPath = join(dir, "layouts", layoutVariantId, "configSchema.json");
        const tokenPath = join(dir, "layouts", layoutVariantId, "tokenPresets.json");
        const bundle = validateTemplateBundle(
          templatePath,
          configPath,
          tokenPath,
          templatePath
        );
        if (!bundle.ok) {
          failed += 1;
          continue;
        }
        templates.push({ layoutVariantId, template: bundle.template });
      }

      try {
        if (!validatePayloadForTemplates(payloadPath, templates, dir)) failed += 1;
      } catch {
        process.stdout.write(`[skip] ${dir}: 无 payload.json\n`);
      }
      continue;
    }

    const tplPath = join(dir, "template.json");
    try {
      const bundle = validateTemplateBundle(
        tplPath,
        join(dir, "configSchema.json"),
        join(dir, "tokenPresets.json"),
        tplPath
      );
      if (!bundle.ok) {
        failed += 1;
        continue;
      }
      try {
        if (!validatePayloadForTemplates(payloadPath, [{ layoutVariantId: null, template: bundle.template }], dir)) {
          failed += 1;
        }
      } catch {
        process.stdout.write(`[skip] ${dir}: 无 payload.json\n`);
      }
    } catch {
      process.stdout.write(`[skip] ${dir}: 无 template.json\n`);
    }
  }
  if (failed > 0) {
    process.stderr.write(`[run-validate-all] ${failed} 个邮件场景校验失败\n`);
    process.exit(1);
  }
}

function validatePublicTokenPresets() {
  if (!statSync(PUBLIC_TOKEN_PRESETS_DIR, { throwIfNoEntry: false })?.isDirectory()) {
    return;
  }
  process.stdout.write("\n=== validate data/token-presets/*.json ===\n");
  let failed = 0;
  for (const name of readdirSync(PUBLIC_TOKEN_PRESETS_DIR).filter((n) => n.endsWith(".json"))) {
    const filePath = join(PUBLIC_TOKEN_PRESETS_DIR, name);
    const tokenPresets = JSON.parse(readFileSync(filePath, "utf8"));
    const issues = validateTokenPresets(tokenPresets);
    if (issues.length === 0) {
      process.stdout.write(`[ok]   ${filePath}\n`);
    } else {
      failed += 1;
      process.stdout.write(`[fail] ${filePath}\n`);
      for (const issue of issues) {
        process.stdout.write(`        ${issue.path}: ${issue.reason}\n`);
      }
    }
  }
  if (failed > 0) {
    process.stderr.write(`[run-validate-all] ${failed} 个公共样式预设校验失败\n`);
    process.exit(1);
  }
}

const cli = parseCliArgs(process.argv.slice(2));
if (cli.help) {
  printHelp();
  process.exit(0);
}

const scopeParts = [];
if (cli.email) scopeParts.push(`email=${cli.email}`);
if (cli.skipUnit) scopeParts.push("skip-unit");
if (cli.skipYaml) scopeParts.push("skip-yaml");
if (cli.skipPublicPresets) scopeParts.push("skip-public-presets");
if (scopeParts.length > 0) {
  process.stdout.write(`[run-validate-all] 范围：${scopeParts.join("，")}\n`);
}

if (!cli.skipUnit) {
  runStep("npm run test:unit", ["npm", "run", "test:unit"]);
}
validateAllTemplates(cli.email);
if (!cli.skipPublicPresets) {
  validatePublicTokenPresets();
}
if (!cli.skipYaml) {
  runStep("npm run template-yaml:golden", ["npm", "run", "template-yaml:golden"]);
}
process.stdout.write("\nvalidate:all 全部通过\n");
