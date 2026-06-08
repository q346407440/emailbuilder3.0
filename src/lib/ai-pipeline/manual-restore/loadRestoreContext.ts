import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

const SKILL_FILES = [
  ".cursor/skills/email-template-restore-guide/SKILL.md",
  ".cursor/skills/email-template-restore-check/SKILL.md",
  ".cursor/skills/email-remote-asset-urls/SKILL.md",
  ".cursor/skills/email-token-preset-standard-scope/SKILL.md",
  ".cursor/skills/email-config-motherboard/SKILL.md",
];

const RULE_SNIPPETS = [
  ".cursor/rules/easy-email-source-first-contract.mdc",
  ".cursor/rules/easy-email-design-reuse.mdc",
];

function readTruncated(relPath: string, maxChars = 2200): string {
  const abs = path.join(REPO_ROOT, relPath);
  if (!fs.existsSync(abs)) return `（未找到 ${relPath}）`;
  const raw = fs.readFileSync(abs, "utf8");
  if (raw.length <= maxChars) return raw;
  return `${raw.slice(0, maxChars)}\n\n…（下文截断，完整见 ${relPath}）`;
}

/** @deprecated 仅旧版 prompts.ts 蓝图流程使用；豆包 mjs demo 已改 promptsApiFixedContext.ts 固定文案。 */
export function loadManualRestoreContext(): string {
  const parts: string[] = [
    "# 手工还原上下文包（模拟 Cursor Agent 固定加载的 skills / rules）\n",
  ];
  for (const rel of SKILL_FILES) {
    parts.push(`\n## ${rel}\n`, readTruncated(rel));
  }
  for (const rel of RULE_SNIPPETS) {
    parts.push(`\n## ${rel}\n`, readTruncated(rel, 2500));
  }
  parts.push(
    "\n## 参考实现（手工 mjs 模式）\n",
    "- 每封邮件一个 `scripts/generate-manual-XX-layout.mjs`",
    "- `sectionShell` + `buildS1..Sn` 对应设计图自上而下模块",
    "- 落盘：`meta.json`、`layout-manifest.json`、`payload.json`、`layouts/default/tokenPresets.json`、`template.json`",
    "- 图源 Pexels（程序搜或验证 URL）；图标 jsDelivr Tabler/Simple Icons（锁版本）",
    "- padding 四边不同必须用 `mode: separate`；禁止 CSS 多值简写如 `8px 12px`",
    "- 父级 widthMode hug 时子级 text 用 hug，禁止 fill 循环依赖",
    "- **content.image 是容器**：底图在 backgroundImage，图内白底字/角标用 children 叠放 + contentAlign，勿写成图下纵排兄弟 text",
  );
  return parts.join("\n");
}

/** 模板 15 的 bgImageBlock：图片作容器叠放子内容（真源样例）。 */
export function loadBgImageBlockSnippet(): string {
  const scriptPath = path.join(REPO_ROOT, "scripts/generate-manual-15-layout.mjs");
  if (!fs.existsSync(scriptPath)) return "（叠放样例未找到）";
  const raw = fs.readFileSync(scriptPath, "utf8");
  const start = raw.indexOf("function bgImageBlock");
  if (start < 0) return "（bgImageBlock 未找到）";
  const end = raw.indexOf("function gridBlock", start);
  return raw.slice(start, end > start ? end : start + 1200).trim();
}

function stripAssetConstantsFromMjs(source: string): string {
  return source
    .replace(/const PEXELS = [\s\S]*?;\n\n/, "// PEXELS — 由程序注入，禁止在脚本中自编 URL\n\n")
    .replace(/const ICON = [\s\S]*?;\n\n/, "// ICON — 由程序注入，禁止在脚本中自编 URL\n\n");
}

/** 模板 53 手工脚本（去掉 PEXELS/ICON URL）：保留工具函数 + buildS* + 落盘样板。 */
export function loadManual53ReferenceScript(maxChars = 20_000): string {
  const scriptPath = path.join(REPO_ROOT, "scripts/generate-manual-53-layout.mjs");
  if (!fs.existsSync(scriptPath)) return "（参考脚本未找到）";
  let raw = stripAssetConstantsFromMjs(fs.readFileSync(scriptPath, "utf8"));
  if (raw.length <= maxChars) return raw;

  const headChars = 10_000;
  const tailChars = 9_000;
  const head = raw.slice(0, headChars);
  const tail = raw.slice(-tailChars);
  return `${head}\n\n// …（中间 buildS* 省略，完整见 scripts/generate-manual-53-layout.mjs）\n\n${tail}`;
}

/** 模板 35 脚本末尾：meta / layout-manifest / payload 落盘形态（schema 真源样例）。 */
export function loadEmailScaffoldSnippet(): string {
  const scriptPath = path.join(REPO_ROOT, "scripts/generate-manual-35-layout.mjs");
  if (!fs.existsSync(scriptPath)) return "（落盘样板未找到）";
  const raw = fs.readFileSync(scriptPath, "utf8");
  const marker = "const meta = {";
  const idx = raw.indexOf(marker);
  if (idx < 0) return raw.slice(-2500);
  return raw.slice(idx);
}

/** @deprecated 使用 loadManual53ReferenceScript */
export function loadManual53ReferenceExcerpt(): string {
  return loadManual53ReferenceScript(3000);
}
