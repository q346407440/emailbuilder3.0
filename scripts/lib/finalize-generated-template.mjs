/**
 * 生成脚本写盘 template.json 后的统一收尾：hug 轴 contentAlign 回落。
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, "..", "..");

/**
 * @param {string} templatePath 绝对或相对 template.json 路径
 */
export function finalizeGeneratedTemplate(templatePath) {
  const abs = resolve(templatePath);
  const r = spawnSync(
    "npx",
    ["tsx", join(REPO, "scripts/migrate-content-align-hug-neutral.ts"), abs, "--write"],
    { cwd: REPO, stdio: "inherit" }
  );
  if (r.status !== 0) {
    throw new Error(`migrate-content-align-hug-neutral 失败：${abs}`);
  }
}
