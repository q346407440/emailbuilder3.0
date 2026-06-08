import fs from "node:fs";
import path from "node:path";

/** 视为「未设置」：undefined 或仅空白（空字符串会阻塞 .env 回填，是 AI 配图失败的常见根因）。 */
export function isEnvValueUnset(value: string | undefined): boolean {
  return value === undefined || value.trim() === "";
}

/**
 * 启动时加载项目根 `.env`（不覆盖已有非空 process.env，便于 CI/Shell 显式注入优先）。
 * `start.sh` 会 source .env；直接 `npm run server` / IDE 启动 API 时也需此兜底。
 */
export function loadEnvFile(envPath: string): void {
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, "utf8");
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eq = line.indexOf("=");
    if (eq <= 0) continue;

    const key = line.slice(0, eq).trim();
    if (!key || !isEnvValueUnset(process.env[key])) continue;

    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

/** 仓库根目录 `.env`（与 server/index.ts 同级的上一级）。 */
export function loadProjectRootEnvFile(projectRoot: string): void {
  loadEnvFile(path.join(projectRoot, ".env"));
}
