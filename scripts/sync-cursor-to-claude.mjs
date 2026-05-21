import { mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const CURSOR_SKILLS_DIR = path.join(ROOT, ".cursor", "skills");
const CLAUDE_SKILLS_DIR = path.join(ROOT, ".claude", "skills");
const CURSOR_RULES_DIR = path.join(ROOT, ".cursor", "rules");
const CLAUDE_MD = path.join(ROOT, "CLAUDE.md");

const SKILL_ORDER = [
  "easy-email-concepts",
  "easy-email-storage-api",
  "email-config-motherboard",
  "email-template-yaml-check",
  "easy-email-json-unified-migration",
  "email-template-restore-guide",
  "email-template-restore-check",
  "easy-email-frontend-chrome-verify",
];

const RULE_ORDER = [
  "easy-email-language-zh-cn.mdc",
  "easy-email-design-reuse.mdc",
  "easy-email-frontend-verify-reminder.mdc",
];

const CHECK_ONLY = process.argv.includes("--check");

function stripFrontmatter(content) {
  if (!content.startsWith("---\n")) return content.trim();
  const end = content.indexOf("\n---", 4);
  if (end === -1) return content.trim();
  return content.slice(end + "\n---".length).trim();
}

function parseFrontmatter(content) {
  if (!content.startsWith("---\n")) return {};
  const end = content.indexOf("\n---", 4);
  if (end === -1) return {};
  const lines = content.slice(4, end).split("\n");
  const meta = {};
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (rawValue === ">-" || rawValue === ">") {
      const parts = [];
      for (i += 1; i < lines.length && /^\s+/.test(lines[i]); i += 1) {
        parts.push(lines[i].trim());
      }
      i -= 1;
      meta[key] = parts.join(" ");
    } else {
      meta[key] = rawValue.trim().replace(/^["']|["']$/g, "");
    }
  }
  return meta;
}

function firstHeading(content, fallback) {
  const line = stripFrontmatter(content)
    .split("\n")
    .find((item) => item.startsWith("# "));
  return line ? line.replace(/^#\s+/, "").trim() : fallback;
}

async function listSkillNames() {
  const entries = await readdir(CURSOR_SKILLS_DIR, { withFileTypes: true });
  const names = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  return [
    ...SKILL_ORDER.filter((name) => names.includes(name)),
    ...names.filter((name) => !SKILL_ORDER.includes(name)).sort(),
  ];
}

async function listRuleFiles() {
  const entries = await readdir(CURSOR_RULES_DIR, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".mdc"))
    .map((entry) => entry.name);
  return [
    ...RULE_ORDER.filter((name) => files.includes(name)),
    ...files.filter((name) => !RULE_ORDER.includes(name)).sort(),
  ];
}

async function syncSkills() {
  await mkdir(CLAUDE_SKILLS_DIR, { recursive: true });
  const skillNames = await listSkillNames();
  const expectedTargets = new Set(skillNames.map((skillName) => `${skillName}.md`));
  const copied = [];
  const removed = [];

  for (const skillName of skillNames) {
    const source = path.join(CURSOR_SKILLS_DIR, skillName, "SKILL.md");
    const target = path.join(CLAUDE_SKILLS_DIR, `${skillName}.md`);
    const content = await readFile(source, "utf8");
    const current = await readFile(target, "utf8").catch(() => null);
    if (current !== content) {
      if (CHECK_ONLY) {
        throw new Error(`Claude skill 未同步：${path.relative(ROOT, target)}`);
      }
      await writeFile(target, content);
      copied.push(path.relative(ROOT, target));
    }
  }

  const claudeEntries = await readdir(CLAUDE_SKILLS_DIR, { withFileTypes: true });
  for (const entry of claudeEntries) {
    if (!entry.isFile() || !entry.name.endsWith(".md") || expectedTargets.has(entry.name)) continue;
    const target = path.join(CLAUDE_SKILLS_DIR, entry.name);
    if (CHECK_ONLY) {
      throw new Error(`Claude skill 多余文件未清理：${path.relative(ROOT, target)}`);
    }
    await unlink(target);
    removed.push(path.relative(ROOT, target));
  }

  return { skillNames, copied, removed };
}

async function buildClaudeMd(skillNames) {
  const skillRows = [];
  for (const skillName of skillNames) {
    const source = path.join(CURSOR_SKILLS_DIR, skillName, "SKILL.md");
    const content = await readFile(source, "utf8");
    const meta = parseFrontmatter(content);
    const title = meta.name || skillName;
    const description = meta.description || firstHeading(content, skillName);
    const claudePath = `.claude/skills/${skillName}.md`;
    skillRows.push(`| ${title} | [${claudePath}](${claudePath}) | ${description} |`);
  }

  const ruleFiles = await listRuleFiles();
  const ruleSections = [];
  for (const [index, fileName] of ruleFiles.entries()) {
    const source = path.join(CURSOR_RULES_DIR, fileName);
    const content = await readFile(source, "utf8");
    const body = stripFrontmatter(content);
    const title = firstHeading(content, fileName.replace(/\.mdc$/, ""));
    ruleSections.push(
      [
        `## Rule ${index + 1}: ${title}`,
        "",
        `> 来源：\`.cursor/rules/${fileName}\``,
        "",
        body
          .split("\n")
          .filter((line, lineIndex) => !(lineIndex === 0 && line.startsWith("# ")))
          .join("\n")
          .trim(),
      ].join("\n")
    );
  }

  return [
    "# Easy-Email — Claude Code Rules",
    "",
    "> 本文件由 `npm run sync:claude` 根据 `.cursor/skills` 与 `.cursor/rules` 生成；请优先修改 Cursor 侧源文件。",
    "",
    "## Skills（按需读取）",
    "",
    "| Skill | 路径 | 触发场景 |",
    "|---|---|---|",
    ...skillRows,
    "",
    "---",
    "",
    ...ruleSections.flatMap((section, index) => (index === 0 ? [section] : ["---", "", section])),
    "",
  ].join("\n");
}

async function syncClaudeMd(skillNames) {
  const next = await buildClaudeMd(skillNames);
  const current = await readFile(CLAUDE_MD, "utf8").catch(() => null);
  if (current !== next) {
    if (CHECK_ONLY) {
      throw new Error("CLAUDE.md 未同步");
    }
    await writeFile(CLAUDE_MD, next);
    return true;
  }
  return false;
}

async function main() {
  const { skillNames, copied, removed } = await syncSkills();
  const claudeMdUpdated = await syncClaudeMd(skillNames);

  if (CHECK_ONLY) {
    console.log("Claude 同步检查通过。");
    return;
  }

  for (const file of copied) {
    console.log(`已同步 skill：${file}`);
  }
  for (const file of removed) {
    console.log(`已删除多余 skill：${file}`);
  }
  if (claudeMdUpdated) {
    console.log("已同步 CLAUDE.md");
  }
  if (copied.length === 0 && removed.length === 0 && !claudeMdUpdated) {
    console.log("Claude 已与 Cursor 保持同步，无需更新。");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
