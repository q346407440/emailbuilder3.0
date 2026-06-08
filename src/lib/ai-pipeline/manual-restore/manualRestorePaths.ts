import path from "node:path";

/** 设计图副本默认落到 public/test-assets/<emailKey>-design.png */
export function deriveDesignCopyPath(repoRoot: string, emailKey: string): string {
  return path.join(repoRoot, "public/test-assets", `${emailKey}-design.png`);
}

/** 版式落盘目录：data/emails/<emailKey>/layouts/default/ */
export function deriveLayoutOutputDir(repoRoot: string, emailKey: string): string {
  return path.join(repoRoot, "data/emails", emailKey, "layouts/default");
}

/** 邮件场景根目录：data/emails/<emailKey>/ */
export function deriveEmailSceneDir(repoRoot: string, emailKey: string): string {
  return path.join(repoRoot, "data/emails", emailKey);
}
