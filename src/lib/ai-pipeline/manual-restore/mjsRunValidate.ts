import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { validateEmailMeta } from "../../../meta-contract";
import { validateLayoutManifest } from "../../emailLayoutVariant";
import { blockingValidationIssues } from "../../validate";
import { validateTemplateFromDisk } from "../../templateTreeAdapter";
import { validateTokenPresets } from "../../validateTokenPresets";
import { applyContractIssueAutofix } from "../../templateContractAutofix";
import type { LayoutManifest } from "../../../layout-variant-contract/types";
import { parseEmailKeyFromMjs } from "./extractMjsFromLlm";
import { rewriteNestedIssuePathToBlockPath } from "./mjsValidatePath";
import type { ManualRestoreBlueprint } from "./types";

export type MjsRunValidateResult = {
  ok: boolean;
  /** node 进程非零退出（与 validate 失败区分） */
  nodeFailed: boolean;
  mjsStdout: string;
  allIssues: string[];
  /** JSON 层确定性 autofix 已应用的修复描述（无修复为空数组） */
  jsonAutofixes: string[];
  resolvedEmail: string;
  templatePath: string;
  tokenPresetsPath: string;
};

function validateEmailSceneOnDisk(emailDir: string): string[] {
  const errors: string[] = [];
  const metaPath = path.join(emailDir, "meta.json");
  if (!fs.existsSync(metaPath)) {
    errors.push("缺少 meta.json（须在 data/emails/<EMAIL>/ 根目录）");
  } else {
    const meta = JSON.parse(fs.readFileSync(metaPath, "utf8")) as unknown;
    for (const issue of validateEmailMeta(meta)) {
      errors.push(`meta.json/${issue.path}: ${issue.reason}`);
    }
  }

  const manifestPath = path.join(emailDir, "layout-manifest.json");
  if (!fs.existsSync(manifestPath)) {
    errors.push("缺少 layout-manifest.json");
  } else {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as LayoutManifest;
    for (const issue of validateLayoutManifest(manifest)) {
      errors.push(`layout-manifest.json/${issue.path}: ${issue.reason}`);
    }
  }

  return errors;
}

/** 从 visual blueprint 派生标准 scale 补缺取值（radius 无图源，留契约兜底）。 */
export function tokenFallbacksFromBlueprint(
  blueprint: ManualRestoreBlueprint
): NonNullable<Parameters<typeof applyContractIssueAutofix>[0]["tokenFallbacks"]> {
  return {
    colors: { ...blueprint.colors },
    spacing: { ...blueprint.spacing },
    typography: { ...blueprint.typography },
  };
}

/** 写入 mjs → node 执行 → validate 落盘产物。 */
export function runMjsAndValidate(opts: {
  mjsSource: string;
  mjsPath: string;
  repoRoot: string;
  fallbackEmailKey: string;
  /** 默认 true；layout-only staging 为 false */
  validateScene?: boolean;
  /** 显式 template 路径；未传则用 data/emails/<email>/layouts/default/template.json */
  outputTemplatePath?: string;
  /** 显式 tokenPresets 路径 */
  outputTokenPresetsPath?: string;
  /** JSON autofix 补标准 scale 时的优先取值（如 blueprint 派生的 colors/spacing/typography） */
  tokenFallbacks?: Parameters<typeof applyContractIssueAutofix>[0]["tokenFallbacks"];
}): MjsRunValidateResult {
  const {
    mjsSource,
    mjsPath,
    repoRoot,
    fallbackEmailKey,
    validateScene = true,
    outputTemplatePath,
    outputTokenPresetsPath,
  } = opts;

  fs.writeFileSync(mjsPath, mjsSource.endsWith("\n") ? mjsSource : `${mjsSource}\n`);

  const run = spawnSync(process.execPath, [mjsPath], {
    cwd: repoRoot,
    encoding: "utf8",
    timeout: 120_000,
  });

  const runLog = [run.stdout, run.stderr].filter(Boolean).join("\n");

  if (run.status !== 0) {
    return {
      ok: false,
      nodeFailed: true,
      mjsStdout: runLog.trim(),
      allIssues: [runLog.slice(-2000) || `mjs 执行失败 exit ${run.status}`],
      jsonAutofixes: [],
      resolvedEmail: parseEmailKeyFromMjs(mjsSource) ?? fallbackEmailKey,
      templatePath: "",
      tokenPresetsPath: "",
    };
  }

  const resolvedEmail = parseEmailKeyFromMjs(mjsSource) ?? fallbackEmailKey;
  const emailDir = path.join(repoRoot, "data/emails", resolvedEmail);
  const templatePath =
    outputTemplatePath ?? path.join(emailDir, "layouts/default/template.json");
  const tokenPresetsPath =
    outputTokenPresetsPath ?? path.join(emailDir, "layouts/default/tokenPresets.json");

  if (!fs.existsSync(templatePath)) {
    return {
      ok: false,
      nodeFailed: true,
      mjsStdout: runLog.trim(),
      allIssues: [`mjs 执行后未找到 template.json: ${templatePath}`],
      jsonAutofixes: [],
      resolvedEmail,
      templatePath,
      tokenPresetsPath,
    };
  }

  const computeIssues = (): string[] => {
    const sceneErrors = validateScene ? validateEmailSceneOnDisk(emailDir) : [];
    const templateRaw = JSON.parse(fs.readFileSync(templatePath, "utf8")) as unknown;
    const templateIssues = blockingValidationIssues(validateTemplateFromDisk(templateRaw));

    const tokenIssues: string[] = [];
    if (fs.existsSync(tokenPresetsPath)) {
      const tokenRaw = JSON.parse(fs.readFileSync(tokenPresetsPath, "utf8")) as unknown;
      tokenIssues.push(
        ...validateTokenPresets(tokenRaw as Parameters<typeof validateTokenPresets>[0]).map(
          (i) => `tokenPresets.json/${i.path}: ${i.reason}`
        )
      );
    } else if (!validateScene) {
      tokenIssues.push(`缺少 tokenPresets.json: ${tokenPresetsPath}`);
    }

    return [
      ...sceneErrors,
      // 壳层索引路径（root.children[i]...）改写为 blocks.<id> 形态，
      // 使 slot 归属与 JSON autofix 可按 id 寻址
      ...templateIssues.map(
        (i) => `${rewriteNestedIssuePathToBlockPath(i.path, templateRaw)}: ${i.reason}`
      ),
      ...tokenIssues,
    ];
  };

  let allIssues = computeIssues();
  const jsonAutofixes: string[] = [];

  // JSON 层确定性 autofix：错误信息蕴含唯一修复方案的契约问题按路径直接修落盘产物，
  // 修复后复验；机械问题不进 LLM 修复循环。
  // 收敛循环：结构级修复（如 presets 打捞）后复验会暴露下一层键级错误，最多 3 轮直至无新修复。
  for (let round = 1; round <= 3 && allIssues.length > 0; round += 1) {
    const templateRaw = JSON.parse(fs.readFileSync(templatePath, "utf8")) as unknown;
    const tokenRaw = fs.existsSync(tokenPresetsPath)
      ? (JSON.parse(fs.readFileSync(tokenPresetsPath, "utf8")) as unknown)
      : null;
    const fixed = applyContractIssueAutofix({
      template: templateRaw,
      tokenPresets: tokenRaw,
      issues: allIssues,
      tokenFallbacks: opts.tokenFallbacks,
    });
    if (fixed.fixes.length === 0) break;
    fs.writeFileSync(templatePath, `${JSON.stringify(fixed.template, null, 2)}\n`);
    if (tokenRaw != null) {
      fs.writeFileSync(tokenPresetsPath, `${JSON.stringify(fixed.tokenPresets, null, 2)}\n`);
    }
    jsonAutofixes.push(...fixed.fixes);
    allIssues = computeIssues();
  }

  return {
    ok: allIssues.length === 0,
    nodeFailed: false,
    mjsStdout: runLog.trim(),
    allIssues,
    jsonAutofixes,
    resolvedEmail,
    templatePath,
    tokenPresetsPath,
  };
}
