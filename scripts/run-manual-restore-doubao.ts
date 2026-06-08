#!/usr/bin/env node
/**
 * 豆包「手工 mjs 还原」**本地 demo 入口**（非生产 API）。
 *
 * 核心能力在 runManualRestoreViaDoubao()：imagePath + outputEmailKey 均为入参。
 * 图源统一走「看图 → 资产槽 JSON → Pexels/CDN」，不依赖手工参考 mjs。
 *
 * 环境变量：DOUBAO_API_KEY、LLM_PIPELINE_MODEL
 *
 * 用法：
 *   npm run manual-restore:doubao
 *   npm run manual-restore:doubao -- \
 *     --image "/path/to/design.png" \
 *     --email-key my_new_email \
 *     --display-name "我的新邮件"
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runManualRestoreViaDoubao } from "../src/lib/ai-pipeline/manual-restore/runManualRestoreViaDoubao";
import { deriveDesignCopyPath } from "../src/lib/ai-pipeline/manual-restore/manualRestorePaths";
import { loadProjectRootEnvFile } from "../server/loadEnvFile";
import { logStepDone, stepStart } from "../src/lib/ai-pipeline/manual-restore/stepTiming";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

loadProjectRootEnvFile(REPO_ROOT);

/** 仅 demo 默认；上线时由前端/HTTP 传入 */
const DEMO_DEFAULTS = {
  image: "/Users/hengliheng/Downloads/邮件学习模板/购买后 1（模板 53）.png",
  emailKey: "engagement_post_purchase_template53_doubao",
  displayName: "购买后 1（模板 53 · IMBŌDHI · 豆包手工还原）",
};

function parseArgs(argv: string[]) {
  let image = DEMO_DEFAULTS.image;
  let emailKey = DEMO_DEFAULTS.emailKey;
  let displayName = DEMO_DEFAULTS.displayName;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--image" && argv[i + 1]) {
      image = argv[++i];
    } else if (arg === "--email-key" && argv[i + 1]) {
      emailKey = argv[++i];
    } else if (arg === "--display-name" && argv[i + 1]) {
      displayName = argv[++i];
    }
  }

  return { image, emailKey, displayName };
}

async function main() {
  const { image, emailKey, displayName } = parseArgs(process.argv.slice(2));

  console.log("[manual-restore:doubao] 设计图:", image);
  console.log("[manual-restore:doubao] 落盘 emailKey:", emailKey);
  console.log(
    "[manual-restore:doubao] 版式目录:",
    `data/emails/${emailKey}/layouts/default/`
  );

  const tTotal = stepStart();
  const result = await runManualRestoreViaDoubao({
    imagePath: image,
    outputEmailKey: emailKey,
    displayName,
    designCopyPath: deriveDesignCopyPath(REPO_ROOT, emailKey),
  });

  console.log("");
  logStepDone("[manual-restore:doubao]", "全流程完成", tTotal);
  console.log("[manual-restore:doubao] 完成");
  console.log("  mjs:", result.mjsPath);
  console.log("  落盘:", result.outputDir);
  console.log("  日志:", result.logDir);
  console.log("  校验:", result.validationOk ? "通过" : `失败（${result.validationIssues.length} 条）`);
  if (result.mjsStdout) {
    console.log("  mjs 输出:", result.mjsStdout.split("\n").slice(-3).join(" | "));
  }

  if (!result.validationOk) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("[manual-restore:doubao] 失败:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
