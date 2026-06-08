import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { validateEmailMeta } from "../../../meta-contract";
import { validateLayoutManifest } from "../../emailLayoutVariant";
import { blockingValidationIssues } from "../../validate";
import { validateTemplateFromDisk } from "../../templateTreeAdapter";
import { validateTokenPresets } from "../../validateTokenPresets";
import type { LayoutManifest } from "../../../layout-variant-contract/types";
import { parseEmailKeyFromMjs } from "./extractMjsFromLlm";

export type MjsRunValidateResult = {
  ok: boolean;
  /** node 进程非零退出（与 validate 失败区分） */
  nodeFailed: boolean;
  mjsStdout: string;
  allIssues: string[];
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
      resolvedEmail,
      templatePath,
      tokenPresetsPath,
    };
  }

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

  const allIssues = [
    ...sceneErrors,
    ...templateIssues.map((i) => `${i.path}: ${i.reason}`),
    ...tokenIssues,
  ];

  return {
    ok: allIssues.length === 0,
    nodeFailed: false,
    mjsStdout: runLog.trim(),
    allIssues,
    resolvedEmail,
    templatePath,
    tokenPresetsPath,
  };
}
